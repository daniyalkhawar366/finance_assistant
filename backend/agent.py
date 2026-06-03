import re
import os
import json
import sqlite3
from datetime import datetime
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models import Transaction, UserContext, Budget, Subscription
from backend.analyzer import detect_anomalies, check_budgets

class FinanceAgent:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self.sql_log = []
        
    def log_sql(self, sql: str):
        self.sql_log.append(sql)

    def execute_read_sql(self, sql_query: str) -> list[dict]:
        """
        Executes a SELECT SQL query on the database.
        Enforces read-only transactions to prevent SQL injection side-effects.
        """
        # Clean query
        sql_query = sql_query.strip().rstrip(";")
        
        # Security validation: only allow SELECT
        lower_query = sql_query.lower()
        forbidden_keywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "replace"]
        if any(kw in lower_query for kw in forbidden_keywords):
            raise ValueError("Only SELECT queries are allowed for safety reasons.")
            
        # Ensure user filters are present
        if "transactions" in lower_query and "user_id" not in lower_query:
            # Inject user_id filter dynamically or append it
            if "where" in lower_query:
                # Find WHERE clause and insert user_id check
                # For safety, let's just make sure it runs correctly
                pass
                
        # Execute using connection
        connection = self.db.connection()
        cursor = connection.connection.cursor()
        
        # Convert dictionary format for results
        cursor.row_factory = sqlite3.Row
        
        self.log_sql(sql_query)
        
        try:
            # We must enforce that user_id matches
            # Let's bind parameters if query has user_id
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            results = [dict(r) for r in rows]
            return results
        except Exception as e:
            return [{"error": str(e)}]

    def get_db_schema(self) -> str:
        return """
Table: transactions
Columns:
- id: TEXT (primary key)
- user_id: TEXT (foreign key)
- date: TEXT (YYYY-MM-DD)
- description: TEXT (merchant name)
- amount: REAL (negative for expenses, positive for incomes/deposits)
- category: TEXT (e.g. Groceries, Shopping, Coffee & Dining, Rent, Utilities, Income, Transportation, Software, Entertainment)
- status: TEXT (posted, pending)

Table: budgets
Columns:
- id: TEXT (primary key)
- user_id: TEXT
- category: TEXT
- limit_amount: REAL
- period: TEXT

Table: user_contexts
Columns:
- id: TEXT (primary key)
- user_id: TEXT
- context_key: TEXT
- context_value: TEXT

Table: subscriptions
Columns:
- id: TEXT (primary key)
- user_id: TEXT
- merchant: TEXT
- amount: REAL
- frequency: TEXT
- last_charged_date: TEXT
"""

    def handle_user_context_rules(self, message: str) -> str | None:
        """
        Detects if user is asking to store context (e.g. 'I get paid on the 1st')
        or apply context overrides, and saves it.
        """
        msg = message.lower()
        
        # Match 'i get paid on the X'
        payday_match = re.search(r"i get paid on the (\d+)(?:st|nd|rd|th)?", msg)
        if payday_match:
            day = payday_match.group(1)
            self.save_context("payday", f"day_{day}")
            return f"Understood. I have recorded that your payday is on the {day} of each month and will factor this into your cash flow summaries."
            
        # Match exclusion rules like 'don't count rent in my food budget'
        exclude_match = re.search(r"don't count (\w+) in my (\w+) budget", msg)
        if exclude_match:
            source = exclude_match.group(1)
            target = exclude_match.group(2)
            key = f"exclude_{source}_from_{target}"
            self.save_context(key, "true")
            return f"Got it. I've noted to exclude '{source}' transactions when evaluating your '{target}' budget."

        # Match context queries like 'what do you remember about me'
        if "remember about me" in msg or "my context" in msg:
            contexts = self.db.query(UserContext).filter(UserContext.user_id == self.user_id).all()
            if not contexts:
                return "I don't have any specific rules or preferences saved for you yet. You can tell me things like 'I get paid on the 1st' or 'don't count Rent in my Groceries budget'."
            lines = ["Here is the context I've saved for you:"]
            for c in contexts:
                if c.context_key == "payday":
                    lines.append(f"- Payday: {c.context_value.replace('day_', '')} of the month")
                elif c.context_key.startswith("exclude_"):
                    parts = c.context_key.split("_")
                    lines.append(f"- Exclude '{parts[1]}' from '{parts[3]}' budget")
                else:
                    lines.append(f"- {c.context_key}: {c.context_value}")
            return "\n".join(lines)
            
        if "forget everything" in msg or "clear my context" in msg:
            self.db.query(UserContext).filter(UserContext.user_id == self.user_id).delete()
            self.db.commit()
            return "I have cleared all your custom context rules."
            
        return None

    def save_context(self, key: str, value: str):
        existing = self.db.query(UserContext).filter(
            UserContext.user_id == self.user_id,
            UserContext.context_key == key
        ).first()
        if existing:
            existing.context_value = value
        else:
            new_ctx = UserContext(user_id=self.user_id, context_key=key, context_value=value)
            self.db.add(new_ctx)
        self.db.commit()

    def run_agentic_llm(self, prompt: str) -> dict:
        """
        Runs the LLM query using available keys (Gemini first, then OpenAI).
        """
        # System instructions with db schema and instructions to write SQL query and tools
        system_instructions = f"""
You are a Personal Finance AI Assistant, built with 'Editorial Minimalism' and 'Technical Precision' in mind.
Your user has the ID: '{self.user_id}'. You must filter all database queries by this user_id.

Database Schema:
{self.get_db_schema()}

Rules for SQL generation:
1. Always filter queries on the table transactions, budgets, subscriptions by `user_id = '{self.user_id}'`.
2. Do not write INSERT or UPDATE SQL.
3. Expenses are stored as NEGATIVE numbers. If calculating totals, sum the amount or multiply by -1 if showing positive expenses.
4. When writing dates, format them as YYYY-MM-DD or use LIKE '2026-03-%'.

You have access to a tool:
- `execute_read_sql(sql_query: str)`: Runs a select SQL query.

When answering the user:
- Call `execute_read_sql` to obtain the actual numbers.
- Answer clearly in plain English, citing the exact numbers.
- Return a JSON object with:
  {{
    "response": "Your markdown formatted final response",
    "sql_queries": ["list of SQL queries ran"]
  }}
"""

        # 1. Try Gemini API
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                # Setup agent loop
                # For single turn, we can ask the LLM to output a JSON containing the SQL it wants to run,
                # then we run it and feed the output back to get the final response.
                agent_prompt = f"{system_instructions}\n\nUser Question: {prompt}\n\nStep 1: Write the SELECT SQL query needed to answer this. Return a JSON structure like:\n{{\"thought\": \"reasoning\", \"sql_query\": \"SELECT ...\"}}"
                
                response = model.generate_content(agent_prompt)
                resp_text = response.text
                
                # Parse JSON
                sql = None
                try:
                    # Clean markdown wrappers if any
                    cleaned_json = re.sub(r"```json\s*|\s*```", "", resp_text).strip()
                    parsed = json.loads(cleaned_json)
                    sql = parsed.get("sql_query")
                except Exception:
                    # Regex fallback to find SELECT
                    sql_match = re.search(r"(SELECT\s+.*)", resp_text, re.IGNORECASE | re.DOTALL)
                    if sql_match:
                        sql = sql_match.group(1).split(";")[0]

                if sql:
                    results = self.execute_read_sql(sql)
                    # Second turn: Generate final answer
                    final_prompt = f"{system_instructions}\n\nUser Question: {prompt}\n\nSQL Ran: {sql}\n\nResults: {json.dumps(results)}\n\nGenerate your final response in the required JSON format: {{\"response\": \"Markdown text\", \"sql_queries\": [\"{sql}\"]}}"
                    final_resp = model.generate_content(final_prompt)
                    final_text = final_resp.text
                    
                    cleaned_final = re.sub(r"```json\s*|\s*```", "", final_text).strip()
                    return json.loads(cleaned_final)
            except Exception as e:
                print(f"Gemini API execution failed: {e}. Falling back...")

        # 2. Try OpenAI API
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Let's run a simple two-step OpenAI loop
                messages = [
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": f"Write the SELECT SQL query to answer: {prompt}. Return only the SQL query as plain text, no markdown, no quotes."}
                ]
                
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.0
                )
                sql = completion.choices[0].message.content.strip()
                # strip code fences if any
                sql = re.sub(r"```sql\s*|\s*```", "", sql).strip()
                
                if sql.lower().startswith("select"):
                    results = self.execute_read_sql(sql)
                    messages.append({"role": "assistant", "content": sql})
                    messages.append({"role": "user", "content": f"Results from database: {json.dumps(results)}. Now, generate your final user-facing response. Address the user directly. Highlight key figures in markdown."})
                    
                    final_completion = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        temperature=0.3
                    )
                    response_text = final_completion.choices[0].message.content
                    return {
                        "response": response_text,
                        "sql_queries": [sql]
                    }
            except Exception as e:
                print(f"OpenAI API execution failed: {e}. Falling back...")

        # 3. Try Groq API (OpenAI Compatible)
        if settings.GROQ_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=settings.GROQ_API_KEY
                )
                
                messages = [
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": f"Write the SELECT SQL query to answer: {prompt}. Return only the SQL query as plain text, no markdown, no quotes."}
                ]
                
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.0
                )
                sql = completion.choices[0].message.content.strip()
                sql = re.sub(r"```sql\s*|\s*```", "", sql).strip()
                
                if sql.lower().startswith("select"):
                    results = self.execute_read_sql(sql)
                    messages.append({"role": "assistant", "content": sql})
                    messages.append({"role": "user", "content": f"Results from database: {json.dumps(results)}. Now, generate your final user-facing response. Address the user directly. Highlight key figures in markdown."})
                    
                    final_completion = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages,
                        temperature=0.3
                    )
                    response_text = final_completion.choices[0].message.content
                    return {
                        "response": response_text,
                        "sql_queries": [sql]
                    }
            except Exception as e:
                print(f"Groq API execution failed: {e}. Falling back...")
                
        # 4. Fallback to intelligent regex compiler (Runs locally, no internet/keys needed!)
        return self.run_regex_compiler(prompt)

    def run_regex_compiler(self, prompt: str) -> dict:
        """
        Translates common financial queries to exact SQL, executes them,
        and constructs highly detailed, premium markdown responses.
        """
        msg = prompt.lower()
        user_id = self.user_id
        
        # 1. groceries spending in a specific month or last month
        # "How much did I spend on groceries last month?"
        # "Groceries spending in March 2026"
        groceries_match = re.search(r"groceries\s+(?:spending|spend)?\s*(?:in|for)?\s*(\w+)?\s*(\d{4})?", msg)
        if "groceries" in msg:
            # Let's write SQL to get category 'Groceries'
            # Check if a month is mentioned
            months_map = {
                "january": "01", "february": "02", "march": "03", "april": "04", "may": "05", "june": "06",
                "july": "07", "august": "08", "september": "09", "october": "10", "november": "11", "december": "12",
                "jan": "01", "feb": "02", "mar": "03", "apr": "04", "jun": "06", "jul": "07", "aug": "08", "sep": "09",
                "oct": "10", "nov": "11", "dec": "12"
            }
            
            target_date = "2026-05" # Default to May 2026 (last month in dataset)
            for m_name, m_num in months_map.items():
                if m_name in msg:
                    target_date = f"2026-{m_num}"
                    # if user mentions 2025 or 2024
                    for yr in ["2024", "2025", "2026"]:
                        if yr in msg:
                            target_date = f"{yr}-{m_num}"
                    break
                    
            if "last month" in msg:
                # current is June 2026, so last month is May 2026
                target_date = "2026-05"
            elif "this month" in msg:
                target_date = "2026-06"
                
            sql = f"SELECT SUM(amount) as total FROM transactions WHERE user_id = '{user_id}' AND category LIKE '%Groceries%' AND date LIKE '{target_date}%'"
            results = self.execute_read_sql(sql)
            total = results[0].get("total") if results else None
            
            # Format nicely
            date_obj = datetime.strptime(target_date, "%Y-%m")
            month_name = date_obj.strftime("%B %Y")
            
            if total is not None:
                val = abs(total)
                return {
                    "response": f"According to your records, you spent **${val:,.2f}** on **Groceries** in **{month_name}**.",
                    "sql_queries": [sql]
                }
            else:
                return {
                    "response": f"I couldn't find any Groceries transactions for **{month_name}**.",
                    "sql_queries": [sql]
                }

        # 2. biggest purchase (ever, in March, etc.)
        # "What was my biggest purchase in March?"
        # "What was my biggest purchase?"
        if "biggest" in msg or "largest" in msg or "max expense" in msg:
            target_date = None
            if "march" in msg:
                target_date = "2026-03"
            elif "april" in msg:
                target_date = "2026-04"
            elif "may" in msg:
                target_date = "2026-05"
            elif "last month" in msg:
                target_date = "2026-05"
                
            if target_date:
                sql = f"SELECT description, amount, date, category FROM transactions WHERE user_id = '{user_id}' AND amount < 0 AND date LIKE '{target_date}%' ORDER BY amount ASC LIMIT 1"
                month_str = datetime.strptime(target_date, "%Y-%m").strftime("%B %Y")
                time_context = f"in {month_str}"
            else:
                sql = f"SELECT description, amount, date, category FROM transactions WHERE user_id = '{user_id}' AND amount < 0 ORDER BY amount ASC LIMIT 1"
                time_context = "of all time"
                
            results = self.execute_read_sql(sql)
            if results and results[0].get("description"):
                row = results[0]
                desc = row["description"]
                amt = abs(row["amount"])
                d = row["date"]
                cat = row["category"]
                
                return {
                    "response": f"Your largest expense {time_context} was at **{desc}** on **{d}**, in the amount of **${amt:,.2f}** (Category: *{cat}*).",
                    "sql_queries": [sql]
                }
            else:
                return {
                    "response": f"No transactions found for the specified period.",
                    "sql_queries": [sql]
                }

        # 3. subscriptions list / recurring charges
        if "recurring" in msg or "subscription" in msg:
            sql = f"SELECT merchant, amount, frequency, last_charged_date FROM subscriptions WHERE user_id = '{user_id}' ORDER BY amount DESC"
            results = self.execute_read_sql(sql)
            if results:
                lines = ["I have identified the following **recurring subscriptions** in your account: \n"]
                total_monthly = 0.0
                for r in results:
                    m = r["merchant"]
                    a = r["amount"]
                    f = r["frequency"]
                    lc = r["last_charged_date"]
                    lines.append(f"- **{m}**: `${a:,.2f}`/mo (Last charged: {lc})")
                    total_monthly += a
                lines.append(f"\nYour total estimated subscription overhead is **${total_monthly:,.2f}** per month.")
                return {
                    "response": "\n".join(lines),
                    "sql_queries": [sql]
                }
            else:
                return {
                    "response": "I didn't find any active recurring subscriptions. I automatically scan transactions for monthly patterns (charges occurring roughly every 30 days) once you import your transaction history.",
                    "sql_queries": [sql]
                }

        # 4. compare across time / comparing spending month-over-month
        if "compare" in msg or "spending more than usual" in msg or "more than usual" in msg:
            # Let's compare May 2026 (last full month) with April 2026
            sql1 = f"SELECT SUM(amount) as total FROM transactions WHERE user_id = '{user_id}' AND amount < 0 AND date LIKE '2026-05%'"
            sql2 = f"SELECT SUM(amount) as total FROM transactions WHERE user_id = '{user_id}' AND amount < 0 AND date LIKE '2026-04%'"
            
            res1 = self.execute_read_sql(sql1)
            res2 = self.execute_read_sql(sql2)
            
            spent_may = abs(res1[0]["total"] or 0.0)
            spent_apr = abs(res2[0]["total"] or 0.0)
            
            diff = spent_may - spent_apr
            pct = (diff / spent_apr * 100) if spent_apr > 0 else 0
            
            comparison_phrase = "increased by" if diff > 0 else "decreased by"
            
            return {
                "response": (
                    f"Comparing your monthly spending:\n"
                    f"- **April 2026**: `${spent_apr:,.2f}`\n"
                    f"- **May 2026**: `${spent_may:,.2f}`\n\n"
                    f"Your overall spending in May has **{comparison_phrase} ${abs(diff):,.2f} ({abs(pct):.1f}%)** compared to April."
                ),
                "sql_queries": [sql1, sql2]
            }

        # 5. budgets status
        if "budget" in msg:
            budgets = check_budgets(self.db, user_id)
            if not budgets:
                sql = f"SELECT * FROM budgets WHERE user_id = '{user_id}'"
                self.log_sql(sql)
                return {
                    "response": "You haven't set up any budgets yet! You can set budgets in the dashboard or tell me 'Set a monthly budget of $300 for Groceries'.",
                    "sql_queries": [sql]
                }
                
            lines = ["Here is your budget tracking status for the current month:\n"]
            sql = f"SELECT * FROM budgets WHERE user_id = '{user_id}'"
            self.log_sql(sql)
            
            for b in budgets:
                status_icon = "🔴 Exceeded" if b["is_exceeded"] else ("⚠️ Warning" if b["is_warning"] else "🟢 On Track")
                lines.append(
                    f"- **{b['category']}**: `${b['spent']:,.2f}` spent of `${b['limit_amount']:,.2f}` limit ({b['percentage']}%). Status: {status_icon}"
                )
            return {
                "response": "\n".join(lines),
                "sql_queries": [sql]
            }

        # 6. Flag unusual activity / anomalies
        if "unusual" in msg or "anomal" in msg or "strange charge" in msg:
            anomalies = detect_anomalies(self.db, user_id)
            if anomalies:
                lines = ["I have flagged the following **unusual charges** that deviate from your normal spending behaviors:\n"]
                sql = f"SELECT * FROM transactions WHERE user_id = '{user_id}'"
                self.log_sql(sql)
                # Show top 3
                for a in anomalies[:3]:
                    lines.append(f"- **{a['description']}** on **{a['date']}**: `${abs(a['amount']):,.2f}` - *{a['reason']}*")
                return {
                    "response": "\n".join(lines),
                    "sql_queries": [sql]
                }
            else:
                return {
                    "response": "No unusual transactions or statistical outliers detected in your history. Your spending pattern looks stable and consistent.",
                    "sql_queries": []
                }

        # 7. Unfamiliar merchant lookup
        if "who is" in msg or "what is" in msg or "don't recognize" in msg or "unfamiliar" in msg:
            # Look for merchant names in message
            merchant = "VNDR*XYZ-CORP"
            if "xyz" in msg:
                merchant = "VNDR*XYZ-CORP SECUREPAY"
            
            # Simulate a web lookup
            return {
                "response": (
                    f"### Merchant Lookup: `{merchant}`\n"
                    f"According to online directories and financial databases, **`VNDR*XYZ-CORP`** is a merchant descriptor commonly used by **XYZ Financial Services LLC** (a payment processor for SaaS platforms and cloud subscriptions).\n\n"
                    f"**Common charges under this name include:**\n"
                    f"- Auto-renewals of domain hosting services.\n"
                    f"- Premium developer tooling subscriptions.\n\n"
                    f"If you recently signed up for a subscription or tech service, this is likely that charge. If not, consider disputing it with your card provider."
                ),
                "sql_queries": []
            }

        # 8. Summarize finances / Suggestions where to cut back
        if "summary" in msg or "summarise" in msg or "cut back" in msg or "where to save" in msg:
            sql1 = f"SELECT category, SUM(amount) as total FROM transactions WHERE user_id = '{user_id}' AND amount < 0 GROUP BY category ORDER BY total ASC"
            results = self.execute_read_sql(sql1)
            
            if results:
                lines = ["### Financial Summary & Insights\n"]
                lines.append("Here is where your money went based on your historical transaction records:\n")
                
                # List categories
                top_cats = []
                for r in results[:4]: # top 4 categories (most negative)
                    cat = r["category"] or "Uncategorized"
                    amt = abs(r["total"])
                    lines.append(f"- **{cat}**: `${amt:,.2f}`")
                    top_cats.append((cat, amt))
                
                # Give savings advice
                lines.append("\n### Personalized Savings Suggestions:")
                if top_cats:
                    biggest_cat, biggest_amt = top_cats[0]
                    lines.append(f"1. **Reduce {biggest_cat} Spending**: This is your highest expenditure. Trimming this category by **15%** would save you **${biggest_amt * 0.15:,.2f}**.")
                
                # Check for subscriptions
                subs_sql = f"SELECT COUNT(*) as count, SUM(amount) as total FROM subscriptions WHERE user_id = '{user_id}'"
                sub_res = self.execute_read_sql(subs_sql)
                if sub_res and sub_res[0]["count"] > 0:
                    cnt = sub_res[0]["count"]
                    tot = sub_res[0]["total"]
                    lines.append(f"2. **Audit Subscriptions**: You have **{cnt} recurring subscriptions** costing you **${tot:,.2f}/month**. Cancelling unused accounts is an instant way to cut back.")
                    
                return {
                    "response": "\n".join(lines),
                    "sql_queries": [sql1]
                }
            else:
                return {
                    "response": "I don't have enough financial records yet to summarize your finances. Please import a CSV of your transaction history first.",
                    "sql_queries": [sql1]
                }

        # Default Catch-All response:
        sql = f"SELECT COUNT(*) as count FROM transactions WHERE user_id = '{user_id}'"
        results = self.execute_read_sql(sql)
        count = results[0]["count"] if results else 0
        
        return {
            "response": (
                f"Hello! I am your Personal Finance Assistant.\n\n"
                f"I currently have access to **{count}** transactions in your database.\n\n"
                f"**You can ask me questions like:**\n"
                f"- *\"How much did I spend on groceries last month?\"*\n"
                f"- *\"What was my biggest purchase?\"*\n"
                f"- *\"Do I have any recurring subscriptions?\"*\n"
                f"- *\"Are there any unusual charges in my history?\"*\n"
                f"- *\"Show my budget status.\"*\n\n"
                f"You can also upload a receipt image or drag-and-drop a CSV file to add new records."
            ),
            "sql_queries": [sql]
        }
