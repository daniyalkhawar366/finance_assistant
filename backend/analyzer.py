import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Transaction, Subscription, Budget, UserContext

def detect_and_save_subscriptions(db: Session, user_id: str):
    """
    Find recurring negative transactions (expenses) that occur with regular intervals (e.g. monthly).
    If found, store them in the subscriptions table.
    """
    # Fetch all negative transactions for this user
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.amount < 0
    ).all()
    
    if len(transactions) < 3:
        return []
        
    # Load into DataFrame
    df = pd.DataFrame([{
        "merchant": t.description,
        "amount": abs(t.amount),
        "date": pd.to_datetime(t.date),
    } for t in transactions])
    
    df = df.sort_values(by=["merchant", "date"])
    
    detected_subs = []
    
    # Simple recurring charge heuristic:
    # 1. Same merchant
    # 2. Similar amount (within 5% range)
    # 3. Monthly frequency (gap between transactions is ~25 to 35 days, or ~28 to 31 days)
    # 4. At least 3 occurrences
    
    for merchant, group in df.groupby("merchant"):
        if len(group) < 3:
            continue
            
        # We want to find clusters of transactions with similar amounts
        # For simplicity, let's group by amount rounded to nearest integer or check if amounts are close
        # In a strict dark-mode editorial cockpit, accuracy is key.
        # Let's group by exact amount or find close matches.
        for amt, sub_group in group.groupby(lambda idx: round(group.loc[idx, "amount"], 1)):
            if len(sub_group) < 3:
                continue
                
            sub_group = sub_group.sort_values(by="date")
            # Calculate date differences in days
            deltas = sub_group["date"].diff().dropna().dt.days.tolist()
            
            # Check if all deltas are roughly monthly (25 to 35 days)
            is_monthly = all(25 <= d <= 35 for d in deltas)
            
            if is_monthly:
                # Get the last date
                last_charged = sub_group["date"].max().strftime("%Y-%m-%d")
                
                # Check if already exists in DB
                existing = db.query(Subscription).filter(
                    Subscription.user_id == user_id,
                    Subscription.merchant == merchant
                ).first()
                
                if existing:
                    existing.amount = sub_group["amount"].iloc[-1]
                    existing.last_charged_date = last_charged
                else:
                    new_sub = Subscription(
                        user_id=user_id,
                        merchant=merchant,
                        amount=sub_group["amount"].iloc[-1],
                        frequency="monthly",
                        last_charged_date=last_charged
                    )
                    db.add(new_sub)
                
                detected_subs.append({
                    "merchant": merchant,
                    "amount": sub_group["amount"].iloc[-1],
                    "frequency": "monthly",
                    "last_charged_date": last_charged
                })
                
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving subscriptions: {e}")
        
    return detected_subs

def detect_anomalies(db: Session, user_id: str) -> list[dict]:
    """
    Find transactions that are unusual for this user.
    Anomalies are flagged if:
    1. The transaction amount is > 3x the standard deviation or mean of expenses in that category.
    2. The expense is extremely high compared to the median expense (e.g. > 5x median expense).
    3. The transaction is at a merchant that has never been seen before and is > $100.
    """
    # Fetch all transactions for this user
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).all()
    
    if len(transactions) < 5:
        return []
        
    df = pd.DataFrame([{
        "id": t.id,
        "date": t.date,
        "description": t.description,
        "amount": t.amount, # negative for expense
        "category": t.category
    } for t in transactions])
    
    # We only analyze expenses (negative amounts)
    expenses_df = df[df["amount"] < 0].copy()
    expenses_df["abs_amount"] = expenses_df["amount"].abs()
    
    anomalies = []
    
    # Group by category to find outliers
    for category, group in expenses_df.groupby("category"):
        if len(group) < 3:
            # Not enough history in this category, check if any single transaction is very large (> $500)
            for idx, row in group.iterrows():
                if row["abs_amount"] > 500:
                    anomalies.append({
                        "transaction_id": row["id"],
                        "date": row["date"],
                        "description": row["description"],
                        "amount": row["amount"],
                        "category": row["category"],
                        "reason": f"High value transaction in new category '{category}'"
                    })
            continue
            
        mean = group["abs_amount"].mean()
        std = group["abs_amount"].std()
        median = group["abs_amount"].median()
        
        # Avoid standard deviation of 0 causing issues
        if pd.isna(std) or std == 0:
            std = 5.0
            
        for idx, row in group.iterrows():
            amt = row["abs_amount"]
            
            # Heuristic 1: 3x median expense or (mean + 3 * std)
            is_outlier = (amt > mean + 3 * std) or (amt > 5 * median and amt > 100)
            
            if is_outlier:
                anomalies.append({
                    "transaction_id": row["id"],
                    "date": row["date"],
                    "description": row["description"],
                    "amount": row["amount"],
                    "category": row["category"],
                    "reason": f"Outlier spending: {amt} is significantly higher than category normal (Avg: {mean:.2f})"
                })
                
    # Heuristic 2: Large transaction at a newly seen merchant
    # Let's find first time transactions at a merchant where amount is > $150
    merchant_counts = expenses_df.groupby("description").size()
    single_visit_merchants = merchant_counts[merchant_counts == 1].index.tolist()
    
    for idx, row in expenses_df.iterrows():
        if row["description"] in single_visit_merchants and row["abs_amount"] > 150:
            # Check if not already added
            if not any(a["transaction_id"] == row["id"] for a in anomalies):
                anomalies.append({
                    "transaction_id": row["id"],
                    "date": row["date"],
                    "description": row["description"],
                    "amount": row["amount"],
                    "category": row["category"],
                    "reason": "First-time charge at merchant exceeding $150"
                })
                
    # Sort anomalies by date descending
    anomalies.sort(key=lambda x: x["date"], reverse=True)
    return anomalies

def check_budgets(db: Session, user_id: str) -> list[dict]:
    """
    Compare current month's spending against budgets.
    """
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    if not budgets:
        return []
        
    # Get current year-month
    current_month_str = datetime.utcnow().strftime("%Y-%m")
    
    # Sum expenses for this month grouped by category
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date.like(f"{current_month_str}%"),
        Transaction.amount < 0
    ).all()
    
    category_spending = {}
    for t in transactions:
        category_spending[t.category] = category_spending.get(t.category, 0.0) + abs(t.amount)
        
    results = []
    for b in budgets:
        spent = category_spending.get(b.category, 0.0)
        percentage = (spent / b.limit_amount) * 100 if b.limit_amount > 0 else 0
        
        results.append({
            "category": b.category,
            "limit_amount": b.limit_amount,
            "spent": spent,
            "percentage": round(percentage, 1),
            "is_exceeded": spent > b.limit_amount,
            "is_warning": (b.limit_amount * 0.8) <= spent <= b.limit_amount
        })
        
    return results
