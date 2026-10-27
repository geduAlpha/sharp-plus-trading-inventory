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
    create: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    read: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
    edit: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    update: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    export: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
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
    view: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    read: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
    restore: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
    delete: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  },
};

export const DEFAULT_NAV_VISIBILITY = {
  dashboard: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  Items: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  items: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  products: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  stockMovements: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  salesMarketing: { employee: true, storekeeper: true, manager: true, admin: true, cashier: true },
  suppliers: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  consumption: { employee: false, storekeeper: false, manager: false, admin: false, cashier: false },
  reports: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  analytics: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  staffAccounts: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
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
  companyLogo: '',
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
          companyLogo: res.data.companyLogo || '',
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

    // 1. Check user custom permissions override (if assigned to this employee)
    if (user.customPermissions) {
      if (action && user.customPermissions[capability] && typeof user.customPermissions[capability] === 'object') {
        for (const ak of actionKeys) {
          if (typeof user.customPermissions[capability][ak] === 'boolean') {
            return user.customPermissions[capability][ak];
          }
        }
      }
      if (typeof user.customPermissions[capability] === 'boolean') {
        return user.customPermissions[capability];
      }
    }

    // 2. Admin role default
    if (user.role === 'admin') {
      if (action) {
        for (const ak of actionKeys) {
          if (rolePermissions?.[capability]?.[ak]?.admin === false) return false;
        }
      }
      if (rolePermissions?.[capability]?.admin === false) return false;
      return true;
    }

    // 3. Employee role check
    const effectiveRoles = [user.role];
    if (user.role === 'employee') effectiveRoles.push('storekeeper');

    if (action && rolePermissions?.[capability]) {
      for (const ak of actionKeys) {
        if (rolePermissions[capability][ak]) {
          for (const r of effectiveRoles) {
            if (rolePermissions[capability][ak][r] !== undefined) {
              return Boolean(rolePermissions[capability][ak][r]);
            }
          }
        }
      }
    }

    if (rolePermissions?.[capability]) {
      for (const r of effectiveRoles) {
        if (rolePermissions[capability][r] !== undefined) {
          return Boolean(rolePermissions[capability][r]);
        }
      }
    }

    return false;
  };

  /** Anti-self-approval helper */
  const canApprove = (item) => {
    if (!user) return false;
    if (user.role === 'developer') return true;
    if (!item) return false;
    const creatorId =
      item.performedBy?._id ||
      item.performedBy ||
      item.recordedBy?._id ||
      item.recordedBy ||
      item.requestedBy?._id ||
      item.requestedBy;
    if (creatorId && String(creatorId) === String(user._id)) {
      return false; // Segregation of duties: cannot approve own record
    }
    return user.role === 'admin' || can('approveGoods');
  };

  /** Check whether a sidebar nav section is visible for this user's role and custom permissions */
  const canSeeNav = (navKey) => {
    if (!user) return false;
    // Developer role has universal owner access to every single section
    if (user.role === 'developer') return true;
    if (!navKey) return true;

    // Company-level Sales & Marketing gate: Owner must have enabled it for company users to see it
    const isSalesKey =
      navKey === 'salesMarketing' ||
      navKey === 'cashSales' ||
      navKey === 'creditSales' ||
      navKey === 'sales_cash' ||
      navKey === 'sales_credit';

    if (isSalesKey && modulesEnabled?.salesMarketing === false && user.role !== 'developer') {
      return false;
    }

    // Special composite group checks
    if (navKey === 'salesMarketing') {
      return canSeeNav('cashSales') || canSeeNav('creditSales');
    }
    if (navKey === 'storeOps') {
      return (
        canSeeNav('purchases') ||
        canSeeNav('stockMovements') ||
        canSeeNav('stockRequests') ||
        canSeeNav('inventoryCount')
      );
    }

    // 1. Direct Employee Custom Permissions Override (Managed via Role Privileges)
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

    // 2. Role Permissions Matrix Check
    if (rolePermissions) {
      const capKey = rolePermissions[navKey] ? navKey : rolePermissions[navKey.toLowerCase()] ? navKey.toLowerCase() : null;
      if (capKey) {
        return can(capKey, 'view') || can(capKey, 'read') || can(capKey);
      }
    }

    // 3. Fallback to navVisibility dictionary if defined
    const nav = navVisibility ?? DEFAULT_NAV_VISIBILITY;
    const entry =
      nav[navKey] ||
      nav[navKey.toLowerCase()] ||
      (navKey.toLowerCase() === 'items' ? (nav['Items'] || nav['items'] || nav['rawMaterials']) : undefined);
    if (entry && entry[user.role] !== undefined) {
      return Boolean(entry[user.role]);
    }

    // 4. Default: Admin is allowed by default; employees check general capability
    if (user.role === 'admin') return true;
    return can(navKey, 'view') || can(navKey);
  };

  const refreshPermissions = async (newSettings) => {
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
      return newSettings;
    }
    return await fetchPermissions();
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
