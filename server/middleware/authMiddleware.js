const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Setting = require('../models/Setting');

const DEFAULT_ROLE_PERMISSIONS = {
  // ── Workflow capabilities ──────────────────────────────────────────────
  recordGoods: { employee: true, storekeeper: true, manager: true, admin: true, cashier: false },
  checkReview: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  approveGoods: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  postLedger: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  voidTransactions: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },
  viewReports: { employee: false, storekeeper: false, manager: true, admin: true, cashier: false },
  manageAccounts: { employee: false, storekeeper: false, manager: false, admin: true, cashier: false },

  // ── Granular CRUD & workflow actions per module ────────────────────────
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
 * @param {String} [action] - Specific action ('view'/'read', 'create', 'edit'/'update', 'delete', 'void', 'approve', 'export', 'restore', 'manageAccess')
 */
const hasPermission = async (userOrRole, capability, action) => {
  if (!userOrRole) return false;

  let role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  let customPermissions = typeof userOrRole === 'object' ? userOrRole.customPermissions : null;

  // Developer role has 100% unrestricted owner access over everything
  if (role === 'developer') return true;

  // Normalize action aliases
  const actionKeys = action
    ? [action]
    : [];
  if (action === 'view') actionKeys.push('read');
  if (action === 'read') actionKeys.push('view');
  if (action === 'edit') actionKeys.push('update');
  if (action === 'update') actionKeys.push('edit');

  // 1. Employee custom permission override
  if (customPermissions) {
    if (action && customPermissions[capability] && typeof customPermissions[capability] === 'object') {
      for (const ak of actionKeys) {
        if (typeof customPermissions[capability][ak] === 'boolean') {
          return customPermissions[capability][ak];
        }
      }
    }
    if (typeof customPermissions[capability] === 'boolean') {
      return customPermissions[capability];
    }
  }

  // 2. Global Role Permissions
  const rolePermissions = await getCachedRolePermissions();

  const isVoidOrDelete =
    capability === 'voidTransactions' ||
    (action && ['void', 'delete'].includes(action) && ['stockMovements', 'purchases', 'transactions'].includes(capability));

  // ONLY Developer and Admin can ever void/delete transactions; all other roles are strictly prohibited
  if (isVoidOrDelete && role !== 'developer' && role !== 'admin') {
    return false;
  }

  if (role === 'admin') {
    // Admin access must be given by the System Developer/Owner to delete/void
    if (isVoidOrDelete) {
      const hasVoidAdminAuth = Boolean(cachedSettings?.allowAdminVoidDelete || rolePermissions?.voidTransactions?.admin);
      if (!hasVoidAdminAuth) return false;
    }

    // Admin has access unless specifically set to false for admin
    if (action) {
      for (const ak of actionKeys) {
        if (rolePermissions?.[capability]?.[ak]?.admin === false) return false;
      }
    }
    if (rolePermissions?.[capability]?.admin === false) return false;
    return true;
  }

  // For employee role (or legacy employee roles: storekeeper, cashier, manager)
  const effectiveRoles = [role];
  if (role === 'employee') {
    effectiveRoles.push('storekeeper');
  }

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

      // Check if user's company access has been granted by System Developer
      if (req.user.role !== 'developer' && req.user.company) {
        const Company = require('../models/Company');
        const comp = await Company.findById(req.user.company).select('accessGranted status');
        if (comp && (comp.accessGranted === false || comp.status === 'suspended')) {
          res.status(403);
          throw new Error('Access for this company has been suspended by the System Developer. Please contact system administration.');
        }
      }

      return next();
    } catch (error) {
      if (error.statusCode === 403 || error.message?.includes('suspended')) {
        res.status(403);
        throw error;
      }
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  res.status(401);
  throw new Error('Not authorized, no token provided');
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, no user found');
    }
    // System Developer has universal override over all role authorizations
    if (req.user.role === 'developer') {
      return next();
    }
    // If route authorizes admin, admin is permitted
    if (roles.includes('admin') && req.user.role === 'admin') {
      return next();
    }
    // If route authorizes employee, admin and employee (and legacy sub-roles) are permitted
    if (roles.includes('employee')) {
      if (
        req.user.role === 'admin' ||
        req.user.role === 'employee' ||
        ['storekeeper', 'cashier', 'manager'].includes(req.user.role)
      ) {
        return next();
      }
    }
    // Direct role match
    if (roles.includes(req.user.role)) {
      return next();
    }
    res.status(403);
    throw new Error(`Role '${req.user.role}' is not permitted to perform this action`);
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
