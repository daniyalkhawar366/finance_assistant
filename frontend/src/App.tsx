import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  TableProperties, 
  DollarSign, 
  UploadCloud, 
  AlertTriangle, 
  LogOut, 
  User as UserIcon, 
  Send, 
  Paperclip, 
  Plus, 
  Trash2, 
  Terminal, 
  Search, 
  Filter, 
  TrendingDown,
  X,
  RefreshCw,
  Info
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  status: string;
  receipt_image: string | null;
}

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  period: string;
  spent?: number;
  percentage?: number;
  is_exceeded?: boolean;
  is_warning?: boolean;
}

interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: string;
  last_charged_date: string;
}

interface Anomaly {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  reason: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  sql_queries?: string[];
  isLoading?: boolean;
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('finance_token'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('finance_email'));
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // App navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'transactions' | 'budgets'>('dashboard');

  // Core data states
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  
  // Modals and form states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  
  // Add Transaction Form
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Groceries');
  const [txStatus, setTxStatus] = useState('posted');
  const [txError, setTxError] = useState('');

  // Add Budget Form
  const [budgetCat, setBudgetCat] = useState('Groceries');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetError, setBudgetError] = useState('');

  // File Upload States
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat States
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Personal Finance AI assistant.\n\nI can analyze your spending, identify subscriptions, track budgets, and help you cut back. How can I assist you with your money today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Receipt upload in chat state
  const [attachedReceipt, setAttachedReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Filters for transactions table
  const [txSearch, setTxSearch] = useState('');
  const [txCatFilter, setTxCatFilter] = useState('all');

  // Load dashboard data
  const loadData = async () => {
    if (!token) return;
    try {
      // 1. Dashboard stats
      const statsRes = await fetch(`${API_BASE}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.status === 401) return handleSignOut();
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Transactions
      const txRes = await fetch(`${API_BASE}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const txData = await txRes.json();
      setTransactions(txData);

      // 3. Budgets
      const bRes = await fetch(`${API_BASE}/api/budgets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bData = await bRes.json();
      setBudgets(bData);

      // 4. Subscriptions
      const subRes = await fetch(`${API_BASE}/api/dashboard/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const subData = await subRes.json();
      setSubscriptions(subData);

      // 5. Anomalies
      const anomRes = await fetch(`${API_BASE}/api/dashboard/anomalies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const anomData = await anomRes.json();
      setAnomalies(anomData);

    } catch (e) {
      console.error("Error fetching financial data:", e);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }
      
      if (isLoginView) {
        localStorage.setItem('finance_token', data.access_token);
        localStorage.setItem('finance_email', email);
        setToken(data.access_token);
        setUserEmail(email);
      } else {
        // Automatically switch to login on successful signup
        setIsLoginView(true);
        setEmail('');
        setPassword('');
        alert('Account created! Please log in.');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_email');
    setToken(null);
    setUserEmail(null);
    setActiveTab('dashboard');
    setChatMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I am your Personal Finance AI assistant.\n\nI can analyze your spending, identify subscriptions, track budgets, and help you cut back. How can I assist you with your money today?",
        timestamp: new Date()
      }
    ]);
  };

  // Add transaction
  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');
    if (!txDesc || !txAmount) {
      setTxError('Please enter a description and amount.');
      return;
    }
    
    // Expenses are negative in this model
    let amt = parseFloat(txAmount);
    if (amt > 0 && txCategory !== 'Income') {
      amt = -amt;
    }

    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: txDate,
          description: txDesc,
          amount: amt,
          category: txCategory,
          status: txStatus
        })
      });
      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(responseData?.detail || 'Failed to add transaction.');
      }

      setIsTxModalOpen(false);
      setTxDesc('');
      setTxAmount('');
      loadData();
    } catch (err: any) {
      setTxError(err.message);
    }
  };

  // Add/Set Budget
  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError('');
    if (!budgetLimit) {
      setBudgetError('Please enter a limit.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: budgetCat,
          limit_amount: parseFloat(budgetLimit),
          period: 'monthly'
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to set budget.' }));
        throw new Error(errorData.detail || 'Failed to set budget.');
      }

      setIsBudgetModalOpen(false);
      setBudgetLimit('');
      loadData();
    } catch (err: any) {
      setBudgetError(err.message);
    }
  };

  // Delete budget
  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await fetch(`${API_BASE}/api/budgets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Drag and drop / file selector
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingCSV(true);
    setCsvUploadResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/api/transactions/upload-csv`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setCsvUploadResult(`Successfully imported ${data.imported} transactions.`);
        loadData();
      } else {
        setCsvUploadResult(`Failed to import: ${data.detail}`);
      }
    } catch (err) {
      setCsvUploadResult('Server error during CSV import.');
    } finally {
      setUploadingCSV(false);
      setTimeout(() => setCsvUploadResult(null), 5000);
    }
  };

  // Chat message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !attachedReceipt) return;

    const userText = inputMessage;
    const userMsgId = String(Date.now());
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: userText || "Uploaded receipt photo",
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newUserMsg]);
    setInputMessage('');
    setChatLoading(true);
    
    // Insert temporary loading bubble for assistant
    const assistantLoadingId = 'loading-' + Date.now();
    setChatMessages(prev => [...prev, {
      id: assistantLoadingId,
      sender: 'assistant',
      text: '',
      timestamp: new Date(),
      isLoading: true
    }]);

    try {
      let res: Response;
      let data: any;
      
      if (attachedReceipt) {
        // OCR Receipt Endpoint
        const formData = new FormData();
        formData.append('file', attachedReceipt);
        
        res = await fetch(`${API_BASE}/api/receipt/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        data = await res.json();
        
        if (res.ok) {
          const itemsStr = data.extracted.items.map((i: string) => `  - ${i}`).join('\n');
          const successMsg = `### Receipt Recorded Successfully! 🧾\n\nI have parsed the receipt image and entered a new transaction for you:\n- **Merchant:** ${data.extracted.merchant}\n- **Amount:** $${Math.abs(data.extracted.amount).toFixed(2)}\n- **Category:** ${data.extracted.category}\n- **Date:** ${data.extracted.date}\n\n**Extracted Items:**\n${itemsStr}`;
          
          setChatMessages(prev => prev.map(m => m.id === assistantLoadingId ? {
            id: String(Date.now()),
            sender: 'assistant',
            text: successMsg,
            timestamp: new Date()
          } : m));
          
          setAttachedReceipt(null);
          setReceiptPreview(null);
          loadData();
        } else {
          throw new Error(data.detail || 'Could not parse receipt');
        }
      } else {
        // Text chat endpoint
        res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: userText })
        });
        data = await res.json();
        
        if (res.ok) {
          setChatMessages(prev => prev.map(m => m.id === assistantLoadingId ? {
            id: String(Date.now()),
            sender: 'assistant',
            text: data.response,
            timestamp: new Date(),
            sql_queries: data.sql_queries
          } : m));
        } else {
          throw new Error(data.detail || 'Assistant error');
        }
      }
    } catch (err: any) {
      setChatMessages(prev => prev.map(m => m.id === assistantLoadingId ? {
        id: String(Date.now()),
        sender: 'assistant',
        text: `Error: ${err.message || 'I encountered an issue communicating with the backend server. Please verify the backend is running.'}`,
        timestamp: new Date()
      } : m));
    } finally {
      setChatLoading(false);
    }
  };

  const handleReceiptAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAttachedReceipt(file);
    
    // Create image preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(txSearch.toLowerCase());
    const matchesCat = txCatFilter === 'all' || t.category === txCatFilter;
    return matchesSearch && matchesCat;
  });

  // Unique categories list for filters
  const categoriesList = Array.from(new Set(transactions.map(t => t.category)));

  // Fast pre-packaged chat prompts
  const runQuickPrompt = (promptText: string) => {
    setInputMessage(promptText);
    setTimeout(() => {
      // Simulate submission
      const btn = document.getElementById('chat-submit-btn');
      btn?.click();
    }, 100);
  };

  // If not logged in, show Auth splash
  if (!token) {
    return (
      <div className="auth-splash">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <h2 className="headline-lg" style={{ color: 'var(--color-primary-indigo)' }}>Editorial Utility</h2>
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '0.25rem' }}>Personal Finance Assistant</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>

            {authError && (
              <div style={{ color: 'var(--color-error)', fontSize: '12px', backgroundColor: 'var(--color-error-bg)', padding: '0.5rem', borderRadius: '4px', border: '0.5px solid rgba(255, 180, 171, 0.2)' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {isLoginView ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: '12px' }}>
            <span className="text-muted">
              {isLoginView ? "Don't have an account? " : 'Already registered? '}
            </span>
            <span 
              style={{ color: 'var(--color-primary-indigo)', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                setIsLoginView(!isLoginView);
                setAuthError('');
              }}
            >
              {isLoginView ? 'Sign up' : 'Log in'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <DollarSign size={18} style={{ color: 'var(--color-primary-indigo)' }} />
              <span>EDITORIAL UTILITY</span>
            </div>
          </div>

          <nav className="sidebar-menu">
            <div 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </div>
            
            <div 
              className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>AI Assistant</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <TableProperties size={16} />
              <span>Transactions</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <DollarSign size={16} />
              <span>Budgets</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          {/* CSV File Upload quick link */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleCSVUpload}
            />
            <button 
              className="btn" 
              style={{ width: '100%', fontSize: '11px', padding: '0.35rem' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCSV}
            >
              <UploadCloud size={12} />
              {uploadingCSV ? 'Importing...' : 'IMPORT TRANSACTION CSV'}
            </button>
            {csvUploadResult && (
              <p style={{ fontSize: '10px', textAlign: 'center', marginTop: '0.5rem', color: 'var(--color-success)' }}>
                {csvUploadResult}
              </p>
            )}
          </div>

          <div className="user-badge">
            <UserIcon size={14} className="text-muted" />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span className="user-email">{userEmail}</span>
              <span 
                onClick={handleSignOut} 
                style={{ color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}
              >
                <LogOut size={10} /> Logout
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <main className="main-content">
        
        {/* TABS VIEWPORT */}
        
        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="headline-xl">Overview</h1>
                <p className="text-muted" style={{ fontSize: '13px' }}>Aggregated cash balances, subscriptions, and budget overheads.</p>
              </div>
              <button className="btn" onClick={loadData}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Bento Grid */}
            <div className="bento-grid">
              
              {/* Card 1: Balance */}
              <div className="bento-card col-4">
                <div className="bento-card-header">
                  <span className="bento-card-title">Net Balance</span>
                  <DollarSign size={14} className="text-muted" />
                </div>
                <div className="kpi-value">
                  ${stats ? stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <div className="kpi-subtext">
                  <span>Current database total net cash flow</span>
                </div>
              </div>

              {/* Card 2: Monthly Spend */}
              <div className="bento-card col-4">
                <div className="bento-card-header">
                  <span className="bento-card-title">Outgoings (This Month)</span>
                  <TrendingDown size={14} className="trend-down" />
                </div>
                <div className="kpi-value trend-down">
                  -${stats ? stats.month_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <div className="kpi-subtext">
                  <span>Monthly total expenses</span>
                </div>
              </div>

              {/* Card 3: Subscriptions */}
              <div className="bento-card col-4">
                <div className="bento-card-header">
                  <span className="bento-card-title">Subscriptions</span>
                  <AlertTriangle size={14} className="text-muted" />
                </div>
                <div className="kpi-value">
                  ${stats ? stats.subscription_monthly_cost.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <div className="kpi-subtext">
                  <span>{stats ? stats.subscription_count : 0} recurring accounts active</span>
                </div>
                {subscriptions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {subscriptions.slice(0, 2).map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{s.merchant}</span>
                        <span className="numeric-data">${s.amount.toFixed(2)}/mo</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 4: Category Breakout (Bigger, col-8) */}
              <div className="bento-card col-8">
                <div className="bento-card-header">
                  <span className="bento-card-title">Spending Categories (This Month)</span>
                </div>
                
                {stats && stats.category_breakout && stats.category_breakout.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, justifyContent: 'center' }}>
                    {stats.category_breakout.slice(0, 5).map((c: any) => {
                      // Calculate percentage compared to total monthly expenses
                      const pct = stats.month_expenses > 0 ? (c.value / stats.month_expenses) * 100 : 0;
                      return (
                        <div key={c.category} className="progress-container">
                          <div className="progress-labels">
                            <span style={{ fontWeight: 500 }}>{c.category}</span>
                            <span className="numeric-data">${c.value.toFixed(2)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--color-outline)' }}>
                    <Info size={24} style={{ marginBottom: '0.5rem' }} />
                    <p>No transaction history for category analysis.</p>
                    <p style={{ fontSize: '11px', marginTop: '0.25rem' }}>Upload a transaction CSV to see breakdown.</p>
                  </div>
                )}
              </div>

              {/* Card 5: Budgets Snapshot (col-4) */}
              <div className="bento-card col-4">
                <div className="bento-card-header">
                  <span className="bento-card-title">Budgets Status</span>
                </div>
                
                {stats && stats.budgets && stats.budgets.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.budgets.slice(0, 4).map((b: any) => {
                      const fillClass = b.is_exceeded ? 'exceeded' : (b.is_warning ? 'warning' : '');
                      return (
                        <div key={b.category} className="progress-container">
                          <div className="progress-labels">
                            <span style={{ fontSize: '12px' }}>{b.category}</span>
                            <span className="numeric-data" style={{ fontSize: '12px' }}>
                              ${b.spent.toFixed(0)} / ${b.limit_amount.toFixed(0)}
                            </span>
                          </div>
                          <div className="progress-track" style={{ height: '3px' }}>
                            <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.min(b.percentage, 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--color-outline)', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px' }}>No active budgets set.</p>
                    <button className="btn" style={{ marginTop: '1rem', fontSize: '11px' }} onClick={() => setActiveTab('budgets')}>
                      Set Budget Limits
                    </button>
                  </div>
                )}
              </div>

              {/* Card 6: Anomalies Alerts (col-12) */}
              <div className="bento-card col-12">
                <div className="bento-card-header">
                  <span className="bento-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={12} style={{ color: 'var(--color-error)' }} />
                    Anomalous Activity Logs
                  </span>
                  {anomalies.length > 0 && (
                    <span className="pill pill-error">{anomalies.length} Flagged Alerts</span>
                  )}
                </div>
                
                {anomalies.length > 0 ? (
                  <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Merchant</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Anomaly Flag Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.slice(0, 5).map((a, idx) => (
                          <tr key={idx}>
                            <td className="numeric-data">{a.date}</td>
                            <td style={{ fontWeight: 500 }}>{a.description}</td>
                            <td><span className="pill">{a.category}</span></td>
                            <td className="numeric-data" style={{ color: 'var(--color-error)', fontWeight: 600 }}>
                              -${Math.abs(a.amount).toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>
                              {a.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: 'rgba(74, 222, 128, 0.02)', border: '1px solid rgba(74, 222, 128, 0.1)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-success)', fontSize: '18px' }}>✓</span>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600 }}>All Clear</h4>
                      <p className="text-muted" style={{ fontSize: '12px' }}>No statistically anomalous expenses or outlier transactions detected in your profile.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}

        {/* 2. CHAT ASSISTANT TAB */}
        {activeTab === 'chat' && (
          <>
            <div>
              <h1 className="headline-xl">Technical Cockpit</h1>
              <p className="text-muted" style={{ fontSize: '13px' }}>AI-agent session with real-time SQL execution logs.</p>
            </div>

            <div className="chat-container">
              <div className="chat-header">
                <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={14} style={{ color: 'var(--color-primary-indigo)' }} />
                  ACTIVE SESSION: LOCAL_FINANCE_AGENT
                </span>
                
                {/* Mode Indicator */}
                <span className="pill pill-success" style={{ fontSize: '10px' }}>
                  Live Importer Mode
                </span>
              </div>

              {/* Chat Message Logs */}
              <div className="chat-messages">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                    <span className="message-meta">
                      {msg.sender === 'user' ? 'USER_PROMPT' : 'AGENT_RESULT'}
                    </span>
                    
                    {msg.isLoading ? (
                      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem 0' }}>
                        <span className="refresh-spinner" style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⚙</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>Formulating execution path...</span>
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
                        {msg.text}
                      </div>
                    )}

                    {/* SQL Logs dropdown for assistant messages */}
                    {msg.sql_queries && msg.sql_queries.length > 0 && (
                      <details className="sql-log-section">
                        <summary className="sql-log-header" style={{ cursor: 'pointer', outline: 'none' }}>
                          <Terminal size={10} /> View system execution logs ({msg.sql_queries.length} queries)
                        </summary>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {msg.sql_queries.map((q, idx) => (
                            <pre key={idx} className="sql-query-text">{q}</pre>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.5rem', backgroundColor: 'var(--color-surface-container-low)', overflowX: 'auto', borderTop: '1px solid var(--color-border)' }}>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("How much did I spend on groceries last month?")}>
                  Groceries Last Month
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("What was my biggest purchase?")}>
                  Biggest Purchase
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("Show my recurring subscriptions.")}>
                  Active Subscriptions
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("Flag unusual transactions.")}>
                  Flag Anomalies
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("Summarize my finances in plain English.")}>
                  Full Summary
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("Where can I cut back?")}>
                  Cut Back Suggestions
                </button>
                <button className="btn" style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }} onClick={() => runQuickPrompt("What do you remember about me?")}>
                  My Context Memory
                </button>
              </div>

              {/* Receipt attached bar preview */}
              {attachedReceipt && (
                <div className="receipt-preview-bar">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt preview" style={{ height: '20px', width: '20px', borderRadius: '2px', objectFit: 'cover' }} />
                    ) : (
                      <Paperclip size={12} />
                    )}
                    Attached: <strong>{attachedReceipt.name}</strong> (Ready to Upload & Scan)
                  </span>
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => {
                    setAttachedReceipt(null);
                    setReceiptPreview(null);
                  }} />
                </div>
              )}

              {/* Chat Form */}
              <form onSubmit={handleSendMessage} className="chat-input-area">
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  ref={receiptInputRef}
                  onChange={handleReceiptAttachment}
                />
                
                <button 
                  type="button" 
                  className="btn" 
                  style={{ padding: '0.625rem' }}
                  onClick={() => receiptInputRef.current?.click()}
                  title="Upload receipt image for OCR scan"
                >
                  <Paperclip size={16} className="text-muted" />
                </button>

                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={attachedReceipt ? "Press Enter to upload and extract receipt data..." : "Ask a question about your spending, budgets, context..."}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={chatLoading}
                />

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  id="chat-submit-btn"
                  style={{ padding: '0.625rem' }}
                  disabled={chatLoading || (!inputMessage.trim() && !attachedReceipt)}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}

        {/* 3. TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="headline-xl">Transactions Ledger</h1>
                <p className="text-muted" style={{ fontSize: '13px' }}>Audit log of all registered posted and pending items.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn" onClick={() => setIsTxModalOpen(true)}>
                  <Plus size={14} /> Add Transaction
                </button>
              </div>
            </div>

            {/* Filters Dashboard */}
            <div style={{ display: 'flex', gap: '1rem', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
                <Search size={14} className="text-muted" />
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ border: 'none', background: 'transparent', padding: '0.25rem' }}
                  placeholder="Filter description or category..." 
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                />
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={14} className="text-muted" />
                <select 
                  className="input-field" 
                  style={{ border: 'none', background: 'transparent', width: '140px', padding: '0.25rem', cursor: 'pointer' }}
                  value={txCatFilter}
                  onChange={e => setTxCatFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="table-container">
              {filteredTxs.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map(t => {
                      const isExpense = t.amount < 0;
                      return (
                        <tr key={t.id}>
                          <td className="numeric-data">{t.date}</td>
                          <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {t.description}
                            {t.receipt_image && (
                              <span style={{ fontSize: '10px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary-indigo)', padding: '0.15rem 0.35rem', borderRadius: '2px', fontWeight: 600 }}>
                                RECEIPT OCR
                              </span>
                            )}
                          </td>
                          <td><span className="pill">{t.category}</span></td>
                          <td>
                            <span style={{ fontSize: '11px', color: t.status === 'posted' ? 'var(--color-outline)' : 'var(--color-warning)' }}>
                              • {t.status}
                            </span>
                          </td>
                          <td className={`numeric-data ${isExpense ? 'trend-down' : 'trend-up'}`} style={{ textAlign: 'right', fontWeight: 600 }}>
                            {isExpense ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <p>No transactions found matching the filter constraints.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 4. BUDGETS TAB */}
        {activeTab === 'budgets' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="headline-xl">Category Limits</h1>
                <p className="text-muted" style={{ fontSize: '13px' }}>Define monthly constraints on categories to track expenses.</p>
              </div>

              <button className="btn" onClick={() => setIsBudgetModalOpen(true)}>
                <Plus size={14} /> Set Budget
              </button>
            </div>

            {/* Budgets Grid */}
            <div className="bento-grid">
              {budgets.length > 0 ? (
                budgets.map(b => {
                  const spent = b.spent || 0;
                  const pct = b.percentage || 0;
                  const isExceeded = b.is_exceeded;
                  const isWarning = b.is_warning;
                  const fillClass = isExceeded ? 'exceeded' : (isWarning ? 'warning' : '');
                  
                  return (
                    <div key={b.id} className="bento-card col-4" style={{ minHeight: '160px', justifyContent: 'space-between' }}>
                      <div className="bento-card-header">
                        <div>
                          <span className="bento-card-title">{b.category}</span>
                          <h3 className="headline-md" style={{ marginTop: '0.25rem' }}>
                            ${spent.toLocaleString('en-US', { maximumFractionDigits: 0 })} / ${b.limit_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </h3>
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteBudget(b.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-outline)' }}
                          title="Remove budget constraint"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="progress-container">
                        <div className="progress-track" style={{ height: '5px' }}>
                          <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                        <div className="progress-labels">
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {pct.toFixed(0)}% exhausted
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            color: isExceeded ? 'var(--color-error)' : (isWarning ? 'var(--color-warning)' : 'var(--color-success)'),
                            fontWeight: 600
                          }}>
                            {isExceeded ? 'EXCEEDED' : (isWarning ? 'WARNING' : 'ON TRACK')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bento-card col-12" style={{ padding: '4rem', alignItems: 'center', justifyContent: 'center' }}>
                  <p className="text-muted">No budget limits defined. Click "Set Budget" to declare monthly spending bounds.</p>
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* MODALS */}
      
      {/* A. Transaction Modal */}
      {isTxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="headline-md">Add Transaction</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setIsTxModalOpen(false)} />
            </div>

            <form onSubmit={handleAddTx} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  required 
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Merchant</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  placeholder="e.g. Walmart"
                  value={txDesc}
                  onChange={e => setTxDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-field" 
                  required 
                  placeholder="e.g. 45.50"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="input-field" 
                  value={txCategory}
                  onChange={e => setTxCategory(e.target.value)}
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Coffee & Dining">Coffee & Dining</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Software">Software</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Income">Income / Deposit</option>
                  <option value="Uncategorized">Uncategorized</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="input-field" 
                  value={txStatus}
                  onChange={e => setTxStatus(e.target.value)}
                >
                  <option value="posted">Posted</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {txError && (
                <div style={{ color: 'var(--color-error)', fontSize: '12px' }}>{txError}</div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Record Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* B. Budget Modal */}
      {isBudgetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="headline-md">Set Budget Limit</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setIsBudgetModalOpen(false)} />
            </div>

            <form onSubmit={handleSetBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="input-field" 
                  value={budgetCat}
                  onChange={e => setBudgetCat(e.target.value)}
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Coffee & Dining">Coffee & Dining</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Software">Software</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Uncategorized">Uncategorized</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Limit (USD)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  required 
                  placeholder="e.g. 500"
                  value={budgetLimit}
                  onChange={e => setBudgetLimit(e.target.value)}
                />
              </div>

              {budgetError && (
                <div style={{ color: 'var(--color-error)', fontSize: '12px' }}>{budgetError}</div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Define Budget Bound
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
