import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const DEFAULT_PERMISSIONS = {
  // Workflow capabilities
  recordGoods: { storekeeper: true, manager: true, admin: true },
  checkReview: { storekeeper: false, manager: true, admin: true },
  approveGoods: { storekeeper: false, manager: false, admin: true },
  postLedger: { storekeeper: false, manager: true, admin: true },
  voidTransactions: { storekeeper: false, manager: false, admin: true },
  viewReports: { storekeeper: false, manager: true, admin: true },
  manageAccounts: { storekeeper: false, manager: false, admin: true },

  // Granular CRUD permissions per module
  items: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: true, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  products: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: true, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  cashSales: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  creditSales: {
    create: { storekeeper: false, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  customers: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  suppliers: {
    create: { storekeeper: false, manager: true, admin: true },
    read: { storekeeper: false, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  purchases: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  stockMovements: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  stockRequests: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  consumption: {
    create: { storekeeper: true, manager: true, admin: true },
    read: { storekeeper: true, manager: true, admin: true },
    update: { storekeeper: false, manager: true, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  reports: {
    read: { storekeeper: false, manager: true, admin: true },
    export: { storekeeper: false, manager: true, admin: true },
  },
  staffAccounts: {
    create: { storekeeper: false, manager: false, admin: true },
    read: { storekeeper: false, manager: false, admin: true },
    update: { storekeeper: false, manager: false, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
  settings: {
    read: { storekeeper: false, manager: false, admin: true },
    update: { storekeeper: false, manager: false, admin: true },
  },
  recycleBin: {
    read: { storekeeper: false, manager: true, admin: true },
    restore: { storekeeper: false, manager: false, admin: true },
    delete: { storekeeper: false, manager: false, admin: true },
  },
};

export const DEFAULT_NAV_VISIBILITY = {
  dashboard: { storekeeper: true, manager: true, admin: true },
  Items: { storekeeper: true, manager: true, admin: true },
  products: { storekeeper: true, manager: true, admin: true },
  stockMovements: { storekeeper: true, manager: true, admin: true },
  salesMarketing: { storekeeper: true, manager: true, admin: true },
  suppliers: { storekeeper: false, manager: true, admin: true },
  consumption: { storekeeper: true, manager: true, admin: true },
  reports: { storekeeper: false, manager: true, admin: true },
  analytics: { storekeeper: false, manager: true, admin: true },
  staffAccounts: { storekeeper: false, manager: false, admin: true },
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
      return res.data;
    } catch (err) {
      // Fall back to localStorage caches or defaults
      const cachedRP = localStorage.getItem('companyStockPermissions');
      const cachedNV = localStorage.getItem('companyStockNavVisibility');
      if (cachedRP) setRolePermissions(JSON.parse(cachedRP));
      if (cachedNV) setNavVisibility(JSON.parse(cachedNV));
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
      } finally {
        await fetchPermissions();
        setLoading(false);
      }
    };
    initAuth();
  }, [fetchPermissions]);

  const login = async (userData) => {
    localStorage.setItem('companyStockAuth', JSON.stringify(userData));
    localStorage.removeItem('hotelStockAuth');
    setUser(userData);
    await fetchPermissions();
  };

  const logout = () => {
    localStorage.removeItem('companyStockAuth');
    localStorage.removeItem('hotelStockAuth');
    clearSettingsCache();
    setUser(null);
    setRolePermissions(DEFAULT_PERMISSIONS);
    setNavVisibility(DEFAULT_NAV_VISIBILITY);
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
    const entry = nav[navKey];
    if (!entry) return true;
    return Boolean(entry[user.role]);
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
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
