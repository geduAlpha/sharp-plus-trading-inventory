import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setLoginInProgress } from '../api/axios';

const AuthContext = createContext(null);

export const DEFAULT_PERMISSIONS = {
  // Workflow capabilities
  recordGoods: { storekeeper: true, manager: true, admin: true, cashier: false },
  checkReview: { storekeeper: false, manager: true, admin: true, cashier: false },
  approveGoods: { storekeeper: false, manager: false, admin: true, cashier: false },
  postLedger: { storekeeper: false, manager: true, admin: true, cashier: false },
  voidTransactions: { storekeeper: false, manager: false, admin: true, cashier: false },
  viewReports: { storekeeper: false, manager: true, admin: true, cashier: false },
  manageAccounts: { storekeeper: false, manager: false, admin: true, cashier: false },

  // Granular CRUD permissions per module
  items: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: true },
    update: { storekeeper: true, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  products: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: true },
    update: { storekeeper: true, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  cashSales: {
    create: { storekeeper: true, manager: true, admin: true, cashier: true },
    read: { storekeeper: true, manager: true, admin: true, cashier: true },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  creditSales: {
    create: { storekeeper: false, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: true },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  customers: {
    create: { storekeeper: true, manager: true, admin: true, cashier: true },
    read: { storekeeper: true, manager: true, admin: true, cashier: true },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  suppliers: {
    create: { storekeeper: false, manager: true, admin: true, cashier: false },
    read: { storekeeper: false, manager: true, admin: true, cashier: false },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  purchases: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: false },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  stockMovements: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: false },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  stockRequests: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: false },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  consumption: {
    create: { storekeeper: true, manager: true, admin: true, cashier: false },
    read: { storekeeper: true, manager: true, admin: true, cashier: false },
    update: { storekeeper: false, manager: true, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  reports: {
    read: { storekeeper: false, manager: true, admin: true, cashier: false },
    export: { storekeeper: false, manager: true, admin: true, cashier: false },
  },
  staffAccounts: {
    create: { storekeeper: false, manager: false, admin: true, cashier: false },
    read: { storekeeper: false, manager: false, admin: true, cashier: false },
    update: { storekeeper: false, manager: false, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  settings: {
    read: { storekeeper: false, manager: false, admin: true, cashier: false },
    update: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
  recycleBin: {
    read: { storekeeper: false, manager: true, admin: true, cashier: false },
    restore: { storekeeper: false, manager: false, admin: true, cashier: false },
    delete: { storekeeper: false, manager: false, admin: true, cashier: false },
  },
};

export const DEFAULT_NAV_VISIBILITY = {
  dashboard: { storekeeper: true, manager: true, admin: true, cashier: true },
  Items: { storekeeper: true, manager: true, admin: true, cashier: false },
  items: { storekeeper: true, manager: true, admin: true, cashier: false },
  products: { storekeeper: true, manager: true, admin: true, cashier: true },
  stockMovements: { storekeeper: true, manager: true, admin: true, cashier: false },
  salesMarketing: { storekeeper: true, manager: true, admin: true, cashier: true },
  suppliers: { storekeeper: false, manager: true, admin: true, cashier: false },
  consumption: { storekeeper: true, manager: true, admin: true, cashier: false },
  reports: { storekeeper: false, manager: true, admin: true, cashier: false },
  analytics: { storekeeper: false, manager: true, admin: true, cashier: false },
  staffAccounts: { storekeeper: false, manager: false, admin: true, cashier: false },
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
      if (cachedRP) setRolePermissions(JSON.parse(cachedRP));
      if (cachedNV) setNavVisibility(JSON.parse(cachedNV));
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
      const email = emailOrData;
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

  const hasRole = (...roles) => user && roles.includes(user.role);

  /**
   * Check a workflow or CRUD capability
   * Usage examples:
   *   can('recordGoods')
   *   can('items', 'create')
   *   can('cashSales', 'delete')
   */
  const can = (capability, action) => {
    if (!user) return false;

    // 1. Check user custom permissions override (if assigned to this employee)
    if (user.customPermissions) {
      if (action && user.customPermissions[capability] && typeof user.customPermissions[capability] === 'object') {
        if (typeof user.customPermissions[capability][action] === 'boolean') {
          return user.customPermissions[capability][action];
        }
      }
      if (typeof user.customPermissions[capability] === 'boolean') {
        return user.customPermissions[capability];
      }
    }

    // 2. Admin role default
    if (user.role === 'admin') {
      if (action && rolePermissions?.[capability]?.[action]?.admin === false) return false;
      if (rolePermissions?.[capability]?.admin === false) return false;
      return true;
    }

    // 3. Granular CRUD action check
    if (action && rolePermissions?.[capability]?.[action]) {
      return Boolean(rolePermissions[capability][action][user.role]);
    }

    // 4. Capability / workflow check
    return Boolean(rolePermissions?.[capability]?.[user.role]);
  };

  /** Check whether a sidebar nav section is visible for this user's role */
  const canSeeNav = (navKey) => {
    if (!user) return false;
    const nav = navVisibility ?? DEFAULT_NAV_VISIBILITY;
    const entry =
      nav[navKey] ||
      nav[navKey.toLowerCase()] ||
      (navKey.toLowerCase() === 'items' ? (nav['Items'] || nav['items'] || nav['rawMaterials']) : undefined);
    if (!entry) return true;
    if (entry[user.role] !== undefined) return Boolean(entry[user.role]);
    if (user.role === 'admin') return true;
    const def = DEFAULT_NAV_VISIBILITY[navKey] || DEFAULT_NAV_VISIBILITY[navKey.toLowerCase()];
    if (def && def[user.role] !== undefined) return Boolean(def[user.role]);
    return true;
  };

  const refreshPermissions = async (newSettings) => {
    if (newSettings) {
      const rp = newSettings.rolePermissions ?? newSettings;
      const nv = newSettings.navVisibility ?? null;

      setRolePermissions(rp);
      localStorage.setItem('companyStockPermissions', JSON.stringify(rp));

      if (nv) {
        setNavVisibility(nv);
        localStorage.setItem('companyStockNavVisibility', JSON.stringify(nv));
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
