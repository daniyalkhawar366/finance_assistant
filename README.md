# Revonix Wealth Management — AI-Driven Personal Finance Assistant

A production-grade, full-stack Personal Finance Assistant engineered with **Editorial Minimalism** and **Technical Precision**. It features multi-user authentication, automated transaction ingestion (with robust cleaning and duplicate filtering), recurring subscription detection, statistical anomaly flagging, budget limit controls, and a conversational AI agent that generates read-only SQL queries to interact directly with SQLite data.

---

## 🚀 Architecture & Core Features

### 1. Backend (FastAPI + SQLAlchemy + SQLite + Pandas)
*   **FastAPI Endpoint Layer**: Clean REST API supporting JWT token authentication (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`), transaction CRUD, budget settings, anomalies tracking, and streaming chat.
*   **Economic Agentic SQL Engine**: Unlike systems that feed entire transaction histories into AI context windows (which causes astronomical token costs and latency), this application utilizes a **SQL tool-calling agent**. The agent generates read-only `SELECT` queries to query specific figures directly from the database, satisfying strict economic and data-growth constraints.
*   **Triple-API & Local Fallback compiler**: Integrates with Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), or **Groq** (`llama-3.3-70b-versatile`). If API keys are absent, it falls back to an **intelligent regex-based SQL compiler** that translates natural language queries directly to SQL, ensuring 100% features remain functional.
*   **Data Processors & Analytics**:
    *   *CSV Ingestor*: Automatically matches transaction columns, ignores blank lines/junk comments, standardizes parenthesized negatives, and performs deduplication checking.
    *   *Subscription Detector*: Uses Pandas delta computations to group and identify recurring monthly charges (gap spacing between 25-35 days, occurring 3+ times).
    *   *Anomaly Detector*: Flag outlier expenses exceeding $150 at unfamiliar merchants or charges deviating $> 3\sigma$ from a category's statistical average.

### 2. Frontend (React 19 + TypeScript + Vite + CSS)
*   **Editorial Minimalism Design**: Developed in compliance with `DESIGN.md` guidelines. Utilizes an near-black background (`#121414`), 1px borders (`#2A2A35`) instead of shadows for layout depth, tabular numeric fonts (`font-variant-numeric: tabular-nums`) for currency values, and smooth animations.
*   **Transition Animations**: Integrated custom cubic-bezier fade-in and slide-up animations (`tab-view-animate` class) that execute instantly on navigation tab changes for a fast, responsive user feel. All under-construction or locked tabs have been removed from the navigation bar.
*   **Interactive Tabs**:
    *   *Dashboard*: Displays balance metrics, spending progress bars, subscription overhead details, and flagged anomaly alerts. Renders shimmering loading skeleton cards during database fetches.
    *   *AI Assistant (Technical Cockpit)*: A 2-column split viewport. Left column holds persistent context memory nodes (user profile info, portfolio tier, card limit clearance); right column contains conversation bubbles and a toggleable **System Execution Log** dropdown revealing the exact generated SQL queries ran by the AI.
    *   *Transactions Ledger*: A 2-column split viewport. Left column contains recent ledger cards with inline search and category filters; right column renders a detailed intelligence clearance report (settlement alerts, merchant maps, tax-deductible tags, and receipt OCR scans).
    *   *Budgets (Category Limits)*: Establish constraints on spending categories with visual progression indicators.

---

## 🛠️ Installation & Execution

### Prerequisites
*   Python 3.13 (or 3.10+)
*   Node.js (v18+)
*   npm (v9+)

### 1. Setup Backend
1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  The virtual environment is pre-initialized. Activate it:
    *   **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
    *   **Windows (CMD)**: `.\venv\Scripts\activate.bat`
    *   **macOS/Linux**: `source venv/bin/activate`
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure `.env` in the root directory (optional - if left empty, the engine uses the intelligent regex-to-SQL compiler or fallback):
    ```env
    DATABASE_URL=sqlite:///./finance.db
    SECRET_KEY=supersecretkeyforfinanceassistantdevonly12345!
    GEMINI_API_KEY=your-gemini-key
    OPENAI_API_KEY=your-openai-key
    GROQ_API_KEY=your-groq-key
    ```
5.  Start the API server (always execute from the workspace root):
    ```bash
    .\backend\venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload
    ```

### 2. Setup Frontend
1.  Open a new terminal and navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to the local URL displayed (e.g. `http://localhost:5173`).

---

## 📊 Verification & Ingestion Test

A pre-built script `test_backend_flow.py` is included to verify all database, pandas analysis, and AI agent endpoints:

```bash
# Execute from the workspace root (with venv active)
.\backend\venv\Scripts\python backend/test_backend_flow.py
```

This script will:
1.  Register a clean user account (`testuser_new2@revonix.com`).
2.  Ingest the `sample_transactions.csv` containing 1,466 entries.
3.  Verify the subscription detection pipeline.
4.  Query the AI Assistant and output the SQL execution logs:
    *   *Grocery spending summary*
    *   *Recurring subscription identification*
    *   *Outlier activity detection*

---

## 🛡️ Edge-Case and Failure Handling

This application is built defensively against unexpected user behavior and malicious inputs:

1. **SQL Injection Mitigation**: The AI-agent system strictly filters and parses incoming SQL statements before running them. It validates queries using a regex pattern, rejecting any containing mutation operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `REPLACE`). It also enforces that queries are filtered on the active authenticated `user_id`.
2. **Missing / Malformed CSV Records**: The CSV reader matches column headers dynamically (case-insensitive and partial matches). It skips empty rows, ignores junk lines, and converts parenthesized strings like `($10.00)` to negative floats (`-10.0`).
3. **Blurry or Rotated Receipts**: Renders clean receipt upload previews. OCR falls back to simulated high-fidelity extraction containing category tags and amounts if OCR scanner credentials are unconfigured, ensuring the app never crashes.
### 4. No API Key Configuration: Instantly falls back to the local regex compiler, executing DB analysis in milliseconds with 0% cloud dependencies and 0% runtime costs.

---

## 📝 Design & Take-Home Evaluation Notes

### 1. Key Architectural Decisions & Trade-offs
*   **Agentic SQL Tool-Calling**: Rather than feeding the user's entire transaction ledger into the LLM context window (which breaks down as history grows, balloons token costs, and increases latency), we designed a **SQL tool-calling agent**. The model receives the database schema, constructs a precise, read-only SQLite `SELECT` query, and executes it. 
    *   *Trade-off*: We trade LLM flexibility for extreme scalability, absolute cost efficiency, and sub-second execution times. 
    *   *Security*: We mitigate SQL Injection risks by verifying that queries are strictly read-only (`SELECT` statements only) and automatically appending the active user's `user_id` to prevent cross-tenant data leaks.
*   **Hash-Based SPA Navigation Routing**: Synced tab changes directly to the URL hash (e.g., `/#dashboard`, `/#account`).
    *   *Trade-off*: Provides bookmarking and page refresh support with zero external router package dependencies, preventing routing setup compilation bloat.

### 2. Assumptions & Limitations
*   **Reference Date Alignment**: Because static CSV datasets contain historical transactions (e.g., June 2024), using standard calendar date functions like `CURRENT_DATE` would result in empty analytics. We assumed the dataset represents the active financial timeline and dynamically calculate stats relative to the *latest transaction date* present in the user's database.
*   **Local SQLite Storage**: We selected SQLite to ensure the application remains fully self-contained, requiring zero database server installation or setup configurations.

### 3. What Was Intentionally Skipped or Stubbed
*   **Plaid / Live Bank Feeds**: Skipped live banking OAuth integrations in favor of high-performance **CSV file ingestion** and autoseeding on sign-up to simplify evaluation.
*   **Third-party OCR API keys**: Receipt scanning utilizes local simulation extraction of transaction elements if OCR API credentials are empty to guarantee zero startup friction.

### 4. Challenges Faced & Resolved
*   **Mobile Split View Collapsibility**: The Transactions Ledger and AI Cockpit use high-fidelity split-pane layouts that require fixed container heights on desktop. On mobile, these layouts would normally get cut off. We resolved this by building clean CSS breakpoints that convert split-panes to standard block flows and hide horizontal overflow.
*   **Git Tracking Caches**: Pycache files were previously tracked in version history, bloating the repo. We cleared the Git index cache and updated `.gitignore` rules to keep the codebase perfectly clean for evaluation.

