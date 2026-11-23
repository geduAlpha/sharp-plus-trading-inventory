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

  // 2. Check duplicate by Code
  const escapedCode = escapeRegex(code);
  const existingByCode = await RawMaterial.findOne({
    code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
  });

  if (existingByCode) {
    // If client requested to override changes on existing code
    if (req.body.overrideIfExists) {
      existingByCode.name = name;
      existingByCode.category = category;
      existingByCode.itemType = itemType;
      existingByCode.unit = unit;
      existingByCode.description = description;
      existingByCode.barcode = barcode;
      existingByCode.minStock = min;
      existingByCode.maxStock = max;
      existingByCode.reorderLevel = reorder;
      existingByCode.unitCost = cost;
      if (req.body.currentStock !== undefined) {
        existingByCode.currentStock = stock;
        const store = normalizeStore(storeLocation);
        if (!Array.isArray(existingByCode.storeBalances) || existingByCode.storeBalances.length === 0) {
          existingByCode.storeBalances = [{ store, balance: stock }];
        } else {
          const idx = existingByCode.storeBalances.findIndex((sb) => normalizeStore(sb.store) === store);
          if (idx >= 0) existingByCode.storeBalances[idx].balance = stock;
          else existingByCode.storeBalances.push({ store, balance: stock });
        }
      }
      existingByCode.storeLocation = normalizeStore(storeLocation);
      existingByCode.isActive = isActive !== undefined ? Boolean(isActive) : true;
      existingByCode.deletedAt = null;
      await existingByCode.save();
      invalidateDashboardCache();
      return res.json(existingByCode);
    }

    res.status(400);
    if (!existingByCode.isActive || existingByCode.deletedAt) {
      throw new Error(`Item code "${code}" is already associated with "${existingByCode.name}" in the Recycle Bin.`);
    } else {
      throw new Error(`Item code "${code}" is already assigned to "${existingByCode.name}".`);
    }
  }

  // 3. Check duplicate by Name (only if no explicit code was originally passed)
  if (!req.body.code) {
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

// Helper to safely parse numeric values from Excel cells (strips currency symbols, commas, trailing text)
function parseNumberClean(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const clean = String(val).replace(/[^0-9.-]/g, '').trim();
  if (!clean || clean === '-' || clean === '.') return fallback;
  const num = parseFloat(clean);
  return isNaN(num) ? fallback : num;
}

// Helper to normalize item types to valid enum values
function normalizeItemType(str) {
  const s = String(str || '').toLowerCase().trim();
  if (s.includes('trading')) return 'Trading Item';
  if (s.includes('finish')) return 'Finished Product';
  return 'Raw Material';
}

// Column keys mapping dictionary supporting diverse Excel header aliases (case-insensitive & whitespace-tolerant)
const IMPORT_COLUMN_KEYS = {
  code: ['code', 'itemcode', 'itemid', 'item_code', 'item_id', 'articlecode', 'articleno', 'article', 'itemno', 'productcode', 'partnumber', 'partno'],
  name: ['name', 'itemname', 'item_name', 'articlename', 'productname', 'description', 'itemdescription', 'particulars', 'title'],
  category: ['category', 'itemcategory', 'categoryname', 'group', 'family', 'classification'],
  itemType: ['itemtype', 'type', 'producttype', 'materialtype'],
  unit: ['unit', 'uom', 'unitofmeasure', 'unitofmeasurement', 'measure', 'measurement'],
  currentStock: ['currentstock', 'stock', 'qty', 'quantity', 'availablestock', 'balance', 'count', 'quantityonhand', 'stockbalance', 'physicalstock'],
  unitCost: ['unitcost', 'cost', 'unitcostetb', 'unitprice', 'price', 'rate', 'unitrate', 'purchaseprice', 'costprice', 'buyingprice'],
  storeLocation: ['storelocation', 'store', 'location', 'warehouse', 'branch', 'depot', 'storagelocation'],
  barcode: ['barcode', 'bar_code', 'upc', 'ean', 'serial', 'serialno', 'serialnumber'],
  reorderLevel: ['reorderlevel', 'reorder', 'reorderpoint', 'minlevel'],
  minStock: ['minstock', 'minimumstock', 'min'],
  maxStock: ['maxstock', 'maximumstock', 'max'],
  description: ['description', 'remark', 'remarks', 'note', 'notes', 'comment'],
};

function normalizeColName(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getColVal(row, keyArray) {
  const keys = Object.keys(row || {});
  for (const target of keyArray) {
    const targetNorm = normalizeColName(target);
    for (const k of keys) {
      if (normalizeColName(k) === targetNorm) {
        const v = row[k];
        if (v !== undefined && v !== null) {
          const s = String(v).trim();
          if (s !== '') return v;
        }
      }
    }
  }
  return undefined;
}

function hasCol(row, keyArray) {
  const keys = Object.keys(row || {});
  for (const target of keyArray) {
    const targetNorm = normalizeColName(target);
    for (const k of keys) {
      if (normalizeColName(k) === targetNorm) {
        return row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '';
      }
    }
  }
  return false;
}

// POST /api/materials/import/validate
// Validates Excel rows before importing, detecting duplicate/existing item codes and computing parallel column diffs
const validateMaterialsExcel = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('No Excel file uploaded. Please select a valid .xlsx or .xls file.');
  }

  let wb;
  try {
    wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    res.status(400);
    throw new Error('Could not parse Excel file. Please ensure the file is a valid Excel spreadsheet.');
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    res.status(400);
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  // Find first sheet that has actual rows
  let rows = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (ws) {
      const candidate = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (candidate && candidate.length > 0) {
        rows = candidate;
        break;
      }
    }
  }

  if (!rows || rows.length === 0) {
    res.status(400);
    throw new Error('No data rows found in uploaded Excel file. Please ensure the sheet has header columns and item rows.');
  }

  const newItems = [];
  const existingItems = [];
  const fileCodesMap = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    const rawCode = String(getColVal(row, IMPORT_COLUMN_KEYS.code) || '').trim();
    const code = rawCode.replace(/-+$/, '');
    let name = String(getColVal(row, IMPORT_COLUMN_KEYS.name) || '').trim();

    // Check existing in database by Code (Primary unique identity)
    let dbExisting = null;
    if (code) {
      const escapedCode = escapeRegex(code);
      dbExisting = await RawMaterial.findOne({
        code: { $regex: `^${escapedCode}-?$`, $options: 'i' },
        deletedAt: null,
      }).lean();
    }

    // Check by name ONLY if no code was given at all
    if (!dbExisting && !code && name) {
      const escapedName = escapeRegex(name);
      dbExisting = await RawMaterial.findOne({
        name: { $regex: `^${escapedName}$`, $options: 'i' },
        deletedAt: null,
      }).lean();
    }

    // If row matches an existing item by code and name was omitted in row, retain existing name
    if (dbExisting && !name) {
      name = dbExisting.name;
    }

    // Skip empty rows (neither name nor code present)
    if (!name && !code) continue;

    // Extract columns with safe number/string parsing and fallback to existing DB item values
    const category = hasCol(row, IMPORT_COLUMN_KEYS.category)
      ? String(getColVal(row, IMPORT_COLUMN_KEYS.category)).trim()
      : (dbExisting ? dbExisting.category : 'General');

    const itemType = normalizeItemType(
      hasCol(row, IMPORT_COLUMN_KEYS.itemType)
        ? getColVal(row, IMPORT_COLUMN_KEYS.itemType)
        : (dbExisting ? dbExisting.itemType : 'Raw Material')
    );

    const unit = hasCol(row, IMPORT_COLUMN_KEYS.unit)
      ? String(getColVal(row, IMPORT_COLUMN_KEYS.unit)).trim()
      : (dbExisting ? dbExisting.unit : 'pcs');

    const currentStock = hasCol(row, IMPORT_COLUMN_KEYS.currentStock)
      ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.currentStock), 0)
      : (dbExisting ? Number(dbExisting.currentStock || 0) : 0);

    const unitCost = hasCol(row, IMPORT_COLUMN_KEYS.unitCost)
      ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.unitCost), 0)
      : (dbExisting ? Number(dbExisting.unitCost || 0) : 0);

    const storeLocation = hasCol(row, IMPORT_COLUMN_KEYS.storeLocation)
      ? String(getColVal(row, IMPORT_COLUMN_KEYS.storeLocation)).trim()
      : (dbExisting ? dbExisting.storeLocation : 'Main Store');

    const barcode = hasCol(row, IMPORT_COLUMN_KEYS.barcode)
      ? String(getColVal(row, IMPORT_COLUMN_KEYS.barcode)).trim()
      : (dbExisting ? dbExisting.barcode || '' : '');

    const reorderLevel = hasCol(row, IMPORT_COLUMN_KEYS.reorderLevel)
      ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.reorderLevel), 10)
      : (dbExisting ? Number(dbExisting.reorderLevel || 10) : 10);

    const minStock = hasCol(row, IMPORT_COLUMN_KEYS.minStock)
      ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.minStock), 0)
      : (dbExisting ? Number(dbExisting.minStock || 0) : 0);

    const maxStock = hasCol(row, IMPORT_COLUMN_KEYS.maxStock)
      ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.maxStock), 0)
      : (dbExisting ? Number(dbExisting.maxStock || 0) : 0);

    const description = hasCol(row, IMPORT_COLUMN_KEYS.description)
      ? String(getColVal(row, IMPORT_COLUMN_KEYS.description)).trim()
      : (dbExisting ? dbExisting.description || '' : '');

    const itemData = {
      rowNumber,
      code,
      name: name || (code ? `Item ${code}` : `Item ${rowNumber}`),
      category: category || 'General',
      itemType: itemType || 'Raw Material',
      unit: unit || 'pcs',
      description,
      barcode,
      currentStock,
      minStock,
      maxStock,
      reorderLevel,
      unitCost,
      storeLocation: storeLocation || 'Main Store',
      isActive: true,
    };

    // Check 1: Duplicate within uploaded file
    if (code && fileCodesMap.has(code.toLowerCase())) {
      existingItems.push({
        ...itemData,
        duplicateType: 'file_duplicate',
        reason: `Item code "${code}" is repeated in uploaded file (Row ${fileCodesMap.get(code.toLowerCase())})`,
        existingCode: code,
        existingName: name,
        hasChanges: true,
        fieldChanges: [{ field: 'File Row', old: `Row ${fileCodesMap.get(code.toLowerCase())}`, new: `Row ${rowNumber}` }],
        parallelOverrides: {},
      });
      continue;
    }
    if (code) {
      fileCodesMap.set(code.toLowerCase(), rowNumber);
    }

    if (dbExisting) {
      // Calculate parallel column overrides / diffs between database record and incoming Excel data
      const fieldChanges = [];
      const parallelOverrides = {};

      if (hasCol(row, IMPORT_COLUMN_KEYS.name) && name.toLowerCase() !== String(dbExisting.name || '').toLowerCase()) {
        fieldChanges.push({ field: 'Name', old: dbExisting.name, new: name });
        parallelOverrides.name = { old: dbExisting.name, new: name };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.unitCost) && Number(unitCost) !== Number(dbExisting.unitCost || 0)) {
        fieldChanges.push({ field: 'Unit Cost', old: `ETB ${dbExisting.unitCost || 0}`, new: `ETB ${unitCost}` });
        parallelOverrides.unitCost = { old: Number(dbExisting.unitCost || 0), new: Number(unitCost) };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.currentStock) && Number(currentStock) !== Number(dbExisting.currentStock || 0)) {
        fieldChanges.push({ field: 'Stock', old: dbExisting.currentStock || 0, new: currentStock });
        parallelOverrides.currentStock = { old: Number(dbExisting.currentStock || 0), new: Number(currentStock) };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.category) && category.toLowerCase() !== String(dbExisting.category || '').toLowerCase()) {
        fieldChanges.push({ field: 'Category', old: dbExisting.category, new: category });
        parallelOverrides.category = { old: dbExisting.category, new: category };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.unit) && unit.toLowerCase() !== String(dbExisting.unit || '').toLowerCase()) {
        fieldChanges.push({ field: 'Unit', old: dbExisting.unit, new: unit });
        parallelOverrides.unit = { old: dbExisting.unit, new: unit };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.storeLocation) && storeLocation.toLowerCase() !== String(dbExisting.storeLocation || '').toLowerCase()) {
        fieldChanges.push({ field: 'Store', old: dbExisting.storeLocation, new: storeLocation });
        parallelOverrides.storeLocation = { old: dbExisting.storeLocation, new: storeLocation };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.reorderLevel) && Number(reorderLevel) !== Number(dbExisting.reorderLevel || 10)) {
        fieldChanges.push({ field: 'Reorder Level', old: dbExisting.reorderLevel || 10, new: reorderLevel });
        parallelOverrides.reorderLevel = { old: dbExisting.reorderLevel || 10, new: reorderLevel };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.barcode) && String(barcode).trim() !== String(dbExisting.barcode || '').trim()) {
        fieldChanges.push({ field: 'Barcode', old: dbExisting.barcode || '—', new: String(barcode).trim() });
        parallelOverrides.barcode = { old: dbExisting.barcode || '—', new: String(barcode).trim() };
      }
      if (hasCol(row, IMPORT_COLUMN_KEYS.description) && String(description).trim() !== String(dbExisting.description || '').trim()) {
        fieldChanges.push({ field: 'Description', old: dbExisting.description || '—', new: String(description).trim() });
        parallelOverrides.description = { old: dbExisting.description || '—', new: String(description).trim() };
      }

      existingItems.push({
        ...itemData,
        duplicateType: 'database_match',
        reason: (code && dbExisting.code && dbExisting.code.toLowerCase().startsWith(code.toLowerCase()))
          ? `Item code "${code}" matches system item`
          : `Item name "${name}" matches existing item (${dbExisting.code})`,
        existingId: dbExisting._id,
        existingCode: dbExisting.code,
        existingName: dbExisting.name,
        existingStock: dbExisting.currentStock,
        existingCost: dbExisting.unitCost,
        existingCategory: dbExisting.category,
        existingUnit: dbExisting.unit,
        hasChanges: fieldChanges.length > 0,
        fieldChanges,
        parallelOverrides,
      });
    } else {
      // Non-duplicate code: strictly a new item, will never replace existing records
      newItems.push(itemData);
    }
  }

  const total = newItems.length + existingItems.length;
  res.json({
    total,
    hasDuplicates: existingItems.length > 0,
    newCount: newItems.length,
    existingCount: existingItems.length,
    existingItems,
    newItems,
    newItemsSummary: newItems.slice(0, 50),
    fileName: req.file.originalname,
    message: existingItems.length > 0
      ? `Authentication alert: ${existingItems.length} existing/duplicate item code(s) detected out of ${total} items. You can override changes or add new items only.`
      : `Authentication verified: All ${total} items are new and ready to import.`,
  });
});

// POST /api/materials/import/excel
// Performs parallel column overrides for matching codes and inserts non-duplicate codes
const importMaterialsExcel = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('No Excel file uploaded');
  }

  const mode = req.body.mode || req.query.mode || 'override_duplicates';

  let wb;
  try {
    wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    res.status(400);
    throw new Error('Could not parse Excel file. Please ensure it is a valid spreadsheet.');
  }

  // Find first sheet that has actual rows
  let rows = [];
  for (const sheetName of (wb.SheetNames || [])) {
    const ws = wb.Sheets[sheetName];
    if (ws) {
      const candidate = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (candidate && candidate.length > 0) {
        rows = candidate;
        break;
      }
    }
  }

  if (!rows || rows.length === 0) {
    res.status(400);
    throw new Error('No data rows found in uploaded Excel file');
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const processedIds = new Set();
  const fileCodesMap = new Map();
  const skippedItems = [];
  const overriddenItems = [];
  const rowErrors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      const rawCode = String(getColVal(row, IMPORT_COLUMN_KEYS.code) || '').trim();
      let code = rawCode.replace(/-+$/, '');
      let name = String(getColVal(row, IMPORT_COLUMN_KEYS.name) || '').trim();

      // Primary identification: match strictly by perspective code
      let existing = null;
      if (code) {
        const escapedCode = escapeRegex(code);
        existing = await RawMaterial.findOne({
          code: { $regex: `^${escapedCode}-?$`, $options: 'i' },
          deletedAt: null,
        });
      }

      // Only if no code was given in Excel row, fall back to exact name
      if (!existing && !code && name) {
        const escapedName = escapeRegex(name);
        existing = await RawMaterial.findOne({
          name: { $regex: `^${escapedName}$`, $options: 'i' },
          deletedAt: null,
        });
      }

      // If matching existing item by code and name is omitted in row, retain existing name
      if (existing && !name) {
        name = existing.name;
      }

      // Skip if row has neither code nor name
      if (!name && !code) continue;

      const category = hasCol(row, IMPORT_COLUMN_KEYS.category)
        ? String(getColVal(row, IMPORT_COLUMN_KEYS.category)).trim()
        : (existing ? existing.category : 'General');

      const itemType = normalizeItemType(
        hasCol(row, IMPORT_COLUMN_KEYS.itemType)
          ? getColVal(row, IMPORT_COLUMN_KEYS.itemType)
          : (existing ? existing.itemType : 'Raw Material')
      );

      const unit = hasCol(row, IMPORT_COLUMN_KEYS.unit)
        ? String(getColVal(row, IMPORT_COLUMN_KEYS.unit)).trim()
        : (existing ? existing.unit : 'pcs');

      const currentStock = hasCol(row, IMPORT_COLUMN_KEYS.currentStock)
        ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.currentStock), 0)
        : (existing ? Number(existing.currentStock || 0) : 0);

      const unitCost = hasCol(row, IMPORT_COLUMN_KEYS.unitCost)
        ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.unitCost), 0)
        : (existing ? Number(existing.unitCost || 0) : 0);

      const storeLocation = hasCol(row, IMPORT_COLUMN_KEYS.storeLocation)
        ? String(getColVal(row, IMPORT_COLUMN_KEYS.storeLocation)).trim()
        : (existing ? existing.storeLocation : 'Main Store');

      const barcode = hasCol(row, IMPORT_COLUMN_KEYS.barcode)
        ? String(getColVal(row, IMPORT_COLUMN_KEYS.barcode)).trim()
        : (existing ? existing.barcode || '' : '');

      const reorderLevel = hasCol(row, IMPORT_COLUMN_KEYS.reorderLevel)
        ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.reorderLevel), 10)
        : (existing ? Number(existing.reorderLevel || 10) : 10);

      const minStock = hasCol(row, IMPORT_COLUMN_KEYS.minStock)
        ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.minStock), 0)
        : (existing ? Number(existing.minStock || 0) : 0);

      const maxStock = hasCol(row, IMPORT_COLUMN_KEYS.maxStock)
        ? parseNumberClean(getColVal(row, IMPORT_COLUMN_KEYS.maxStock), 0)
        : (existing ? Number(existing.maxStock || 0) : 0);

      const description = hasCol(row, IMPORT_COLUMN_KEYS.description)
        ? String(getColVal(row, IMPORT_COLUMN_KEYS.description)).trim()
        : (existing ? existing.description || '' : '');

      // Detect duplicate code within file
      let isFileDuplicate = false;
      if (code && fileCodesMap.has(code.toLowerCase())) {
        isFileDuplicate = true;
      } else if (code) {
        fileCodesMap.set(code.toLowerCase(), rowNumber);
      }

      // Handle skip duplicates mode
      if (mode === 'skip_duplicates') {
        if (existing || isFileDuplicate) {
          skipped++;
          skippedItems.push({
            code: code || existing?.code || `Row ${rowNumber}`,
            name: name || existing?.name || `Item ${rowNumber}`,
            reason: isFileDuplicate ? 'Duplicate code in Excel' : `Existing item code (${existing?.code || code}) in system`,
          });
          continue;
        }

        // Non-duplicate code: insert new item
        const data = {
          code,
          name: name || (code ? `Item ${code}` : `Item ${rowNumber}`),
          category: category || 'General',
          itemType: itemType || 'Raw Material',
          unit: unit || 'pcs',
          description,
          barcode,
          currentStock,
          minStock,
          maxStock,
          reorderLevel,
          unitCost,
          storeLocation: storeLocation || 'Main Store',
          isActive: true,
        };

        const storeName = normalizeStore(data.storeLocation || 'Main Store');
        data.storeBalances = [{ store: storeName, balance: data.currentStock }];
        data.openingBalance = data.currentStock;
        const created_ = await RawMaterial.create(data);
        processedIds.add(created_._id.toString());
        created++;
        continue;
      }

      // Default, override_duplicates, or update_all mode
      if (existing) {
        // Parallel override of columns present in Excel row
        if (hasCol(row, IMPORT_COLUMN_KEYS.name) && name) existing.name = name;
        if (hasCol(row, IMPORT_COLUMN_KEYS.category) && category) existing.category = category;
        if (hasCol(row, IMPORT_COLUMN_KEYS.itemType) && itemType) existing.itemType = itemType;
        if (hasCol(row, IMPORT_COLUMN_KEYS.unit) && unit) existing.unit = unit;
        if (hasCol(row, IMPORT_COLUMN_KEYS.unitCost)) existing.unitCost = Number(unitCost) || 0;
        if (hasCol(row, IMPORT_COLUMN_KEYS.reorderLevel)) existing.reorderLevel = Number(reorderLevel) || 10;
        if (hasCol(row, IMPORT_COLUMN_KEYS.minStock)) existing.minStock = Number(minStock) || 0;
        if (hasCol(row, IMPORT_COLUMN_KEYS.maxStock)) existing.maxStock = Number(maxStock) || 0;
        if (hasCol(row, IMPORT_COLUMN_KEYS.barcode)) existing.barcode = barcode;
        if (hasCol(row, IMPORT_COLUMN_KEYS.description)) existing.description = description;
        if (hasCol(row, IMPORT_COLUMN_KEYS.storeLocation)) existing.storeLocation = storeLocation;

        // Update currentStock & storeBalances if stock column is present
        if (hasCol(row, IMPORT_COLUMN_KEYS.currentStock)) {
          existing.currentStock = Number(currentStock) || 0;
          const storeName = normalizeStore(storeLocation || existing.storeLocation || 'Main Store');
          if (!Array.isArray(existing.storeBalances) || existing.storeBalances.length === 0) {
            existing.storeBalances = [{ store: storeName, balance: existing.currentStock }];
          } else {
            const idx = existing.storeBalances.findIndex((sb) => normalizeStore(sb.store) === storeName);
            if (idx >= 0) {
              existing.storeBalances[idx].balance = existing.currentStock;
            } else {
              existing.storeBalances.push({ store: storeName, balance: existing.currentStock });
            }
          }
        }

        await existing.save();
        processedIds.add(existing._id.toString());
        updated++;
        overriddenItems.push({
          code: existing.code,
          name: existing.name,
        });
      } else {
        // Non-duplicate code: create brand new item, never replace existing records!
        const data = {
          code,
          name: name || (code ? `Item ${code}` : `Item ${rowNumber}`),
          category: category || 'General',
          itemType: itemType || 'Raw Material',
          unit: unit || 'pcs',
          description,
          barcode,
          currentStock,
          minStock,
          maxStock,
          reorderLevel,
          unitCost,
          storeLocation: storeLocation || 'Main Store',
          isActive: true,
        };

        const storeName = normalizeStore(data.storeLocation || 'Main Store');
        data.storeBalances = [{ store: storeName, balance: data.currentStock }];
        data.openingBalance = data.currentStock;
        const created_ = await RawMaterial.create(data);
        processedIds.add(created_._id.toString());
        created++;
      }
    } catch (rowErr) {
      console.error(`Error importing row ${rowNumber}:`, rowErr.message);
      rowErrors.push({
        row: rowNumber,
        error: rowErr.message,
      });
    }
  }

  invalidateDashboardCache();

  let message = '';
  if (mode === 'skip_duplicates') {
    message = `Import completed: ${created} new items added to system. ${skipped} existing item codes skipped.`;
  } else {
    message = `Import completed successfully: ${created} new items added, ${updated} existing items overridden with changes.`;
  }

  res.json({
    success: true,
    message,
    created,
    updated,
    skipped,
    skippedItems,
    skippedCodes: skippedItems.map((it) => it.code),
    overriddenCount: updated,
  });
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
  validateMaterialsExcel,
  importMaterialsExcel,
};
