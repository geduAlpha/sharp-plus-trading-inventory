const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const User = require('../models/User');
const Setting = require('../models/Setting');
const tg = require('../utils/telegramNotifier');

// Helper to ensure at least one default company exists (migrates Setting if necessary)
const ensureDefaultCompany = async () => {
  const count = await Company.countDocuments();
  if (count === 0) {
    const setting = (await Setting.findOne()) || {};
    const adminUser = await User.findOne({ role: 'admin' });
    const defaultCompany = await Company.create({
      name: setting.companyName || 'Sharp Plus Trading PLC',
      tradeName: setting.tradeName || setting.companyName || 'Sharp Plus',
      systemEmail: setting.systemEmail || 'info@sharpplus.com',
      phone: setting.phone || '+251 911 000 111',
      address: setting.address || 'Addis Ababa, Ethiopia',
      city: setting.city || 'Addis Ababa',
      country: setting.country || 'Ethiopia',
      tinNumber: setting.tinNumber || '',
      currency: setting.currency || 'ETB',
      currencySymbol: setting.currencySymbol || 'ETB',
      taxRate: setting.taxRate || 15,
      logo: setting.companyLogo || '',
      ownerName: setting.ownerName || 'System Admin',
      ownerEmail: setting.ownerEmail || 'admin@company.com',
      ownerPhone: setting.ownerPhone || '',
      ownerUser: adminUser ? adminUser._id : null,
      accessGranted: true,
      status: 'active',
      isDefault: true,
    });

    // Associate unlinked existing users with default company
    await User.updateMany(
      { company: null, role: { $ne: 'developer' } },
      { $set: { company: defaultCompany._id, companyName: defaultCompany.name } }
    );

    return defaultCompany;
  }
};

// @desc    Get all companies (with staff counts)
// @route   GET /api/companies
// @access  Private (Developer, Admin)
const getCompanies = asyncHandler(async (req, res) => {
  await ensureDefaultCompany();

  // If requester is not developer, only return their own company
  let query = {};
  if (req.user.role !== 'developer') {
    if (req.user.company) {
      query._id = req.user.company;
    } else {
      // Find company where user is owner
      query.ownerEmail = req.user.email;
    }
  }

  const companies = await Company.find(query).sort({ createdAt: -1 });

  // Attach live staff count to each company
  const enhancedCompanies = await Promise.all(
    companies.map(async (comp) => {
      const staffCount = await User.countDocuments({ company: comp._id });
      const activeStaffCount = await User.countDocuments({ company: comp._id, isActive: true });
      return {
        ...comp.toObject(),
        staffCount,
        activeStaffCount,
      };
    })
  );

  res.json(enhancedCompanies);
});

// @desc    Get single company by ID with its staff members
// @route   GET /api/companies/:id
// @access  Private (Developer, Admin)
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  // Restrict access for non-developers to their own company
  if (req.user.role !== 'developer' && String(req.user.company) !== String(company._id)) {
    res.status(403);
    throw new Error('Not authorized to access another company profile');
  }

  const staff = await User.find({ company: company._id })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({
    company,
    staff,
  });
});

// @desc    Create / Provision a new company
// @route   POST /api/companies
// @access  Private (Developer)
const createCompany = asyncHandler(async (req, res) => {
  const {
    name,
    tradeName,
    systemEmail,
    phone,
    address,
    city,
    country,
    tinNumber,
    currency,
    currencySymbol,
    taxRate,
    logo,
    notes,
    ownerName,
    ownerEmail,
    ownerPassword,
    ownerPhone,
    maxUsers,
    allowedModules,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Company name is required');
  }
  if (!ownerName || !ownerName.trim()) {
    res.status(400);
    throw new Error('Owner name is required');
  }
  if (!ownerEmail || !ownerEmail.trim()) {
    res.status(400);
    throw new Error('Owner email is required');
  }

  const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
  const cleanCompanyName = name.trim();

  // Create Company document
  const company = await Company.create({
    name: cleanCompanyName,
    tradeName: tradeName ? tradeName.trim() : cleanCompanyName,
    systemEmail: systemEmail ? systemEmail.trim().toLowerCase() : cleanOwnerEmail,
    phone: phone ? phone.trim() : '',
    address: address ? address.trim() : '',
    city: city ? city.trim() : 'Addis Ababa',
    country: country ? country.trim() : 'Ethiopia',
    tinNumber: tinNumber ? tinNumber.trim() : '',
    currency: currency ? currency.trim() : 'ETB',
    currencySymbol: currencySymbol ? currencySymbol.trim() : (currency || 'ETB'),
    taxRate: taxRate !== undefined && taxRate !== '' ? Number(taxRate) : 15,
    logo: logo || '',
    notes: notes || '',
    ownerName: ownerName.trim(),
    ownerEmail: cleanOwnerEmail,
    ownerPhone: ownerPhone ? ownerPhone.trim() : '',
    maxUsers: maxUsers ? Number(maxUsers) : 50,
    allowedModules: allowedModules || undefined,
    accessGranted: true,
    status: 'active',
  });

  // Provision or link owner account
  let owner = await User.findOne({ email: cleanOwnerEmail });
  if (!owner) {
    owner = await User.create({
      name: ownerName.trim(),
      email: cleanOwnerEmail,
      password: ownerPassword || 'admin123',
      role: 'admin',
      phone: ownerPhone ? ownerPhone.trim() : '',
      company: company._id,
      companyName: company.name,
      isActive: true,
    });
  } else {
    owner.company = company._id;
    owner.companyName = company.name;
    await owner.save();
  }

  company.ownerUser = owner._id;
  await company.save();

  res.status(201).json(company);
});

// @desc    Update company profile
// @route   PUT /api/companies/:id
// @access  Private (Developer, Company Admin)
const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (req.user.role !== 'developer' && String(req.user.company) !== String(company._id)) {
    res.status(403);
    throw new Error('Not authorized to modify another company');
  }

  const fields = [
    'name', 'tradeName', 'systemEmail', 'phone', 'address', 'city',
    'country', 'tinNumber', 'currency', 'currencySymbol', 'logo', 'notes',
    'ownerName', 'ownerEmail', 'ownerPhone', 'accessNotes',
  ];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      company[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
    }
  });

  if (req.body.taxRate !== undefined && req.body.taxRate !== '') {
    const t = Number(req.body.taxRate);
    company.taxRate = isNaN(t) ? 15 : t;
  }

  if (req.body.maxUsers !== undefined && req.body.maxUsers !== '') {
    const m = Number(req.body.maxUsers);
    company.maxUsers = isNaN(m) ? 50 : m;
  }

  if (req.body.allowedModules !== undefined && typeof req.body.allowedModules === 'object') {
    company.allowedModules = req.body.allowedModules;
    company.markModified('allowedModules');
  }

  // Developer can also update access status directly here if requested
  if (req.user.role === 'developer') {
    if (req.body.accessGranted !== undefined) {
      company.accessGranted = Boolean(req.body.accessGranted);
      company.status = company.accessGranted ? 'active' : 'suspended';
    }
    if (req.body.status && ['active', 'suspended', 'pending'].includes(req.body.status)) {
      company.status = req.body.status;
      company.accessGranted = req.body.status === 'active';
    }
  }

  const updated = await company.save();

  // If company name was updated, update users cached companyName
  if (req.body.name) {
    await User.updateMany({ company: company._id }, { $set: { companyName: updated.name } });
  }

  res.json(updated);
});

// @desc    Toggle Give Access / Deny Access to a Company
// @route   PUT /api/companies/:id/access
// @access  Private (Developer only)
const toggleCompanyAccess = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  const newAccess = req.body.accessGranted !== undefined ? Boolean(req.body.accessGranted) : !company.accessGranted;
  company.accessGranted = newAccess;
  company.status = newAccess ? 'active' : 'suspended';
  if (req.body.accessNotes) {
    company.accessNotes = req.body.accessNotes.trim();
  } else {
    company.accessNotes = newAccess
      ? `Access granted by System Developer (${req.user.name})`
      : `Access suspended by System Developer (${req.user.name})`;
  }

  const updated = await company.save();

  // Log action
  console.log(`[DEVELOPER ACTION] Company ${company.name} access set to: ${newAccess ? 'ACTIVE/GRANTED' : 'SUSPENDED/DENIED'}`);

  res.json({
    message: newAccess
      ? `System access granted for ${company.name}.`
      : `System access suspended for ${company.name}.`,
    company: updated,
  });
});

// @desc    Get staff members under a company
// @route   GET /api/companies/:id/staff
// @access  Private (Developer, Company Admin)
const getCompanyStaff = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (req.user.role !== 'developer' && String(req.user.company) !== String(company._id)) {
    res.status(403);
    throw new Error('Not authorized to view another company staff list');
  }

  const staff = await User.find({ company: company._id })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json(staff);
});

// @desc    Create a staff member under a company
// @route   POST /api/companies/:id/staff
// @access  Private (Developer, Company Admin)
const createCompanyStaff = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (req.user.role !== 'developer' && String(req.user.company) !== String(company._id)) {
    res.status(403);
    throw new Error('Not authorized to add staff to another company');
  }

  // Check maxUsers limit
  const currentCount = await User.countDocuments({ company: company._id });
  if (currentCount >= (company.maxUsers || 50)) {
    res.status(400);
    throw new Error(`Company user limit reached (${company.maxUsers || 50} users). Contact System Developer to expand limit.`);
  }

  const { name, email, password, role, phone, telegramChatId, customPermissions } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const exists = await User.findOne({ email: cleanEmail });
  if (exists) {
    res.status(400);
    throw new Error('A user with this email address already exists');
  }

  const newStaff = await User.create({
    name: name.trim(),
    email: cleanEmail,
    password,
    role: role || 'storekeeper',
    phone: phone ? phone.trim() : '',
    telegramChatId: telegramChatId ? telegramChatId.trim() : '',
    company: company._id,
    companyName: company.name,
    customPermissions: customPermissions || null,
    isActive: true,
  });

  res.status(201).json({
    _id: newStaff._id,
    name: newStaff.name,
    email: newStaff.email,
    role: newStaff.role,
    phone: newStaff.phone,
    isActive: newStaff.isActive,
    company: newStaff.company,
    companyName: newStaff.companyName,
    customPermissions: newStaff.customPermissions,
  });
});

// @desc    Update / Give or Deny Access to a Staff Member under a company
// @route   PUT /api/companies/:id/staff/:userId
// @access  Private (Developer, Company Admin)
const updateCompanyStaff = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (req.user.role !== 'developer' && String(req.user.company) !== String(company._id)) {
    res.status(403);
    throw new Error('Not authorized to manage staff of another company');
  }

  const user = await User.findOne({ _id: req.params.userId, company: company._id });
  if (!user) {
    res.status(404);
    throw new Error('Staff member not found under this company');
  }

  if (req.body.name) user.name = req.body.name.trim();
  if (req.body.role && ['developer', 'admin', 'manager', 'cashier', 'storekeeper'].includes(req.body.role)) {
    // Only developer can promote to developer
    if (req.body.role === 'developer' && req.user.role !== 'developer') {
      res.status(403);
      throw new Error('Only the System Developer can assign Developer role');
    }
    user.role = req.body.role;
  }
  if (req.body.isActive !== undefined) {
    user.isActive = Boolean(req.body.isActive);
  }
  if (req.body.phone !== undefined) user.phone = req.body.phone.trim();
  if (req.body.password) user.password = req.body.password;
  if (req.body.customPermissions !== undefined) {
    user.customPermissions = req.body.customPermissions;
    user.markModified('customPermissions');
  }

  const updated = await user.save();

  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone,
    isActive: updated.isActive,
    customPermissions: updated.customPermissions,
  });
});

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private (Developer only)
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (company.isDefault) {
    res.status(400);
    throw new Error('Default root company cannot be deleted');
  }

  // Deactivate staff or remove company reference
  await User.updateMany({ company: company._id }, { $set: { isActive: false } });
  await company.deleteOne();

  res.json({ message: `Company ${company.name} and associated accounts removed.` });
});

module.exports = {
  ensureDefaultCompany,
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  toggleCompanyAccess,
  getCompanyStaff,
  createCompanyStaff,
  updateCompanyStaff,
  deleteCompany,
};
