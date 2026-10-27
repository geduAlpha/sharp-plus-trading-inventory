const asyncHandler = require('express-async-handler');
const Setting = require('../models/Setting');
const { DEFAULT_THEME_CONFIG, DEFAULT_SIDEBAR_CONFIG } = Setting;
const { clearSettingsCache, DEFAULT_ROLE_PERMISSIONS } = require('../middleware/authMiddleware');
const tg = require('../utils/telegramNotifier');

const DEFAULT_NAV_VISIBILITY = {
  dashboard: { storekeeper: true, manager: true, admin: true },
  Items: { storekeeper: true, manager: true, admin: true },
  items: { storekeeper: true, manager: true, admin: true },
  products: { storekeeper: true, manager: true, admin: true },
  stockMovements: { storekeeper: true, manager: true, admin: true },
  suppliers: { storekeeper: false, manager: true, admin: true },
  consumption: { storekeeper: true, manager: true, admin: true },
  reports: { storekeeper: false, manager: true, admin: true },
  analytics: { storekeeper: false, manager: true, admin: true },
  staffAccounts: { storekeeper: false, manager: false, admin: true },
};

// @desc   Get system settings (creates default if none exists)
// @route  GET /api/settings
// @access Private
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({
      companyName: 'Sharp Plus',
      systemEmail: 'info@Sharp Plus.com',
      phone: '+251 911 000 111',
      address: 'Addis Ababa, Ethiopia',
      currency: 'ETB',
      currencySymbol: 'ETB',
      lowStockThresholdDefault: 15,
      taxRate: 15,
      autoGenerateVoucherNo: true,
      allowNegativeStock: false,
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      navVisibility: DEFAULT_NAV_VISIBILITY,
      themeConfig: DEFAULT_THEME_CONFIG,
      sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
      modulesEnabled: { salesMarketing: true, accounting: true },
      auditLogs: [],
    });
  } else {
    let modified = false;
    if (!settings.rolePermissions) {
      settings.rolePermissions = DEFAULT_ROLE_PERMISSIONS;
      settings.markModified('rolePermissions');
      modified = true;
    }
    if (!settings.navVisibility) {
      settings.navVisibility = DEFAULT_NAV_VISIBILITY;
      settings.markModified('navVisibility');
      modified = true;
    }
    if (!settings.themeConfig || Object.keys(settings.themeConfig).length === 0) {
      settings.themeConfig = DEFAULT_THEME_CONFIG;
      settings.markModified('themeConfig');
      modified = true;
    }
    if (!settings.sidebarConfig || !Array.isArray(settings.sidebarConfig) || settings.sidebarConfig.length === 0) {
      settings.sidebarConfig = DEFAULT_SIDEBAR_CONFIG;
      settings.markModified('sidebarConfig');
      modified = true;
    }
    if (!settings.modulesEnabled || typeof settings.modulesEnabled !== 'object') {
      settings.modulesEnabled = { salesMarketing: true, accounting: true };
      settings.markModified('modulesEnabled');
      modified = true;
    }
    if (!Array.isArray(settings.auditLogs)) {
      settings.auditLogs = [];
      settings.markModified('auditLogs');
      modified = true;
    }
    if (modified) await settings.save();
  }
  res.json(settings);
});

// @desc   Update system settings
// @route  PUT /api/settings
// @access Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = new Setting();
  }

  // Restrict global theme, sidebar, module activation, admin delegation, and role permissions configuration exclusively to System Owner/Developer
  const isPrivilegedSettingUpdate =
    req.body.rolePermissions !== undefined ||
    req.body.themeConfig !== undefined ||
    req.body.sidebarConfig !== undefined ||
    req.body.modulesEnabled !== undefined ||
    req.body.allowAdminManagePermissions !== undefined ||
    req.body.allowAdminVoidDelete !== undefined;

  if (isPrivilegedSettingUpdate && req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: Only the authenticated System Developer & Owner can manage role permissions, administrator authority delegation, global appearance, or system module activation.');
  }

  const stringFields = [
    'companyName', 'tradeName', 'systemEmail', 'phone', 'address',
    'city', 'country', 'tinNumber', 'website', 'companyLogo',
    'ownerName', 'ownerEmail', 'ownerPhone', 'notes',
    'rawMaterialPriceAdjustType',
  ];

  const booleanFields = [
    'autoGenerateVoucherNo', 'allowNegativeStock', 'isConfigured',
  ];

  const numericFields = [
    'currencySymbol', 'currency', // handle string/symbol
    'lowStockThresholdDefault', 'taxRate',
    'contingencyPercent', 'overheadPercent', 'defaultFoodCostPercent',
    'rawMaterialPriceAdjustValue', 'productSellingPriceAdjustPercent',
  ];

  stringFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      settings[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : String(req.body[field] || '');
    }
  });

  booleanFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      settings[field] = Boolean(req.body[field]);
    }
  });

  if (req.body.allowAdminManagePermissions !== undefined && req.user?.role === 'developer') {
    const prevAuth = settings.allowAdminManagePermissions;
    settings.allowAdminManagePermissions = Boolean(req.body.allowAdminManagePermissions);
    if (!Array.isArray(settings.auditLogs)) settings.auditLogs = [];
    settings.auditLogs.unshift({
      action: 'ADMIN_DELEGATION_TOGGLED',
      details: `Administrator employee permission management authority set to ${settings.allowAdminManagePermissions ? 'ENABLED' : 'DISABLED'} by System Developer & Owner`,
      actorId: req.user?._id,
      actorName: req.user?.name || 'System Developer & Owner',
      actorRole: 'developer',
      timestamp: new Date(),
    });
  }

  if (req.body.allowAdminVoidDelete !== undefined && req.user?.role === 'developer') {
    settings.allowAdminVoidDelete = Boolean(req.body.allowAdminVoidDelete);
    if (!Array.isArray(settings.auditLogs)) settings.auditLogs = [];
    settings.auditLogs.unshift({
      action: 'ADMIN_VOID_DELETE_DELEGATION_TOGGLED',
      details: `Administrator transaction void & delete authority set to ${settings.allowAdminVoidDelete ? 'ENABLED' : 'DISABLED'} by System Developer & Owner`,
      actorId: req.user?._id,
      actorName: req.user?.name || 'System Developer & Owner',
      actorRole: 'developer',
      timestamp: new Date(),
    });
  }

  if (req.body.currency !== undefined && req.body.currency !== null) {
    settings.currency = String(req.body.currency).trim();
  }
  if (req.body.currencySymbol !== undefined && req.body.currencySymbol !== null) {
    settings.currencySymbol = String(req.body.currencySymbol).trim();
  }

  // Safe numeric conversion (never cast empty string or null into NaN)
  const numbersToConvert = [
    { field: 'lowStockThresholdDefault', defaultVal: 15 },
    { field: 'taxRate', defaultVal: 15 },
    { field: 'contingencyPercent', defaultVal: 10 },
    { field: 'overheadPercent', defaultVal: 25 },
    { field: 'defaultFoodCostPercent', defaultVal: 30 },
    { field: 'rawMaterialPriceAdjustValue', defaultVal: 0 },
    { field: 'productSellingPriceAdjustPercent', defaultVal: 0 },
  ];

  numbersToConvert.forEach(({ field, defaultVal }) => {
    if (req.body[field] !== undefined) {
      if (req.body[field] === '' || req.body[field] === null) {
        settings[field] = defaultVal;
      } else {
        const val = Number(req.body[field]);
        settings[field] = isNaN(val) ? defaultVal : val;
      }
    }
  });

  if (!Array.isArray(settings.auditLogs)) {
    settings.auditLogs = [];
  }

  if (req.body.rolePermissions !== undefined && typeof req.body.rolePermissions === 'object') {
    settings.rolePermissions = req.body.rolePermissions;
    settings.markModified('rolePermissions');
    clearSettingsCache();

    settings.auditLogs.unshift({
      action: 'ROLE_PERMISSIONS_UPDATED',
      details: `Role Privileges Matrix updated by ${req.user?.name || 'System Developer & Owner'}`,
      actorId: req.user?._id,
      actorName: req.user?.name || 'System Developer & Owner',
      actorRole: req.user?.role || 'developer',
      timestamp: new Date(),
    });

    try {
      const { logAudit } = require('../utils/auditLogger');
      logAudit({
        req,
        action: 'PERMISSIONS_CHANGE',
        module: 'settings',
        resourceName: 'Role Privileges Matrix',
        details: { actor: req.user?.name, role: req.user?.role },
      });
    } catch {}
  }

  if (req.body.navVisibility !== undefined && typeof req.body.navVisibility === 'object') {
    settings.navVisibility = req.body.navVisibility;
    settings.markModified('navVisibility');
  }

  // System Modules ON/OFF Control with Audit Trail
  if (req.body.modulesEnabled !== undefined && typeof req.body.modulesEnabled === 'object') {
    const prevModules = settings.modulesEnabled || {};
    settings.modulesEnabled = {
      ...prevModules,
      ...req.body.modulesEnabled,
    };
    settings.markModified('modulesEnabled');

    for (const [modKey, val] of Object.entries(req.body.modulesEnabled)) {
      if (prevModules[modKey] !== val) {
        settings.auditLogs.unshift({
          action: 'MODULE_TOGGLED',
          module: modKey,
          details: `Module "${modKey === 'salesMarketing' ? 'Sales & Marketing' : modKey}" switched ${val ? 'ON (Activated)' : 'OFF (Deactivated)'}`,
          actorId: req.user?._id,
          actorName: req.user?.name || 'System Owner',
          actorRole: req.user?.role || 'developer',
          timestamp: new Date(),
        });
      }
    }

    try {
      const { clearModulesCache } = require('../middleware/moduleGateMiddleware');
      clearModulesCache();
    } catch {}
  }

  // Theme & Appearance Configuration with Audit Trail
  if (req.body.themeConfig !== undefined && typeof req.body.themeConfig === 'object') {
    const prevTheme = settings.themeConfig?.theme;
    settings.themeConfig = {
      ...(settings.themeConfig || DEFAULT_THEME_CONFIG),
      ...req.body.themeConfig,
    };
    settings.markModified('themeConfig');

    if (req.body.themeConfig.theme && req.body.themeConfig.theme !== prevTheme) {
      settings.auditLogs.unshift({
        action: 'THEME_UPDATED',
        details: `Global appearance theme changed to "${req.body.themeConfig.theme}"`,
        actorId: req.user?._id,
        actorName: req.user?.name || 'System Owner',
        actorRole: req.user?.role || 'developer',
        timestamp: new Date(),
      });
    }
  }

  if (req.body.sidebarConfig !== undefined && Array.isArray(req.body.sidebarConfig)) {
    settings.sidebarConfig = req.body.sidebarConfig;
    settings.markModified('sidebarConfig');
  }

  // Cap auditLogs to last 150 items
  if (settings.auditLogs.length > 150) {
    settings.auditLogs = settings.auditLogs.slice(0, 150);
    settings.markModified('auditLogs');
  }

  const updated = await settings.save();
  clearSettingsCache();

  try {
    if (tg && typeof tg.notifySettingsChanged === 'function') {
      tg.notifySettingsChanged(req.body, req.user);
    }
  } catch (tgErr) {
    console.warn('[Telegram] Could not notify settings changed:', tgErr.message);
  }

  res.json(updated);
});

// @desc   Apply bulk % increase to ALL product selling prices
// @route  POST /api/settings/apply-product-price-adjustment
// @access Private/Admin
const applyProductPriceAdjustment = asyncHandler(async (req, res) => {
  const { percent } = req.body;
  const pct = Number(percent);
  if (!pct || pct <= 0 || pct > 500) {
    res.status(400); throw new Error('Percent must be between 0.01 and 500');
  }

  const Product = require('../models/Product');

  // Fetch all active products
  const products = await Product.find({ isActive: true });
  let updatedCount = 0;

  for (const product of products) {
    const oldPrice = product.sellingPrice || 0;
    if (oldPrice > 0) {
      product.sellingPrice = Math.round(oldPrice * (1 + pct / 100) * 100) / 100;
      await product.save();
      updatedCount++;
    }
  }

  tg.notifySettingsChanged && tg.notifySettingsChanged(
    { action: `Bulk product price +${pct}%`, updatedCount },
    req.user
  );

  res.json({
    message: `Successfully applied +${pct}% to ${updatedCount} product selling prices.`,
    updatedCount,
    percent: pct,
  });
});

// @desc   Get public company profile (safe fields for guest/login views)
// @route  GET /api/settings/public
// @access Public
const getPublicCompanyProfile = asyncHandler(async (req, res) => {
  let settings = await Setting.findOne();
  if (!settings) {
    return res.json({
      companyName: 'Sharp Plus',
      tradeName: 'Sharp Plus',
      systemEmail: 'info@Sharp Plus.com',
      phone: '+251 911 000 111',
      address: 'Addis Ababa, Ethiopia',
      city: 'Addis Ababa',
      country: 'Ethiopia',
      currency: 'ETB',
      currencySymbol: 'ETB',
      taxRate: 15,
      companyLogo: '',
      tinNumber: '',
      isConfigured: false,
    });
  }
  res.json({
    companyName: settings.companyName || 'Sharp Plus',
    tradeName: settings.tradeName || settings.companyName || 'Sharp Plus',
    systemEmail: settings.systemEmail || '',
    phone: settings.phone || '',
    address: settings.address || '',
    city: settings.city || 'Addis Ababa',
    country: settings.country || 'Ethiopia',
    currency: settings.currency || 'ETB',
    currencySymbol: settings.currencySymbol || 'ETB',
    companyLogo: settings.companyLogo || '',
    tinNumber: settings.tinNumber || '',
    taxRate: settings.taxRate !== undefined ? settings.taxRate : 15,
    ownerName: settings.ownerName || '',
    isConfigured: settings.isConfigured || false,
    registeredAt: settings.registeredAt,
  });
});

module.exports = {
  getSettings,
  updateSettings,
  applyProductPriceAdjustment,
  getPublicCompanyProfile,
};

