const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
      trim: true,
    },
    userRole: {
      type: String,
      default: 'system',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'CREATE',
        'UPDATE',
        'DELETE',
        'SOFT_DELETE',
        'RESTORE',
        'VOID',
        'APPROVE',
        'REJECT',
        'PERMISSIONS_CHANGE',
        'PERMISSIONS_UPDATE',
        'ROLE_CHANGE',
        'STATUS_CHANGE',
        'BACKUP_EXPORT',
        'BACKUP_RESTORE',
        'RECORD_RECOVERY',
        'MODULE_TOGGLE',
        'THEME_CHANGE',
      ],
    },
    module: {
      type: String,
      required: true,
      enum: [
        'auth',
        'users',
        'items',
        'products',
        'customers',
        'suppliers',
        'stockMovements',
        'purchases',
        'stockRequests',
        'consumption',
        'reports',
        'analytics',
        'settings',
        'recycleBin',
        'backup',
        'system',
      ],
    },
    resourceId: {
      type: String,
      default: '',
    },
    resourceName: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Indexes for high-speed filtering & queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
