const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const StockTransaction = require('../models/StockTransaction');

// @desc    Get all registered and imported customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  // 1. Fetch registered customers
  const query = { isActive: true };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ];
  }

  const registeredCustomers = await Customer.find(query).sort({ name: 1 }).lean();

  // 2. Fetch unique historical/imported customers from transactions
  const txnCustomers = await StockTransaction.aggregate([
    {
      $match: {
        customerName: { $exists: true, $ne: '', $nin: ['Walk-in Customer', null] },
      },
    },
    {
      $group: {
        _id: '$customerName',
        name: { $first: '$customerName' },
        phone: { $first: '$customerPhone' },
        address: { $first: '$customerAddress' },
        lastTransactionDate: { $max: '$date' },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { lastTransactionDate: -1 } },
  ]);

  // 3. Merge: If a customer from transactions is already in registered list, keep registered
  const registeredNames = new Set(registeredCustomers.map((c) => c.name.trim().toLowerCase()));
  const mergedList = registeredCustomers.map((c) => ({
    ...c,
    source: 'registered',
  }));

  for (const txnC of txnCustomers) {
    if (!txnC.name) continue;
    const cleanName = txnC.name.trim().toLowerCase();
    if (!registeredNames.has(cleanName)) {
      // Add as imported customer
      mergedList.push({
        _id: `imported_${encodeURIComponent(txnC.name)}`,
        name: txnC.name.trim(),
        phone: txnC.phone || '',
        address: txnC.address || '',
        email: '',
        customerType: 'regular',
        source: 'imported',
        transactionCount: txnC.transactionCount || 1,
        lastTransactionDate: txnC.lastTransactionDate,
      });
      registeredNames.add(cleanName);
    }
  }

  // Filter if search query exists for imported ones
  let results = mergedList;
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.phone && c.phone.includes(s)) ||
        (c.address && c.address.toLowerCase().includes(s))
    );
  }

  // Sort: Registered first, then alphabetical
  results.sort((a, b) => a.name.localeCompare(b.name));

  res.json(results);
});

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, address, email, tinNumber, customerType, notes, creditLimit } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Customer name is required');
  }

  // Check if active customer with same name already exists
  let customer = await Customer.findOne({
    name: { $regex: `^${name.trim()}$`, $options: 'i' },
    isActive: true,
  });

  if (customer) {
    // Update existing customer info
    if (phone) customer.phone = phone.trim();
    if (address) customer.address = address.trim();
    if (email) customer.email = email.trim();
    if (tinNumber) customer.tinNumber = tinNumber.trim();
    if (customerType) customer.customerType = customerType;
    if (creditLimit !== undefined) customer.creditLimit = Number(creditLimit) || 0;
    if (notes) customer.notes = notes;
    await customer.save();
    return res.status(200).json({ ...customer.toObject(), source: 'registered' });
  }

  customer = await Customer.create({
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    address: address ? address.trim() : '',
    email: email ? email.trim() : '',
    tinNumber: tinNumber ? tinNumber.trim() : '',
    customerType: customerType || 'regular',
    notes: notes || '',
    creditLimit: Number(creditLimit) || 0,
    isActive: true,
  });

  res.status(201).json({ ...customer.toObject(), source: 'registered' });
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  const { name, phone, address, email, tinNumber, customerType, notes, creditLimit } = req.body;
  if (name) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone.trim();
  if (address !== undefined) customer.address = address.trim();
  if (email !== undefined) customer.email = email.trim();
  if (tinNumber !== undefined) customer.tinNumber = tinNumber.trim();
  if (customerType) customer.customerType = customerType;
  if (creditLimit !== undefined) customer.creditLimit = Number(creditLimit) || 0;
  if (notes !== undefined) customer.notes = notes;

  await customer.save();
  res.json({ ...customer.toObject(), source: 'registered' });
});

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
};
