import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  TableProperties, 
  DollarSign, 
  UploadCloud, 
  AlertTriangle, 
  LogOut, 
  Send, 
  Paperclip, 
  Plus, 
  Trash2, 
  Terminal, 
  Search, 
  Filter, 
  X,
  Menu,
  Bell,
  Settings,
  Cloud,
  Plane,
  ChevronRight
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
  const [userFullName, setUserFullName] = useState<string | null>(localStorage.getItem('finance_fullname'));
  const [userPortfolioTier, setUserPortfolioTier] = useState<string | null>(localStorage.getItem('finance_portfolio_tier'));
  
  // Auth Form Fields
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [portfolioTier] = useState('Private Client');
  const [authError, setAuthError] = useState('');
  const [isAuthSuccessTransition, setIsAuthSuccessTransition] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');
  const [passwordWarning, setPasswordWarning] = useState('');
  const [fullNameWarning, setFullNameWarning] = useState('');

  // Account Form Fields
  const [profileName, setProfileName] = useState(localStorage.getItem('finance_fullname') || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileNameWarning, setProfileNameWarning] = useState('');
  const [profilePasswordWarning, setProfilePasswordWarning] = useState('');

  // App navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'transactions' | 'budgets' | 'account'>(() => {
    const path = window.location.pathname.replace('/', '');
    const validTabs = ['dashboard', 'chat', 'transactions', 'budgets', 'account'];
    return validTabs.includes(path) ? (path as any) : 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeTab) {
      const currentPath = window.location.pathname.replace('/', '');
      if (currentPath !== activeTab) {
        window.history.pushState(null, '', `/${activeTab}`);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      const validTabs = ['dashboard', 'chat', 'transactions', 'budgets', 'account'];
      if (validTabs.includes(path)) {
        setActiveTab(path as any);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Core data states
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{name: string, value: number, x: number, y: number} | null>(null);
  
  // Modals and form states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
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

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };



  // Load user details
  const loadUserDetails = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const u = await res.json();
        setUserFullName(u.full_name);
        setUserPortfolioTier(u.portfolio_tier);
        localStorage.setItem('finance_fullname', u.full_name || '');
        localStorage.setItem('finance_portfolio_tier', u.portfolio_tier || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load dashboard data
  const loadData = async () => {
    if (!token) return;
    setIsLoadingData(true);
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
      
      // Select first transaction by default if none selected
      if (txData && txData.length > 0) {
        setSelectedTx(txData[0]);
      }

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
    } finally {
      setTimeout(() => {
        setIsLoadingData(false);
      }, 700);
    }
  };

  useEffect(() => {
    if (token) {
      loadUserDetails();
      loadData();
    }
  }, [token]);

  useEffect(() => {
    if (userFullName) {
      setProfileName(userFullName);
    }
  }, [userFullName]);

  const handleProfileNameChange = (val: string) => {
    setProfileName(val);
    if (!val) {
      setProfileNameWarning('Name is required.');
    } else if (/\d/.test(val)) {
      setProfileNameWarning('Numbers are excluded in names.');
    } else {
      setProfileNameWarning('');
    }
  };

  const handleProfilePasswordChange = (val: string) => {
    setProfilePassword(val);
    if (val && val.length < 6) {
      setProfilePasswordWarning('Password must be at least 6 characters.');
    } else {
      setProfilePasswordWarning('');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    if (profileNameWarning || profilePasswordWarning) {
      setProfileError('Please resolve all validation errors before proceeding.');
      return;
    }
    try {
      const payload: any = { full_name: profileName };
      if (profilePassword.trim()) {
        payload.password = profilePassword;
      }
      const res = await fetch(`${API_BASE}/api/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile');
      }
      setUserFullName(data.full_name);
      localStorage.setItem('finance_fullname', data.full_name || '');
      setProfileSuccess('Profile updated successfully!');
      setProfilePassword('');
      triggerToast('Profile credentials updated.', 'success');
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailWarning('');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailWarning('Invalid email format (e.g. name@company.com).');
    } else {
      setEmailWarning('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordWarning('');
    } else if (val.length < 6) {
      setPasswordWarning('Password must be at least 6 characters.');
    } else {
      setPasswordWarning('');
    }
  };

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (!val) {
      setFullNameWarning('');
    } else if (/\d/.test(val)) {
      setFullNameWarning('Numbers are excluded in names.');
    } else {
      setFullNameWarning('');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (emailWarning || passwordWarning || (!isLoginView && fullNameWarning)) {
      setAuthError('Please resolve all validation errors before proceeding.');
      return;
    }
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';
    const bodyData = isLoginView 
      ? { email, password }
      : { email, password, full_name: fullName, portfolio_tier: portfolioTier };
      
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }
      
      // Trigger authentication animation
      setIsAuthSuccessTransition(true);
      setTimeout(async () => {
        setIsAuthSuccessTransition(false);
        localStorage.setItem('finance_token', data.access_token);
        localStorage.setItem('finance_email', email);
        setToken(data.access_token);
        setUserEmail(email);
        
        // Wait briefly for state updates
        setTimeout(() => {
          loadUserDetails();
          loadData();
          triggerToast(
            isLoginView 
              ? 'Welcome back to Revonix!' 
              : 'Welcome to Revonix! Your account has been established and seeded with demo assets.', 
            'success'
          );
        }, 100);
      }, 1500);
      
    } catch (err: any) {
      setAuthError(err.message);
      triggerToast(err.message, 'error');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_email');
    localStorage.removeItem('finance_fullname');
    localStorage.removeItem('finance_portfolio_tier');
    setToken(null);
    setUserEmail(null);
    setUserFullName(null);
    setUserPortfolioTier(null);
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
    const cleanDesc = txDesc.trim();
    if (!cleanDesc || !txAmount) {
      setTxError('Please enter a description and amount.');
      return;
    }

    if (cleanDesc.length < 3) {
      setTxError('Description must be at least 3 characters long.');
      return;
    }

    if (cleanDesc.length > 80) {
      setTxError('Description must not exceed 80 characters.');
      return;
    }

    let amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      setTxError('Amount must be a valid number greater than 0.');
      return;
    }

    if (!txDate) {
      setTxError('Please select a valid transaction date.');
      return;
    }
    const selectedDate = new Date(txDate);
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
    if (selectedDate > maxFutureDate) {
      setTxError('Transaction date cannot be more than 1 year in the future.');
      return;
    }
    
    // Expenses are negative in this model
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

  // Delete budget (trigger custom modal)
  const handleDeleteBudget = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDeleteBudget = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await fetch(`${API_BASE}/api/budgets/${confirmDeleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast("Budget bound removed.", "success");
      } else {
        triggerToast("Failed to remove budget bound.", "error");
      }
      setConfirmDeleteId(null);
      loadData();
    } catch (e) {
      console.error(e);
      triggerToast("Network error trying to delete budget.", "error");
      setConfirmDeleteId(null);
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

  if (isAuthSuccessTransition) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0c0e0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        zIndex: 99999
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <svg className="spin" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animationDuration: '2s' }}>
            <path d="M32 6L54 18L32 30L10 18L32 6Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.15)"/>
            <path d="M10 18L32 30V54L10 42V18Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.08)"/>
            <path d="M32 30L54 18V42L32 54V30Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.2)"/>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <h2 className="headline-lg" style={{ letterSpacing: '0.05em', color: '#ffffff' }}>AUTHENTICATING</h2>
            <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.5rem', letterSpacing: '0.1em' }}>ESTABLISHING SECURE COCKPIT SESSION...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, show Auth splash
  if (!token) {
    return (
      <div className="auth-splash">
        {/* Left Panel */}
        <div className="auth-left-panel">
          <div className="auth-left-content">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 6L54 18L32 30L10 18L32 6Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.1)"/>
              <path d="M10 18L32 30V54L10 42V18Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.05)"/>
              <path d="M32 30L54 18V42L32 54V30Z" stroke="#5D5CFF" strokeWidth="4" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.15)"/>
              <path d="M21 24L32 30L43 24" stroke="#5D5CFF" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M32 30V42" stroke="#5D5CFF" strokeWidth="2.5" strokeLinejoin="round"/>
            </svg>
            <h1>Precision Wealth<br />Management.</h1>
            <p>Access the next generation of financial intelligence. Technical precision and editorial minimalism at your fingertips.</p>
          </div>
          <div className="auth-left-footer">
            SYSTEM_STATUS: ACTIVE &nbsp;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;&nbsp; V_4.2.0
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right-panel">
          <div className="auth-card">
            <div className="auth-title-section">
              <h2>{isLoginView ? 'Sign in to Revonix' : 'Create a Revonix Account'}</h2>
              <p>{isLoginView ? 'Enter your credentials to access your dashboard.' : 'Enter details below to establish your secure cockpit profile.'}</p>
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">Email Address</label>
                <input 
                  type="email" 
                  className="auth-input" 
                  required 
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="name@company.com"
                />
                {emailWarning && (
                  <span style={{ color: '#ffb4ab', fontSize: '11px', marginTop: '0.25rem', display: 'block' }}>{emailWarning}</span>
                )}
              </div>

              <div className="auth-input-group">
                <div className="auth-input-label-container">
                  <label className="auth-input-label">Password</label>
                </div>
                <input 
                  type="password" 
                  className="auth-input" 
                  required 
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                />
                {passwordWarning && (
                  <span style={{ color: '#ffb4ab', fontSize: '11px', marginTop: '0.25rem', display: 'block' }}>{passwordWarning}</span>
                )}
              </div>

              {!isLoginView && (
                <>
                  <div className="auth-input-group">
                    <label className="auth-input-label">Full Name</label>
                    <input 
                      type="text" 
                      className="auth-input" 
                      required 
                      value={fullName}
                      onChange={e => handleFullNameChange(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                    />
                    {fullNameWarning && (
                      <span style={{ color: '#ffb4ab', fontSize: '11px', marginTop: '0.25rem', display: 'block' }}>{fullNameWarning}</span>
                    )}
                  </div>
                </>
              )}

              {isLoginView && (
                <div className="auth-checkbox-container">
                  <input type="checkbox" id="stay-signed" className="auth-checkbox" defaultChecked />
                  <label htmlFor="stay-signed" className="auth-checkbox-label">Remember me</label>
                </div>
              )}

              {authError && (
                <div style={{ color: 'var(--color-error)', fontSize: '12px', backgroundColor: 'var(--color-error-bg)', padding: '0.65rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(255, 180, 171, 0.15)' }}>
                  {authError}
                </div>
              )}

              <button 
                type="submit" 
                className="auth-button"
                disabled={!!emailWarning || !!passwordWarning || (!isLoginView && !!fullNameWarning)}
              >
                <span>{isLoginView ? 'Sign In' : 'Create Account'}</span>
                <span>&rarr;</span>
              </button>
            </form>

            <div className="auth-footer-link-section">
              <span className="text-muted">
                {isLoginView ? "New to Revonix? " : 'Already have an account? '}
              </span>
              <span 
                className="auth-footer-link"
                onClick={() => {
                  setIsLoginView(!isLoginView);
                  setAuthError('');
                  setEmailWarning('');
                  setPasswordWarning('');
                  setFullNameWarning('');
                }}
              >
                {isLoginView ? 'Create account' : 'Sign in instead'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
            <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 6L54 18L32 30L10 18L32 6Z" stroke="#5D5CFF" strokeWidth="5" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.1)"/>
                <path d="M10 18L32 30V54L10 42V18Z" stroke="#5D5CFF" strokeWidth="5" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.05)"/>
                <path d="M32 30L54 18V42L32 54V30Z" stroke="#5D5CFF" strokeWidth="5" strokeLinejoin="round" fill="rgba(93, 92, 255, 0.15)"/>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: '1.2' }}>Revonix</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-outline)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WEALTH MANAGEMENT</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-menu" style={{ marginTop: '1.5rem' }}>
            <div 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
            >
              <Terminal size={16} />
              <span>AI Cockpit</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
            >
              <TableProperties size={16} />
              <span>Transactions</span>
            </div>

            <div 
              className={`sidebar-item ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => { setActiveTab('budgets'); setIsSidebarOpen(false); }}
            >
              <DollarSign size={16} />
              <span>Budget Bounds</span>
            </div>

          </nav>
        </div>

        <div className="sidebar-footer">

          {/* CSV File Upload quick link */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1rem' }}>
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

          <div className="user-badge" style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <span 
              onClick={() => setIsLogoutConfirmOpen(true)} 
              style={{ color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', fontWeight: 500 }}
            >
              <LogOut size={14} /> Logout
            </span>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Column Wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
        
        {/* Globally wrapped header bar */}
        <header className="top-header">
          <button 
            className="sidebar-mobile-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="search-bar-container">
            <Search size={14} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search markets, assets, or insights..." 
              className="top-search-input"
              value={txSearch}
              onChange={(e) => {
                const cleanValue = e.target.value.substring(0, 50).replace(/[^a-zA-Z0-9\s.\-_]/g, '');
                setTxSearch(cleanValue);
                if (activeTab !== 'transactions') {
                  setActiveTab('transactions');
                }
              }}
            />
          </div>
          
          <div className="top-header-right">
            <div className="icon-button" onClick={() => triggerToast("No new notifications.", "info")}>
              <Bell size={16} />
            </div>
            
            <div className="icon-button" onClick={() => setActiveTab('budgets')}>
              <Settings size={16} />
            </div>
            
            <div className="header-divider"></div>
            
            <div className="user-profile-badge" onClick={() => setActiveTab('account')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="profile-name">{userFullName || 'Guest User'}</span>
              </div>
              <div className="profile-avatar">
                <span style={{ fontSize: '11px', fontWeight: 600 }}>
                  {userFullName ? userFullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'GU'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport for tab contents */}
        <main className={`main-content tab-${activeTab}`} style={{ flexGrow: 1, padding: '2rem' }}>
          
          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="tab-view-animate">
              {isLoadingData ? (
                <div className="bento-grid">
                  {/* Net Cashflow skeleton */}
                  <div className="bento-card col-8 skeleton-card" style={{ height: '260px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                      <div className="skeleton-text" style={{ width: '30%', height: '20px' }}></div>
                      <div className="skeleton-text" style={{ width: '20%', height: '12px' }}></div>
                      <div style={{ flexGrow: 1, marginTop: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '100px' }}>
                        <div className="skeleton-text" style={{ width: '100%', height: '30%', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '50%', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '80%', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '40%', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '60%', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '90%', borderRadius: '4px', margin: 0 }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Spending category skeleton */}
                  <div className="bento-card col-4 skeleton-card" style={{ height: '260px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                      <div className="skeleton-text" style={{ width: '50%', height: '20px' }}></div>
                      <div className="skeleton-text" style={{ width: '30%', height: '12px' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div className="skeleton-text" style={{ width: '80%', height: '12px', margin: 0 }}></div>
                          <div className="skeleton-text" style={{ width: '100%', height: '6px', margin: 0 }}></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div className="skeleton-text" style={{ width: '60%', height: '12px', margin: 0 }}></div>
                          <div className="skeleton-text" style={{ width: '100%', height: '6px', margin: 0 }}></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div className="skeleton-text" style={{ width: '70%', height: '12px', margin: 0 }}></div>
                          <div className="skeleton-text" style={{ width: '100%', height: '6px', margin: 0 }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Budget Status skeleton */}
                  <div className="bento-card col-4 skeleton-card" style={{ height: '240px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                      <div className="skeleton-text" style={{ width: '60%', height: '16px' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="skeleton-text" style={{ width: '90%', height: '12px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '80%', height: '12px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '4px', margin: 0 }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Subscriptions skeleton */}
                  <div className="bento-card col-4 skeleton-card" style={{ height: '240px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                      <div className="skeleton-text" style={{ width: '50%', height: '16px' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        <div className="skeleton-text" style={{ width: '100%', height: '36px', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '36px', borderRadius: '4px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '100%', height: '36px', borderRadius: '4px', margin: 0 }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Balance card skeleton */}
                  <div className="bento-card col-4 skeleton-card" style={{ height: '240px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between', height: '100%' }}>
                      <div>
                        <div className="skeleton-text" style={{ width: '40%', height: '16px' }}></div>
                        <div className="skeleton-text" style={{ width: '80%', height: '32px', marginTop: '1rem' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <div className="skeleton-text" style={{ width: '45%', height: '20px', margin: 0 }}></div>
                        <div className="skeleton-text" style={{ width: '45%', height: '20px', margin: 0 }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Warning alert banner for anomalies */}
              {anomalies.length > 0 && (
                <div className="dashboard-alert-banner">
                  <div className="alert-banner-left">
                    <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
                    <div>
                      <span className="alert-banner-title">Unusual Activity Detected</span>
                      <span style={{ color: 'var(--color-outline)', margin: '0 0.5rem' }}>|</span>
                      <span>A large transaction was flagged in your 'Travel' category. Verify this activity.</span>
                    </div>
                  </div>
                  <button className="alert-banner-btn" onClick={() => setActiveTab('transactions')}>Review Now</button>
                </div>
              )}

              {/* Bento Grid */}
              <div className="bento-grid">
                <div className="bento-card col-8">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="bento-card-title">Net Cashflow</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>6-Month Performance Overview</p>
                    </div>
                    {hoveredPoint ? (
                      <div className="tab-view-animate" style={{ fontSize: '11px', border: '1px solid var(--color-primary-indigo)', borderRadius: '4px', backgroundColor: 'rgba(93, 92, 255, 0.1)', padding: '0.25rem 0.5rem', color: '#ffffff' }}>
                        <strong>{hoveredPoint.name}</strong>: <span style={{ color: 'var(--color-success)' }}>${hoveredPoint.value.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <button className="btn" style={{ fontSize: '10px', padding: '0.25rem 0.5rem', borderRadius: 0, backgroundColor: 'rgba(93, 92, 255, 0.08)', border: 'none', color: '#8F90FF', fontWeight: 600 }}>Last 6 Months</button>
                        <button className="btn" style={{ fontSize: '10px', padding: '0.25rem 0.5rem', borderRadius: 0, background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-border)', color: 'var(--color-outline)' }} onClick={() => triggerToast("YTD historical stats are loading.", "info")}>Year to Date</button>
                      </div>
                    )}
                  </div>
                  
                  {/* Performance Wave Chart SVG */}
                  <div style={{ height: '160px', marginTop: '1.5rem', position: 'relative' }}>
                    <svg viewBox="0 0 500 150" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5D5CFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#5D5CFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="500" y2="25" stroke="#1c1c24" strokeWidth="1" strokeDasharray="3" />
                      <line x1="0" y1="65" x2="500" y2="65" stroke="#1c1c24" strokeWidth="1" strokeDasharray="3" />
                      <line x1="0" y1="105" x2="500" y2="105" stroke="#1c1c24" strokeWidth="1" strokeDasharray="3" />
                      
                      {/* Area Under the curve */}
                      <path d="M 10 110 C 80 110, 120 130, 160 120 C 200 110, 240 60, 300 70 C 360 80, 400 120, 440 110 C 480 100, 490 50, 490 45 L 490 125 L 10 125 Z" fill="url(#chartGrad)" />
                      
                      {/* Wave Line */}
                      <path d="M 10 110 C 80 110, 120 130, 160 120 C 200 110, 240 60, 300 70 C 360 80, 400 120, 440 110 C 480 100, 490 50, 490 45" fill="none" stroke="#5D5CFF" strokeWidth="2.5" />

                      {/* Interactive circles */}
                      {[
                        { name: 'JAN', value: 18500.00, x: 10, y: 110 },
                        { name: 'FEB', value: 24200.00, x: 106, y: 122 },
                        { name: 'MAR', value: 19800.00, x: 202, y: 110 },
                        { name: 'APR', value: 38900.00, x: 298, y: 70 },
                        { name: 'MAY', value: 21500.00, x: 394, y: 115 },
                        { name: 'JUN', value: 45780.00, x: 490, y: 45 }
                      ].map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.name === pt.name ? 6 : 3.5}
                          fill={hoveredPoint?.name === pt.name ? "#ffffff" : "#5D5CFF"}
                          stroke="#0A0B0D"
                          strokeWidth={hoveredPoint?.name === pt.name ? 2.5 : 1.5}
                          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}

                      {/* SVG Month Labels directly mapped for perfect alignment */}
                      <text x="10" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="start">JAN</text>
                      <text x="106" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="middle">FEB</text>
                      <text x="202" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="middle">MAR</text>
                      <text x="298" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="middle">APR</text>
                      <text x="394" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="middle">MAY</text>
                      <text x="490" y="142" fill="var(--color-outline)" fontSize="10" fontWeight="600" textAnchor="end">JUN</text>
                    </svg>
                  </div>
                </div>

                {/* Spending by Category (col-4 width) */}
                <div className="bento-card col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">Spending by Category</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>This billing cycle</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {[
                      { label: "Real Estate & Housing", val: 4250.00, width: "85%" },
                      { label: "Travel & Leisure", val: 1840.50, width: "61%" },
                      { label: "Fine Dining", val: 980.20, width: "65%" },
                      { label: "Investments", val: 12000.00, width: "80%" }
                    ].map((item, idx) => {
                      const dynamicVal = transactions
                        .filter(t => t.category.toLowerCase().includes(item.label.split(' ')[0].toLowerCase()) && t.amount < 0)
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                      const finalVal = dynamicVal > 0 ? dynamicVal : item.val;
                      return (
                        <div key={idx} className="progress-container">
                          <div className="progress-labels">
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.label}</span>
                            <span className="numeric-data" style={{ fontSize: '12px', fontWeight: 600 }}>
                              ${finalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: item.width, backgroundColor: '#5D5CFF' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Budget Status (col-4 width) */}
                <div className="bento-card col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">Budget Status</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>Current bounds status</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {[
                      { category: "Monthly Operating", spent: 2100.00, limit: 5000.00, pct: 42, fillClass: "" },
                      { category: "Discretionary", spent: 840.00, limit: 1000.00, pct: 84, fillClass: "warning" },
                      { category: "Client Entertainment", spent: 510.00, limit: 500.00, pct: 102, fillClass: "exceeded" }
                    ].map((b, idx) => {
                      const matchingBudget = stats?.budgets?.find((dbB: any) => dbB.category === b.category);
                      const spent = matchingBudget ? matchingBudget.spent : b.spent;
                      const limit = matchingBudget ? matchingBudget.limit_amount : b.limit;
                      const pct = limit > 0 ? (spent / limit) * 100 : b.pct;
                      const fillClass = spent > limit ? 'exceeded' : ((limit * 0.8) <= spent ? 'warning' : '');
                      
                      return (
                        <div key={idx} className="progress-container">
                          <div className="progress-labels">
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>{b.category}</span>
                            <span className="numeric-data" style={{ fontSize: '11px', color: fillClass === 'exceeded' ? 'var(--color-error)' : 'var(--color-outline)' }}>
                              ${spent.toFixed(0)} / ${limit.toFixed(0)} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="progress-track" style={{ height: '4px' }}>
                            <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subscriptions List (col-4 width) */}
                <div className="bento-card col-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <span className="bento-card-title">Subscriptions</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>Recurring accounts active</p>
                    </div>
                    <span style={{ color: 'var(--color-outline)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }} onClick={() => triggerToast("Subscription details.", "info")}>&bull;&bull;&bull;</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { merchant: 'Bloomberg Terminal', date: 'Next: July 12', amount: 2250.00, icon: <Terminal size={12} /> },
                      { merchant: 'AWS Infrastructure', date: 'Next: July 15', amount: 842.10, icon: <Cloud size={12} /> },
                      { merchant: 'NetJets Management', date: 'Next: July 18', amount: 4500.00, icon: <Plane size={12} /> }
                    ].map((sub, idx) => {
                      const matchingSub = subscriptions.find(s => s.merchant.toLowerCase().includes(sub.merchant.split(' ')[0].toLowerCase()));
                      const amt = matchingSub ? matchingSub.amount : sub.amount;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#0c0e0e', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', backgroundColor: 'rgba(93, 92, 255, 0.08)', border: '1px solid rgba(93, 92, 255, 0.15)', borderRadius: '3px', color: '#8F90FF' }}>
                              {sub.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>{sub.merchant}</span>
                              <span style={{ fontSize: '9px', color: 'var(--color-outline)' }}>{sub.date}</span>
                            </div>
                          </div>
                          <span className="numeric-data" style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                            ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KPI Metrics Snapshot (col-4 width) */}
                <div className="bento-card col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">Balance & Cashflow</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>Key financial indexes</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Portfolio Balance</span>
                      <div className="kpi-value" style={{ fontSize: '26px', marginTop: '0.25rem' }}>
                        ${stats ? stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '15,448.20'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-outline)' }}>Inflow YTD</span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)', marginTop: '0.15rem' }}>+$28,450.00</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-outline)' }}>Outflow YTD</span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-error)', marginTop: '0.15rem' }}>-$13,001.80</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions (col-12 width) */}
                <div className="bento-card col-12">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <span className="bento-card-title">Recent Transactions</span>
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '0.15rem' }}>Audit ledger log of system entries</p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#5D5CFF', cursor: 'pointer', fontWeight: 600 }} onClick={() => fileInputRef.current?.click()}>
                      Download CSV
                    </span>
                  </div>

                  <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>MERCHANT</th>
                          <th>CATEGORY</th>
                          <th>DATE</th>
                          <th style={{ textAlign: 'right' }}>AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { desc: "Apple Store Regent St", cat: "Technology", date: "Jun 28, 2024", amt: -2499.00 },
                          { desc: "Nobu Berkeley ST", cat: "Entertainment", date: "Jun 27, 2024", amt: -840.50 },
                          { desc: "Goldman Sachs Asset Mgmt", cat: "Investment", date: "Jun 25, 2024", amt: 12500.00 },
                          { desc: "British Airways", cat: "Travel", date: "Jun 24, 2024", amt: -5210.00 }
                        ].map((tx, idx) => {
                          const matchingTx = transactions.find(t => t.description.toLowerCase().includes(tx.desc.split(' ')[0].toLowerCase()));
                          const description = matchingTx ? matchingTx.description : tx.desc;
                          const category = matchingTx ? matchingTx.category : tx.cat;
                          const date = matchingTx ? matchingTx.date : tx.date;
                          const amount = matchingTx ? matchingTx.amount : tx.amt;
                          const isExpense = amount < 0;
                          
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600, color: '#ffffff' }}>{description}</td>
                              <td><span className="pill" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 600 }}>{category}</span></td>
                              <td className="numeric-data">{date}</td>
                              <td className={`numeric-data ${isExpense ? 'trend-down' : 'trend-up'}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                                {isExpense ? '-' : '+'}${Math.abs(amount).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
                    <button className="btn" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#8F90FF', border: '1px dashed rgba(143, 144, 255, 0.3)' }} onClick={() => setActiveTab('transactions')}>
                      View All Transactions <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

              </div>
                </>
              )}
            </div>
          )}

        {/* 2. CHAT ASSISTANT TAB */}
        {activeTab === 'chat' && (
          <div className="tab-view-animate">
            <div>
              <h1 className="headline-xl">Technical Cockpit</h1>
              <p className="text-muted" style={{ fontSize: '13px' }}>AI-agent session with real-time SQL execution logs.</p>
            </div>

            <div className="chat-split-container">
              {/* Chat Sidebar: Memory Nodes & Params */}
              <div className="chat-sidebar-pane">
                <div className="sidebar-section-title">ACTIVE CONTEXT NODES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div className="context-node">
                    <span className="context-node-key">NAME</span>
                    <span className="context-node-val">{userFullName || 'Guest'}</span>
                  </div>
                  <div className="context-node">
                    <span className="context-node-key">PORTFOLIO</span>
                    <span className="context-node-val">{userPortfolioTier || 'Standard'}</span>
                  </div>
                  <div className="context-node">
                    <span className="context-node-key">CLEARANCE</span>
                    <span className="context-node-val" style={{ color: 'var(--color-success)' }}>SECURE (Node 4)</span>
                  </div>
                  <div className="context-node">
                    <span className="context-node-key">CARD_LIMIT</span>
                    <span className="context-node-val">$42,900.00</span>
                  </div>
                </div>

                <div className="sidebar-section-title">RECENT DISCUSSIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  {[
                    "Bloomberg Subscription Review",
                    "NetJets Charter Expense Audit",
                    "Apple Store Regent St Clearance",
                    "Nobu Entertainment Bounds"
                  ].map((title, idx) => (
                    <div 
                      key={idx} 
                      className="recent-chat-item" 
                      onClick={() => {
                        triggerToast(`Loaded history for "${title}"`, "info");
                        runQuickPrompt(`Summarize my transaction for ${title.split(' ')[0]}`);
                      }}
                    >
                      <Terminal size={10} style={{ color: 'var(--color-outline)' }} />
                      <span className="recent-chat-title">{title}</span>
                    </div>
                  ))}
                </div>

                <div className="sidebar-section-title">SYSTEM STATUS</div>
                <div className="system-status-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span className="text-muted">Agent Engine</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Revonix-Fin-v4</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '0.25rem' }}>
                    <span className="text-muted">Memory Synced</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '0.25rem' }}>
                    <span className="text-muted">Database Link</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>finance.db</span>
                  </div>
                </div>
              </div>

              {/* Main Chat Interface */}
              <div className="chat-container">
                <div className="chat-header">
                  <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Terminal size={14} style={{ color: 'var(--color-primary-indigo)' }} />
                    ACTIVE SESSION: LOCAL_FINANCE_AGENT
                  </span>
                  
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
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="tab-view-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h1 className="headline-xl">Transactions Ledger</h1>
                <p className="text-muted" style={{ fontSize: '13px' }}>Audit log of all registered posted and pending items.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingCSV}>
                  <UploadCloud size={14} /> {uploadingCSV ? 'Importing...' : 'Import CSV'}
                </button>
                <button className="btn" onClick={() => setIsTxModalOpen(true)}>
                  <Plus size={14} /> Add Transaction
                </button>
              </div>
            </div>

            {/* Split layout */}
            <div className="tx-split-container">
              {/* Left pane: Transaction List */}
              <div className="tx-list-pane">
                {/* Filters Dashboard */}
                <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.5rem 0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
                    <Search size={12} className="text-muted" />
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ border: 'none', background: 'transparent', padding: '0.15rem', fontSize: '12px' }}
                      placeholder="Search description..." 
                      value={txSearch}
                      onChange={e => {
                        const cleanValue = e.target.value.substring(0, 50).replace(/[^a-zA-Z0-9\s.\-_]/g, '');
                        setTxSearch(cleanValue);
                      }}
                    />
                  </div>

                  <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border)' }}></div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Filter size={12} className="text-muted" />
                    <select 
                      className="input-field" 
                      style={{ border: 'none', background: 'transparent', width: '110px', padding: '0.15rem', cursor: 'pointer', fontSize: '12px' }}
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

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className="pill active" style={{ fontSize: '10px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>RECENT</span>
                  <span className="pill" style={{ fontSize: '10px', padding: '0.2rem 0.5rem', cursor: 'pointer' }} onClick={() => triggerToast("Showing high value filter.", "info")}>HIGH VALUE</span>
                  <span className="pill" style={{ fontSize: '10px', padding: '0.2rem 0.5rem', cursor: 'pointer' }} onClick={() => triggerToast("Showing international clearance filter.", "info")}>INTERNATIONAL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredTxs.length > 0 ? (
                    filteredTxs.map(t => {
                      const isExpense = t.amount < 0;
                      const isSelected = selectedTx?.id === t.id;
                      return (
                        <div 
                          key={t.id} 
                          className={`transaction-list-card ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedTx(t)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="tx-card-merchant">{t.description}</span>
                            <span className={`tx-card-amount ${isExpense ? 'expense' : 'income'}`} style={{ color: isExpense ? '#ffffff' : 'var(--color-success)', fontWeight: 600 }}>
                              {isExpense ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                            <span className="tx-card-cat" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 600, color: 'var(--color-outline)' }}>{t.category}</span>
                            <span className="tx-card-date">{t.date}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-outline)' }}>
                      <p>No matching transactions found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: Transaction Details */}
              <div className="tx-detail-pane">
                {selectedTx ? (
                  <>
                    <div>
                      <div className="detail-settlement-status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>• SETTLED ON {selectedTx.date}</span>
                        {selectedTx.receipt_image && (
                          <span style={{ fontSize: '9px', backgroundColor: 'rgba(93, 92, 255, 0.1)', color: 'var(--color-primary-indigo)', padding: '0.15rem 0.35rem', borderRadius: '2px', fontWeight: 600 }}>
                            RECEIPT OCR SCAN
                          </span>
                        )}
                      </div>
                      <div className="detail-title">{selectedTx.description}</div>
                      <div className="detail-ref">Ref: {selectedTx.id.substring(0, 8).toUpperCase()}-TX-L10-B</div>
                    </div>

                    <div style={{ marginTop: '-0.5rem' }}>
                      <span className="detail-large-amount" style={{ color: selectedTx.amount < 0 ? '#ffffff' : 'var(--color-success)' }}>
                        {selectedTx.amount < 0 ? '-' : '+'}${Math.abs(selectedTx.amount).toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <div className="detail-section-title">Merchant Intelligence</div>
                      <p className="detail-description" style={{ fontSize: '12px' }}>
                        {selectedTx.description} is categorized under <strong>{selectedTx.category}</strong>. This charge has been dynamically cleared and posted to the ledger for {userFullName || 'the account holder'}. Any questions or discrepancies should be flagged for advisory review.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn" 
                        style={{ fontSize: '11px', flex: 1, padding: '0.5rem', border: '1px solid var(--color-border)' }}
                        onClick={() => {
                          triggerToast(`Flagged transaction as unusual. Anomaly report generated.`, "success");
                          const exists = anomalies.some(a => a.transaction_id === selectedTx.id);
                          if (!exists) {
                            setAnomalies([...anomalies, {
                              transaction_id: selectedTx.id,
                              amount: selectedTx.amount,
                              description: selectedTx.description,
                              category: selectedTx.category,
                              date: selectedTx.date,
                              reason: "User flagged manually"
                            }]);
                          }
                        }}
                      >
                        Flag as unusual
                      </button>
                      
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '11px', flex: 1, padding: '0.5rem' }}
                        onClick={() => {
                          setBudgetCat(selectedTx.category);
                          setBudgetLimit("1500");
                          setIsBudgetModalOpen(true);
                        }}
                      >
                        Add to budget
                      </button>
                    </div>

                    <div>
                      <div className="detail-section-title">Digital Receipt</div>
                      <div className="detail-receipt-box">
                        {selectedTx.receipt_image ? (
                          <img 
                            src={`${API_BASE}${selectedTx.receipt_image}`} 
                            alt="Receipt" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--color-outline)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="16" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="4" />
                              <line x1="8" y1="2" x2="8" y2="4" />
                              <line x1="3" y1="8" x2="21" y2="8" />
                            </svg>
                            <span style={{ fontSize: '10px' }}>No physical receipt attached to ledger</span>
                          </div>
                        )}
                        <div className="detail-receipt-overlay">
                          <button 
                            className="btn" 
                            style={{ fontSize: '11px', backgroundColor: '#5D5CFF', color: '#ffffff' }}
                            onClick={() => triggerToast("Receipt print preview generated.", "success")}
                          >
                            View Receipt PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div className="detail-section-title">Account Used</div>
                        <p style={{ fontSize: '12px', color: '#ffffff', margin: 0, fontWeight: 500 }}>
                          Corporate Platinum Card (•••• 4291)
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--color-outline)', margin: '0.15rem 0 0 0' }}>
                          Available credit: $42,900.00
                        </p>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div className="detail-section-title">Internal Tags</div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span className="detail-tag">TAX_DEDUCTIBLE</span>
                          <span className="detail-tag">{selectedTx.category.toUpperCase()}_CYCLE</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="detail-section-title">Merchant Location</div>
                      <div className="detail-map-box">
                        <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          📍 San Francisco, CA, USA (Clearance Node 4)
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)', fontSize: '13px' }}>
                    Select a transaction from the ledger to view detailed intelligence reports.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. BUDGETS TAB */}
        {activeTab === 'budgets' && (
          <div className="tab-view-animate">
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
          </div>
        )}

        {/* 5. ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="tab-view-animate" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 className="headline-xl">Account Settings</h1>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '0.25rem' }}>Update your user profile credentials and secure password.</p>
            </div>

            <div className="account-container-centered" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '2rem' }}>
              <div className="bento-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <h3 className="headline-md" style={{ marginBottom: '1.5rem' }}>Personal Profile</h3>
                
                {profileSuccess && (
                  <div style={{ backgroundColor: 'rgba(46, 125, 50, 0.1)', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: '4px', fontSize: '13px', marginBottom: '1.25rem' }}>
                    {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div style={{ backgroundColor: 'rgba(198, 40, 40, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '0.75rem', borderRadius: '4px', fontSize: '13px', marginBottom: '1.25rem' }}>
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="auth-input-group" style={{ margin: 0 }}>
                    <label className="auth-input-label">Account Email Address</label>
                    <input 
                      type="text" 
                      className="auth-input" 
                      disabled 
                      value={userEmail || ''} 
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="auth-input-group" style={{ margin: 0 }}>
                    <label className="auth-input-label">Full Name</label>
                    <input 
                      type="text" 
                      className="auth-input" 
                      required 
                      value={profileName}
                      onChange={e => handleProfileNameChange(e.target.value)}
                      placeholder="e.g. Alex Vance"
                    />
                    {profileNameWarning && (
                      <span style={{ color: '#ffb4ab', fontSize: '11px', marginTop: '0.25rem', display: 'block' }}>{profileNameWarning}</span>
                    )}
                  </div>

                  <div className="auth-input-group" style={{ margin: 0 }}>
                    <label className="auth-input-label">New Password (leave blank to keep current)</label>
                    <input 
                      type="password" 
                      className="auth-input" 
                      value={profilePassword}
                      onChange={e => handleProfilePasswordChange(e.target.value)}
                      placeholder="••••••••"
                    />
                    {profilePasswordWarning && (
                      <span style={{ color: '#ffb4ab', fontSize: '11px', marginTop: '0.25rem', display: 'block' }}>{profilePasswordWarning}</span>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="auth-button"
                    style={{ marginTop: '0.5rem', width: 'auto', padding: '0.75rem 1.5rem', alignSelf: 'flex-start' }}
                    disabled={!!profileNameWarning || !!profilePasswordWarning}
                  >
                    Save Updates
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>

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

      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="headline-md" style={{ color: 'var(--color-error)' }}>Remove Budget Bound</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setConfirmDeleteId(null)} />
            </div>
            
            <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              <p className="text-muted" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                Are you sure you want to delete this budget limit constraint? This action cannot be undone.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                style={{ border: '1px solid var(--color-border)', background: 'transparent' }} 
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', border: 'none' }} 
                onClick={executeDeleteBudget}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="headline-md" style={{ color: 'var(--color-error)' }}>Confirm Session Logout</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setIsLogoutConfirmOpen(false)} />
            </div>
            
            <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              <p className="text-muted" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                Are you sure you want to end your current session and sign out of the Revonix Finance Cockpit?
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                style={{ border: '1px solid var(--color-border)', background: 'transparent' }} 
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', border: 'none' }} 
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleSignOut();
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' && <span className="toast-icon">✓</span>}
            {toast.type === 'error' && <span className="toast-icon">✕</span>}
            {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
        </div>
      )}

    </div>
  );
}
