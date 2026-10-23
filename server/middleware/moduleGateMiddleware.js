const Setting = require('../models/Setting');

let cachedModules = null;
let lastFetch = 0;

const getCachedModules = async () => {
  const now = Date.now();
  if (!cachedModules || now - lastFetch > 5000) {
    try {
      const setting = await Setting.findOne().select('modulesEnabled');
      cachedModules = setting?.modulesEnabled || { salesMarketing: true, accounting: true };
      lastFetch = now;
    } catch (err) {
      console.error('[moduleGateMiddleware] Error reading modules:', err.message);
      cachedModules = { salesMarketing: true, accounting: true };
    }
  }
  return cachedModules;
};

const clearModulesCache = () => {
  cachedModules = null;
  lastFetch = 0;
};

/**
 * Middleware factory that blocks requests if a module is deactivated by System Owner/Developer
 * @param {string} moduleKey - e.g. 'salesMarketing' | 'accounting'
 */
const checkModuleEnabled = (moduleKey) => {
  return async (req, res, next) => {
    // System Developer & Owner has unrestricted master access
    if (req.user && req.user.role === 'developer') {
      return next();
    }

    const modules = await getCachedModules();
    const isEnabled = modules && modules[moduleKey] !== false;

    if (!isEnabled) {
      const moduleName = moduleKey === 'salesMarketing' ? 'Sales & Marketing' : moduleKey;
      return res.status(403).json({
        success: false,
        code: 'MODULE_DISABLED',
        module: moduleKey,
        message: `Access Denied: The ${moduleName} module is currently deactivated by the System Owner & Developer. All data remains safe and preserved.`,
      });
    }

    next();
  };
};

module.exports = {
  checkModuleEnabled,
  clearModulesCache,
  getCachedModules,
};
