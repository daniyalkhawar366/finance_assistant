# Editorial Utility — AI-Driven Personal Finance Assistant

A production-ready, full-stack Personal Finance Assistant engineered with **Editorial Minimalism** and **Technical Precision**. It features multi-user authentication, automated transaction ingestion (with robust cleaning and duplicate filtering), recurring subscription detection, statistical anomaly flagging, budget limit controls, and a conversational AI agent that generates read-only SQL queries to interact directly with SQLite data.

## 🚀 Architecture & Core Features

### 1. Backend (FastAPI + SQLAlchemy + SQLite + Pandas)
*   **FastAPI Endpoint Layer**: Clean REST API supporting JWT token authentication (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`), transaction CRUD, budget settings, anomalies tracking, and streaming chat.
*   **Economic Agentic SQL Engine**: Unlike systems that feed entire transaction histories into AI context windows (which causes astronomical token costs and latency), this application utilizes a **SQL tool-calling agent**. The agent generates read-only `SELECT` queries to query specific figures directly from the database, satisfying strict economic and data-growth constraints.
*   **Dual-API & Local Fallback compiler**: Integrates with Gemini (`gemini-1.5-flash`) or OpenAI (`gpt-4o-mini`). If API keys are absent, it falls back to an **intelligent regex-based SQL compiler** that translates natural language queries directly to SQL, ensuring 100% features remain functional.
*   **Data Processors & Analytics**:
    *   *CSV Ingestor*: Automatically matches transaction columns, ignores blank lines/junk comments, standardizes parenthesized negatives, and performs deduplication checking.
    *   *Subscription Detector*: Uses Pandas delta computations to group and identify recurring monthly charges (gap spacing between 25-35 days, occurring 3+ times).
    *   *Anomaly Detector*: Flag outlier expenses exceeding $150 at unfamiliar merchants or charges deviating $> 3\sigma$ from a category's statistical average.

### 2. Frontend (React 19 + TypeScript + Vite + CSS)
*   **Editorial Minimalism Design**: Developed in compliance with `DESIGN.md` guidelines. Utilizes an near-black background (`#121414`), 1px borders (`#2A2A35`) instead of shadows for layout depth, tabular numeric fonts (`font-variant-numeric: tabular-nums`) for currency values, and smooth animations.
*   **Interactive Tabs**:
    *   *Dashboard*: Displays balance metrics, spending progress bars, subscription overhead details, and flagged anomaly alerts.
    *   *AI Assistant (Technical Cockpit)*: A conversational terminal showing chat bubbles, receipt attachment uploads, and a toggleable **System Execution Log** dropdown revealing the exact generated SQL queries ran by the AI.
    *   *Transactions Ledger*: Clean grid with search, category filtering, manual transaction addition, and CSV import drag-and-drop.
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
4.  Configure `.env` in the root directory (optional - if left empty, the engine uses the intelligent regex-to-SQL compiler):
    ```env
    DATABASE_URL=sqlite:///./finance.db
    SECRET_KEY=supersecretkeyforfinanceassistantdevonly12345!
    GEMINI_API_KEY=your-gemini-key
    OPENAI_API_KEY=your-openai-key
    ```
5.  Start the API server:
    ```bash
    python -m uvicorn backend.main:app --port 8000 --reload
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
4.  Open your browser and navigate to: `http://localhost:5173`

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
