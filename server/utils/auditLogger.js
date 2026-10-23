const AuditLog = require('../models/AuditLog');

/**
 * Asynchronously record an audited event
 * @param {Object} params
 * @param {Object} [params.req] - Express request object (extracts user, ip, userAgent)
 * @param {Object} [params.user] - User object override
 * @param {String} params.action - CREATE, UPDATE, DELETE, VOID, APPROVE, REJECT, RESTORE, etc.
 * @param {String} params.module - items, products, stockMovements, purchases, users, etc.
 * @param {String} [params.resourceId] - ID of modified entity
 * @param {String} [params.resourceName] - Human readable title/code
 * @param {Object} [params.details] - Extra details, diffs, or reasons
 */
const logAudit = async ({ req, user, action, module, resourceId = '', resourceName = '', details = {} }) => {
  try {
    const actingUser = user || req?.user;
    const ip = req ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '' : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      user: actingUser?._id || null,
      userName: actingUser?.name || 'System',
      userRole: actingUser?.role || 'system',
      company: actingUser?.company || null,
      action,
      module,
      resourceId: String(resourceId || ''),
      resourceName: String(resourceName || ''),
      details,
      ip: String(ip),
      userAgent: String(userAgent),
    });
  } catch (err) {
    // Audit logging should never crash the main application request
    console.warn('[AuditLogger] Failed to write audit record:', err.message);
  }
};

module.exports = { logAudit };
