const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const RawMaterial = require('../models/RawMaterial');
const { invalidateDashboardCache } = require('./dashboardController');
const tg = require('../utils/telegramNotifier');
const { getStoreStock, normalizeStore } = require('../utils/stockBalanceHelper');

const escapeRegex = (str) => String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// GET /api/materials
const getMaterials = asyncHandler(async (req, res) => {
  const { search, status, category, itemType, storeLocation, store, isActive, page, limit } = req.query;
  const targetStore = storeLocation || store;

  // Active / recycle bin filter
  const filter = { deletedAt: null };
  if (isActive === 'all') {
    // return all non-deleted
  } else if (isActive === 'false') {
    filter.isActive = false;
  } else {
    filter.isActive = true;
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (itemType && itemType !== 'all') {
    filter.itemType = itemType;
  }

  if (search) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { code: { $regex: escaped, $options: 'i' } },
      { barcode: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  let materials = await RawMaterial.find(filter).sort({ name: 1 }).lean();

  materials = materials.map((m) => {
    const storeBalances = (Array.isArray(m.storeBalances) && m.storeBalances.length > 0)
      ? m.storeBalances
      : [{ store: m.storeLocation || 'Main Store', balance: Number(m.currentStock) || 0 }];

    let effectiveStock = Number(m.currentStock) || 0;
    if (targetStore && targetStore !== 'all') {
      effectiveStock = getStoreStock(m, targetStore);
    }

    let itemStatus = 'in_stock';
    if (m.isActive === false) {
      itemStatus = 'inactive';
    } else if (effectiveStock <= 0) {
      itemStatus = 'out_of_stock';
    } else if (effectiveStock <= (Number(m.reorderLevel) || 10)) {
      itemStatus = 'low_stock';
    } else if (Number(m.maxStock) > 0 && effectiveStock > Number(m.maxStock)) {
      itemStatus = 'over_stock';
    }

    return {
      ...m,
      storeBalances,
      storeStock: effectiveStock,
      status: itemStatus,
    };
  });

  if (status && status !== 'all') {
    materials = materials.filter((m) => m.status === status);
  }

  // Summary statistics for dashboard/inventory overview
  const stats = {
    totalItems: materials.length,
    inStock: materials.filter((m) => m.status === 'in_stock').length,
    lowStock: materials.filter((m) => m.status === 'low_stock').length,
    outOfStock: materials.filter((m) => m.status === 'out_of_stock').length,
    inactive: materials.filter((m) => m.status === 'inactive').length,
    totalValuation: materials.reduce((acc, m) => acc + ((Number(m.currentStock) || 0) * (Number(m.unitCost) || 0)), 0),
  };

  // Optional pagination support
  if (page || limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const total = materials.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paged = materials.slice(startIndex, startIndex + limitNum);

    return res.json({
      data: paged,
      materials: paged,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      stats,
    });
  }

  // Full array for seamless dropdown and voucher picker compatibility
  res.json(materials);
});

// GET /api/materials/next-code?itemType=Raw Material
const getNextCode = asyncHandler(async (req, res) => {
  const { itemType = 'Raw Material' } = req.query;
  const prefix = itemType === 'Finished Product' ? 'FP' : itemType === 'Trading Item' ? 'TI' : 'RM';

  const materials = await RawMaterial.find({
    code: { $regex: new RegExp(`^${prefix}-?\\d+`, 'i') },
  }).select('code').lean();

  const nums = materials
    .map((m) => {
      const match = String(m.code || '').match(new RegExp(`^${prefix}-?(\\d+)`, 'i'));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const nextCode = `${prefix}-${String(next).padStart(4, '0')}`;
  res.json({ nextCode });
});

// GET /api/materials/:id
const getMaterialById = asyncHandler(async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Item / raw material not found');
  }
  res.json(material);
});

// POST /api/materials
const createMaterial = asyncHandler(async (req, res) => {
  let {
    name,
    code,
    category,
    itemType,
    unit,
    description,
    barcode,
    currentStock,
    openingBalance,
    minStock,
    maxStock,
    reorderLevel,
    unitCost,
    storeLocation,
    storeBalances,
    isActive,
  } = req.body;

  name = (name || '').trim();
  code = (code || '').trim();
  category = (category || 'General').trim();
  itemType = (itemType || 'Raw Material').trim();
  unit = (unit || '').trim();
  description = (description || '').trim();
  barcode = (barcode || '').trim();

  // Validate required fields
  if (!name) {
    res.status(400);
    throw new Error('Item name is required.');
  }

  if (!unit) {
    res.status(400);
    throw new Error('Unit of measurement is required.');
  }

  const validTypes = ['Raw Material', 'Finished Product', 'Trading Item'];
  if (!validTypes.includes(itemType)) {
    itemType = 'Raw Material';
  }

  const stock = Number(currentStock) || 0;
  if (stock < 0) {
    res.status(400);
    throw new Error('Current stock cannot be negative.');
  }

  const opening = openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : stock;
  if (opening < 0) {
    res.status(400);
    throw new Error('Opening balance cannot be negative.');
  }

  const min = minStock !== undefined && minStock !== '' ? Number(minStock) : 0;
  if (min < 0) {
    res.status(400);
    throw new Error('Minimum stock cannot be negative.');
  }

  const max = maxStock !== undefined && maxStock !== '' ? Number(maxStock) : 0;
  if (max < 0) {
    res.status(400);
    throw new Error('Maximum stock cannot be negative.');
  }

  if (max > 0 && max < min) {
    res.status(400);
    throw new Error(`Maximum stock (${max}) cannot be less than minimum stock (${min}).`);
  }

  const reorder = reorderLevel !== undefined && reorderLevel !== '' ? Number(reorderLevel) : 10;
  if (reorder < 0) {
    res.status(400);
    throw new Error('Reorder level cannot be negative.');
  }

  const cost = Number(unitCost) || 0;
  if (cost < 0) {
    res.status(400);
    throw new Error('Unit cost cannot be negative.');
  }

  // 1. Auto-generate code if empty
  if (!code) {
    const prefix = itemType === 'Finished Product' ? 'FP' : itemType === 'Trading Item' ? 'TI' : 'RM';
    const existingCodes = await RawMaterial.find({
      code: { $regex: new RegExp(`^${prefix}-?\\d+`, 'i') },
    }).select('code').lean();

    const nums = existingCodes
      .map((m) => {
        const match = String(m.code || '').match(new RegExp(`^${prefix}-?(\\d+)`, 'i'));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    code = `${prefix}-${String(next).padStart(4, '0')}`;
  }

  // 2. Check duplicate by Name (case-insensitive)
  const escapedName = escapeRegex(name);
  const existingByName = await RawMaterial.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  });

  if (existingByName) {
    res.status(400);
    if (!existingByName.isActive || existingByName.deletedAt) {
      throw new Error(`An item named "${existingByName.name}" is already in the Recycle Bin. Please restore it or permanently delete it first.`);
    } else {
      throw new Error(`An item named "${existingByName.name}" already exists${existingByName.code ? ` (Code: ${existingByName.code})` : ''}.`);
    }
  }

  // 3. Check duplicate by Code
  const escapedCode = escapeRegex(code);
  const existingByCode = await RawMaterial.findOne({
    code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
  });

  if (existingByCode) {
    res.status(400);
    if (!existingByCode.isActive || existingByCode.deletedAt) {
      throw new Error(`Item code "${code}" is already associated with "${existingByCode.name}" in the Recycle Bin.`);
    } else {
      throw new Error(`Item code "${code}" is already assigned to "${existingByCode.name}".`);
    }
  }

  // 4. Check duplicate by Barcode (if provided)
  if (barcode) {
    const escapedBarcode = escapeRegex(barcode);
    const existingByBarcode = await RawMaterial.findOne({
      barcode: { $regex: new RegExp(`^${escapedBarcode}$`, 'i') },
      isActive: true,
      deletedAt: null,
    });
    if (existingByBarcode) {
      res.status(400);
      throw new Error(`Barcode "${barcode}" is already assigned to item "${existingByBarcode.name}".`);
    }
  }

  const store = normalizeStore(storeLocation);
  if (!storeBalances || !storeBalances.length) {
    storeBalances = [{ store, balance: stock }];
  }

  const material = await RawMaterial.create({
    code,
    name,
    category,
    itemType,
    unit,
    description,
    barcode,
    currentStock: stock,
    openingBalance: opening,
    minStock: min,
    maxStock: max,
    reorderLevel: reorder,
    unitCost: cost,
    storeLocation: storeLocation || 'Main Store',
    storeBalances,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  tg.notifyMaterialCreated(material, req.user);
  invalidateDashboardCache();
  res.status(201).json(material);
});

// PUT /api/materials/:id
const updateMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const before = await RawMaterial.findById(id).lean();
  if (!before) {
    res.status(404);
    throw new Error('Item / raw material not found');
  }

  let {
    name,
    code,
    category,
    itemType,
    unit,
    description,
    barcode,
    currentStock,
    minStock,
    maxStock,
    reorderLevel,
    unitCost,
    storeLocation,
    isActive,
  } = req.body;

  if (name !== undefined) {
    name = (name || '').trim();
    if (!name) {
      res.status(400);
      throw new Error('Item name cannot be empty.');
    }
    const escapedName = escapeRegex(name);
    const existingByName = await RawMaterial.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (existingByName) {
      res.status(400);
      throw new Error(`Another item named "${existingByName.name}" already exists.`);
    }
    req.body.name = name;
  }

  if (code !== undefined) {
    code = (code || '').trim();
    if (code) {
      const escapedCode = escapeRegex(code);
      const existingByCode = await RawMaterial.findOne({
        _id: { $ne: id },
        code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
      });
      if (existingByCode) {
        res.status(400);
        throw new Error(`Item code "${code}" is already in use by "${existingByCode.name}".`);
      }
    }
    req.body.code = code;
  }

  if (barcode !== undefined) {
    barcode = (barcode || '').trim();
    if (barcode) {
      const escapedBarcode = escapeRegex(barcode);
      const existingByBarcode = await RawMaterial.findOne({
        _id: { $ne: id },
        barcode: { $regex: new RegExp(`^${escapedBarcode}$`, 'i') },
        isActive: true,
        deletedAt: null,
      });
      if (existingByBarcode) {
        res.status(400);
        throw new Error(`Barcode "${barcode}" is already assigned to "${existingByBarcode.name}".`);
      }
    }
    req.body.barcode = barcode;
  }

  if (currentStock !== undefined && Number(currentStock) < 0) {
    res.status(400);
    throw new Error('Current stock cannot be negative.');
  }

  if (minStock !== undefined && Number(minStock) < 0) {
    res.status(400);
    throw new Error('Minimum stock cannot be negative.');
  }

  if (maxStock !== undefined && Number(maxStock) < 0) {
    res.status(400);
    throw new Error('Maximum stock cannot be negative.');
  }

  const effectiveMin = minStock !== undefined ? Number(minStock) : Number(before.minStock) || 0;
  const effectiveMax = maxStock !== undefined ? Number(maxStock) : Number(before.maxStock) || 0;
  if (effectiveMax > 0 && effectiveMax < effectiveMin) {
    res.status(400);
    throw new Error(`Maximum stock (${effectiveMax}) cannot be less than minimum stock (${effectiveMin}).`);
  }

  if (reorderLevel !== undefined && Number(reorderLevel) < 0) {
    res.status(400);
    throw new Error('Reorder level cannot be negative.');
  }

  if (unitCost !== undefined && Number(unitCost) < 0) {
    res.status(400);
    throw new Error('Unit cost cannot be negative.');
  }

  const material = await RawMaterial.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  const watchedFields = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'itemType', label: 'Item Type' },
    { key: 'unit', label: 'Unit' },
    { key: 'unitCost', label: 'Unit Cost', format: (v) => `ETB ${Number(v).toFixed(2)}` },
    { key: 'currentStock', label: 'Current Stock', format: (v, m) => `${v} ${m?.unit || ''}` },
    { key: 'reorderLevel', label: 'Reorder Level', format: (v, m) => `${v} ${m?.unit || ''}` },
    { key: 'storeLocation', label: 'Store Location' },
  ];

  const changes = watchedFields
    .filter((f) => req.body[f.key] !== undefined && String(before[f.key]) !== String(req.body[f.key]))
    .map((f) => ({
      label: f.label,
      from: f.format ? f.format(before[f.key], before) : String(before[f.key] ?? '—'),
      to: f.format ? f.format(req.body[f.key], material) : String(req.body[f.key]),
    }));

  tg.notifyMaterialUpdated(material, req.user, changes);
  invalidateDashboardCache();
  res.json(material);
});

// PATCH /api/materials/:id/status
const toggleMaterialStatus = asyncHandler(async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Item not found');
  }

  material.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !material.isActive;
  await material.save();

  invalidateDashboardCache();
  res.json({
    message: `Item "${material.name}" is now ${material.isActive ? 'Active' : 'Inactive'}.`,
    material,
  });
});

// DELETE /api/materials/:id
const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Raw material not found');
  }
  material.isActive = false;
  material.deletedAt = new Date();
  material.deletedBy = req.user?.name || 'System';
  material.deletedFrom = 'materials';
  await material.save();
  tg.notifyMaterialDeleted(material, req.user);
  invalidateDashboardCache();
  res.json({ message: 'Raw material moved to recycle bin.' });
});

// DELETE /api/materials/bulk
const bulkDeleteMaterials = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) {
    res.status(400);
    throw new Error('No ids provided');
  }
  await RawMaterial.updateMany(
    { _id: { $in: ids } },
    { isActive: false, deletedAt: new Date(), deletedBy: req.user?.name || 'System', deletedFrom: 'materials' }
  );
  tg.notifyBulkDeleted('Items', ids.length, req.user);
  invalidateDashboardCache();
  res.json({ message: `${ids.length} material(s) moved to recycle bin.` });
});

// POST /api/materials/:id/restore
const restoreMaterial = asyncHandler(async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Raw material not found');
  }
  material.isActive = true;
  material.deletedAt = null;
  material.deletedBy = null;
  material.deletedFrom = null;
  await material.save();
  invalidateDashboardCache();
  res.json({ message: 'Raw material restored.', material });
});

// DELETE /api/materials/:id/permanent
const permanentDeleteMaterial = asyncHandler(async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error('Raw material not found');
  }
  await material.deleteOne();
  invalidateDashboardCache();
  res.json({ message: 'Raw material permanently deleted.' });
});

// GET /api/materials/export/excel
const exportMaterialsExcel = asyncHandler(async (req, res) => {
  const materials = await RawMaterial.find({ deletedAt: null }).sort({ name: 1 });

  const rows = materials.map((m) => ({
    'Code': m.code || '',
    'Name': m.name,
    'Category': m.category || 'General',
    'Item Type': m.itemType || 'Raw Material',
    'Unit': m.unit,
    'Barcode': m.barcode || '',
    'Current Stock': m.currentStock,
    'Min Stock': m.minStock || 0,
    'Max Stock': m.maxStock || 0,
    'Reorder Level': m.reorderLevel,
    'Unit Cost (ETB)': m.unitCost || 0,
    'Store Location': m.storeLocation,
    'Status': m.isActive ? (m.currentStock <= m.reorderLevel ? 'Low Stock' : 'In Stock') : 'Inactive',
    'Description': m.description || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [12, 22, 18, 16, 10, 16, 14, 12, 12, 14, 14, 16, 12, 25].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="inventory_items.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST /api/materials/import/excel
const importMaterialsExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  let created = 0;
  let updated = 0;
  const processedIds = new Set();

  for (const row of rows) {
    const name = String(row['Name'] || row['Item Name'] || '').trim();
    const code = String(row['Code'] || row['Item Code'] || '').trim().replace(/-+$/, '');
    if (!name) continue;

    const data = {
      code,
      name,
      category: String(row['Category'] || 'General').trim(),
      itemType: String(row['Item Type'] || row['Type'] || 'Raw Material').trim(),
      unit: String(row['Unit'] || 'pcs').trim(),
      description: String(row['Description'] || '').trim(),
      barcode: String(row['Barcode'] || '').trim(),
      currentStock: Number(row['Current Stock'] || row['Stock']) || 0,
      minStock: Number(row['Min Stock']) || 0,
      maxStock: Number(row['Max Stock']) || 0,
      reorderLevel: Number(row['Reorder Level']) || 10,
      unitCost: Number(row['Unit Cost'] || row['Unit Cost (ETB)']) || 0,
      storeLocation: String(row['Store Location'] || 'Main Store').trim(),
      isActive: true,
    };

    let existing = null;
    if (code) {
      const escapedCode = escapeRegex(code);
      existing = await RawMaterial.findOne({ code: { $regex: `^${escapedCode}-?$`, $options: 'i' } });
      if (existing && processedIds.has(existing._id.toString())) existing = null;
    }
    if (!existing) {
      const escapedName = escapeRegex(name);
      const byName = await RawMaterial.findOne({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
      if (byName && !processedIds.has(byName._id.toString())) existing = byName;
    }

    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      processedIds.add(existing._id.toString());
      updated++;
    } else {
      const created_ = await RawMaterial.create(data);
      processedIds.add(created_._id.toString());
      created++;
    }
  }

  invalidateDashboardCache();
  res.json({ message: `Import completed: ${created} items created, ${updated} items updated.` });
});

module.exports = {
  getMaterials,
  getNextCode,
  getMaterialById,
  createMaterial,
  updateMaterial,
  toggleMaterialStatus,
  deleteMaterial,
  bulkDeleteMaterials,
  restoreMaterial,
  permanentDeleteMaterial,
  exportMaterialsExcel,
  importMaterialsExcel,
};
