const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const StockTransaction = require('../models/StockTransaction');
const { VOUCHER_DIRECTION } = require('../models/StockTransaction');
const RawMaterial = require('../models/RawMaterial');
const User = require('../models/User');
const { invalidateDashboardCache } = require('./dashboardController');
const { hasPermission } = require('../middleware/authMiddleware');
const tg = require('../utils/telegramNotifier');
const notify = require('../utils/notificationHelper');
const {
  normalizeStore,
  getStoreStock,
  validateStockForReduction,
  applyStockMovement,
  reverseStockMovement,
} = require('../utils/stockBalanceHelper');

// ── helpers ───────────────────────────────────────────────────────────
const verifyUserPassword = async (userId, password) => {
  const user = await User.findById(userId).select('+password');
  if (!user || !password) return null;
  let ok = await bcrypt.compare(password, user.password);
  if (!ok && typeof password === 'string' && password.trim() !== password) {
    ok = await bcrypt.compare(password.trim(), user.password);
  }
  return ok ? user : null;
};

// ── Auto voucher number ───────────────────────────────────────────────
const generateVoucherNo = async (voucherType) => {
  const prefixes = {
    cash_grv:       'CGRV',
    credit_grv:     'CRGRV',
    disposal:       'DISP',
    neg_adjustment: 'NSAV',
    pos_adjustment: 'PSAV',
    psav:           'PSAV',
    nsav:           'NSAV',
    fresh_bazaar:   'FBR',
    sales_import:   'SALE',
    cash_sale:      'CSALE',
    credit_sale:    'CRSALE',
    cash_sales:     'CSALE',
    credit_sales:   'CRSALE',
  };
  const effectiveType = (voucherType === 'psav') ? 'pos_adjustment'
    : ((voucherType === 'nsav') ? 'neg_adjustment'
    : ((voucherType === 'cash_sales') ? 'cash_sale'
    : ((voucherType === 'credit_sales') ? 'credit_sale' : voucherType)));
  const prefix = prefixes[voucherType] ?? prefixes[effectiveType] ?? 'TXN';

  const prefixRegex = new RegExp(`^${prefix}-(\\d+)`, 'i');
  const existing = await StockTransaction.find({
    $or: [
      { voucherType: { $in: [voucherType, effectiveType] } },
      { voucherNo: prefixRegex },
    ],
  })
    .select('voucherNo')
    .lean();

  let maxNum = 0;
  for (const doc of existing) {
    if (doc.voucherNo) {
      const match = String(doc.voucherNo).match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNum) maxNum = val;
      }
    }
  }

  const nextSeq = Math.max(maxNum + 1, existing.length + 1);
  return `${prefix}-${String(nextSeq).padStart(5, '0')}`;
};

const getNextVoucherNo = asyncHandler(async (req, res) => {
  const { voucherType = 'cash_grv' } = req.query;
  const vNo = await generateVoucherNo(voucherType);
  res.json({ voucherNo: vNo });
});

// ── Auto Fiscal Serial (FS) Number for Sales ──────────────────────────────
const generateFsNo = async () => {
  const highest = await StockTransaction.findOne({ fsNumber: { $gt: 0 } })
    .sort({ fsNumber: -1 })
    .select('fsNumber')
    .lean();

  let nextFs = 1;
  if (highest && highest.fsNumber) {
    nextFs = highest.fsNumber + 1;
  } else {
    const existing = await StockTransaction.find({
      fsNo: { $exists: true, $ne: '' },
    })
      .select('fsNo')
      .lean();

    let maxNum = 0;
    for (const doc of existing) {
      const match = String(doc.fsNo).match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNum) maxNum = val;
      }
    }
    if (maxNum > 0) {
      nextFs = maxNum + 1;
    } else {
      const count = await StockTransaction.countDocuments({
        voucherType: { $in: ['cash_sale', 'credit_sale', 'sales_import'] },
      });
      nextFs = count + 1;
    }
  }

  return {
    fsNo: `FS No.${String(nextFs).padStart(8, '0')}`,
    fsNumber: nextFs,
  };
};

// ── GET /api/transactions ─────────────────────────────────────────────
const getTransactions = asyncHandler(async (req, res) => {
  const {
    voucherType, material, from, to, paymentStatus, paymentType, search,
    status, objectState, consigneeUnit, storeLocation, device, deviceName,
    user: filterUser, code, voucherCode,
  } = req.query;

  const filter = { deletedAt: null };
  const isSalesQuery = voucherType === 'sales' || ['cash_sale', 'credit_sale', 'cash_sales', 'credit_sales', 'sales_import'].includes(voucherType);
  if (req.user?.role !== 'developer') {
    const { getCachedModules } = require('../middleware/moduleGateMiddleware');
    const modules = await getCachedModules();
    if (modules && modules.salesMarketing === false) {
      if (isSalesQuery) {
        res.status(403);
        throw new Error('Access Denied: The Sales & Marketing module is currently deactivated by the System Owner & Developer.');
      }
      // If general transaction query, exclude sales vouchers from results
      filter.voucherType = { $nin: ['cash_sale', 'credit_sale', 'cash_sales', 'credit_sales', 'sales_import'] };
    }
  }

  if (voucherType === 'sales') {
    filter.voucherType = { $in: ['cash_sale', 'credit_sale'] };
  } else if (voucherType) {
    filter.voucherType = voucherType;
  }

  // Status / ObjectState filtering (support 'prepared' -> 'pending')
  const requestedStatus = (status || objectState || '').toLowerCase();
  if (requestedStatus && requestedStatus !== 'all' && requestedStatus !== 'all states') {
    if (requestedStatus === 'prepared') {
      filter.status = 'pending';
    } else {
      filter.status = requestedStatus;
    }
  } else {
    // By default, voided vouchers are excluded from active origin views (visible in Recycle Bin)
    filter.status = { $ne: 'voided' };
  }

  // ConsigneeUnit / Store Location
  const andConditions = [];
  const reqStore = consigneeUnit || storeLocation;
  if (reqStore && reqStore !== 'all' && reqStore !== 'all units') {
    andConditions.push({
      $or: [
        { consigneeUnit: reqStore },
        { storeLocation: reqStore },
        { 'items.storeLocation': reqStore },
      ],
    });
  }

  // Device filtering
  const reqDevice = device || deviceName;
  if (reqDevice && reqDevice !== 'all' && reqDevice !== 'all devices') {
    filter.deviceName = { $regex: reqDevice, $options: 'i' };
  }

  // User filtering
  if (filterUser && filterUser !== 'all' && filterUser !== 'all users') {
    filter.performedBy = filterUser;
  }

  // Voucher Code direct filter
  const targetCode = code || voucherCode;
  if (targetCode) {
    filter.voucherNo = { $regex: targetCode, $options: 'i' };
  }

  if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
  if (paymentType && paymentType !== 'all') filter.paymentType = paymentType;
  if (material) {
    andConditions.push({
      $or: [{ material }, { 'items.material': material }],
    });
  }

  if (search) {
    const sRegex = { $regex: search, $options: 'i' };
    andConditions.push({
      $or: [
        { voucherNo: sRegex },
        { customerName: sRegex },
        { customerPhone: sRegex },
        { reference: sRegex },
        { tin: sRegex },
        { storeLocation: sRegex },
        { consigneeUnit: sRegex },
      ],
    });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to)   filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const transactions = await StockTransaction.find(filter)
    .populate('material', 'name code unit unitCost category currentStock storeLocation')
    .populate('items.material', 'name code unit unitCost category currentStock storeLocation')
    .populate('supplier', 'name tin contactPerson phone address')
    .populate('employee', 'firstName lastName employeeId phone department')
    .populate('performedBy', 'name role email')
    .populate('checkedBy', 'name role')
    .populate('approvedBy', 'name role')
    .populate('postedBy', 'name role')
    .sort({ date: -1, createdAt: -1 })
    .limit(500)
    .lean();

  res.json(transactions);
});


// ── POST /api/transactions ────────────────────────────────────────────
const createTransaction = asyncHandler(async (req, res) => {
  const {
    voucherType, voucherNo, supplier,
    items = [],
    reason, reference, notes, date,
    attachments = [],
    attachment = '',
    customerName,
    customerPhone,
    customerAddress,
    paymentType,
    paymentStatus,
    amountPaid,
    dueDate,
  } = req.body;

  if (!VOUCHER_DIRECTION[voucherType]) {
    res.status(400);
    throw new Error(`Unknown voucher type: ${voucherType}`);
  }

  const isSalesVoucher = ['cash_sale', 'credit_sale', 'cash_sales', 'credit_sales', 'sales_import'].includes(voucherType);
  if (isSalesVoucher && req.user?.role !== 'developer') {
    const { getCachedModules } = require('../middleware/moduleGateMiddleware');
    const modules = await getCachedModules();
    if (modules && modules.salesMarketing === false) {
      res.status(403);
      throw new Error('Access Denied: The Sales & Marketing module is currently deactivated by the System Owner & Developer.');
    }
  }

  const direction = VOUCHER_DIRECTION[voucherType];

  if (!items.length) {
    res.status(400);
    throw new Error('At least one item is required.');
  }

  if ((voucherType === 'cash_grv' || voucherType === 'credit_grv') && !supplier) {
    res.status(400);
    throw new Error('Supplier is required for Goods Receiving Vouchers.');
  }

  const isGRV = (voucherType === 'cash_grv' || voucherType === 'credit_grv');
  let assignedTin = (req.body.tin || '').trim();
  if (!assignedTin && supplier) {
    try {
      const Supplier = require('../models/Supplier');
      const supDoc = await Supplier.findById(supplier).select('tin');
      if (supDoc?.tin) assignedTin = supDoc.tin;
    } catch { /* ignore */ }
  }

  let assignedEmployee = req.body.employee || undefined;
  let assignedEmployeeName = (req.body.employeeName || '').trim();
  let assignedEmployeeCode = (req.body.employeeCode || '').trim();
  let assignedEmployeePhone = (req.body.employeePhone || '').trim();

  if (assignedEmployee) {
    try {
      const Employee = require('../models/Employee');
      const empDoc = await Employee.findById(assignedEmployee);
      if (empDoc) {
        if (!assignedEmployeeName) assignedEmployeeName = `${empDoc.firstName} ${empDoc.lastName}`.trim();
        if (!assignedEmployeeCode) assignedEmployeeCode = empDoc.employeeId || `Emp-${empDoc._id.toString().slice(-5)}-`;
        if (!assignedEmployeePhone) assignedEmployeePhone = empDoc.phone || '';
      }
    } catch { /* ignore */ }
  }

  const assignedConsigneeUnit = (req.body.consigneeUnit || req.body.storeLocation || 'Main Store').trim();
  const assignedStoreLocation = (req.body.storeLocation || req.body.consigneeUnit || 'Main Store').trim();
  const assignedDeviceName = (req.body.deviceName || req.body.device || 'Web Client').trim();

  const assignedTaxRate = typeof req.body.taxRate === 'number' ? Number(req.body.taxRate) : 15;
  const isTaxInclusive = req.body.isVatInclusive !== false;

  const resolvedItems = [];
  for (const item of items) {
    const mat = await RawMaterial.findById(item.material);
    if (!mat) {
      res.status(404);
      throw new Error(`Material not found: ${item.material}`);
    }
    const unitCost     = Number(item.unitCost) || mat.unitCost || 0;
    const discount     = Number(item.discount) || 0;
    const additionalCharge = Number(item.additionalCharge) || 0;
    const serialNumber = (item.serialNumber || '').trim();
    const category     = (item.category || mat.category || '').trim();
    const itemLocation = (item.storeLocation || mat.storeLocation || assignedStoreLocation || '').trim();
    const sellingPrice = Number(item.sellingPrice) || unitCost;
    const rawCost      = unitCost * Number(item.quantity);
    const lineTotal    = Math.max(0, rawCost - discount + additionalCharge);
    const totalCost    = lineTotal;
    const totalRevenue = sellingPrice * Number(item.quantity);

    const itemTaxRate = item.taxRate !== undefined ? Number(item.taxRate) : assignedTaxRate;
    let itemSubTotal = item.subTotal !== undefined ? Number(item.subTotal) : lineTotal;
    let itemTaxAmount = item.taxAmount !== undefined ? Number(item.taxAmount) : 0;
    if (itemTaxRate > 0 && !itemTaxAmount) {
      if (isTaxInclusive) {
        itemSubTotal = Number((lineTotal / (1 + itemTaxRate / 100)).toFixed(2));
        itemTaxAmount = Number((lineTotal - itemSubTotal).toFixed(2));
      } else {
        itemSubTotal = lineTotal;
        itemTaxAmount = Number((itemSubTotal * (itemTaxRate / 100)).toFixed(2));
      }
    }

    const systemStock = item.systemStock !== undefined ? Number(item.systemStock) : (mat.currentStock || 0);
    const physicalCount = (item.physicalCount !== null && item.physicalCount !== undefined && item.physicalCount !== '') ? Number(item.physicalCount) : null;
    const projectedBalance = item.projectedBalance !== undefined ? Number(item.projectedBalance) : (direction === 'in' ? systemStock + Number(item.quantity) : systemStock - Number(item.quantity));
    const reconciliationNote = (item.reconciliationNote || '').trim();

    resolvedItems.push({
      material: mat._id,
      quantity: Number(item.quantity),
      uom: item.uom || mat.unit || '',
      unitCost,
      discount,
      additionalCharge,
      serialNumber,
      category,
      storeLocation: itemLocation,
      systemStock,
      physicalCount,
      projectedBalance,
      reconciliationNote,
      taxRate: itemTaxRate,
      taxAmount: itemTaxAmount,
      subTotal: itemSubTotal,
      sellingPrice,
      totalCost,
      totalRevenue,
      _doc: mat
    });
  }

  // Enforce negative stock validation for any outward voucher (NSAV, disposal, sales)
  if (direction === 'out') {
    const val = await validateStockForReduction(resolvedItems, assignedStoreLocation);
    if (!val.valid) {
      res.status(400);
      throw new Error(val.error);
    }
  }

  const rawTotalAmount = resolvedItems.reduce((s, i) => s + i.totalCost, 0);
  const totalRevenue = resolvedItems.reduce((s, i) => s + (i.totalRevenue || 0), 0);
  const grossProfit  = totalRevenue - rawTotalAmount;

  const isSale = (voucherType === 'cash_sale' || voucherType === 'credit_sale' || voucherType === 'cash_sales' || voucherType === 'credit_sales');
  const isCredit = (voucherType === 'credit_sale' || voucherType === 'credit_sales');
  const canonicalVoucherType = isSale ? (isCredit ? 'credit_sale' : 'cash_sale') : voucherType;
  const assignedPaymentType = paymentType || (isCredit ? 'credit' : 'cash');
  const initialAmountPaid = isSale ? (isCredit ? Number(amountPaid) || 0 : totalRevenue) : 0;
  const assignedPaymentStatus = paymentStatus || (isCredit
    ? (initialAmountPaid >= totalRevenue && totalRevenue > 0 ? 'paid' : (initialAmountPaid > 0 ? 'partial' : 'unpaid'))
    : 'paid');

  // VAT & Fiscal Tax Calculation
  let computedSubTotal = req.body.subTotal !== undefined ? Number(req.body.subTotal) : 0;
  let computedVat = req.body.vatAmount !== undefined ? Number(req.body.vatAmount) : (req.body.taxAmount !== undefined ? Number(req.body.taxAmount) : 0);
  let computedGrandTotal = rawTotalAmount;

  if (isSale) {
    if (!computedSubTotal || !computedVat) {
      if (isTaxInclusive) {
        computedSubTotal = assignedTaxRate > 0 ? Number((totalRevenue / (1 + assignedTaxRate / 100)).toFixed(2)) : totalRevenue;
        computedVat = Number((totalRevenue - computedSubTotal).toFixed(2));
      } else {
        computedSubTotal = totalRevenue;
        computedVat = assignedTaxRate > 0 ? Number((computedSubTotal * (assignedTaxRate / 100)).toFixed(2)) : 0;
      }
    }
  } else if (isGRV) {
    if (req.body.subTotal !== undefined && req.body.vatAmount !== undefined) {
      computedSubTotal = Number(req.body.subTotal);
      computedVat = Number(req.body.vatAmount);
      computedGrandTotal = Number(req.body.totalAmount || (computedSubTotal + computedVat));
    } else if (isTaxInclusive) {
      computedSubTotal = assignedTaxRate > 0 ? Number((rawTotalAmount / (1 + assignedTaxRate / 100)).toFixed(2)) : rawTotalAmount;
      computedVat = Number((rawTotalAmount - computedSubTotal).toFixed(2));
      computedGrandTotal = rawTotalAmount;
    } else {
      computedSubTotal = rawTotalAmount;
      computedVat = assignedTaxRate > 0 ? Number((computedSubTotal * (assignedTaxRate / 100)).toFixed(2)) : 0;
      computedGrandTotal = Number((computedSubTotal + computedVat).toFixed(2));
    }
  } else {
    computedSubTotal = rawTotalAmount;
  }

  const formattedAttachments = Array.isArray(attachments) && attachments.length > 0
    ? attachments.map(a => ({
        url: a.url || a,
        name: a.name || 'Receipt',
        mimeType: a.mimeType || 'image/jpeg',
        size: a.size || 0,
        uploadedAt: a.uploadedAt || new Date(),
      }))
    : (attachment ? [{ url: attachment, name: 'Receipt', mimeType: 'image/jpeg', size: 0, uploadedAt: new Date() }] : []);

  let assignedFsNo = req.body.fsNo || '';
  let assignedFsNumber = req.body.fsNumber || 0;
  if (isSale && !assignedFsNo) {
    const fsData = await generateFsNo();
    assignedFsNo = fsData.fsNo;
    assignedFsNumber = fsData.fsNumber;
  }

  let assignedVoucherNo = (voucherNo || '').trim();
  if (isSale) {
    // Sales voucher numbers are strictly system auto-generated (e.g. CSALE-00013 / CRSALE-00006)
    const isValidSalesFormat = /^(CSALE|CRSALE)-\d{5,}$/i.test(assignedVoucherNo);
    if (!isValidSalesFormat) {
      assignedVoucherNo = await generateVoucherNo(canonicalVoucherType);
    }
  } else if (!assignedVoucherNo) {
    assignedVoucherNo = await generateVoucherNo(canonicalVoucherType);
  }

  const firstItem = resolvedItems[0];
  const txnData = {
    voucherType: canonicalVoucherType,
    voucherNo: assignedVoucherNo,
    fsNo: assignedFsNo,
    fsNumber: assignedFsNumber,
    supplier:  supplier || undefined,
    employee:  assignedEmployee || undefined,
    employeeName: assignedEmployeeName,
    employeeCode: assignedEmployeeCode,
    employeePhone: assignedEmployeePhone,
    tin:       assignedTin,
    storeLocation: assignedStoreLocation,
    consigneeUnit: assignedConsigneeUnit,
    deviceName:    assignedDeviceName,
    type:      direction,
    material:  firstItem.material,
    quantity:  firstItem.quantity,
    unitCost:  firstItem.unitCost,
    items:     resolvedItems.map(({ material, quantity, uom, unitCost, discount, additionalCharge, serialNumber, category, storeLocation, systemStock, physicalCount, projectedBalance, reconciliationNote, taxRate, taxAmount, subTotal, sellingPrice, totalCost, totalRevenue }) => ({
      material, quantity, uom, unitCost, discount, additionalCharge, serialNumber, category, storeLocation, systemStock, physicalCount, projectedBalance, reconciliationNote, taxRate, taxAmount, subTotal, sellingPrice, totalCost, totalRevenue
    })),
    reason:    reason || (isSale ? `${voucherType === 'cash_sale' ? 'Cash Sale' : 'Credit Sale'}` : ''),
    reference: reference || '',
    notes:     notes || '',
    remark:    req.body.remark || '',
    activity:  req.body.activity || '',
    creditTerms: req.body.creditTerms || '',
    discount:  req.body.discount !== undefined ? Number(req.body.discount) : resolvedItems.reduce((s, i) => s + (i.discount || 0), 0),
    additionalCharge: req.body.additionalCharge !== undefined ? Number(req.body.additionalCharge) : resolvedItems.reduce((s, i) => s + (i.additionalCharge || 0), 0),
    date: (() => {
      if (!date) return new Date();
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const now = new Date();
        const [y, m, d] = date.trim().split('-').map(Number);
        return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      return new Date(date);
    })(),
    attachment: attachment || (formattedAttachments[0]?.url || ''),
    attachments: formattedAttachments,
    performedBy: req.user._id,
    subTotal: computedSubTotal,
    totalAmount: isSale ? rawTotalAmount : computedGrandTotal,
    totalRevenue: isSale ? totalRevenue : 0,
    grossProfit:  isSale ? grossProfit : 0,
    taxRate: assignedTaxRate,
    taxableAmount: computedSubTotal,
    vatAmount: computedVat,
    taxAmount: computedVat,
    isVatInclusive: isTaxInclusive,
    customerName: customerName || (voucherType === 'cash_sale' ? 'Walk-in Customer' : ''),
    customerPhone: customerPhone || '',
    customerAddress: customerAddress || '',
    paymentType: assignedPaymentType,
    paymentStatus: assignedPaymentStatus,
    amountPaid: initialAmountPaid,
    dueDate: dueDate ? new Date(dueDate) : null,
    stockApplied: Boolean(isSale), // Only direct sales immediately affect stock; GRVs, Adjustments & non-sales wait for approval
    status: isSale ? 'posted' : 'pending',
    postedBy: isSale ? req.user._id : undefined,
    postedAt: isSale ? new Date() : undefined,
    trail: [{
      action: isSale ? 'posted' : 'pending',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: isSale ? `${voucherType === 'credit_sale' ? 'Credit' : 'Cash'} sale completed & stock deducted` : 'Voucher prepared (awaiting approval before stock balance update)',
    }],
  };

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  let transaction;
  try {
    const [createdTxn] = await StockTransaction.create([txnData], session ? { session } : {});
    transaction = createdTxn;

    // Direct sales immediately reduce stock atomically; GRVs, Adjustments, and non-sale vouchers wait for approval
    if (isSale) {
      await applyStockMovement(resolvedItems, direction, session, {
        defaultStore: assignedStoreLocation,
        updateWac: false,
      });
    }

    // If this is a direct sale, also create companion SalesRecord
    if (isSale) {
      try {
        const SalesRecord = require('../models/SalesRecord');
        await SalesRecord.create([{
          saleDate: txnData.date,
          reference: txnData.voucherNo,
          notes: `${voucherType === 'cash_sale' ? 'Cash Sale' : 'Credit Sale'}${customerName ? ' — ' + customerName : ''}`,
          source: voucherType,
          lines: resolvedItems.map(i => ({
            productName: i._doc.name,
            productCode: i._doc.code || '',
            quantitySold: i.quantity,
            sellingPrice: i.sellingPrice,
            revenue: i.totalRevenue,
            cogs: i.totalCost,
            grossProfit: i.totalRevenue - i.totalCost,
            matchStatus: 'direct_material',
            ingredientsUsed: [{
              materialId: i.material,
              materialName: i._doc.name,
              unit: i._doc.unit,
              quantityUsed: i.quantity,
              unitCost: i.unitCost,
              totalCost: i.totalCost,
            }],
          })),
          totalRevenue: txnData.totalRevenue,
          totalCOGS: txnData.totalAmount,
          grossProfit: txnData.grossProfit,
          profitMargin: txnData.totalRevenue > 0 ? (txnData.grossProfit / txnData.totalRevenue) * 100 : 0,
          stockTransaction: transaction._id,
          importedBy: req.user._id,
        }], session ? { session } : {});
      } catch (sErr) {
        console.warn('[Sale] Could not create companion SalesRecord:', sErr.message);
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(400);
    throw err;
  }

  const populated = await StockTransaction.findById(transaction._id)
    .populate('material', 'name unit unitCost category currentStock')
    .populate('items.material', 'name unit unitCost category currentStock')
    .populate('supplier', 'name')
    .populate('performedBy', 'name role');

  invalidateDashboardCache();
  tg.notifyTransaction(populated, req.user);
  notify.push({
    type: 'transaction',
    title: isSale ? (voucherType === 'cash_sale' ? 'New Cash Sale' : 'New Credit Sale') : 'New Stock Transaction',
    message: `${req.user.name} recorded ${populated.voucherNo} (${populated.items?.length || 1} item(s)) — ETB ${(populated.totalRevenue || populated.totalAmount).toLocaleString()}`,
    icon: isSale ? '💰' : (populated.type === 'in' ? '📥' : '📤'),
    link: isSale ? '/sales' : '/transactions',
    severity: 'info',
    userId: req.user._id
  });
  res.status(201).json(populated);
});
// ── PUT /api/transactions/:id ─────────────────────────────────────────
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await StockTransaction.findById(req.params.id);
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.status !== 'pending') {
    res.status(400);
    throw new Error(`Cannot edit transaction in "${transaction.status}" status. Only pending transactions can be edited.`);
  }
  const {
    voucherType = transaction.voucherType,
    voucherNo,
    supplier,
    items = [],
    reason,
    reference,
    notes,
    date,
    attachments = [],
    attachment = '',
  } = req.body;

  if (!VOUCHER_DIRECTION[voucherType]) {
    res.status(400);
    throw new Error(`Unknown voucher type: ${voucherType}`);
  }

  const newDirection = VOUCHER_DIRECTION[voucherType];
  const oldDirection = transaction.type || VOUCHER_DIRECTION[transaction.voucherType];

  if (!items.length) {
    res.status(400);
    throw new Error('At least one item is required.');
  }

  if ((voucherType === 'cash_grv' || voucherType === 'credit_grv') && !supplier) {
    res.status(400);
    throw new Error('Supplier is required for Goods Receiving Vouchers.');
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    // 1. If stock was previously applied, reverse the old stock movement first
    if (transaction.stockApplied) {
      const oldItems = transaction.items?.length
        ? transaction.items
        : [{ material: transaction.material, quantity: transaction.quantity, storeLocation: transaction.storeLocation }];
      await reverseStockMovement(oldItems, oldDirection, session, {
        defaultStore: transaction.storeLocation,
      });
      transaction.stockApplied = false;
    }

    const isApprovedOrPosted = ['approved', 'posted'].includes(transaction.status);

    // 2. Validate negative stock reduction for new items if stock is to be applied
    const assignedStore = req.body.storeLocation || req.body.consigneeUnit || transaction.storeLocation || 'Main Store';
    if (isApprovedOrPosted && newDirection === 'out') {
      const val = await validateStockForReduction(resolvedItems, assignedStore, session);
      if (!val.valid) {
        throw new Error(val.error);
      }
    }

    // 3. Only apply stock movement if the transaction is approved or posted!
    // GRVs, Adjustments, and non-sale vouchers do NOT affect stock balance while pending/unapproved.
    if (isApprovedOrPosted) {
      await applyStockMovement(resolvedItems, newDirection, session, {
        defaultStore: assignedStore,
        updateWac: ['cash_grv', 'credit_grv', 'fresh_bazaar', 'pos_adjustment'].includes(voucherType),
      });
      transaction.stockApplied = true;
    } else {
      transaction.stockApplied = false;
    }

    // 4. Update transaction document
    const rawTotalAmount = resolvedItems.reduce((s, i) => s + i.totalCost, 0);
    const formattedAttachments = Array.isArray(attachments) && attachments.length > 0
      ? attachments.map(a => ({
          url: a.url || a,
          name: a.name || 'Receipt',
          mimeType: a.mimeType || 'image/jpeg',
          size: a.size || 0,
          uploadedAt: a.uploadedAt || new Date(),
        }))
      : (attachment ? [{ url: attachment, name: 'Receipt', mimeType: 'image/jpeg', size: 0, uploadedAt: new Date() }] : []);

    const firstItem = resolvedItems[0];

    transaction.voucherType = voucherType;
    if (voucherNo) transaction.voucherNo = voucherNo;
    transaction.supplier    = supplier || undefined;
    if (req.body.employee !== undefined) transaction.employee = req.body.employee || undefined;
    if (req.body.employeeName !== undefined) transaction.employeeName = req.body.employeeName;
    if (req.body.employeeCode !== undefined) transaction.employeeCode = req.body.employeeCode;
    if (req.body.employeePhone !== undefined) transaction.employeePhone = req.body.employeePhone;
    if (req.body.tin !== undefined) transaction.tin = req.body.tin;
    if (req.body.consigneeUnit) transaction.consigneeUnit = req.body.consigneeUnit;
    if (req.body.storeLocation) transaction.storeLocation = req.body.storeLocation;
    if (req.body.deviceName) transaction.deviceName = req.body.deviceName;
    if (req.body.remark !== undefined) transaction.remark = req.body.remark;
    if (req.body.activity !== undefined) transaction.activity = req.body.activity;
    if (req.body.creditTerms !== undefined) transaction.creditTerms = req.body.creditTerms;
    if (req.body.discount !== undefined) transaction.discount = Number(req.body.discount);
    if (req.body.additionalCharge !== undefined) transaction.additionalCharge = Number(req.body.additionalCharge);
    if (req.body.subTotal !== undefined) transaction.subTotal = Number(req.body.subTotal);
    if (req.body.vatAmount !== undefined) transaction.vatAmount = Number(req.body.vatAmount);
    if (req.body.taxRate !== undefined) transaction.taxRate = Number(req.body.taxRate);
    transaction.type        = newDirection;
    transaction.material    = firstItem.material;
    transaction.quantity    = firstItem.quantity;
    transaction.unitCost    = firstItem.unitCost;
    transaction.items       = resolvedItems.map(({ material, quantity, uom, unitCost, discount, additionalCharge, serialNumber, category, storeLocation, systemStock, physicalCount, projectedBalance, reconciliationNote, taxRate, taxAmount, subTotal, totalCost }) => ({
      material, quantity, uom: uom || '', unitCost, discount: discount || 0, additionalCharge: additionalCharge || 0, serialNumber: serialNumber || '', category: category || '', storeLocation: storeLocation || '', systemStock: systemStock || 0, physicalCount, projectedBalance: projectedBalance || 0, reconciliationNote: reconciliationNote || '', taxRate: taxRate || 15, taxAmount: taxAmount || 0, subTotal: subTotal || totalCost, totalCost
    }));
    transaction.reason      = reason || '';
    transaction.reference   = reference || '';
    transaction.notes       = notes || '';
    if (date) transaction.date = new Date(date);
    transaction.attachments = formattedAttachments;
    transaction.attachment  = formattedAttachments.length > 0 ? formattedAttachments[0].url : '';
    transaction.totalAmount = req.body.totalAmount !== undefined ? Number(req.body.totalAmount) : rawTotalAmount;

    if (!transaction.trail) transaction.trail = [];
    transaction.trail.push({
      action: 'pending',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: 'Voucher details updated and stock movement re-applied',
      at: new Date(),
    });

    await transaction.save({ session: session || undefined });

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(400);
    throw err;
  }

  const populated = await StockTransaction.findById(transaction._id)
    .populate('material', 'name code unit unitCost category currentStock storeLocation')
    .populate('items.material', 'name code unit unitCost category currentStock storeLocation')
    .populate('supplier', 'name tin contactPerson phone address')
    .populate('employee', 'firstName lastName employeeId phone department')
    .populate('performedBy checkedBy approvedBy postedBy', 'name role email');

  invalidateDashboardCache();
  tg.notifyTransactionUpdated(populated, req.user);
  res.json(populated);
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────
const deleteTransaction = asyncHandler(async (req, res) => {
  // STRICT SECURITY: Only Developer and Admin can delete/void transactions.
  // Admin must have explicit authority granted by the System Developer/Owner.
  if (req.user?.role === 'developer') {
    // Unrestricted developer access
  } else if (req.user?.role === 'admin') {
    const Setting = require('../models/Setting');
    const settings = await Setting.findOne();
    const adminAllowed = Boolean(settings?.allowAdminVoidDelete || settings?.rolePermissions?.voidTransactions?.admin);
    if (!adminAllowed) {
      res.status(403);
      throw new Error('Access denied: System Developer/Owner has not granted Admin permission to void or delete transactions.');
    }
  } else {
    res.status(403);
    throw new Error('Access denied: Only Developer and authorized Admin can delete or void transactions.');
  }

  const transaction = await StockTransaction.findById(req.params.id);
  if (!transaction) { res.status(404); throw new Error('Transaction not found'); }

  const direction = transaction.type || VOUCHER_DIRECTION[transaction.voucherType];

  // Only reverse stock if it was actually applied to inventory
  if (transaction.stockApplied) {
    const itemsToReverse = transaction.items?.length
      ? transaction.items
      : [{ material: transaction.material, quantity: transaction.quantity, storeLocation: transaction.storeLocation }];

    await reverseStockMovement(itemsToReverse, direction, null, {
      defaultStore: transaction.storeLocation,
    });
    transaction.stockApplied = false;
  }

  // Soft delete — move to recycle bin
  transaction.status      = 'voided';
  transaction.deletedAt   = new Date();
  transaction.deletedBy   = req.user?.name || 'System';
  transaction.deletedFrom = 'transactions';
  await transaction.save();

  tg.notifyTransactionDeleted(transaction, req.user);
  notify.push({ type: 'transaction', title: 'Transaction Deleted', message: `${req.user.name} deleted voucher ${transaction.voucherNo || transaction._id?.toString().slice(-6)}`, icon: '🗑️', link: '/transactions', severity: 'warning', userId: req.user._id });
  invalidateDashboardCache();
  res.json({ message: 'Transaction moved to recycle bin and stock reversed.' });
});

const bulkDeleteTransactions = asyncHandler(async (req, res) => {
  // STRICT SECURITY: Only Developer and Admin can delete/void transactions.
  // Admin must have explicit authority granted by the System Developer/Owner.
  if (req.user?.role === 'developer') {
    // Unrestricted developer access
  } else if (req.user?.role === 'admin') {
    const Setting = require('../models/Setting');
    const settings = await Setting.findOne();
    const adminAllowed = Boolean(settings?.allowAdminVoidDelete || settings?.rolePermissions?.voidTransactions?.admin);
    if (!adminAllowed) {
      res.status(403);
      throw new Error('Access denied: System Developer/Owner has not granted Admin permission to void or delete transactions.');
    }
  } else {
    res.status(403);
    throw new Error('Access denied: Only Developer and authorized Admin can delete or void transactions.');
  }

  const { ids } = req.body;
  if (!ids?.length) { res.status(400); throw new Error('No ids provided'); }

  const transactions = await StockTransaction.find({ _id: { $in: ids } });
  for (const transaction of transactions) {
    const direction = transaction.type || VOUCHER_DIRECTION[transaction.voucherType];
    if (transaction.stockApplied) {
      const items = transaction.items?.length
        ? transaction.items
        : [{ material: transaction.material, quantity: transaction.quantity, storeLocation: transaction.storeLocation }];
      await reverseStockMovement(items, direction, null, {
        defaultStore: transaction.storeLocation,
      });
      transaction.stockApplied = false;
    }
    transaction.status      = 'voided';
    transaction.deletedAt   = new Date();
    transaction.deletedBy   = req.user?.name || 'System';
    transaction.deletedFrom = 'transactions';
    await transaction.save();
  }

  invalidateDashboardCache();
  res.json({ message: `${ids.length} transaction(s) moved to recycle bin.` });
});

const restoreTransaction = asyncHandler(async (req, res) => {
  // STRICT SECURITY: Only System Developer & Owner can restore transactions
  if (req.user?.role !== 'developer') {
    res.status(403);
    throw new Error('Access denied: Only the System Developer & Owner can restore transactions from the Recycle Bin.');
  }

  const transaction = await StockTransaction.findById(req.params.id);
  if (!transaction) { res.status(404); throw new Error('Transaction not found'); }

  const direction = transaction.type || VOUCHER_DIRECTION[transaction.voucherType];
  if (!transaction.stockApplied) {
    const items = transaction.items?.length
      ? transaction.items
      : [{ material: transaction.material, quantity: transaction.quantity, storeLocation: transaction.storeLocation }];

    if (direction === 'out') {
      const val = await validateStockForReduction(items, transaction.storeLocation);
      if (!val.valid) {
        res.status(400);
        throw new Error(val.error);
      }
    }

    await applyStockMovement(items, direction, null, {
      defaultStore: transaction.storeLocation,
      updateWac: ['cash_grv', 'credit_grv', 'fresh_bazaar', 'pos_adjustment'].includes(transaction.voucherType),
    });
    transaction.stockApplied = true;
  }

  // If status was voided, reset to pending
  if (transaction.status === 'voided') {
    transaction.status = 'pending';
    transaction.trail = transaction.trail || [];
    transaction.trail.push({
      action: 'restored',
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      note: 'Restored from Recycle Bin by System Developer & Owner',
    });
  }

  transaction.deletedAt   = null;
  transaction.deletedBy   = null;
  transaction.deletedFrom = null;
  await transaction.save();

  invalidateDashboardCache();
  res.json({ message: 'Transaction restored and stock re-applied.', transaction });
});

const permanentDeleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await StockTransaction.findById(req.params.id);
  if (!transaction) { res.status(404); throw new Error('Transaction not found'); }
  await transaction.deleteOne();
  invalidateDashboardCache();
  res.json({ message: 'Transaction permanently deleted.' });
});


// ── GET /api/transactions/summary ────────────────────────────────────
const getVoucherSummary = asyncHandler(async (req, res) => {
  const { from, to, voucherType } = req.query;
  const match = {};
  if (voucherType) match.voucherType = voucherType;
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to)   match.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const summary = await StockTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$voucherType',
        count:       { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalQty:    { $sum: '$quantity' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(summary);
});

// ── POST /api/transactions/:id/advance ───────────────────────────────
const advanceTransaction = asyncHandler(async (req, res) => {
  const { action, password, note = '' } = req.body;
  if (!password) { res.status(400); throw new Error('Password is required. Please enter your login password to authorize this action.'); }

  const actor = await verifyUserPassword(req.user._id, password);
  if (!actor) { res.status(403); throw new Error('Incorrect password. Please re-enter your password to proceed.'); }

  const txn = await StockTransaction.findById(req.params.id);
  if (!txn) { res.status(404); throw new Error('Transaction not found'); }

  const actionCapMap = {
    check: 'checkReview',
    approve: 'approveGoods',
    post: 'postLedger',
    void: 'voidTransactions',
  };

  const cap = actionCapMap[action];
  if (!cap) { res.status(400); throw new Error(`Unknown action: ${action}`); }

  const transitions = {
    check:   { from: ['pending'],                               to: 'checked' },
    approve: { from: ['checked', 'pending'],                   to: 'approved' },
    post:    { from: ['approved', 'checked', 'pending'],        to: 'posted' },
    void:    { from: ['pending','checked','approved','posted'], to: 'voided' },
  };

  const rule = transitions[action];
  if (!rule.from.includes(txn.status)) {
    res.status(400);
    throw new Error(`Cannot ${action} a voucher that is currently "${txn.status}"`);
  }

  const allowed = await hasPermission(actor.role, cap);
  if (!allowed) {
    res.status(403);
    throw new Error(`Your role (${actor.role}) does not have permission to "${action}" vouchers`);
  }

  // STRICT SECURITY: Voiding can only be performed by Developer and authorized Admin
  if (action === 'void') {
    if (actor.role === 'developer') {
      // Unrestricted developer access
    } else if (actor.role === 'admin') {
      const Setting = require('../models/Setting');
      const settings = await Setting.findOne();
      const adminAllowed = Boolean(settings?.allowAdminVoidDelete || settings?.rolePermissions?.voidTransactions?.admin);
      if (!adminAllowed) {
        res.status(403);
        throw new Error('Access denied: System Developer/Owner has not granted Admin permission to void transactions.');
      }
    } else {
      res.status(403);
      throw new Error('Access denied: Only Developer and authorized Admin can void transactions.');
    }
  }

  // Anti-self-approval rule (Segregation of Duties)
  if (action === 'approve' || action === 'check') {
    const creatorId = txn.performedBy?._id?.toString() || txn.performedBy?.toString();
    if (creatorId && creatorId === actor._id.toString() && actor.role !== 'developer') {
      res.status(403);
      throw new Error(`Segregation of Duties Violation: You cannot ${action} a voucher that you prepared. An independent administrator must review and ${action}.`);
    }
  }

  if (action === 'post') {
    const creatorId = txn.performedBy?._id?.toString() || txn.performedBy?.toString();
    if (creatorId && creatorId === actor._id.toString() && !['developer', 'admin'].includes(actor.role)) {
      res.status(403);
      throw new Error('Segregation of Duties Violation: You cannot post a voucher that you prepared. An authorized reviewer must post it.');
    }
  }

  const prev = txn.status;
  txn.status = rule.to;
  txn.trail = txn.trail || [];
  txn.trail.push({ action: rule.to, by: actor._id, byName: actor.name, byRole: actor.role, note });

  if (action === 'check')   { txn.checkedBy  = actor._id; txn.checkedAt  = new Date(); }
  if (action === 'approve') { txn.approvedBy = actor._id; txn.approvedAt = new Date(); }
  if (action === 'post')    { txn.postedBy   = actor._id; txn.postedAt   = new Date(); }

  // ── STOCK IMPACT RULES ────────────────────────────────────────────
  // STRICT RULE: GRVs, Adjustments, and Stock Vouchers ONLY affect stock balance upon APPROVAL or POSTING.
  // Checking/reviewing a voucher does NOT affect stock balance.
  // When an approval takes place ('approve' or 'post'), stock is atomically applied to currentStock and storeBalances.
  // Duplicate-update protection: if txn.stockApplied is already true, it is not re-applied.
  // VOIDED   → reverse stock movement and set stockApplied = false.
  const direction = txn.type || VOUCHER_DIRECTION[txn.voucherType];
  const stockItems = txn.items?.length
    ? txn.items
    : [{ material: txn.material, quantity: txn.quantity, unitCost: txn.unitCost, storeLocation: txn.storeLocation }];

  if (['approve', 'post'].includes(action)) {
    // Apply stock only upon approval or posting
    if (!txn.stockApplied) {
      if (direction === 'out') {
        const val = await validateStockForReduction(stockItems, txn.storeLocation);
        if (!val.valid) {
          res.status(400);
          throw new Error(val.error);
        }
      }
      await applyStockMovement(stockItems, direction, null, {
        defaultStore: txn.storeLocation,
        updateWac: ['cash_grv', 'credit_grv', 'fresh_bazaar', 'pos_adjustment'].includes(txn.voucherType),
      });
      txn.stockApplied = true;
    }
  }

  if (action === 'void') {
    // Only reverse stock if it was actually applied to inventory
    if (txn.stockApplied) {
      await reverseStockMovement(stockItems, direction, null, {
        defaultStore: txn.storeLocation,
      });
      txn.stockApplied = false;
    }
    // Automatically move voided transaction to recycle bin
    txn.deletedAt   = new Date();
    txn.deletedBy   = actor.name || 'System';
    txn.deletedFrom = 'transactions';
  }

  await txn.save();
  invalidateDashboardCache();

  const populated = await StockTransaction.findById(txn._id)
    .populate('material', 'name code unit unitCost category currentStock storeLocation')
    .populate('items.material', 'name code unit unitCost category currentStock storeLocation')
    .populate('supplier', 'name tin contactPerson phone address')
    .populate('performedBy checkedBy approvedBy postedBy', 'name role email');

  tg.notifyTransactionAdvanced(populated, action, actor);
  if (['void','approve','post'].includes(action)) {
    notify.push({
      type: 'transaction',
      title: `Voucher ${action.toUpperCase()}ED`,
      message: `${actor.name} ${action}ed ${populated.voucherNo || 'voucher'}`,
      icon: action === 'void' ? '🔴' : (action === 'post' ? '✅' : '🟣'),
      link: '/transactions',
      severity: action === 'void' ? 'error' : 'success',
      userId: actor._id
    });
  }
  res.json({ message: `Voucher moved from "${prev}" → "${rule.to}"`, transaction: populated });
});


// ── POST /api/transactions/import-sales ──────────────────────────────
// Enhanced: matches by product code OR name, deducts stock if matched, records complete sold POS products list
const importSales = asyncHandler(async (req, res) => {
  const { sales, notes, reference, saleDate } = req.body;
  if (!sales || !sales.length) {
    res.status(400);
    throw new Error('No sales data provided');
  }

  const Product     = require('../models/Product');
  const SalesRecord = require('../models/SalesRecord');

  const escapeRegex = (s) => (s ? String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

  const materialDeductions = {};
  const saleLines = [];
  const allSoldProducts = [];
  const notFound  = [];

  for (const sale of sales) {
    const { productName, productCode, quantity, revenue, unitPrice } = sale;
    const nameStr = (productName || '').trim();
    const codeStr = (productCode || '').trim();

    if (!nameStr && !codeStr) continue;

    const qty = Math.max(0.001, Number(quantity) || 1);
    const rev = Number(revenue) || 0;
    const price = Number(unitPrice) || 0;
    const lineIngredients = [];

    // 1. Try to find in Product by code or name (isActive only)
    let product = null;
    if (codeStr) {
      // Match exact code OR code with trailing dashes (e.g. stored as "P-0001-")
      const escapedCode = escapeRegex(codeStr);
      product = await Product.findOne({
        isActive: true,
        code: { $regex: `^${escapedCode}-*$`, $options: 'i' },
      }).populate({ path: 'ingredients.material', model: 'RawMaterial' });
    }
    if (!product && nameStr) {
      product = await Product.findOne({
        isActive: true,
        name: new RegExp(`^${escapeRegex(nameStr)}$`, 'i'),
      }).populate({ path: 'ingredients.material', model: 'RawMaterial' });
    }
    // Fallback: partial match — code contains the term or name contains the term
    if (!product && (codeStr || nameStr)) {
      const term = escapeRegex(codeStr || nameStr);
      product = await Product.findOne({
        isActive: true,
        $or: [
          { code: { $regex: `^${term}-*$`, $options: 'i' } },
          { name: { $regex: `^${term}$`,   $options: 'i' } },
        ],
      }).populate({ path: 'ingredients.material', model: 'RawMaterial' });
    }

    if (product) {
      let cogs = 0;
      // Re-fetch ingredients with explicit populate to ensure materials load
      // even if the shorthand populate silently missed them
      const ingList = product.ingredients || [];
      const hasRecipe = ingList.length > 0;
      if (hasRecipe) {
        for (const ing of ingList) {
          // ing.material is populated; if null, fetch manually by ID
          let mat = ing.material;
          if (!mat && ing._doc?.material) {
            mat = await RawMaterial.findById(ing._doc.material).lean();
          }
          if (!mat) continue;
          const matId     = mat._id.toString();
          const deductQty = ing.quantity * qty;
          const ingCost   = (mat.unitCost || 0) * deductQty;
          cogs += ingCost;
          materialDeductions[matId] = (materialDeductions[matId] || 0) + deductQty;
          lineIngredients.push({
            materialId:   mat._id,
            materialName: mat.name,
            unit:         mat.unit,
            quantityUsed: deductQty,
            unitCost:     mat.unitCost || 0,
            totalCost:    ingCost,
          });
        }
      }

      let lineRev = rev;
      if (lineRev <= 0) {
        if (price > 0) lineRev = price * qty;
        else if (product.sellingPrice > 0) lineRev = product.sellingPrice * qty;
      }
      const lineSellingPrice = qty > 0 ? (lineRev / qty) : (product.sellingPrice || 0);

      const recordLine = {
        productName:     product.name || nameStr,
        productCode:     product.code || codeStr,
        productId:       product._id,
        category:        product.category || 'General',
        parentCategory:  product.parentCategory || 'FOOD',
        uom:             product.uom || 'Pcs',
        quantitySold:    qty,
        sellingPrice:    lineSellingPrice,
        revenue:         lineRev,
        cogs,
        grossProfit:     lineRev - cogs,
        matchStatus:     (hasRecipe && lineIngredients.length > 0) ? 'recipe_deducted' : (hasRecipe ? 'no_recipe' : 'no_recipe'),
        ingredientsUsed: lineIngredients,
      };

      saleLines.push(recordLine);
      allSoldProducts.push(recordLine);
      continue;
    }

    // 2. Try RawMaterial directly
    let material = null;
    if (codeStr) {
      material = await RawMaterial.findOne({ code: new RegExp(`^${escapeRegex(codeStr)}$`, 'i') });
    }
    if (!material && nameStr) {
      material = await RawMaterial.findOne({ name: new RegExp(`^${escapeRegex(nameStr)}$`, 'i') });
    }
    if (!material && (codeStr || nameStr)) {
      const term = (nameStr || codeStr);
      material = await RawMaterial.findOne({
        $or: [
          { code: new RegExp(`^${escapeRegex(term)}$`, 'i') },
          { name: new RegExp(`^${escapeRegex(term)}$`, 'i') },
        ]
      });
    }

    if (material) {
      const matId   = material._id.toString();
      const ingCost = (material.unitCost || 0) * qty;
      materialDeductions[matId] = (materialDeductions[matId] || 0) + qty;
      lineIngredients.push({
        materialId:   material._id,
        materialName: material.name,
        unit:         material.unit,
        quantityUsed: qty,
        unitCost:     material.unitCost || 0,
        totalCost:    ingCost,
      });

      let lineRev = rev;
      if (lineRev <= 0) {
        if (price > 0) lineRev = price * qty;
        else if (material.unitCost > 0) lineRev = material.unitCost * 1.35 * qty;
      }
      const lineSellingPrice = qty > 0 ? (lineRev / qty) : 0;

      const recordLine = {
        productName:     material.name || nameStr,
        productCode:     material.code || codeStr,
        productId:       null,
        category:        material.category || 'General',
        parentCategory:  'RAW',
        uom:             material.unit || 'Pcs',
        quantitySold:    qty,
        sellingPrice:    lineSellingPrice,
        revenue:         lineRev,
        cogs:            ingCost,
        grossProfit:     lineRev - ingCost,
        matchStatus:     'direct_material',
        ingredientsUsed: lineIngredients,
      };

      saleLines.push(recordLine);
      allSoldProducts.push(recordLine);
      continue;
    }

    // 3. Unmatched product
    const identifier = nameStr || codeStr;
    notFound.push(identifier);

    let lineRev = rev;
    if (lineRev <= 0 && price > 0) lineRev = price * qty;
    const lineSellingPrice = qty > 0 ? (lineRev / qty) : price;

    const unmatchedLine = {
      productName:     nameStr || codeStr,
      productCode:     codeStr,
      productId:       null,
      category:        'Unmatched',
      parentCategory:  '—',
      uom:             'Pcs',
      quantitySold:    qty,
      sellingPrice:    lineSellingPrice,
      revenue:         lineRev,
      cogs:            0,
      grossProfit:     lineRev,
      matchStatus:     'unmatched',
      ingredientsUsed: [],
    };
    allSoldProducts.push(unmatchedLine);
  }

  // Aggregate totals
  const totalRevenue = saleLines.reduce((s, l) => s + (l.revenue     || 0), 0);
  const totalCOGS    = saleLines.reduce((s, l) => s + (l.cogs        || 0), 0);
  const grossProfit  = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Create SalesRecord
  const salesRecord = await SalesRecord.create({
    saleDate:    saleDate ? new Date(saleDate) : new Date(),
    reference:   reference || '',
    notes:       notes || 'Imported from POS/Excel report',
    source:      'excel_import',
    lines:       saleLines,
    totalRevenue,
    totalCOGS,
    grossProfit,
    profitMargin,
    importedBy:  req.user._id,
  });

  // Create stock transaction if there are materials to deduct
  let transaction = null;
  const resolvedItems = [];
  for (const [matId, qty] of Object.entries(materialDeductions)) {
    if (qty <= 0) continue;
    const mat = await RawMaterial.findById(matId);
    if (mat) resolvedItems.push({ material: mat._id, quantity: qty, unitCost: mat.unitCost || 0, totalCost: (mat.unitCost || 0) * qty, _doc: mat });
  }

  if (resolvedItems.length > 0) {
    const totalAmount = resolvedItems.reduce((s, i) => s + i.totalCost, 0);
    transaction = await StockTransaction.create({
      voucherType: 'sales_import',
      voucherNo:   await generateVoucherNo('sales_import'),
      type:        'out',
      items:       resolvedItems.map(({ material, quantity, unitCost, totalCost }) => ({ material, quantity, unitCost, totalCost })),
      material:    resolvedItems[0].material,
      quantity:    resolvedItems[0].quantity,
      unitCost:    resolvedItems[0].unitCost,
      reason:      'Sales Report Import',
      reference:   reference || '',
      notes:       notes || 'Automated stock deduction from sales report',
      date:        saleDate ? new Date(saleDate) : new Date(),
      performedBy: req.user._id,
      totalAmount,
      stockApplied: true,
      status:      'posted',
      trail: [{ action: 'posted', by: req.user._id, byName: req.user.name, byRole: req.user.role, note: 'Sales import posted & stock deducted' }],
    });

    salesRecord.stockTransaction = transaction._id;
    await salesRecord.save();

    await applyStockMovement(resolvedItems, 'out', null, {
      defaultStore: 'Main Store',
    });
  }

  invalidateDashboardCache();

  res.status(201).json({
    message: 'Sales imported. Stock deducted and P&L recorded.',
    salesRecord,
    transactionId: transaction?._id,
    summary: {
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin: profitMargin.toFixed(1) + '%',
      totalSoldProducts: allSoldProducts.length,
      matchedCount: saleLines.length,
      unmatchedCount: notFound.length,
    },
    items: allSoldProducts,
    unmatchedProducts: notFound,
  });
});

// ── POST /api/transactions/parse-image-sales ─────────────────────────
// Accepts a base64-encoded image of a POS report, runs OCR via ocr.space,
// parses the resulting text for article codes / names / quantities / amounts.
const parseImageSales = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) { res.status(400); throw new Error('No image data provided'); }

  const https    = require('https');
  const querystring = require('querystring');

  const OCR_API_KEY = process.env.OCR_API_KEY || 'helloworld'; // helloworld = free demo key

  // Call ocr.space API
  const ocrText = await new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      base64Image: `data:${mimeType};base64,${imageBase64}`,
      language:    'eng',
      isTable:     'true',
      OCREngine:   '2',
      apikey:      OCR_API_KEY,
    });

    const options = {
      hostname: 'api.ocr.space',
      path:     '/parse/image',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.IsErroredOnProcessing) {
            reject(new Error(json.ErrorMessage?.[0] || 'OCR processing failed'));
            return;
          }
          const text = json.ParsedResults?.[0]?.ParsedText || '';
          resolve(text);
        } catch (e) {
          reject(new Error('Invalid OCR response'));
        }
      });
    });
    request.on('error', reject);
    request.write(postData);
    request.end();
  });

  if (!ocrText.trim()) {
    res.status(422); throw new Error('No text detected in the image. Please use a clearer photo.');
  }

  // ── Parse OCR text for POS data ──────────────────────────────────
  // Lines that look like: CODE  NAME  QTY  AVG_AMOUNT  TOTAL_AMOUNT
  // We try to extract rows with at least a code pattern (P-XXXX) and numbers.
  const rows = [];
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip header/summary lines
    if (/^(category|sub.?category|article|catagory|total|grand|sub\s|add\.|discount|erp|page|count:)/i.test(line)) continue;
    if (/^\s*$/.test(line)) continue;

    // Try to detect a product code pattern (P-XXXX or p-XXXXX-)
    const codeMatch = line.match(/\b([Pp]-?\d{3,6}-?)\b/);
    if (!codeMatch) continue; // skip lines without a product code

    const code = codeMatch[1].replace(/-+$/, '').trim();

    // Extract all numbers from the line
    const nums = [...line.matchAll(/[\d,]+\.?\d*/g)]
      .map(m => parseFloat(m[0].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0);

    if (nums.length < 2) continue; // need at least qty + one amount

    // Heuristic: first small number = qty, last large number = total amount, middle = avg
    const qty      = nums[0] <= 1000 ? nums[0] : 1;
    const totalAmt = nums[nums.length - 1];
    const avgAmt   = nums.length >= 3 ? nums[nums.length - 2] : (qty > 0 ? totalAmt / qty : totalAmt);

    // Extract product name — text between code and first number
    const afterCode = line.slice(line.indexOf(codeMatch[0]) + codeMatch[0].length);
    const nameMatch = afterCode.match(/^[^0-9\t]*/);
    const name = (nameMatch ? nameMatch[0] : '').replace(/[^\w\s\-\/\(\)]/g, '').trim();

    if (qty <= 0 || totalAmt <= 0) continue;

    rows.push({ code, name, qty, avgAmt, totalAmt });
  }

  res.json({
    rows,
    rawText: ocrText,
    message: rows.length > 0
      ? `Detected ${rows.length} product line(s) from the image.`
      : 'No product lines detected. The image may be unclear or not in CNET format.',
  });
});

// ── PUT /api/transactions/:id/payment ─────────────────────────────────
// Record payment against credit sale
const recordSalePayment = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    res.status(400);
    throw new Error('Valid payment amount is required');
  }

  const txn = await StockTransaction.findById(req.params.id);
  if (!txn) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  const newAmountPaid = (txn.amountPaid || 0) + paymentAmount;
  txn.amountPaid = newAmountPaid;
  const total = txn.totalRevenue || txn.totalAmount;

  if (newAmountPaid >= total) {
    txn.paymentStatus = 'paid';
  } else if (newAmountPaid > 0) {
    txn.paymentStatus = 'partial';
  }

  txn.trail = txn.trail || [];
  txn.trail.push({
    action: 'payment',
    by: req.user._id,
    byName: req.user.name,
    byRole: req.user.role,
    note: `Received payment of ETB ${paymentAmount.toFixed(2)}${notes ? ' (' + notes + ')' : ''}. Total paid: ETB ${newAmountPaid.toFixed(2)} / ${total.toFixed(2)}`,
  });

  await txn.save();

  const populated = await StockTransaction.findById(txn._id)
    .populate('material', 'name unit unitCost category currentStock')
    .populate('items.material', 'name unit unitCost category currentStock')
    .populate('supplier', 'name')
    .populate('performedBy', 'name role');

  res.json(populated);
});

// ── GET /api/transactions/reconciliation ─────────────────────────────
const getReconciliationSummary = asyncHandler(async (req, res) => {
  const { storeLocation, materialId } = req.query;
  const filter = { isActive: true };
  if (storeLocation && storeLocation !== 'all') {
    const sRegex = new RegExp(`^${storeLocation.trim()}$`, 'i');
    filter.$or = [
      { storeLocation: sRegex },
      { 'storeBalances.store': sRegex },
    ];
  }
  if (materialId) {
    filter._id = materialId;
  }

  const materials = await RawMaterial.find(filter).lean();
  let latestCount = null;
  try {
    const InventoryCount = require('../models/InventoryCount');
    const countFilter = { status: { $ne: 'closed' } };
    if (storeLocation && storeLocation !== 'all') {
      countFilter.storeLocation = storeLocation;
    }
    latestCount = await InventoryCount.findOne(countFilter)
      .sort({ createdAt: -1 })
      .lean();
  } catch { /* ignore */ }

  const results = [];
  for (const mat of materials) {
    const curStock = (storeLocation && storeLocation !== 'all')
      ? getStoreStock(mat, storeLocation)
      : (mat.currentStock ?? 0);
    let physCount = null;

    if (latestCount?.lines?.length) {
      const line = latestCount.lines.find(l => l.material?.toString() === mat._id.toString());
      if (line && line.physicalCount !== null && line.physicalCount !== undefined) {
        physCount = Number(line.physicalCount);
      }
    }

    let recommendation = 'balanced';
    let suggestedVoucherType = null;
    let suggestedQty = 0;
    let projectedBalance = curStock;
    let reason = '';

    if (curStock < 0 && (physCount === null || physCount === 0)) {
      recommendation = 'negative_stock';
      suggestedVoucherType = 'pos_adjustment';
      suggestedQty = Math.abs(curStock);
      projectedBalance = 0;
      reason = 'System stock is negative. Suggesting PSAV to restore ledger to zero.';
    } else if (physCount !== null) {
      const diff = physCount - curStock;
      if (diff > 0) {
        recommendation = 'surplus';
        suggestedVoucherType = 'pos_adjustment';
        suggestedQty = Number(diff.toFixed(4));
        projectedBalance = physCount;
        reason = `Physical stock (${physCount}) exceeds system stock (${curStock}). Positive adjustment recommended.`;
      } else if (diff < 0) {
        recommendation = 'shortage';
        suggestedVoucherType = 'neg_adjustment';
        suggestedQty = Number(Math.abs(diff).toFixed(4));
        projectedBalance = physCount;
        reason = `System stock (${curStock}) exceeds physical count (${physCount}). Negative adjustment recommended.`;
      } else {
        recommendation = 'matched';
        reason = 'Physical count matches system ledger balance.';
      }
    } else {
      reason = 'No physical variance recorded.';
    }

    results.push({
      materialId: mat._id,
      code: mat.code || '',
      name: mat.name,
      category: mat.category || 'Item',
      unit: mat.unit || 'Pcs',
      unitCost: mat.unitCost || 0,
      storeLocation: (storeLocation && storeLocation !== 'all') ? storeLocation : (mat.storeLocation || 'Main store'),
      systemStock: curStock,
      physicalCount: physCount,
      variance: physCount !== null ? (physCount - curStock) : 0,
      recommendation,
      suggestedVoucherType,
      suggestedQty,
      projectedBalance,
      reason,
    });
  }

  res.json(results);
});

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  restoreTransaction,
  permanentDeleteTransaction,
  getVoucherSummary,
  getNextVoucherNo,
  getReconciliationSummary,
  advanceTransaction,
  importSales,
  parseImageSales,
  recordSalePayment,
};
