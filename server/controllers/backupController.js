const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');
const RawMaterial = require('../models/RawMaterial');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Purchase = require('../models/Purchase');
const StockRequest = require('../models/StockRequest');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Setting = require('../models/Setting');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

// ── GET /api/backup/export (Developer only) ───────────────────────────
const exportBackup = asyncHandler(async (req, res) => {
  const [
    materials,
    products,
    transactions,
    purchases,
    stockRequests,
    customers,
    suppliers,
    settings,
    users,
  ] = await Promise.all([
    RawMaterial.find({}).lean(),
    Product.find({}).lean(),
    StockTransaction.find({}).lean(),
    Purchase.find({}).lean(),
    StockRequest.find({}).lean(),
    Customer.find({}).lean(),
    Supplier.find({}).lean(),
    Setting.findOne({}).lean(),
    User.find({}).select('-password').lean(),
  ]);

  const backupPayload = {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      counts: {
        materials: materials.length,
        products: products.length,
        transactions: transactions.length,
        purchases: purchases.length,
        stockRequests: stockRequests.length,
        customers: customers.length,
        suppliers: suppliers.length,
        users: users.length,
      },
    },
    data: {
      materials,
      products,
      transactions,
      purchases,
      stockRequests,
      customers,
      suppliers,
      settings,
      users,
    },
  };

  await logAudit({
    req,
    action: 'BACKUP_EXPORT',
    module: 'backup',
    resourceName: 'Full System Snapshot',
    details: backupPayload.metadata.counts,
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="sharp-plus-backup-${new Date().toISOString().split('T')[0]}.json"`
  );
  res.json(backupPayload);
});

// ── POST /api/backup/recover-record (Developer only) ─────────────────
const recoverRecord = asyncHandler(async (req, res) => {
  const { module: recordModule, recordId, reason = 'Audited Developer Recovery' } = req.body;
  if (!recordModule || !recordId) {
    res.status(400);
    throw new Error('Module and recordId are required for record recovery');
  }

  let recoveredItem = null;

  switch (recordModule) {
    case 'stockMovements':
    case 'transactions': {
      const txn = await StockTransaction.findById(recordId);
      if (!txn) {
        res.status(404);
        throw new Error('Transaction record not found');
      }
      const prevStatus = txn.status;
      txn.status = 'approved';
      txn.deletedAt = null;
      txn.trail = txn.trail || [];
      txn.trail.push({
        action: 'recovered',
        by: req.user._id,
        byName: req.user.name,
        byRole: req.user.role,
        note: `Audited record recovery by System Developer. Previous status: ${prevStatus}. Reason: ${reason}`,
      });
      await txn.save();
      recoveredItem = txn;
      break;
    }

    case 'items':
    case 'materials': {
      const mat = await RawMaterial.findById(recordId);
      if (!mat) {
        res.status(404);
        throw new Error('Item record not found');
      }
      mat.isActive = true;
      mat.deletedAt = null;
      await mat.save();
      recoveredItem = mat;
      break;
    }

    case 'products': {
      const prod = await Product.findById(recordId);
      if (!prod) {
        res.status(404);
        throw new Error('Product record not found');
      }
      prod.isActive = true;
      prod.deletedAt = null;
      await prod.save();
      recoveredItem = prod;
      break;
    }

    case 'purchases': {
      const po = await Purchase.findById(recordId);
      if (!po) {
        res.status(404);
        throw new Error('Purchase record not found');
      }
      po.status = 'checked';
      po.deletedAt = null;
      po.trail = po.trail || [];
      po.trail.push({
        action: 'recovered',
        by: req.user._id,
        byName: req.user.name,
        byRole: req.user.role,
        note: `Audited recovery by System Developer. Reason: ${reason}`,
      });
      await po.save();
      recoveredItem = po;
      break;
    }

    case 'stockRequests': {
      const sr = await StockRequest.findById(recordId);
      if (!sr) {
        res.status(404);
        throw new Error('Stock request record not found');
      }
      sr.status = 'pending';
      sr.deletedAt = null;
      sr.trail = sr.trail || [];
      sr.trail.push({
        action: 'recovered',
        by: req.user._id,
        byName: req.user.name,
        byRole: req.user.role,
        note: `Audited recovery by System Developer. Reason: ${reason}`,
      });
      await sr.save();
      recoveredItem = sr;
      break;
    }

    default:
      res.status(400);
      throw new Error(`Unsupported recovery module: ${recordModule}`);
  }

  await logAudit({
    req,
    action: 'RECORD_RECOVERY',
    module: recordModule,
    resourceId: recordId,
    resourceName: recoveredItem?.name || recoveredItem?.voucherNo || recordId,
    details: { reason },
  });

  res.json({
    success: true,
    message: `Record successfully recovered by System Developer.`,
    recoveredItem,
  });
});

// ── GET /api/audit-logs (Developer & Administrator) ───────────────────
const getAuditLogs = asyncHandler(async (req, res) => {
  const { module: filterModule, action: filterAction, search, limit = 100, page = 1 } = req.query;

  const query = {};

  // Administrator can monitor employee activities; Developer sees everything
  if (req.user.role === 'admin') {
    query.userRole = { $ne: 'developer' };
  }

  if (filterModule && filterModule !== 'all') {
    query.module = filterModule;
  }

  if (filterAction && filterAction !== 'all') {
    query.action = filterAction;
  }

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { userName: { $regex: term, $options: 'i' } },
      { resourceName: { $regex: term, $options: 'i' } },
      { action: { $regex: term, $options: 'i' } },
    ];
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const skip = ((parseInt(page, 10) || 1) - 1) * parsedLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    logs,
    total,
    page: parseInt(page, 10) || 1,
    pages: Math.ceil(total / parsedLimit),
  });
});

module.exports = {
  exportBackup,
  recoverRecord,
  getAuditLogs,
};
