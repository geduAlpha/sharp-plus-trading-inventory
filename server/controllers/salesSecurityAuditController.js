const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');
const StockTransaction = require('../models/StockTransaction');
const Customer = require('../models/Customer');
const RawMaterial = require('../models/RawMaterial');
const { updateStockBalance } = require('../utils/stockBalanceHelper');
const {
  buildRangeFilter,
  formatLocalDate,
} = require('../utils/dateRangeHelper');

// @desc    Get Security Audit Report & User Activity Monitoring
// @route   GET /api/sales-security/report
// @access  Private (Owner, Admin, Manager)
const getSecurityAuditReport = asyncHandler(async (req, res) => {
  const { from, to, action, user: filterUser, severity } = req.query;

  const filter = {};
  if (action && action !== 'all') {
    filter.action = action;
  }
  if (filterUser && filterUser !== 'all') {
    filter.userName = { $regex: filterUser, $options: 'i' };
  }
  if (from || to) {
    const df = buildRangeFilter(from, to, req);
    if (df) filter.createdAt = df;
  }

  // Fetch security logs
  const logs = await AuditLog.find(filter)
    .populate('user', 'name role email')
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  // Fetch all Zeroing Vouchers
  const zeroingVouchers = await StockTransaction.find({
    voucherType: 'zeroing',
    deletedAt: null,
  })
    .populate('performedBy', 'name role')
    .populate('approvedBy', 'name role')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  // Calculate Security KPIs
  const totalAuditEvents = logs.length;
  const zeroingCount = zeroingVouchers.length;
  const voidEventsCount = logs.filter((l) => ['VOID', 'DELETE', 'SOFT_DELETE'].includes(l.action)).length;
  const authEventsCount = logs.filter((l) => ['APPROVE', 'ROLE_CHANGE', 'PERMISSIONS_CHANGE'].includes(l.action)).length;

  res.json({
    logs,
    zeroingVouchers,
    summary: {
      totalAuditEvents,
      zeroingCount,
      voidEventsCount,
      authEventsCount,
    },
  });
});

// @desc    Execute Zeroing Voucher on an existing transaction
// @route   POST /api/sales-security/zeroing
// @access  Private (Owner, Admin, Manager)
const createZeroingVoucher = asyncHandler(async (req, res) => {
  const { targetVoucherId, reason = 'Transaction Zeroing & Adjustment', notes = '' } = req.body;

  if (!targetVoucherId) {
    res.status(400);
    throw new Error('Target sales voucher ID is required to perform zeroing.');
  }

  const originalTxn = await StockTransaction.findById(targetVoucherId);
  if (!originalTxn) {
    res.status(404);
    throw new Error('Original sales voucher not found.');
  }

  if (originalTxn.isZeroed) {
    res.status(400);
    throw new Error(`Voucher ${originalTxn.voucherNo} has already been zeroed.`);
  }

  const todayStr = formatLocalDate(new Date()).replace(/-/g, '');
  const zeroingVoucherNo = `ZV-${todayStr}-${originalTxn.voucherNo}`;

  // 1. Create the Zeroing Voucher record (reversing the financial effect)
  const zeroingDoc = await StockTransaction.create({
    voucherType: 'zeroing',
    voucherNo: zeroingVoucherNo,
    type: 'in', // reversal of outward sales
    status: 'posted',
    date: new Date(),
    zeroedRef: originalTxn.voucherNo,
    zeroingReason: reason,
    totalRevenue: -Math.abs(Number(originalTxn.totalRevenue || originalTxn.totalAmount || 0)),
    totalAmount: -Math.abs(Number(originalTxn.totalAmount || originalTxn.totalRevenue || 0)),
    subTotal: -Math.abs(Number(originalTxn.subTotal || 0)),
    vatAmount: -Math.abs(Number(originalTxn.vatAmount || 0)),
    customerName: originalTxn.customerName,
    customerPhone: originalTxn.customerPhone,
    customerAddress: originalTxn.customerAddress,
    tin: originalTxn.tin,
    storeLocation: originalTxn.storeLocation || 'Main Store',
    consigneeUnit: originalTxn.consigneeUnit || 'Main Store',
    deviceName: originalTxn.deviceName || 'Web Client',
    assignedRoute: originalTxn.assignedRoute || 'Default Route',
    mrc: originalTxn.mrc || 'SPM00000189',
    fsNo: originalTxn.fsNo,
    fsNumber: originalTxn.fsNumber,
    items: originalTxn.items || [],
    performedBy: req.user?._id,
    approvedBy: req.user?._id,
    notes: `Zeroing voucher reversing ${originalTxn.voucherNo}: ${reason}. ${notes}`,
  });

  // 2. Mark original voucher as zeroed
  originalTxn.isZeroed = true;
  originalTxn.zeroedAt = new Date();
  originalTxn.zeroedBy = req.user?.name || 'Administrator';
  originalTxn.zeroingReason = reason;
  originalTxn.status = 'voided';
  await originalTxn.save();

  // 3. Reverse inventory movement if stock was previously deducted
  if (originalTxn.stockApplied && Array.isArray(originalTxn.items)) {
    for (const item of originalTxn.items) {
      if (item.material && item.quantity > 0) {
        await updateStockBalance({
          materialId: item.material,
          storeLocation: item.storeLocation || originalTxn.storeLocation || 'Main Store',
          quantityChange: Number(item.quantity), // Add back into stock
          type: 'in',
          user: req.user,
        }).catch((err) => console.warn('Failed to reverse stock balance on zeroing:', err.message));
      }
    }
  }

  // 4. Record Security Audit Log
  await AuditLog.create({
    user: req.user?._id,
    userName: req.user?.name || 'System',
    userRole: req.user?.role || 'user',
    action: 'ZEROING',
    module: 'security',
    resourceId: zeroingDoc._id.toString(),
    resourceName: zeroingVoucherNo,
    details: {
      zeroingVoucherNo,
      originalVoucherNo: originalTxn.voucherNo,
      reversedAmount: originalTxn.totalRevenue || originalTxn.totalAmount,
      reason,
      performedBy: req.user?.name,
    },
    ip: req.ip || '',
  }).catch(() => {});

  res.status(201).json({
    message: `Voucher ${originalTxn.voucherNo} successfully zeroed. Zeroing Voucher: ${zeroingVoucherNo}`,
    zeroingVoucher: zeroingDoc,
    originalVoucher: originalTxn,
  });
});

// @desc    Record customer collection / payment on Credit Sales Voucher
// @route   POST /api/sales-security/collect-credit
// @access  Private
const recordCreditCollection = asyncHandler(async (req, res) => {
  const { voucherId, amount, paymentMethod = 'Cash', reference = '', note = '' } = req.body;

  const paymentAmount = Number(amount);
  if (!voucherId || isNaN(paymentAmount) || paymentAmount <= 0) {
    res.status(400);
    throw new Error('Valid voucher ID and payment amount greater than zero are required.');
  }

  const voucher = await StockTransaction.findById(voucherId);
  if (!voucher) {
    res.status(404);
    throw new Error('Credit sales voucher not found.');
  }

  const grandTotal = Number(voucher.totalRevenue || voucher.totalAmount || 0);
  const currentPaid = Number(voucher.amountPaid || 0);
  const newPaidTotal = currentPaid + paymentAmount;
  const remainingBalance = Math.max(0, grandTotal - newPaidTotal);

  voucher.amountPaid = newPaidTotal;
  if (remainingBalance <= 0.01) {
    voucher.paymentStatus = 'paid';
  } else {
    voucher.paymentStatus = 'partial';
  }

  // Append payment receipt
  if (!Array.isArray(voucher.collectionPayments)) {
    voucher.collectionPayments = [];
  }
  voucher.collectionPayments.push({
    amount: paymentAmount,
    date: new Date(),
    receivedBy: req.user?.name || 'Cashier',
    paymentMethod,
    note,
    reference: reference || `COL-${new Date().getTime().toString().slice(-6)}`,
  });

  await voucher.save();

  // Audit Log Entry
  await AuditLog.create({
    user: req.user?._id,
    userName: req.user?.name || 'System',
    userRole: req.user?.role || 'user',
    action: 'CREDIT_COLLECTION',
    module: 'salesMarketing',
    resourceId: voucher._id.toString(),
    resourceName: voucher.voucherNo,
    details: {
      voucherNo: voucher.voucherNo,
      customerName: voucher.customerName,
      paymentAmount,
      totalPaid: newPaidTotal,
      remainingBalance,
      paymentMethod,
      reference,
    },
    ip: req.ip || '',
  }).catch(() => {});

  res.json({
    message: `Collection of ETB ${paymentAmount.toLocaleString()} recorded for ${voucher.voucherNo}.`,
    voucher,
    remainingBalance,
  });
});

// @desc    Get Customer Credit Ledger
// @route   GET /api/sales-security/credit-ledger
// @access  Private
const getCustomerCreditLedger = asyncHandler(async (req, res) => {
  const { customerName } = req.query;

  const matchFilter = {
    deletedAt: null,
    status: { $ne: 'voided' },
    voucherType: { $in: ['credit_sale', 'credit_sales'] },
  };

  if (customerName && customerName !== 'all') {
    matchFilter.customerName = { $regex: customerName, $options: 'i' };
  }

  const creditVouchers = await StockTransaction.find(matchFilter)
    .sort({ date: -1 })
    .lean();

  const customerMap = new Map();

  creditVouchers.forEach((v) => {
    const cName = v.customerName || v.customer?.name || 'Walk-in Customer';
    if (!customerMap.has(cName)) {
      customerMap.set(cName, {
        customerName: cName,
        customerPhone: v.customerPhone || '',
        customerAddress: v.customerAddress || '',
        tin: v.tin || '',
        assignedRoute: v.assignedRoute || 'Default Route',
        totalInvoices: 0,
        totalCreditAmount: 0,
        totalCollected: 0,
        outstandingBalance: 0,
        invoices: [],
      });
    }

    const entry = customerMap.get(cName);
    const invoiceTotal = Number(v.totalRevenue || v.totalAmount || 0);
    const paid = Number(v.amountPaid || 0);
    const balance = Math.max(0, invoiceTotal - paid);

    entry.totalInvoices++;
    entry.totalCreditAmount += invoiceTotal;
    entry.totalCollected += paid;
    entry.outstandingBalance += balance;
    entry.invoices.push({
      _id: v._id,
      voucherNo: v.voucherNo,
      date: v.date,
      dueDate: v.dueDate,
      totalAmount: invoiceTotal,
      amountPaid: paid,
      remainingBalance: balance,
      paymentStatus: v.paymentStatus || 'unpaid',
      collectionPayments: v.collectionPayments || [],
    });
  });

  const ledger = Array.from(customerMap.values());
  ledger.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  res.json(ledger);
});

module.exports = {
  getSecurityAuditReport,
  createZeroingVoucher,
  recordCreditCollection,
  getCustomerCreditLedger,
};

