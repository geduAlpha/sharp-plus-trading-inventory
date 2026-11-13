import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setLoginInProgress } from '../api/axios';

const AuthContext = createContext(null);

export const DEFAULT_PERMISSIONS = {
  // Workflow capabilities
  recordGoods: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  checkReview: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  approveGoods: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  postLedger: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  voidTransactions: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  viewReports: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  manageAccounts: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },

  // Granular actions per module
  items: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    update: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    export: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  },
  products: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    update: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    export: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  },
  cashSales: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    void: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  creditSales: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    create: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    void: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  customers: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  suppliers: {
    view: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    create: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  purchases: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    approve: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    void: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  stockMovements: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    void: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    approve: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  stockRequests: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    approve: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  consumption: {
    view: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  reports: {
    view: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    export: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  },
  staffAccounts: {
    view: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    create: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    manageAccess: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  settings: {
    view: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    edit: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    update: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
  recycleBin: {
    view: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    restore: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
};

export const SUBMENU_TO_PARENT_MAIN_MENU = {
  // allIds children
  items: 'allIds',
  materials: 'allIds',
  raw_materials: 'allIds',
  rawMaterials: 'allIds',
  products: 'allIds',
  Products: 'allIds',
  employees: 'allIds',
  suppliers: 'allIds',

  // storeOps children
  purchases: 'storeOps',
  purchases_grv: 'storeOps',
  movements_cash_grv: 'storeOps',
  movements_credit_grv: 'storeOps',
  movements_neg_adj: 'storeOps',
  movements_pos_adj: 'storeOps',
  stockMovements: 'storeOps',
  stock_movements: 'storeOps',
  transactions: 'storeOps',
  inventoryCount: 'storeOps',
  report_inventory_count: 'storeOps',
  movements_all: 'storeOps',
  movements_sales_import: 'storeOps',
  stockRequests: 'storeOps',
  stock_requests: 'storeOps',
  consumption: 'storeOps',
  stockManagementVoucherReportUnderStoreOps: 'storeOps',
  stockManagementVoucherReport: 'storeOps',

  // salesMarketing children
  cashSales: 'salesMarketing',
  sales_cash: 'salesMarketing',
  creditSales: 'salesMarketing',
  sales_credit: 'salesMarketing',

  // subSystem children
  subsystem: 'subSystem',
  subsystem_stock_management: 'subSystem',
  subsystem_sales_marketing: 'subSystem',
  subsystem_captain_order: 'subSystem',
  subsystem_cash_sales: 'subSystem',
  subsystem_credit_sales: 'subSystem',
  subsystem_pos_ordering: 'subSystem',
  subsystem_zeroing_voucher: 'subSystem',
  subsystem_security_report: 'subSystem',
  subsystem_sales_closing: 'subSystem',
  subsystem_sales_route_mapping: 'subSystem',

  // reports children
  report_summary: 'reports',
  report_balance: 'reports',
  report_daily: 'reports',
  report_cash_grv: 'reports',
  report_credit_grv: 'reports',
  report_pos_adj: 'reports',
  report_neg_adj: 'reports',
  report_levels: 'reports',
  report_purchases: 'reports',
  report_disposal: 'reports',
  reports_analytics: 'reports',

  // analytics children
  finance: 'analytics',
  expenses: 'analytics',
  overhead_expenses: 'analytics',
  analytics_pnl: 'analytics',

  // staffAccounts children
  staff: 'staffAccounts',
  staff_accounts: 'staffAccounts',
  users: 'staffAccounts',

  // recycleBin children
  recycle_bin: 'recycleBin',

  // settings children
  system_settings: 'settings',
};

export const DEFAULT_NAV_VISIBILITY = {
  dashboard: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  allIds: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  analytics: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  storeOps: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  salesMarketing: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  subSystem: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  reports: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  staffAccounts: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  recycleBin: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  settings: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  // aliases & submenus
  items: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  products: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  stockMovements: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  suppliers: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  consumption: { employee: false, storekeeper: false, manager: false, admin: false, cashier: false },
};

export const DEFAULT_COMPANY_INFO = {
  companyName: 'Sharp Plus',
  tradeName: 'Sharp Plus',
  systemEmail: 'info@Sharp Plus.com',
  phone: '+251 911 000 111',
  currency: 'ETB',
  currencySymbol: 'ETB',
  address: 'Addis Ababa, Ethiopia',
  city: 'Addis Ababa',
  country: 'Ethiopia',
  tinNumber: '',
  companyLogo: '/logo.png',
  taxRate: 15,
  ownerName: 'System Owner',
  isConfigured: false,
};

/** Clear every settings-related key from localStorage */
const clearSettingsCache = () => {
  localStorage.removeItem('companyStockPermissions');
  localStorage.removeItem('companyStockNavVisibility');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_PERMISSIONS);
  const [navVisibility, setNavVisibility] = useState(DEFAULT_NAV_VISIBILITY);
  const [allowAdminManagePermissions, setAllowAdminManagePermissions] = useState(false);
  const [allowAdminVoidDelete, setAllowAdminVoidDelete] = useState(false);
  const [allowAdminThemeCustomization, setAllowAdminThemeCustomization] = useState(true);
  const [modulesEnabled, setModulesEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('companyModulesEnabled');
      return saved ? JSON.parse(saved) : { salesMarketing: true, accounting: true };
    } catch {
      return { salesMarketing: true, accounting: true };
    }
  });
  const [companyInfo, setCompanyInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('companyProfileInfo');
      return saved ? { ...DEFAULT_COMPANY_INFO, ...JSON.parse(saved) } : DEFAULT_COMPANY_INFO;
    } catch {
      return DEFAULT_COMPANY_INFO;
    }
  });

  // loading stays true until BOTH the user AND the server settings are resolved
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.rolePermissions) {
        setRolePermissions(res.data.rolePermissions);
        localStorage.setItem('companyStockPermissions', JSON.stringify(res.data.rolePermissions));
      }
      if (res.data?.navVisibility) {
        setNavVisibility(res.data.navVisibility);
        localStorage.setItem('companyStockNavVisibility', JSON.stringify(res.data.navVisibility));
      }
      if (res.data?.allowAdminManagePermissions !== undefined) {
        setAllowAdminManagePermissions(Boolean(res.data.allowAdminManagePermissions));
      }
      if (res.data?.allowAdminVoidDelete !== undefined) {
        setAllowAdminVoidDelete(Boolean(res.data.allowAdminVoidDelete));
      }
      if (res.data?.allowAdminThemeCustomization !== undefined) {
        setAllowAdminThemeCustomization(Boolean(res.data.allowAdminThemeCustomization));
      }
      if (res.data?.modulesEnabled && typeof res.data.modulesEnabled === 'object') {
        setModulesEnabled(res.data.modulesEnabled);
        localStorage.setItem('companyModulesEnabled', JSON.stringify(res.data.modulesEnabled));
      }
      // Sync fresh user custom permissions if session is active
      try {
        const stored = localStorage.getItem('companyStockAuth') || localStorage.getItem('hotelStockAuth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.token) {
            const meRes = await api.get('/auth/me');
            if (meRes.data) {
              const freshUser = { ...parsed, ...meRes.data, token: parsed.token };
              setUser(freshUser);
              localStorage.setItem('companyStockAuth', JSON.stringify(freshUser));
            }
          }
        }
      } catch (meErr) {
        // Silent fallback to existing user session
      }
      if (res.data) {
        const info = {
          companyName: res.data.companyName || 'Sharp Plus',
          tradeName: res.data.tradeName || res.data.companyName || 'Sharp Plus',
          systemEmail: res.data.systemEmail || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          city: res.data.city || 'Addis Ababa',
          country: res.data.country || 'Ethiopia',
          currency: res.data.currency || 'ETB',
          currencySymbol: res.data.currencySymbol || res.data.currency || 'ETB',
          companyLogo: res.data.companyLogo || '/logo.png',
          tinNumber: res.data.tinNumber || '',
          taxRate: res.data.taxRate !== undefined ? res.data.taxRate : 15,
          ownerName: res.data.ownerName || '',
          ownerEmail: res.data.ownerEmail || '',
          ownerPhone: res.data.ownerPhone || '',
          isConfigured: Boolean(res.data.isConfigured),
          registeredAt: res.data.registeredAt,
        };
        setCompanyInfo(info);
        localStorage.setItem('companyProfileInfo', JSON.stringify(info));
      }
      return res.data;
    } catch (err) {
      // Fall back to localStorage caches or defaults
      const cachedRP = localStorage.getItem('companyStockPermissions');
      const cachedNV = localStorage.getItem('companyStockNavVisibility');
      const cachedCI = localStorage.getItem('companyProfileInfo');
      const cachedME = localStorage.getItem('companyModulesEnabled');
      if (cachedRP) setRolePermissions(JSON.parse(cachedRP));
      if (cachedNV) setNavVisibility(JSON.parse(cachedNV));
      if (cachedME) {
        try { setModulesEnabled(JSON.parse(cachedME)); } catch {}
      }
      if (cachedCI) {
        try { setCompanyInfo(JSON.parse(cachedCI)); } catch {}
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored =
          localStorage.getItem('companyStockAuth') ||
          localStorage.getItem('hotelStockAuth');

        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.token) {
            setUser(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to parse auth token:', err);
        localStorage.removeItem('companyStockAuth');
        localStorage.removeItem('hotelStockAuth');
      } finally {
        await fetchPermissions();
        setLoading(false);
      }
    };
    initAuth();
  }, [fetchPermissions]);

  // Listen for the custom 401 event dispatched by the axios interceptor
  // This lets React Router handle the redirect cleanly (no hard page reload)
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setRolePermissions(DEFAULT_PERMISSIONS);
      setNavVisibility(DEFAULT_NAV_VISIBILITY);
      clearSettingsCache();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Synchronize document title and browser tab favicon dynamically
  useEffect(() => {
    const brand = companyInfo?.companyName || 'Sharp Plus';
    document.title = `${brand} — Inventory & Stock Management`;
    const iconUrl = companyInfo?.companyLogo || '/favicon.png';
    const favicons = document.querySelectorAll("link[rel*='icon']");
    favicons.forEach(el => {
      el.href = iconUrl;
    });
  }, [companyInfo]);

  // Real-time synchronization across browser tabs and background polling:
  // Ensures changes made by System Developer / Owner apply everywhere immediately!
  useEffect(() => {
    // 1. BroadcastChannel across all browser tabs for instant 0ms sync
    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('sharp_plus_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_CHANGED' || event.data?.type === 'PERMISSIONS_CHANGED') {
            fetchPermissions();
          }
        };
      }
    } catch (e) {
      // BroadcastChannel not available or restricted
    }

    // 2. Storage event for cross-tab synchronization fallback
    const handleStorageChange = (e) => {
      if (
        e.key === 'companyStockPermissions' ||
        e.key === 'companyStockNavVisibility' ||
        e.key === 'companyModulesEnabled' ||
        e.key === 'companyProfileInfo' ||
        e.key === 'sharp_plus_modules_enabled'
      ) {
        fetchPermissions();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Custom event dispatched within the same window
    const handleCustomSettingsUpdated = () => {
      fetchPermissions();
    };
    window.addEventListener('settings:updated', handleCustomSettingsUpdated);

    // 4. Window focus listener: immediately sync fresh permissions when switching to the tab
    const handleFocus = () => {
      fetchPermissions();
    };
    window.addEventListener('focus', handleFocus);

    // 5. Periodic background polling every 10 seconds so all users (cashier, storekeeper, manager, etc.)
    // receive Developer/Owner changes in near real-time without requiring a page reload.
    const pollTimer = setInterval(() => {
      fetchPermissions();
    }, 10000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings:updated', handleCustomSettingsUpdated);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollTimer);
    };
  }, [fetchPermissions]);

  /**
   * Login can be called two ways:
   *   1. login(email, password, otpToken)  — from Login.jsx, makes API call
   *   2. login(userDataObject)             — legacy, stores data directly
   */
  const login = async (emailOrData, password, otpToken) => {
    // If first arg is an object (legacy usage), store directly
    if (emailOrData && typeof emailOrData === 'object') {
      const userData = emailOrData;
      localStorage.setItem('companyStockAuth', JSON.stringify(userData));
      localStorage.removeItem('hotelStockAuth');
      setUser(userData);
      await fetchPermissions();
      return userData;
    }

    // Standard login: set guard so 401 responses during login don't log out the user
    setLoginInProgress(true);
    try {
      // POST credentials to the API
      const email = typeof emailOrData === 'string' ? emailOrData.trim() : emailOrData;
      const res = await api.post('/auth/login', { email, password, otpToken });
      const userData = res.data;

      // Ensure we have a token
      if (!userData?.token) {
        throw new Error('No token received from server.');
      }

      // Persist and activate session
      localStorage.setItem('companyStockAuth', JSON.stringify(userData));
      localStorage.removeItem('hotelStockAuth');
      // Reset session activity timestamp so the timeout clock starts fresh
      localStorage.setItem('companyStockLastActivity', String(Date.now()));
      setUser(userData);

      // Fetch permissions (failure is safe — falls back to defaults/cache)
      await fetchPermissions();
      return userData;
    } finally {
      // Always release the guard, even if login fails
      setLoginInProgress(false);
    }
  };

  const logout = (navigate) => {
    localStorage.removeItem('companyStockAuth');
    localStorage.removeItem('hotelStockAuth');
    localStorage.removeItem('companyStockLastActivity');
    clearSettingsCache();
    setUser(null);
    setRolePermissions(DEFAULT_PERMISSIONS);
    setNavVisibility(DEFAULT_NAV_VISIBILITY);
    // If a navigate function is provided, use it; otherwise fall back gracefully
    if (typeof navigate === 'function') {
      navigate('/login', { replace: true });
    }
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem('companyStockAuth', JSON.stringify(newUser));
    setUser(newUser);
  };

  const hasRole = (...roles) => user && (user.role === 'developer' || roles.includes(user.role));

  /**
   * Check a workflow or CRUD capability
   * Usage examples:
   *   can('recordGoods')
   *   can('items', 'view') / can('items', 'create') / can('items', 'edit') / can('items', 'delete')
   *   can('purchases', 'approve')
   */
  const can = (capability, action) => {
    if (!user) return false;

    // Developer role has universal owner access to all capabilities
    if (user.role === 'developer') return true;

    // Normalize action aliases
    const actionKeys = action ? [action] : [];
    if (action === 'view') actionKeys.push('read');
    if (action === 'read') actionKeys.push('view');
    if (action === 'edit') actionKeys.push('update');
    if (action === 'update') actionKeys.push('edit');
    if (action === 'export' || action === 'print') actionKeys.push('export', 'print', 'print_export');

    // Capability aliases
    const capAliases = [capability];
    const aliasMap = {
      raw_materials: 'items',
      items: 'raw_materials',
      rawMaterials: 'items',
      materials: 'items',
      products: 'Products',
      Products: 'products',
      cashSales: 'subsystem_cash_sales',
      subsystem_cash_sales: 'cashSales',
      sales_cash: 'cashSales',
      creditSales: 'subsystem_pos_ordering',
      subsystem_pos_ordering: 'creditSales',
      sales_credit: 'creditSales',
      overhead_expenses: 'expenses',
      expenses: 'overhead_expenses',
      stock_movements: 'stockMovements',
      stockMovements: 'stock_movements',
      transactions: 'stockMovements',
      purchases_grv: 'purchases',
      purchases: 'purchases_grv',
      staffAccounts: 'employees',
      employees: 'staffAccounts',
      staff_accounts: 'employees',
    };
    if (aliasMap[capability] && !capAliases.includes(aliasMap[capability])) {
      capAliases.push(aliasMap[capability]);
    }

    // 1. Check user custom permissions override (if assigned to this employee)
    if (user.customPermissions) {
      for (const cap of capAliases) {
        if (action && user.customPermissions[cap] && typeof user.customPermissions[cap] === 'object') {
          for (const ak of actionKeys) {
            if (typeof user.customPermissions[cap][ak] === 'boolean') {
              return user.customPermissions[cap][ak];
            }
          }
        }
        if (typeof user.customPermissions[cap] === 'boolean') {
          return user.customPermissions[cap];
        }
      }
    }

    const isVoidOrDelete =
      capability === 'voidTransactions' ||
      (action && ['void', 'delete'].includes(action) && ['stockMovements', 'purchases', 'transactions'].includes(capability));

    // ONLY Developer and Admin can ever void/delete transactions; all other roles are strictly prohibited
    if (isVoidOrDelete && user.role !== 'developer' && user.role !== 'admin') {
      return false;
    }

    // 2. Admin role default
    if (user.role === 'admin') {
      if (isVoidOrDelete) {
        return Boolean(allowAdminVoidDelete || rolePermissions?.voidTransactions?.admin);
      }
      if (action) {
        for (const cap of capAliases) {
          for (const ak of actionKeys) {
            if (rolePermissions?.[cap]?.[ak]?.admin === false) return false;
          }
        }
      }
      for (const cap of capAliases) {
        if (rolePermissions?.[cap]?.admin === false) return false;
      }
      return true;
    }

    // 3. Employee role check
    const effectiveRoles = [user.role];
    if (user.role === 'employee') effectiveRoles.push('storekeeper');

    if (action) {
      for (const cap of capAliases) {
        if (rolePermissions?.[cap]) {
          for (const ak of actionKeys) {
            if (rolePermissions[cap][ak]) {
              for (const r of effectiveRoles) {
                if (rolePermissions[cap][ak][r] !== undefined) {
                  return Boolean(rolePermissions[cap][ak][r]);
                }
              }
            }
          }
        }
      }
    }

    for (const cap of capAliases) {
      if (rolePermissions?.[cap]) {
        for (const r of effectiveRoles) {
          if (rolePermissions[cap][r] !== undefined) {
            return Boolean(rolePermissions[cap][r]);
          }
        }
      }
    }

    return false;
  };

  /** Helper to detect if current user was the creator / actor of an item (action taken by user) */
  const isActorOfItem = (item) => {
    if (!item || !user) return false;
    const actorId =
      item.performedBy?._id ||
      item.performedBy ||
      item.recordedBy?._id ||
      item.recordedBy ||
      item.requestedBy?._id ||
      item.requestedBy ||
      item.createdBy?._id ||
      item.createdBy ||
      item.userId?._id ||
      item.userId;
    if (actorId && String(actorId) === String(user._id)) return true;

    const actorName =
      (typeof item.performedBy === 'object' && item.performedBy?.name) ||
      (typeof item.recordedBy === 'object' && item.recordedBy?.name) ||
      (typeof item.requestedBy === 'object' && item.requestedBy?.name) ||
      item.performedByName ||
      item.recordedByName;
    if (actorName && user.name && actorName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;

    return false;
  };

  /** Anti-self-approval helper: user must have approve privilege AND must not have taken the action */
  const canApprove = (item, moduleKey) => {
    if (!user) return false;
    if (user.role === 'developer') return true;

    // Check privilege
    const hasPrivilege =
      user.role === 'admin' ||
      can('approveGoods') ||
      (moduleKey ? (can(moduleKey, 'approve') || can(moduleKey, 'edit')) : false) ||
      can('purchases', 'approve') ||
      can('stockMovements', 'approve');
    if (!hasPrivilege) return false;

    // Strict Segregation of Duties: cannot approve own record / action taken
    if (item && isActorOfItem(item)) {
      return false;
    }
    return true;
  };

  /** Anti-self-check helper: user must have checkReview privilege AND must not have taken the action */
  const canCheck = (item, moduleKey) => {
    if (!user) return false;
    if (user.role === 'developer') return true;

    const hasPrivilege =
      user.role === 'admin' ||
      can('checkReview') ||
      (moduleKey ? can(moduleKey, 'edit') : false);
    if (!hasPrivilege) return false;

    if (item && isActorOfItem(item)) {
      return false;
    }
    return true;
  };

  /** Anti-self-post helper: user must have postLedger privilege AND must not have taken the action */
  const canPost = (item, moduleKey) => {
    if (!user) return false;
    if (user.role === 'developer') return true;

    const hasPrivilege =
      user.role === 'admin' ||
      can('postLedger');
    if (!hasPrivilege) return false;

    if (item && isActorOfItem(item)) {
      return false;
    }
    return true;
  };

  /** Check whether a sidebar nav section is visible for this user's role and custom permissions */
  const canSeeNav = (navKey) => {
    if (!user) return false;
    // Developer role has universal owner access to every single section
    if (user.role === 'developer') return true;
    if (!navKey) return true;

    // Centralized Module Gates: When disabled by System Owner/Developer, completely hide from non-developers
    if (user.role !== 'developer' && modulesEnabled) {
      const isSalesKey =
        navKey === 'salesMarketing' ||
        navKey === 'cashSales' ||
        navKey === 'creditSales' ||
        navKey === 'sales_cash' ||
        navKey === 'sales_credit' ||
        navKey === 'subsystem' ||
        navKey === 'subsystem_captain_order' ||
        navKey === 'subsystem_cash_sales' ||
        navKey === 'subsystem_pos_ordering';
      if (isSalesKey && modulesEnabled?.salesMarketing === false) return false;

      const isItemsKey =
        navKey === 'items' ||
        navKey === 'raw_materials' ||
        navKey === 'products' ||
        navKey === 'inventory_items';
      if (isItemsKey && modulesEnabled?.items === false) return false;

      const isAccountingKey =
        navKey === 'accounting' ||
        navKey === 'finance' ||
        navKey === 'overhead_expenses' ||
        navKey === 'analytics_pnl' ||
        navKey === 'expenses' ||
        navKey === 'analytics';
      if (isAccountingKey && modulesEnabled?.accounting === false) return false;

      if ((modulesEnabled?.digitalMenu === false || companyInfo?.digitalMenuEnabled === false) && navKey === 'digitalMenu') return false;
    }

    const nav = navVisibility ?? DEFAULT_NAV_VISIBILITY;

    // 1. Parent main sidebar menu cascade check:
    // If navKey is a submenu whose parent main sidebar menu is explicitly disabled for the user's role in navVisibility, deny access immediately
    const parentMenuKey = SUBMENU_TO_PARENT_MAIN_MENU[navKey];
    if (parentMenuKey && nav[parentMenuKey] && nav[parentMenuKey][user.role] !== undefined) {
      if (Boolean(nav[parentMenuKey][user.role]) === false) {
        return false;
      }
    }

    // 2. Direct navVisibility matrix check for this exact navKey or its aliases
    const entry =
      nav[navKey] ||
      nav[navKey.toLowerCase()] ||
      (navKey.toLowerCase() === 'items' ? (nav['Items'] || nav['items'] || nav['raw_materials'] || nav['rawMaterials']) : undefined) ||
      (navKey === 'cashSales' ? (nav['cashSales'] || nav['subsystem_cash_sales']) : undefined) ||
      (navKey === 'creditSales' ? (nav['creditSales'] || nav['subsystem_pos_ordering']) : undefined) ||
      (navKey === 'stockRequests' ? (nav['stockRequests'] || nav['consumption']) : undefined) ||
      (navKey === 'expenses' ? (nav['expenses'] || nav['overhead_expenses']) : undefined) ||
      (navKey === 'staffAccounts' ? (nav['staffAccounts'] || nav['staff_accounts']) : undefined);

    if (entry && entry[user.role] !== undefined) {
      return Boolean(entry[user.role]);
    }

    // 3. Direct Employee Custom Permissions Override (Managed via Staff Accounts / User Permissions)
    if (user.customPermissions && typeof user.customPermissions === 'object') {
      const custom = user.customPermissions;
      const lower = navKey.toLowerCase();

      // Check exact key
      if (typeof custom[navKey] === 'boolean') return custom[navKey];
      if (custom[navKey] && typeof custom[navKey] === 'object') {
        if (typeof custom[navKey].view === 'boolean') return custom[navKey].view;
        if (typeof custom[navKey].read === 'boolean') return custom[navKey].read;
      }

      // Check lowercase alias
      if (typeof custom[lower] === 'boolean') return custom[lower];
      if (custom[lower] && typeof custom[lower] === 'object') {
        if (typeof custom[lower].view === 'boolean') return custom[lower].view;
        if (typeof custom[lower].read === 'boolean') return custom[lower].read;
      }
    }

    // 4. Special composite group checks (when not explicitly configured in navVisibility)
    if (navKey === 'salesMarketing' || navKey === 'subsystem' || navKey === 'subSystem' || navKey === 'subsystem_sales_marketing') {
      if (modulesEnabled?.salesMarketing === false && user.role !== 'developer') return false;
      return (
        canSeeNav('cashSales') ||
        canSeeNav('creditSales') ||
        canSeeNav('subsystem_cash_sales') ||
        canSeeNav('subsystem_pos_ordering') ||
        canSeeNav('subsystem_captain_order') ||
        can('cashSales', 'view') ||
        can('creditSales', 'view')
      );
    }
    if (navKey === 'subsystem_stock_management') {
      return canSeeNav('stockMovements') || canSeeNav('purchases') || can('stockMovements', 'view') || can('purchases', 'view');
    }
    if (navKey === 'finance' || navKey === 'accounting') {
      if (modulesEnabled?.accounting === false && user.role !== 'developer') return false;
      return canSeeNav('expenses') || canSeeNav('overhead_expenses') || canSeeNav('analytics') || can('expenses', 'view');
    }
    if (navKey === 'storeOps' || navKey === 'stock_operations') {
      return (
        canSeeNav('purchases') ||
        canSeeNav('stockMovements') ||
        canSeeNav('stockRequests') ||
        canSeeNav('inventoryCount') ||
        canSeeNav('cash_grv') ||
        canSeeNav('credit_grv') ||
        can('stockMovements', 'view') ||
        can('purchases', 'view')
      );
    }
    if (navKey === 'allIds' || navKey === 'inventory_items') {
      if (modulesEnabled?.items === false && user.role !== 'developer') return false;
      return canSeeNav('items') || canSeeNav('products') || canSeeNav('suppliers') || canSeeNav('employees') || canSeeNav('raw_materials') || can('items', 'view') || can('products', 'view');
    }
    if (navKey === 'reports' || navKey === 'reports_analytics') {
      const reportsEntry = nav['reports'] || nav['reports_analytics'];
      if (reportsEntry && reportsEntry[user.role] !== undefined) {
        if (Boolean(reportsEntry[user.role])) return true;
      }
      if (can('reports', 'view') || can('viewReports')) return true;
    }

    if (entry && entry[user.role] !== undefined) {
      if (Boolean(entry[user.role])) return true;
    }

    // 3. Fallback to Role Permissions Matrix Check (Admin/Developer configured permissions)
    if (rolePermissions) {
      const capKey = rolePermissions[navKey] ? navKey : rolePermissions[navKey.toLowerCase()] ? navKey.toLowerCase() : null;
      if (capKey) {
        return can(capKey, 'view') || can(capKey, 'read') || can(capKey);
      }
    }

    // 4. Default: Admin is allowed by default; check general view capability
    if (user.role === 'admin') return true;
    return can(navKey, 'view') || can(navKey);
  };

  const refreshPermissions = async (newSettings) => {
    let result = null;
    if (newSettings) {
      const rp = newSettings.rolePermissions ?? newSettings;
      const nv = newSettings.navVisibility ?? null;
      const me = newSettings.modulesEnabled ?? null;

      setRolePermissions(rp);
      localStorage.setItem('companyStockPermissions', JSON.stringify(rp));

      if (nv) {
        setNavVisibility(nv);
        localStorage.setItem('companyStockNavVisibility', JSON.stringify(nv));
      }
      if (me) {
        setModulesEnabled(me);
        localStorage.setItem('companyModulesEnabled', JSON.stringify(me));
      }
      if (newSettings.allowAdminThemeCustomization !== undefined) {
        setAllowAdminThemeCustomization(Boolean(newSettings.allowAdminThemeCustomization));
      }
      result = newSettings;
    } else {
      result = await fetchPermissions();
    }

    // Broadcast across tabs and local windows immediately
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('sharp_plus_sync');
        bc.postMessage({ type: 'PERMISSIONS_CHANGED', timestamp: Date.now() });
        bc.close();
      }
    } catch { }

    window.dispatchEvent(new CustomEvent('settings:updated', { detail: result }));
    return result;
  };

  const registerCompany = async (formData) => {
    setLoginInProgress(true);
    try {
      const res = await api.post('/auth/register-company', formData);
      const data = res.data;
      if (data.token) {
        const authData = data.user ? { ...data.user, token: data.token } : data;
        localStorage.setItem('companyStockAuth', JSON.stringify(authData));
        localStorage.removeItem('hotelStockAuth');
        localStorage.setItem('companyStockLastActivity', String(Date.now()));
        setUser(authData);
      }
      if (data.company) {
        setCompanyInfo(data.company);
        localStorage.setItem('companyProfileInfo', JSON.stringify(data.company));
      }
      await fetchPermissions();
      return data;
    } finally {
      setLoginInProgress(false);
    }
  };

  const updateCompanyInfo = (updated) => {
    setCompanyInfo((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('companyProfileInfo', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isDeveloper: user?.role === 'developer',
        isAdmin: user?.role === 'admin' || user?.role === 'developer',
        isEmployee: user?.role === 'employee' || ['storekeeper', 'cashier', 'manager'].includes(user?.role),
        canApprove,
        canCheck,
        canPost,
        isActorOfItem,
        user,
        loading,
        login,
        logout,
        updateUser,
        hasRole,
        can,
        canSeeNav,
        rolePermissions,
        navVisibility,
        modulesEnabled,
        setModulesEnabled,
        allowAdminManagePermissions,
        allowAdminVoidDelete,
        allowAdminThemeCustomization,
        companyInfo,
        setCompanyInfo,
        updateCompanyInfo,
        registerCompany,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
