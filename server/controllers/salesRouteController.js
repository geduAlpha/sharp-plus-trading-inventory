const asyncHandler = require('express-async-handler');
const SalesRoute = require('../models/SalesRoute');
const Customer = require('../models/Customer');
const StockTransaction = require('../models/StockTransaction');
const AuditLog = require('../models/AuditLog');

// @desc    Get all sales routes with customer count
// @route   GET /api/sales-routes
// @access  Private
const getSalesRoutes = asyncHandler(async (req, res) => {
  const routes = await SalesRoute.find({ deletedAt: null }).sort({ code: 1 }).lean();

  // Populate dynamic customer counts for each route
  const routesWithStats = await Promise.all(
    routes.map(async (r) => {
      const customerCount = await Customer.countDocuments({
        assignedRoute: r.name,
        isActive: true,
        deletedAt: null,
      });

      // Aggregate sales metrics for this route
      const salesAgg = await StockTransaction.aggregate([
        {
          $match: {
            assignedRoute: r.name,
            deletedAt: null,
            status: { $ne: 'voided' },
            voucherType: { $in: ['cash_sale', 'cash_sales', 'credit_sale', 'credit_sales'] },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: { $ifNull: ['$totalRevenue', '$totalAmount'] } },
            voucherCount: { $sum: 1 },
          },
        },
      ]);

      const stat = salesAgg[0] || { totalSales: 0, voucherCount: 0 };

      return {
        ...r,
        customerCount,
        totalSales: stat.totalSales,
        voucherCount: stat.voucherCount,
      };
    })
  );

  res.json(routesWithStats);
});

// @desc    Create a new sales route
// @route   POST /api/sales-routes
// @access  Private
const createSalesRoute = asyncHandler(async (req, res) => {
  const { code, name, description, zone, assignedRep, repPhone, vehicleNo, targetStores } = req.body;

  if (!code || !name) {
    res.status(400);
    throw new Error('Route code and route name are required.');
  }

  const existing = await SalesRoute.findOne({
    code: code.trim().toUpperCase(),
    deletedAt: null,
  });
  if (existing) {
    res.status(400);
    throw new Error(`Route code "${code}" already exists.`);
  }

  const route = await SalesRoute.create({
    code: code.trim().toUpperCase(),
    name: name.trim(),
    description: description || '',
    zone: zone || 'Central',
    assignedRep: assignedRep || 'Unassigned',
    repPhone: repPhone || '',
    vehicleNo: vehicleNo || '',
    targetStores: Array.isArray(targetStores) ? targetStores : [],
  });

  await AuditLog.create({
    user: req.user?._id,
    userName: req.user?.name || 'System',
    userRole: req.user?.role || 'user',
    action: 'CREATE',
    module: 'salesMarketing',
    resourceId: route._id.toString(),
    resourceName: route.name,
    details: { code: route.code, name: route.name, assignedRep: route.assignedRep },
    ip: req.ip || '',
  }).catch(() => {});

  res.status(201).json(route);
});

// @desc    Update a sales route
// @route   PUT /api/sales-routes/:id
// @access  Private
const updateSalesRoute = asyncHandler(async (req, res) => {
  const route = await SalesRoute.findById(req.params.id);
  if (!route || route.deletedAt) {
    res.status(404);
    throw new Error('Sales route not found.');
  }

  const oldName = route.name;
  if (req.body.name) route.name = req.body.name.trim();
  if (req.body.description !== undefined) route.description = req.body.description;
  if (req.body.zone) route.zone = req.body.zone.trim();
  if (req.body.assignedRep) route.assignedRep = req.body.assignedRep.trim();
  if (req.body.repPhone !== undefined) route.repPhone = req.body.repPhone.trim();
  if (req.body.vehicleNo !== undefined) route.vehicleNo = req.body.vehicleNo.trim();
  if (req.body.targetStores) route.targetStores = req.body.targetStores;
  if (req.body.isActive !== undefined) route.isActive = Boolean(req.body.isActive);

  await route.save();

  // If route name changed, synchronize assigned customers
  if (oldName !== route.name) {
    await Customer.updateMany({ assignedRoute: oldName }, { $set: { assignedRoute: route.name } });
    await StockTransaction.updateMany({ assignedRoute: oldName }, { $set: { assignedRoute: route.name } });
  }

  res.json(route);
});

// @desc    Assign customers to a sales route
// @route   POST /api/sales-routes/assign-customers
// @access  Private
const assignCustomersToRoute = asyncHandler(async (req, res) => {
  const { customerIds, routeName } = req.body;

  if (!Array.isArray(customerIds) || customerIds.length === 0 || !routeName) {
    res.status(400);
    throw new Error('Customer IDs array and target route name are required.');
  }

  // Handle both registered customer ObjectIds and historical customer strings
  const validObjectIds = customerIds.filter((id) => !String(id).startsWith('imported_'));
  const importedNames = customerIds
    .filter((id) => String(id).startsWith('imported_'))
    .map((id) => decodeURIComponent(String(id).replace('imported_', '')));

  let modifiedCount = 0;

  if (validObjectIds.length > 0) {
    const resUpdate = await Customer.updateMany(
      { _id: { $in: validObjectIds } },
      { $set: { assignedRoute: routeName } }
    );
    modifiedCount += resUpdate.modifiedCount;

    // Also link open transactions for these customers to the route
    const customers = await Customer.find({ _id: { $in: validObjectIds } }).select('name').lean();
    const names = customers.map((c) => c.name);
    await StockTransaction.updateMany(
      { customerName: { $in: names } },
      { $set: { assignedRoute: routeName } }
    );
  }

  if (importedNames.length > 0) {
    await StockTransaction.updateMany(
      { customerName: { $in: importedNames } },
      { $set: { assignedRoute: routeName } }
    );
    modifiedCount += importedNames.length;
  }

  res.json({
    message: `Successfully assigned ${modifiedCount} customer(s) to route "${routeName}".`,
    assignedRoute: routeName,
    count: modifiedCount,
  });
});

// @desc    Get Route-wise Sales Report
// @route   GET /api/sales-routes/report
// @access  Private
const getRouteWiseSalesReport = asyncHandler(async (req, res) => {
  const { from, to, zone } = req.query;

  const matchFilter = {
    deletedAt: null,
    status: { $ne: 'voided' },
    voucherType: { $in: ['cash_sale', 'cash_sales', 'credit_sale', 'credit_sales'] },
  };

  if (from || to) {
    matchFilter.date = {};
    if (from) matchFilter.date.$gte = new Date(from);
    if (to) matchFilter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const transactions = await StockTransaction.find(matchFilter).lean();
  const allRoutes = await SalesRoute.find({ deletedAt: null }).lean();

  const routeMap = new Map();

  // Initialize from defined routes
  allRoutes.forEach((r) => {
    if (zone && zone !== 'all' && r.zone !== zone) return;
    routeMap.set(r.name, {
      routeCode: r.code,
      routeName: r.name,
      zone: r.zone,
      assignedRep: r.assignedRep,
      voucherCount: 0,
      cashRevenue: 0,
      creditRevenue: 0,
      totalRevenue: 0,
      unitsSold: 0,
      customerNames: new Set(),
    });
  });

  // Ensure "Default / Unassigned Route" entry
  if (!routeMap.has('Default Route')) {
    routeMap.set('Default Route', {
      routeCode: 'RT-DEF',
      routeName: 'Default Route',
      zone: 'General',
      assignedRep: 'Unassigned',
      voucherCount: 0,
      cashRevenue: 0,
      creditRevenue: 0,
      totalRevenue: 0,
      unitsSold: 0,
      customerNames: new Set(),
    });
  }

  // Aggregate transactions
  transactions.forEach((tx) => {
    const rName = tx.assignedRoute || 'Default Route';
    if (!routeMap.has(rName)) {
      routeMap.set(rName, {
        routeCode: 'RT-AUTO',
        routeName: rName,
        zone: 'General',
        assignedRep: 'Unassigned',
        voucherCount: 0,
        cashRevenue: 0,
        creditRevenue: 0,
        totalRevenue: 0,
        unitsSold: 0,
        customerNames: new Set(),
      });
    }

    const entry = routeMap.get(rName);
    const rev = Number(tx.totalRevenue || tx.totalAmount || 0);
    const isCredit = tx.voucherType === 'credit_sale' || tx.voucherType === 'credit_sales';
    const qty = Array.isArray(tx.items)
      ? tx.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
      : Number(tx.quantity || 0);

    entry.voucherCount++;
    entry.unitsSold += qty;
    entry.totalRevenue += rev;
    if (isCredit) {
      entry.creditRevenue += rev;
    } else {
      entry.cashRevenue += rev;
    }

    const cName = tx.customerName || tx.customer?.name;
    if (cName) entry.customerNames.add(cName.trim());
  });

  const report = Array.from(routeMap.values()).map((r) => ({
    ...r,
    uniqueCustomersCount: r.customerNames.size,
    customerNames: undefined,
  }));

  report.sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json(report);
});

module.exports = {
  getSalesRoutes,
  createSalesRoute,
  updateSalesRoute,
  assignCustomersToRoute,
  getRouteWiseSalesReport,
};

