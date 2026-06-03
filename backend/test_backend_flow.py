import requests
import os

API_BASE = "http://localhost:8000"
CSV_PATH = "sample_transactions.csv"

def run_test():
    print("--- Starting Revonix Personal Finance API Integration Test ---")
    
    # 1. Sign up
    signup_url = f"{API_BASE}/api/auth/signup"
    user_payload = {
        "email": "testuser_new2@revonix.com",
        "password": "Password123!"
    }
    
    print("\n[1] Registering user 'testuser_new2@revonix.com'...")
    try:
        res = requests.post(signup_url, json=user_payload)
        if res.status_code == 200:
            print("Signup Success!")
        else:
            print(f"Signup info: {res.status_code} - {res.text} (User might already exist)")
    except Exception as e:
        print(f"Signup failed: {e}")
        return

    # 2. Login
    login_url = f"{API_BASE}/api/auth/login"
    print("\n[2] Logging in to acquire JWT token...")
    res = requests.post(login_url, json=user_payload)
    if res.status_code != 200:
        print(f"Login failed: {res.status_code} - {res.text}")
        return
        
    token = res.json()["access_token"]
    print("Login Success! Token acquired.")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Import CSV
    upload_url = f"{API_BASE}/api/transactions/upload-csv"
    print(f"\n[3] Ingesting transaction database '{CSV_PATH}'...")
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found in root!")
        return
        
    with open(CSV_PATH, "rb") as f:
        files = {"file": (CSV_PATH, f, "text/csv")}
        res = requests.post(upload_url, headers=headers, files=files)
        
    if res.status_code != 200:
        print(f"CSV Ingestion failed: {res.status_code} - {res.text}")
        return
        
    print(f"CSV Ingestion Success: {res.json()}")

    # 4. Get Dashboard Stats
    stats_url = f"{API_BASE}/api/dashboard/stats"
    print("\n[4] Querying Dashboard Stats...")
    res = requests.get(stats_url, headers=headers)
    if res.status_code != 200:
        print(f"Failed to load stats: {res.status_code} - {res.text}")
        return
        
    stats = res.json()
    print("Dashboard KPIs:")
    print(f" - Net Balance: ${stats['balance']:,.2f}")
    print(f" - Total Income: ${stats['total_income']:,.2f}")
    print(f" - Total Expenses: ${stats['total_expenses']:,.2f}")
    print(f" - Monthly Income: ${stats['month_income']:,.2f}")
    print(f" - Monthly Expenses: ${stats['month_expenses']:,.2f}")
    print(f" - Active Subscriptions Count: {stats['subscription_count']}")
    print(f" - Active Subscriptions Cost: ${stats['subscription_monthly_cost']:,.2f}/mo")
    print(f" - Flagged Anomalies Count: {stats['anomaly_count']}")
    print(f" - Top Spending Categories: {stats['category_breakout'][:3]}")

    # 5. AI Chat Query - Groceries spend
    chat_url = f"{API_BASE}/api/chat"
    query1 = {"message": "How much did I spend on groceries last month?"}
    print(f"\n[5] Chatting with AI: '{query1['message']}'...")
    res = requests.post(chat_url, headers=headers, json=query1)
    if res.status_code == 200:
        chat_res = res.json()
        print(f"Agent Response:\n{chat_res['response']}")
        print(f"SQL Ran:\n{chat_res['sql_queries']}")
    else:
        print(f"Chat failed: {res.status_code} - {res.text}")

    # 6. AI Chat Query - Recurring subscriptions
    query2 = {"message": "Do I have any recurring subscriptions?"}
    print(f"\n[6] Chatting with AI: '{query2['message']}'...")
    res = requests.post(chat_url, headers=headers, json=query2)
    if res.status_code == 200:
        chat_res = res.json()
        print(f"Agent Response:\n{chat_res['response']}")
        print(f"SQL Ran:\n{chat_res['sql_queries']}")
    else:
        print(f"Chat failed: {res.status_code} - {res.text}")

    # 7. AI Chat Query - Outlier check
    query3 = {"message": "Are there any unusual charges in my history?"}
    print(f"\n[7] Chatting with AI: '{query3['message']}'...")
    res = requests.post(chat_url, headers=headers, json=query3)
    if res.status_code == 200:
        chat_res = res.json()
        print(f"Agent Response:\n{chat_res['response']}")
        print(f"SQL Ran:\n{chat_res['sql_queries']}")
    else:
        print(f"Chat failed: {res.status_code} - {res.text}")

    print("\n--- Integration Test Completed Successfully! ---")

if __name__ == "__main__":
    run_test()
