const asyncHandler = require('express-async-handler');
const RawMaterial = require('../models/RawMaterial');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Purchase = require('../models/Purchase');
const Consumption = require('../models/Consumption');
const StockRequest = require('../models/StockRequest');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const { invalidateDashboardCache } = require('./dashboardController');
const { VOUCHER_DIRECTION } = require('../models/StockTransaction');
const tg = require('../utils/telegramNotifier');
const notify = require('../utils/notificationHelper');
const { logAudit } = require('../utils/auditLogger');

// ── Privilege Check Helper ──────────────────────────────────────────
// Developer/Owner has unrestricted authority.
// Admin is only authorized if Developer/Owner has granted explicit privilege in Settings.
const checkOwnerOrAdminPrivilege = async (user, actionDesc = 'perform this action') => {
  if (user?.role === 'developer') return true;
  if (user?.role === 'admin') {
    const Setting = require('../models/Setting');
    const settings = await Setting.findOne().lean();
    const adminAllowed = Boolean(
      settings?.allowAdminVoidDelete ||
      settings?.rolePermissions?.voidTransactions?.admin
    );
    if (adminAllowed) return true;
    const err = new Error(
      `Access denied: System Developer & Owner has not granted Admin permission to ${actionDesc}. Please contact the Developer/Owner to enable Admin void/delete/restore privileges.`
    );
    err.statusCode = 403;
    throw err;
  }
  const err = new Error(`Access denied: Only System Developer & Owner or authorized Admin can ${actionDesc}.`);
  err.statusCode = 403;
  throw err;
};

// ── GET /api/recycle-bin ─────────────────────────────────────────────
// Returns all soft-deleted and voided records across all system collections
const getRecycleBin = asyncHandler(async (req, res) => {
  const [
    materials,
    suppliers,
    products,
    transactions,
    purchases,
    consumptions,
    stockRequests,
    employees,
    customers,
  ] = await Promise.all([
    RawMaterial.find({
      $or: [{ isActive: false, deletedAt: { $ne: null } }, { deletedAt: { $ne: null } }],
    }).lean().catch(() => []),

    Supplier.find({
      $or: [{ isActive: false, deletedAt: { $ne: null } }, { deletedAt: { $ne: null } }],
    }).lean().catch(() => []),

    Product.find({
      $or: [{ isActive: false, deletedAt: { $ne: null } }, { deletedAt: { $ne: null } }],
    }).populate('ingredients.material', 'name unit').lean().catch(() => []),

    StockTransaction.find({
      $or: [{ deletedAt: { $ne: null } }, { status: 'voided' }],
    })
      .populate('supplier', 'name')
      .populate('performedBy', 'name')
      .populate('items.material', 'name unit')
      .lean().catch(() => []),

    Purchase.find({
      $or: [{ deletedAt: { $ne: null } }, { status: 'cancelled' }],
    })
      .populate('supplier', 'name')
      .populate('items.material', 'name unit')
      .populate('recordedBy', 'name')
      .lean().catch(() => []),

    Consumption.find({
      $or: [{ deletedAt: { $ne: null } }, { status: 'voided' }],
    })
      .populate('items.product', 'name code')
      .populate('performedBy', 'name')
      .lean().catch(() => []),

    StockRequest.find({ deletedAt: { $ne: null } })
      .populate('requestedBy', 'name')
      .populate('items.material', 'name unit')
      .lean().catch(() => []),

    Employee.find({ deletedAt: { $ne: null } }).lean().catch(() => []),

    Customer.find({
      $or: [{ isActive: false, deletedAt: { $ne: null } }, { deletedAt: { $ne: null } }],
    }).lean().catch(() => []),
  ]);

  const items = [
    ...materials.map((m) => ({
      ...m,
      _type: 'material',
      _typeLabel: 'Item / Material',
      deletedAt: m.deletedAt || m.updatedAt,
      isVoided: false,
    })),
    ...suppliers.map((s) => ({
      ...s,
      _type: 'supplier',
      _typeLabel: 'Supplier',
      deletedAt: s.deletedAt || s.updatedAt,
      isVoided: false,
    })),
    ...products.map((p) => ({
      ...p,
      _type: 'product',
      _typeLabel: 'Product',
      deletedAt: p.deletedAt || p.updatedAt,
      isVoided: false,
    })),
    ...transactions.map((t) => ({
      ...t,
      _type: 'transaction',
      _typeLabel: 'Stock Transaction',
      deletedAt: t.deletedAt || t.updatedAt,
      isVoided: t.status === 'voided',
    })),
    ...purchases.map((po) => ({
      ...po,
      _type: 'purchase',
      _typeLabel: 'Purchase Order',
      deletedAt: po.deletedAt || po.updatedAt,
      isVoided: po.status === 'cancelled',
    })),
    ...consumptions.map((c) => ({
      ...c,
      _type: 'consumption',
      _typeLabel: 'Consumption Record',
      deletedAt: c.deletedAt || c.updatedAt,
      isVoided: c.status === 'voided',
    })),
    ...stockRequests.map((sr) => ({
      ...sr,
      _type: 'stockRequest',
      _typeLabel: 'Stock Request',
      deletedAt: sr.deletedAt || sr.updatedAt,
      isVoided: false,
    })),
    ...employees.map((e) => ({
      ...e,
      _type: 'employee',
      _typeLabel: 'Employee',
      deletedAt: e.deletedAt || e.updatedAt,
      isVoided: false,
    })),
    ...customers.map((c) => ({
      ...c,
      _type: 'customer',
      _typeLabel: 'Customer',
      deletedAt: c.deletedAt || c.updatedAt,
      isVoided: false,
    })),
  ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  res.json(items);
});

// ── POST /api/recycle-bin/:type/:id/restore ──────────────────────────
// Privilege check: System Developer & Owner or Admin with Owner Privileges granted
const restoreItem = asyncHandler(async (req, res) => {
  await checkOwnerOrAdminPrivilege(req.user, 'restore items from the Recycle Bin');

  const { type, id } = req.params;

  if (type === 'material') {
    const doc = await RawMaterial.findById(id);
    if (!doc) { res.status(404); throw new Error('Item not found'); }
    doc.isActive = true;
    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    await doc.save();
    tg.notifyRestored('Raw Material', doc.name, req.user);
    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'material', resourceId: id, resourceName: doc.name });
    return res.json({ message: `Item "${doc.name}" restored successfully.` });
  }

  if (type === 'supplier') {
    const doc = await Supplier.findById(id);
    if (!doc) { res.status(404); throw new Error('Supplier not found'); }
    doc.isActive = true;
    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    await doc.save();
    tg.notifyRestored('Supplier', doc.name, req.user);
    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'supplier', resourceId: id, resourceName: doc.name });
    return res.json({ message: `Supplier "${doc.name}" restored successfully.` });
  }

  if (type === 'product') {
    const doc = await Product.findById(id);
    if (!doc) { res.status(404); throw new Error('Product not found'); }
    doc.isActive = true;
    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    await doc.save();
    tg.notifyRestored('Product', doc.name, req.user);
    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'product', resourceId: id, resourceName: doc.name });
    return res.json({ message: `Product "${doc.name}" restored successfully.` });
  }

  if (type === 'transaction') {
    const doc = await StockTransaction.findById(id);
    if (!doc) { res.status(404); throw new Error('Transaction not found'); }

    // Re-apply stock if it was previously checked/approved/posted or needed
    const direction = doc.type || VOUCHER_DIRECTION[doc.voucherType];
    const wasApplied = ['checked', 'approved', 'posted'].includes(doc.status ?? 'pending') || doc.stockApplied;
    if (wasApplied || doc.status === 'voided') {
      const items = doc.items?.length ? doc.items : [{ material: doc.material, quantity: doc.quantity }];
      for (const item of items) {
        if (!item.material) continue;
        const mat = await RawMaterial.findById(item.material);
        if (mat) {
          mat.currentStock += direction === 'in' ? item.quantity : -item.quantity;
          await mat.save();
        }
      }
      doc.stockApplied = true;
    }

    if (doc.status === 'voided') {
      doc.status = 'pending';
    }

    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    doc.trail = doc.trail || [];
    doc.trail.push({
      action: 'restored',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: `Restored from Recycle Bin by ${req.user.name} (${req.user.role})`,
    });
    await doc.save();

    tg.notifyRestored('Transaction', doc.voucherNo || doc._id.toString().slice(-6), req.user);
    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'transaction', resourceId: id, resourceName: doc.voucherNo || String(id) });
    return res.json({ message: `Transaction "${doc.voucherNo || id}" restored and stock re-applied.` });
  }

  if (type === 'purchase') {
    const doc = await Purchase.findById(id);
    if (!doc) { res.status(404); throw new Error('Purchase not found'); }

    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    if (doc.status === 'cancelled') {
      doc.status = 'draft';
    }
    doc.trail = doc.trail || [];
    doc.trail.push({
      action: 'restored',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: `Restored from Recycle Bin by ${req.user.name} (${req.user.role})`,
    });
    await doc.save();

    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'purchase', resourceId: id, resourceName: doc.invoiceNumber || String(id) });
    return res.json({ message: 'Purchase order restored successfully.' });
  }

  if (type === 'consumption') {
    const doc = await Consumption.findById(id);
    if (!doc) { res.status(404); throw new Error('Consumption record not found'); }

    doc.deletedAt = null;
    doc.deletedBy = null;
    if (doc.status === 'voided') {
      doc.status = 'pending';
    }
    doc.trail = doc.trail || [];
    doc.trail.push({
      action: 'restored',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: `Restored from Recycle Bin by ${req.user.name} (${req.user.role})`,
    });
    await doc.save();

    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'consumption', resourceId: id, resourceName: doc.voucherNo || String(id) });
    return res.json({ message: `Consumption "${doc.voucherNo || id}" restored successfully.` });
  }

  if (type === 'stockRequest') {
    const doc = await StockRequest.findById(id);
    if (!doc) { res.status(404); throw new Error('Stock request not found'); }

    doc.deletedAt = null;
    doc.deletedBy = null;
    if (doc.status === 'cancelled' || doc.status === 'rejected') {
      doc.status = 'pending';
    }
    await doc.save();

    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'stockRequest', resourceId: id, resourceName: doc.voucherNo || String(id) });
    return res.json({ message: `Stock request "${doc.voucherNo || id}" restored.` });
  }

  if (type === 'employee') {
    const doc = await Employee.findById(id);
    if (!doc) { res.status(404); throw new Error('Employee not found'); }

    doc.deletedAt = null;
    doc.deletedBy = null;
    await doc.save();

    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'employee', resourceId: id, resourceName: `${doc.firstName} ${doc.lastName}` });
    return res.json({ message: `Employee "${doc.firstName} ${doc.lastName}" restored.` });
  }

  if (type === 'customer') {
    const doc = await Customer.findById(id);
    if (!doc) { res.status(404); throw new Error('Customer not found'); }

    doc.isActive = true;
    doc.deletedAt = null;
    doc.deletedBy = null;
    doc.deletedFrom = null;
    await doc.save();

    invalidateDashboardCache();
    await logAudit({ req, action: 'RECYCLE_RESTORE', module: 'customer', resourceId: id, resourceName: doc.name });
    return res.json({ message: `Customer "${doc.name}" restored.` });
  }

  res.status(400);
  throw new Error(`Unknown type: ${type}`);
});

// ── DELETE /api/recycle-bin/:type/:id (permanent delete) ─────────────
const permanentDelete = asyncHandler(async (req, res) => {
  await checkOwnerOrAdminPrivilege(req.user, 'permanently delete items from the database');
  const { type, id } = req.params;

  const modelMap = {
    material: RawMaterial,
    supplier: Supplier,
    product: Product,
    transaction: StockTransaction,
    purchase: Purchase,
    consumption: Consumption,
    stockRequest: StockRequest,
    employee: Employee,
    customer: Customer,
  };

  const Model = modelMap[type];
  if (!Model) { res.status(400); throw new Error(`Unknown type: ${type}`); }
  const doc = await Model.findById(id);
  if (!doc) { res.status(404); throw new Error('Item not found'); }

  await doc.deleteOne();
  invalidateDashboardCache();

  const name = doc.name || doc.voucherNo || doc.invoiceNumber || doc.firstName || String(id);
  tg.notifyPermanentDeleted(type, name, req.user);
  notify.push({
    type: 'system',
    title: 'Item Permanently Deleted',
    message: `${req.user?.name || 'Admin'} permanently deleted ${type}: ${name}`,
    icon: '💥',
    link: '/recycle-bin',
    severity: 'error',
    userId: req.user?._id,
  });

  await logAudit({ req, action: 'PERMANENT_DELETE', module: type, resourceId: id, resourceName: name });
  res.json({ message: 'Item permanently deleted.' });
});

// ── DELETE /api/recycle-bin/empty (empty the entire bin) ─────────────
const emptyRecycleBin = asyncHandler(async (req, res) => {
  await checkOwnerOrAdminPrivilege(req.user, 'empty the entire Recycle Bin');

  await Promise.all([
    RawMaterial.deleteMany({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }),
    Supplier.deleteMany({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }),
    Product.deleteMany({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }),
    StockTransaction.deleteMany({ $or: [{ deletedAt: { $ne: null } }, { status: 'voided' }] }),
    Purchase.deleteMany({ $or: [{ deletedAt: { $ne: null } }, { status: 'cancelled' }] }),
    Consumption.deleteMany({ $or: [{ deletedAt: { $ne: null } }, { status: 'voided' }] }),
    StockRequest.deleteMany({ deletedAt: { $ne: null } }),
    Employee.deleteMany({ deletedAt: { $ne: null } }),
    Customer.deleteMany({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }),
  ]);

  invalidateDashboardCache();
  tg.notifyBinEmptied(req.user);
  await logAudit({ req, action: 'RECYCLE_BIN_EMPTIED', module: 'system', resourceName: 'All recycle bin collections' });
  res.json({ message: 'Recycle bin completely emptied.' });
});

// ── POST /api/recycle-bin/delete-all-data ─────────────────────────────
// Moves all operational records and master entities to the recycle bin
// NOTE: Admin with owner-delegated privilege or Developer only. Safe: no permanent destruction!
const deleteAllData = asyncHandler(async (req, res) => {
  await checkOwnerOrAdminPrivilege(req.user, 'void and move all system data to the Recycle Bin');

  const actorName = req.user?.name || 'Administrator';
  const now = new Date();

  // 1. Fetch all active stock transactions and reverse applied stock
  const activeTxns = await StockTransaction.find({
    deletedAt: null,
    status: { $ne: 'voided' },
  });

  for (const txn of activeTxns) {
    if (txn.stockApplied) {
      const direction = txn.type || VOUCHER_DIRECTION[txn.voucherType];
      const items = txn.items?.length
        ? txn.items
        : [{ material: txn.material, quantity: txn.quantity, storeLocation: txn.storeLocation }];
      for (const item of items) {
        if (!item.material) continue;
        const mat = await RawMaterial.findById(item.material);
        if (mat) {
          mat.currentStock += direction === 'in' ? -item.quantity : item.quantity;
          await mat.save();
        }
      }
      txn.stockApplied = false;
    }
    txn.status = 'voided';
    txn.deletedAt = now;
    txn.deletedBy = actorName;
    txn.deletedFrom = 'bulk_system_cleanup';
    txn.trail = txn.trail || [];
    txn.trail.push({
      action: 'voided_and_recycled',
      by: req.user._id,
      byName: actorName,
      byRole: req.user.role,
      note: 'Moved to Recycle Bin during full system cleanup',
    });
    await txn.save();
  }

  // 2. Soft-delete and cancel active purchases
  await Purchase.updateMany(
    { deletedAt: null },
    {
      $set: {
        status: 'cancelled',
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  // 3. Soft-delete and void active consumptions
  const activeConsumptions = await Consumption.find({
    deletedAt: null,
    status: { $ne: 'voided' },
  });
  for (const c of activeConsumptions) {
    c.status = 'voided';
    c.deletedAt = now;
    c.deletedBy = actorName;
    c.trail = c.trail || [];
    c.trail.push({
      action: 'voided_and_recycled',
      by: req.user._id,
      byName: actorName,
      byRole: req.user.role,
      note: 'Moved to Recycle Bin during full system cleanup',
    });
    await c.save();
  }

  // 4. Soft-delete active stock requests
  await StockRequest.updateMany(
    { deletedAt: null },
    {
      $set: {
        deletedAt: now,
        deletedBy: actorName,
      },
    }
  );

  // 5. Soft-delete active Raw Materials / Articles
  const activeMaterials = await RawMaterial.updateMany(
    { deletedAt: null },
    {
      $set: {
        isActive: false,
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  // 6. Soft-delete active Products
  const activeProducts = await Product.updateMany(
    { deletedAt: null },
    {
      $set: {
        isActive: false,
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  // 7. Soft-delete active Suppliers
  const activeSuppliers = await Supplier.updateMany(
    { deletedAt: null },
    {
      $set: {
        isActive: false,
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  // 8. Soft-delete active Customers
  const activeCustomers = await Customer.updateMany(
    { deletedAt: null },
    {
      $set: {
        isActive: false,
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  // 9. Soft-delete active Employees
  const activeEmployees = await Employee.updateMany(
    { deletedAt: null },
    {
      $set: {
        deletedAt: now,
        deletedBy: actorName,
        deletedFrom: 'bulk_system_cleanup',
      },
    }
  );

  invalidateDashboardCache();

  await logAudit({
    req,
    action: 'BULK_MOVE_TO_RECYCLE_BIN',
    module: 'system',
    resourceName: 'All Operational and Master Data',
    details: {
      transactionsMoved: activeTxns.length,
      consumptionsMoved: activeConsumptions.length,
      materialsRecycled: activeMaterials.modifiedCount,
      productsRecycled: activeProducts.modifiedCount,
      suppliersRecycled: activeSuppliers.modifiedCount,
      customersRecycled: activeCustomers.modifiedCount,
      employeesRecycled: activeEmployees.modifiedCount,
    },
  });

  notify.push({
    type: 'system',
    title: 'All System Data Moved to Recycle Bin',
    message: `${actorName} moved all operational & master data to the Recycle Bin. Dashboard metrics reset. Recoverable from Recycle Bin.`,
    icon: '🗑️',
    link: '/recycle-bin',
    severity: 'warning',
    userId: req.user?._id,
  });

  res.json({
    success: true,
    message: `All system operational records (${activeTxns.length} transactions, purchases, consumptions) and master records safely moved to Recycle Bin. Only the Developer/Owner or authorized Admin can restore them.`,
  });
});

module.exports = {
  getRecycleBin,
  restoreItem,
  permanentDelete,
  emptyRecycleBin,
  deleteAllData,
};
