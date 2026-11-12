const asyncHandler = require('express-async-handler');
const SalesClosing = require('../models/SalesClosing');
const StockTransaction = require('../models/StockTransaction');
const AuditLog = require('../models/AuditLog');
const {
  buildRangeFilter,
  formatLocalDate,
} = require('../utils/dateRangeHelper');

// Generate Next Closing Code (e.g. SCL-20261103-001)
const generateClosingCode = async () => {
  const today = formatLocalDate(new Date()).replace(/-/g, '');
  const prefix = `SCL-${today}-`;
  const latest = await SalesClosing.findOne({ closingCode: { $regex: `^${prefix}` } })
    .sort({ closingCode: -1 })
    .lean();

  if (latest && latest.closingCode) {
    const parts = latest.closingCode.split('-');
    const seq = parseInt(parts[parts.length - 1], 10) || 0;
    return `${prefix}${String(seq + 1).padStart(3, '0')}`;
  }
  return `${prefix}001`;
};

// @desc    Get all sales closing sessions
// @route   GET /api/sales-closing
// @access  Private
const getSalesClosings = asyncHandler(async (req, res) => {
  const { from, to, storeLocation, status } = req.query;
  const filter = { deletedAt: null };

  if (storeLocation && storeLocation !== 'all') {
    filter.storeLocation = storeLocation;
  }
  if (status && status !== 'all') {
    filter.status = status;
  }
  if (from || to) {
    const df = buildRangeFilter(from, to, req);
    if (df) filter.date = df;
  }

  const closings = await SalesClosing.find(filter)
    .populate('cashier', 'name role email')
    .populate('closedBy', 'name role email')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.json(closings);
});

// @desc    Get live unclosed sales statistics for reconciliation
// @route   GET /api/sales-closing/unclosed-stats
// @access  Private
const getUnclosedSalesStats = asyncHandler(async (req, res) => {
  const { storeLocation, deviceName } = req.query;
  const matchFilter = {
    deletedAt: null,
    status: { $ne: 'voided' },
    salesClosingSession: null, // Vouchers that have not yet been closed
    voucherType: { $in: ['cash_sale', 'cash_sales', 'credit_sale', 'credit_sales', 'zeroing'] },
  };

  if (storeLocation && storeLocation !== 'all') {
    matchFilter.storeLocation = storeLocation;
  }
  if (deviceName && deviceName !== 'all') {
    matchFilter.deviceName = deviceName;
  }

  const unclosedVouchers = await StockTransaction.find(matchFilter).lean();

  let cashSalesCount = 0;
  let cashSalesTotal = 0;
  let creditSalesCount = 0;
  let creditSalesTotal = 0;
  let zeroingCount = 0;
  let zeroingTotal = 0;
  let collectionsCount = 0;
  let collectionsTotal = 0;
  let totalVat = 0;

  unclosedVouchers.forEach((v) => {
    const rev = Number(v.totalRevenue || v.totalAmount || 0);
    const vat = Number(v.vatAmount || 0);
    totalVat += vat;

    if (v.voucherType === 'credit_sale' || v.voucherType === 'credit_sales') {
      creditSalesCount++;
      creditSalesTotal += rev;

      // Check if partial/full collections occurred
      if (Array.isArray(v.collectionPayments) && v.collectionPayments.length > 0) {
        v.collectionPayments.forEach((p) => {
          collectionsCount++;
          collectionsTotal += Number(p.amount || 0);
        });
      }
    } else if (v.voucherType === 'zeroing') {
      zeroingCount++;
      zeroingTotal += rev;
    } else {
      cashSalesCount++;
      cashSalesTotal += rev;
    }
  });

  res.json({
    voucherCount: unclosedVouchers.length,
    cashSalesCount,
    cashSalesTotal,
    creditSalesCount,
    creditSalesTotal,
    zeroingCount,
    zeroingTotal,
    collectionsCount,
    collectionsTotal,
    totalVat,
    expectedCash: cashSalesTotal + collectionsTotal,
    voucherIds: unclosedVouchers.map((v) => v._id),
  });
});

// @desc    Perform official Sales Closing and lock the period
// @route   POST /api/sales-closing
// @access  Private
const createSalesClosing = asyncHandler(async (req, res) => {
  const {
    openingCash = 0,
    actualCashCounted = 0,
    storeLocation = 'Main Store',
    deviceName = 'POS Terminal 01',
    notes = '',
  } = req.body;

  // 1. Gather all unclosed vouchers matching criteria
  const unclosedVouchers = await StockTransaction.find({
    deletedAt: null,
    status: { $ne: 'voided' },
    salesClosingSession: null,
    voucherType: { $in: ['cash_sale', 'cash_sales', 'credit_sale', 'credit_sales', 'zeroing'] },
    ...(storeLocation && storeLocation !== 'all' ? { storeLocation } : {}),
  });

  let cashSalesCount = 0;
  let cashSalesTotal = 0;
  let creditSalesCount = 0;
  let creditSalesTotal = 0;
  let zeroingCount = 0;
  let zeroingTotal = 0;
  let collectionsCount = 0;
  let collectionsTotal = 0;
  let totalVat = 0;

  unclosedVouchers.forEach((v) => {
    const rev = Number(v.totalRevenue || v.totalAmount || 0);
    const vat = Number(v.vatAmount || 0);
    totalVat += vat;

    if (v.voucherType === 'credit_sale' || v.voucherType === 'credit_sales') {
      creditSalesCount++;
      creditSalesTotal += rev;
      if (Array.isArray(v.collectionPayments)) {
        v.collectionPayments.forEach((p) => {
          collectionsCount++;
          collectionsTotal += Number(p.amount || 0);
        });
      }
    } else if (v.voucherType === 'zeroing') {
      zeroingCount++;
      zeroingTotal += rev;
    } else {
      cashSalesCount++;
      cashSalesTotal += rev;
    }
  });

  const expectedCash = Number(openingCash || 0) + cashSalesTotal + collectionsTotal;
  const counted = Number(actualCashCounted || 0);
  const cashVariance = counted - expectedCash;
  const closingCode = await generateClosingCode();

  // 2. Create the SalesClosing Record
  const closingDoc = await SalesClosing.create({
    closingCode,
    date: new Date(),
    storeLocation,
    deviceName,
    cashier: req.user?._id,
    cashierName: req.user?.name || 'Cashier',
    closedBy: req.user?._id,
    closedByName: req.user?.name || 'Supervisor',
    status: Math.abs(cashVariance) < 0.01 ? 'reconciled' : 'closed',
    openingCash: Number(openingCash || 0),
    cashSalesCount,
    cashSalesTotal,
    creditSalesCount,
    creditSalesTotal,
    zeroingCount,
    zeroingTotal,
    collectionsCount,
    collectionsTotal,
    totalVat,
    expectedCash,
    actualCashCounted: counted,
    cashVariance,
    notes,
    vouchers: unclosedVouchers.map((v) => v._id),
    isLocked: true,
    lockedAt: new Date(),
  });

  // 3. Mark vouchers as closed
  if (unclosedVouchers.length > 0) {
    await StockTransaction.updateMany(
      { _id: { $in: unclosedVouchers.map((v) => v._id) } },
      { $set: { salesClosingSession: closingDoc._id } }
    );
  }

  // 4. Log Audit Event
  await AuditLog.create({
    user: req.user?._id,
    userName: req.user?.name || 'System',
    userRole: req.user?.role || 'user',
    action: 'SALES_CLOSING',
    module: 'salesMarketing',
    resourceId: closingDoc._id.toString(),
    resourceName: closingCode,
    details: {
      closingCode,
      storeLocation,
      cashSalesTotal,
      creditSalesTotal,
      expectedCash,
      actualCashCounted: counted,
      cashVariance,
      voucherCount: unclosedVouchers.length,
    },
    ip: req.ip || '',
  }).catch((err) => console.warn('Failed to write sales closing audit log:', err.message));

  res.status(201).json(closingDoc);
});

module.exports = {
  getSalesClosings,
  getUnclosedSalesStats,
  createSalesClosing,
};

