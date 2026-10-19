const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Setting = require('../models/Setting');

const DEFAULT_ROLE_PERMISSIONS = {
  // ── Existing workflow capabilities ──────────────────────────────────────
  recordGoods: { storekeeper: true, manager: true, admin: true },
  checkReview: { storekeeper: false, manager: true, admin: true },
  approveGoods: { storekeeper: false, manager: false, admin: true },
  postLedger: { storekeeper: false, manager: true, admin: true },
  voidTransactions: { storekeeper: false, manager: false, admin: true },
  viewReports: { storekeeper: false, manager: true, admin: true },
  manageAccounts: { storekeeper: false, manager: false, admin: true },

  // ── Granular CRUD permissions per module ────────────────────────────────
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

let cachedSettings = null;
let lastSettingsFetch = 0;

const getCachedRolePermissions = async () => {
  const now = Date.now();
  if (!cachedSettings || now - lastSettingsFetch > 5000) {
    try {
      cachedSettings = await Setting.findOne();
      lastSettingsFetch = now;
    } catch (err) {
      console.error('Error fetching settings in authMiddleware:', err);
    }
  }
  return cachedSettings?.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
};

const clearSettingsCache = () => {
  cachedSettings = null;
  lastSettingsFetch = 0;
};

/**
 * Check if a user or role has permission for a capability and optional action
 * @param {Object|String} userOrRole - User object or role string
 * @param {String} capability - Module or workflow key (e.g., 'items', 'recordGoods')
 * @param {String} [action] - Specific CRUD action (e.g., 'create', 'read', 'update', 'delete')
 */
const hasPermission = async (userOrRole, capability, action) => {
  if (!userOrRole) return false;

  let role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  let customPermissions = typeof userOrRole === 'object' ? userOrRole.customPermissions : null;

  // 1. Employee custom permission override
  if (customPermissions) {
    if (action && customPermissions[capability] && typeof customPermissions[capability] === 'object') {
      if (typeof customPermissions[capability][action] === 'boolean') {
        return customPermissions[capability][action];
      }
    }
    if (typeof customPermissions[capability] === 'boolean') {
      return customPermissions[capability];
    }
  }

  // 2. Global Role Permissions
  const rolePermissions = await getCachedRolePermissions();

  if (role === 'admin') {
    if (action && rolePermissions?.[capability]?.[action]?.admin === false) return false;
    if (rolePermissions?.[capability]?.admin === false) return false;
    return true;
  }

  if (action && rolePermissions?.[capability]?.[action]) {
    return Boolean(rolePermissions[capability][action][role]);
  }

  return Boolean(rolePermissions?.[capability]?.[role]);
};

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        res.status(401);
        throw new Error('Not authorized, account inactive or not found');
      }
      return next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  res.status(401);
  throw new Error('Not authorized, no token provided');
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user ? req.user.role : 'guest'}' is not permitted to perform this action`);
    }
    next();
  };
};

const authorizePermission = (capability, action) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, no user found');
    }
    const permitted = await hasPermission(req.user, capability, action);
    if (!permitted) {
      res.status(403);
      throw new Error(
        `Access denied: You do not have permission to perform this action (${capability}${
          action ? `:${action}` : ''
        })`
      );
    }
    next();
  });
};

module.exports = {
  protect,
  authorize,
  authorizePermission,
  hasPermission,
  clearSettingsCache,
  getCachedRolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
};
