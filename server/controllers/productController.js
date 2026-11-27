const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Setting = require('../models/Setting');
const { invalidateDashboardCache } = require('./dashboardController');
const tg = require('../utils/telegramNotifier');

// ── Pricing helper — applies settings-based adjustments to recipe cost ──
// Returns full cost breakdown:
//   adjustedMaterialCost  = raw material cost with price adjustment applied
//   withContingency       = + contingency %
//   totalCost             = + overhead %
//   suggestedSellingPrice = totalCost / (foodCostPercent / 100)
function calcRecipeCostBreakdown(ingredients, settings = {}) {
  const {
    contingencyPercent = 10,
    overheadPercent = 25,
    defaultFoodCostPercent = 30,
    rawMaterialPriceAdjustType = 'percent',
    rawMaterialPriceAdjustValue = 0,
  } = settings;

  // Step 1: raw material cost with price adjustment
  const rawMaterialCost = (ingredients || []).reduce((sum, ing) => {
    let unitCost = ing.material?.unitCost ?? 0;
    // Apply global price adjustment
    if (rawMaterialPriceAdjustValue > 0) {
      if (rawMaterialPriceAdjustType === 'percent') {
        unitCost = unitCost * (1 + rawMaterialPriceAdjustValue / 100);
      } else {
        unitCost = unitCost + rawMaterialPriceAdjustValue;
      }
    }
    return sum + unitCost * (ing.quantity || 0);
  }, 0);

  // Step 2: add contingency
  const withContingency = rawMaterialCost * (1 + contingencyPercent / 100);

  // Step 3: add overhead
  const totalCost = withContingency * (1 + overheadPercent / 100);

  // Step 4: suggested selling price (back-calc from food cost %)
  const foodCostFraction = Math.max(defaultFoodCostPercent, 1) / 100;
  const suggestedSellingPrice = totalCost / foodCostFraction;

  return {
    rawMaterialCost: Math.round(rawMaterialCost * 100) / 100,
    contingencyAmount: Math.round((withContingency - rawMaterialCost) * 100) / 100,
    withContingency: Math.round(withContingency * 100) / 100,
    overheadAmount: Math.round((totalCost - withContingency) * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    suggestedSellingPrice: Math.round(suggestedSellingPrice * 100) / 100,
    // Selling prices at common food cost benchmarks
    sellingAt30pct: Math.round((totalCost / 0.30) * 100) / 100,
    sellingAt35pct: Math.round((totalCost / 0.35) * 100) / 100,
    sellingAt40pct: Math.round((totalCost / 0.40) * 100) / 100,
    sellingAt50pct: Math.round((totalCost / 0.50) * 100) / 100,
    // Settings used (for display in UI)
    settings: { contingencyPercent, overheadPercent, defaultFoodCostPercent, rawMaterialPriceAdjustType, rawMaterialPriceAdjustValue },
  };
}

// GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { isActive: true, deletedAt: null };
  if (search) filter.name = { $regex: search, $options: 'i' };

  const [products, settings] = await Promise.all([
    Product.find(filter)
      .populate('ingredients.material', 'name unit unitCost')
      .sort({ createdAt: -1 })
      .lean(),
    Setting.findOne().lean(),
  ]);

  const mapped = products.map((p) => {
    const breakdown = calcRecipeCostBreakdown(p.ingredients, settings || {});
    return {
      ...p,
      recipeCost: breakdown.rawMaterialCost, // backward-compatible: raw cost only
      costBreakdown: breakdown,              // full breakdown for UI
    };
  });

  res.json(mapped);
});

// GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const [product, settings] = await Promise.all([
    Product.findById(req.params.id)
      .populate('ingredients.material', 'name unit unitCost'),
    Setting.findOne().lean(),
  ]);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  const obj = product.toJSON();
  obj.costBreakdown = calcRecipeCostBreakdown(obj.ingredients, settings || {});
  res.json(obj);
});

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, description, sellingPrice, ingredients, code, uom, parentCategory } = req.body;

  if (!name?.trim()) { res.status(400); throw new Error('Product name is required.'); }

  // Duplicate code check (only if a non-empty code was provided)
  const trimmedCode = (code || '').trim();
  if (trimmedCode) {
    const existing = await Product.findOne({
      code: { $regex: `^${trimmedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-*$`, $options: 'i' },
      isActive: true,
    });
    if (existing) {
      res.status(400);
      throw new Error(`Product code "${trimmedCode}" is already used by "${existing.name}". Please use a different code.`);
    }
  }

  // Duplicate name check
  const existingName = await Product.findOne({
    name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    isActive: true,
  });
  if (existingName) {
    res.status(400);
    throw new Error(`A product named "${name.trim()}" already exists (Code: ${existingName.code || 'no code'}). Use a different name.`);
  }

  const product = await Product.create({ code: trimmedCode, name: name.trim(), category, parentCategory, uom, description, sellingPrice, ingredients });
  const populated = await product.populate('ingredients.material', 'name unit unitCost');
  tg.notifyProductCreated(populated, req.user);
  invalidateDashboardCache();
  res.status(201).json(populated);
});


// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }

  const { name, category, description, sellingPrice, ingredients, code, uom, parentCategory } = req.body;

  // Duplicate code check — only if code is being changed to a non-empty value
  const trimmedCode = code !== undefined ? (code || '').trim() : null;
  if (trimmedCode && trimmedCode !== (product.code || '').trim()) {
    const conflict = await Product.findOne({
      _id: { $ne: product._id },
      code: { $regex: `^${trimmedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-*$`, $options: 'i' },
      isActive: true,
    });
    if (conflict) {
      res.status(400);
      throw new Error(`Product code "${trimmedCode}" is already used by "${conflict.name}". Choose a different code.`);
    }
  }

  // Duplicate name check — only if name is being changed to something different
  const trimmedName = name !== undefined ? (name || '').trim() : null;
  if (trimmedName && trimmedName.toLowerCase() !== product.name.trim().toLowerCase()) {
    const nameConflict = await Product.findOne({
      _id: { $ne: product._id },
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isActive: true,
    });
    if (nameConflict) {
      res.status(400);
      throw new Error(`A product named "${trimmedName}" already exists. Use a different name.`);
    }
  }

  // Track price change before overwriting
  const oldPrice = product.sellingPrice;
  const oldIngCount = product.ingredients?.length || 0;

  if (trimmedCode !== null) product.code = trimmedCode;
  if (trimmedName) product.name = trimmedName;
  product.category = category ?? product.category;
  product.parentCategory = parentCategory ?? product.parentCategory;
  product.uom = uom ?? product.uom;
  product.description = description ?? product.description;
  product.sellingPrice = sellingPrice ?? product.sellingPrice;
  product.ingredients = ingredients ?? product.ingredients;

  const updated = await product.save();
  const populated = await updated.populate('ingredients.material', 'name unit unitCost');

  // Build diff for notification
  const changes = [];
  if (name !== undefined && name !== populated.name) changes.push({ label: 'Name', from: product.name, to: name });
  if (category !== undefined && category !== populated.category) changes.push({ label: 'Category', from: product.category, to: category });
  if (sellingPrice !== undefined && Number(sellingPrice) !== Number(oldPrice))
    changes.push({ label: 'Selling Price', from: `ETB ${Number(oldPrice).toFixed(2)}`, to: `ETB ${Number(sellingPrice).toFixed(2)}` });
  if (ingredients !== undefined && ingredients.length !== oldIngCount)
    changes.push({ label: 'Ingredients', from: `${oldIngCount} items`, to: `${ingredients.length} items` });

  tg.notifyProductUpdated(populated, req.user, changes);
  invalidateDashboardCache();
  res.json(populated);
});

// DELETE /api/products/:id  (soft delete → recycle bin)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  product.isActive = false;
  product.deletedAt = new Date();
  product.deletedBy = req.user?.name || 'System';
  product.deletedFrom = 'products';
  await product.save();
  tg.notifyProductDeleted(product, req.user);
  invalidateDashboardCache();
  res.json({ message: 'Product moved to recycle bin.' });
});

// DELETE /api/products/bulk  (bulk soft delete)
const bulkDeleteProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) { res.status(400); throw new Error('No ids provided'); }
  await Product.updateMany(
    { _id: { $in: ids } },
    { isActive: false, deletedAt: new Date(), deletedBy: req.user?.name || 'System', deletedFrom: 'products' }
  );
  invalidateDashboardCache();
  res.json({ message: `${ids.length} product(s) moved to recycle bin.` });
});

// POST /api/products/:id/restore
const restoreProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  product.isActive = true;
  product.deletedAt = null;
  product.deletedBy = null;
  product.deletedFrom = null;
  await product.save();
  invalidateDashboardCache();
  res.json({ message: 'Product restored.', product });
});

// DELETE /api/products/:id/permanent
const permanentDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  await product.deleteOne();
  invalidateDashboardCache();
  res.json({ message: 'Product permanently deleted.' });
});


// GET /api/products/export/excel
// Exports in the Sharp Plus format:
// Code | Name | UOM | Child Category | Parent Category | Default Value | Default Tax | Created On | State
const exportProductsExcel = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .populate('ingredients.material', 'name unit unitCost')
    .sort({ createdAt: 1 });

  const rows = products.map((p, i) => ({
    'Code': p.code || `P-${String(i + 1).padStart(4, '0')}`,
    'Name': p.name,
    'UOM': p.uom || 'Pcs',
    'Child Category': p.category || '',
    'Parent Category': p.parentCategory || 'FOOD',
    'Default Value': p.sellingPrice ?? 0,
    'Default Tax': 1,
    'Created On': p.createdAt ? new Date(p.createdAt).toISOString() : '',
    'State': p.isActive ? 'Active' : 'Inactive',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [12, 30, 6, 18, 16, 14, 12, 22, 8].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Helper to safely parse numeric values from Excel cells (strips currency symbols, commas, trailing text, handles accounting parens)
function parseNumberClean(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const s = String(val).replace(/,/g, '').trim();
  const isNegative = /^\(.*\)$/.test(s) || s.startsWith('-') || /^-/.test(s);
  const match = s.match(/\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const num = parseFloat(match[0]);
  if (isNaN(num)) return fallback;
  return isNegative ? -num : num;
}

// Column keys mapping dictionary supporting diverse Excel header aliases for Products/Articles
const IMPORT_PRODUCT_COLUMN_KEYS = {
  code: [
    'code', 'itemcode', 'itemid', 'item_code', 'item_id', 'articlecode', 'articleno',
    'article', 'itemno', 'productcode', 'partnumber', 'partno', 'artcode', 'artno',
    'articlenumber', 'itemnumber', 'sku', 'ref', 'reference', 'id', 'productid',
    'art', 'item#', 'art#', 'code#', 'article#', 'art_code', 'art_no'
  ],
  name: [
    'name', 'itemname', 'item_name', 'articlename', 'productname', 'description',
    'itemdescription', 'particulars', 'title', 'item', 'product', 'details',
    'goods', 'commodity', 'specification', 'desc', 'article_name', 'product_name', 'item_title'
  ],
  category: [
    'childcategory', 'category', 'itemcategory', 'categoryname', 'group', 'family',
    'classification', 'class', 'department', 'section', 'cat', 'item_category'
  ],
  parentCategory: [
    'parentcategory', 'department', 'supercategory', 'maincategory', 'division',
    'parent_category', 'section', 'dept'
  ],
  uom: [
    'uom', 'unit', 'unitofmeasure', 'unitofmeasurement', 'measure', 'measurement',
    'packing', 'pack', 'pkg', 'packaging'
  ],
  sellingPrice: [
    'defaultvalue', 'sellingprice', 'price', 'rate', 'unitprice', 'val', 'default_value',
    'selling_price', 'unit_price', 'priceetb', 'rateetb', 'amount', 'saleprice',
    'retailprice', 'sellingpriceetb', 'unitcost', 'cost'
  ],
  description: [
    'description', 'remark', 'remarks', 'note', 'notes', 'comment', 'desc', 'memo'
  ],
};

function cleanHeader(str) {
  return String(str || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .trim();
}

function normalizeColName(str) {
  return cleanHeader(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getProductColVal(row, keyArray) {
  const keys = Object.keys(row || {}).filter((k) => !k.startsWith('_'));
  for (const target of keyArray) {
    const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of keys) {
      if (normalizeColName(k) === targetNorm) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }
  for (const target of keyArray) {
    const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of keys) {
      const rawNorm = String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rawNorm === targetNorm) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }
  for (const target of keyArray) {
    const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (targetNorm.length < 5) continue;
    for (const k of keys) {
      const colNorm = normalizeColName(k);
      if (colNorm.includes(targetNorm) || (colNorm.length >= 6 && targetNorm.includes(colNorm))) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }
  return undefined;
}

function hasProductCol(row, keyArray) {
  return getProductColVal(row, keyArray) !== undefined;
}

function extractProductRowsFromWorkbook(wb) {
  if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) return [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawData || rawData.length === 0) continue;

    let bestHeaderIdx = -1;
    let maxKeywordScore = 0;
    const KEYWORD_REGEX = /code|item|article|name|desc|product|price|uom|unit|category|department|rate|amount|value/i;

    for (let r = 0; r < Math.min(rawData.length, 25); r++) {
      const rowArr = rawData[r];
      if (!Array.isArray(rowArr)) continue;
      let score = 0;
      for (const cell of rowArr) {
        const str = String(cell || '').trim();
        if (str && KEYWORD_REGEX.test(str)) score++;
      }
      if (score > maxKeywordScore) {
        maxKeywordScore = score;
        bestHeaderIdx = r;
      }
    }
    if (bestHeaderIdx === -1 && rawData.length > 0) bestHeaderIdx = 0;
    if (bestHeaderIdx === -1) continue;

    const rawHeaders = rawData[bestHeaderIdx];
    const headers = [];
    for (let c = 0; c < rawHeaders.length; c++) {
      const h = String(rawHeaders[c] || '').trim();
      headers.push(h || `Column_${c + 1}`);
    }

    const rows = [];
    for (let r = bestHeaderIdx + 1; r < rawData.length; r++) {
      const rowArr = rawData[r];
      if (!Array.isArray(rowArr)) continue;
      const hasAnyVal = rowArr.some((val) => val !== undefined && val !== null && String(val).trim() !== '');
      if (!hasAnyVal) continue;
      const rowObj = {};
      rowObj._rawRowNumber = r + 1;
      for (let c = 0; c < headers.length; c++) {
        rowObj[headers[c]] = rowArr[c] !== undefined ? rowArr[c] : '';
      }
      rows.push(rowObj);
    }
    if (rows.length > 0) return rows;
  }
  return [];
}

// POST /api/products/import/validate
// Validates Products/Articles Excel rows before importing, detecting duplicate/existing item codes with parallel overrides
const validateProductsExcel = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('No Excel file uploaded');
  }

  let wb;
  try {
    wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    res.status(400);
    throw new Error('Could not parse Excel file. Please ensure it is a valid spreadsheet.');
  }

  const rows = extractProductRowsFromWorkbook(wb);
  if (!rows || rows.length === 0) {
    res.status(400);
    throw new Error('No data rows found in uploaded Excel file');
  }

  const newItems = [];
  const existingItems = [];
  const fileCodesMap = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row._rawRowNumber || (i + 2);

    const rawCode = String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.code) || '').trim();
    const code = rawCode.replace(/-+$/, '');
    let name = String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.name) || '').trim();

    if (!name && !code) continue;
    if (name && (/^Count:/i.test(name) || name.toLowerCase() === 'name')) continue;

    let dbExisting = null;
    if (code) {
      const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      dbExisting = await Product.findOne({
        code: { $regex: `^${escapedCode}-?$`, $options: 'i' },
        deletedAt: null,
      }).lean();
    }

    if (!dbExisting && !code && name) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      dbExisting = await Product.findOne({
        name: { $regex: `^${escapedName}$`, $options: 'i' },
        deletedAt: null,
      }).lean();
    }

    if (dbExisting && !name) {
      name = dbExisting.name;
    }

    const category = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.category)
      ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.category)).trim()
      : (dbExisting ? dbExisting.category : 'General');

    const parentCategory = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory)
      ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory)).trim()
      : (dbExisting ? dbExisting.parentCategory : 'FOOD');

    const uom = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.uom)
      ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.uom)).trim()
      : (dbExisting ? dbExisting.uom : 'Pcs');

    const sellingPrice = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice)
      ? parseNumberClean(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice), 0)
      : (dbExisting ? Number(dbExisting.sellingPrice || 0) : 0);

    const description = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.description)
      ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.description)).trim()
      : (dbExisting ? dbExisting.description || '' : '');

    const itemData = {
      rowNumber,
      code,
      name: name || (code ? `Product ${code}` : `Product ${rowNumber}`),
      category: category || 'General',
      parentCategory: parentCategory || 'FOOD',
      uom: uom || 'Pcs',
      unit: uom || 'Pcs',
      sellingPrice,
      unitCost: sellingPrice,
      description,
      currentStock: 0,
      storeLocation: 'Main Store',
      isActive: true,
    };

    // Duplicate inside file
    if (code && fileCodesMap.has(code.toLowerCase())) {
      existingItems.push({
        ...itemData,
        duplicateType: 'file_duplicate',
        reason: `Product code "${code}" is repeated in uploaded file (Row ${fileCodesMap.get(code.toLowerCase())})`,
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
      const fieldChanges = [];
      const parallelOverrides = {};

      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.name) && name.toLowerCase() !== String(dbExisting.name || '').toLowerCase()) {
        fieldChanges.push({ field: 'Name', old: dbExisting.name, new: name });
        parallelOverrides.name = { old: dbExisting.name, new: name };
      }
      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.category) && category.toLowerCase() !== String(dbExisting.category || '').toLowerCase()) {
        fieldChanges.push({ field: 'Category', old: dbExisting.category, new: category });
        parallelOverrides.category = { old: dbExisting.category, new: category };
      }
      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory) && parentCategory.toLowerCase() !== String(dbExisting.parentCategory || '').toLowerCase()) {
        fieldChanges.push({ field: 'Department', old: dbExisting.parentCategory, new: parentCategory });
        parallelOverrides.parentCategory = { old: dbExisting.parentCategory, new: parentCategory };
      }
      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.uom) && uom.toLowerCase() !== String(dbExisting.uom || '').toLowerCase()) {
        fieldChanges.push({ field: 'Unit / UOM', old: dbExisting.uom, new: uom });
        parallelOverrides.uom = { old: dbExisting.uom, new: uom };
        parallelOverrides.unit = { old: dbExisting.uom, new: uom };
      }
      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice) && Number(sellingPrice) !== Number(dbExisting.sellingPrice || 0)) {
        fieldChanges.push({ field: 'Price', old: `ETB ${dbExisting.sellingPrice || 0}`, new: `ETB ${sellingPrice}` });
        parallelOverrides.sellingPrice = { old: Number(dbExisting.sellingPrice || 0), new: Number(sellingPrice) };
        parallelOverrides.unitCost = { old: Number(dbExisting.sellingPrice || 0), new: Number(sellingPrice) };
      }
      if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.description) && String(description).trim() !== String(dbExisting.description || '').trim()) {
        fieldChanges.push({ field: 'Description', old: dbExisting.description || '—', new: String(description).trim() });
        parallelOverrides.description = { old: dbExisting.description || '—', new: String(description).trim() };
      }

      existingItems.push({
        ...itemData,
        duplicateType: 'database_match',
        reason: (code && dbExisting.code && dbExisting.code.toLowerCase().startsWith(code.toLowerCase()))
          ? `Product code "${code}" already exists in system`
          : `Product name "${name}" matches existing product (${dbExisting.code})`,
        existingId: dbExisting._id,
        existingCode: dbExisting.code,
        existingName: dbExisting.name,
        existingPrice: dbExisting.sellingPrice,
        existingCategory: dbExisting.category,
        existingUnit: dbExisting.uom,
        hasChanges: fieldChanges.length > 0,
        fieldChanges,
        parallelOverrides,
      });
    } else {
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
      ? `Authentication alert: ${existingItems.length} existing/duplicate product code(s) detected out of ${total} items. You can override changes or add new items only.`
      : `Authentication verified: All ${total} products are new and ready to import.`,
  });
});

// POST /api/products/import/excel
// Performs parallel column overrides for matching codes and inserts non-duplicate products
const importProductsExcel = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const mode = req.body?.mode || req.query?.mode || 'override_duplicates';
  let wb;
  try {
    wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    res.status(400);
    throw new Error('Could not parse Excel file. Please ensure it is a valid spreadsheet.');
  }

  const rows = extractProductRowsFromWorkbook(wb);
  if (!rows || rows.length === 0) {
    res.status(400);
    throw new Error('No data rows found in uploaded Excel file');
  }

  const total = rows.length;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];
  const skippedItems = [];
  const processedIds = new Set();
  const fileCodesMap = new Map();

  // Stream SSE events by default to feed the client-side reader
  const isStream = req.query.stream !== 'false';
  let send = () => {};
  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ type: 'start', total });
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = row._rawRowNumber || (i + 2);

    const rawCode = String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.code) || '').trim();
    const code = rawCode.replace(/-+$/, '');
    let name = String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.name) || '').trim();

    if (!name && !code) continue;
    if (name && (/^Count:/i.test(name) || name.toLowerCase() === 'name')) continue;

    let isFileDuplicate = false;
    if (code && fileCodesMap.has(code.toLowerCase())) {
      isFileDuplicate = true;
    } else if (code) {
      fileCodesMap.set(code.toLowerCase(), rowNumber);
    }

    try {
      let existing = null;
      if (code) {
        const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        existing = await Product.findOne({
          code: { $regex: `^${escapedCode}-?$`, $options: 'i' },
          deletedAt: null,
        });
        if (existing && processedIds.has(existing._id.toString())) {
          existing = null;
        }
      }

      if (!existing && !code && name) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const byName = await Product.findOne({
          name: { $regex: `^${escapedName}$`, $options: 'i' },
          deletedAt: null,
        });
        if (byName && !processedIds.has(byName._id.toString())) {
          existing = byName;
        }
      }

      if (existing && !name) {
        name = existing.name;
      }

      const category = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.category)
        ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.category)).trim()
        : (existing ? existing.category : 'General');

      const parentCategory = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory)
        ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory)).trim()
        : (existing ? existing.parentCategory : 'FOOD');

      const uom = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.uom)
        ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.uom)).trim()
        : (existing ? existing.uom : 'Pcs');

      const sellingPrice = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice)
        ? parseNumberClean(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice), 0)
        : (existing ? Number(existing.sellingPrice || 0) : 0);

      const description = hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.description)
        ? String(getProductColVal(row, IMPORT_PRODUCT_COLUMN_KEYS.description)).trim()
        : (existing ? existing.description || '' : '');

      if (mode === 'skip_duplicates') {
        if (existing || isFileDuplicate) {
          skipped++;
          skippedItems.push({
            code: code || existing?.code || `Row ${rowNumber}`,
            name: name || existing?.name || `Product ${rowNumber}`,
            reason: isFileDuplicate ? 'Duplicate code in Excel' : `Existing product code (${existing?.code || code}) in system`,
          });
          continue;
        }

        const created_ = await Product.create({
          code,
          name: name || (code ? `Product ${code}` : `Product ${rowNumber}`),
          category: category || 'General',
          parentCategory: parentCategory || 'FOOD',
          uom: uom || 'Pcs',
          sellingPrice,
          description,
          ingredients: [],
          isActive: true,
        });
        processedIds.add(created_._id.toString());
        created++;
      } else if (existing) {
        // Parallel override of columns present in Excel row
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.name) && name) existing.name = name;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.code) && code) existing.code = code;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.category) && category) existing.category = category;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.parentCategory) && parentCategory) existing.parentCategory = parentCategory;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.uom) && uom) existing.uom = uom;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.sellingPrice)) existing.sellingPrice = sellingPrice;
        if (hasProductCol(row, IMPORT_PRODUCT_COLUMN_KEYS.description)) existing.description = description;
        existing.isActive = true;
        await existing.save();
        processedIds.add(existing._id.toString());
        updated++;
      } else {
        const created_ = await Product.create({
          code,
          name: name || (code ? `Product ${code}` : `Product ${rowNumber}`),
          category: category || 'General',
          parentCategory: parentCategory || 'FOOD',
          uom: uom || 'Pcs',
          sellingPrice,
          description,
          ingredients: [],
          isActive: true,
        });
        processedIds.add(created_._id.toString());
        created++;
      }
    } catch (err) {
      errors.push(`Row ${rowNumber} "${name}": ${err.message}`);
      skipped++;
    }

    if (isStream) {
      send({
        type: 'progress',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        created,
        updated,
        skipped,
      });
    }
  }

  invalidateDashboardCache();

  const summaryMsg = mode === 'skip_duplicates'
    ? `Import complete: ${created} new products pushed to system. ${skipped} existing codes skipped.`
    : `Import complete: ${created} new products created, ${updated} existing products overridden with parallel column changes.`;

  if (isStream) {
    send({
      type: 'done',
      created,
      updated,
      skipped,
      total,
      errors,
      skippedCodes: skippedItems.map(it => it.code),
      message: summaryMsg,
    });
    res.end();
  } else {
    res.json({
      success: true,
      message: summaryMsg,
      created,
      updated,
      skipped,
      errors,
      skippedCodes: skippedItems.map(it => it.code),
    });
  }
});


// GET /api/products/export/recipe-template
// Downloads an Excel workbook pre-filled with all active products and their current recipes.
// Users edit this file and re-upload it to bulk-set ingredients.
// Format per row: Product Code | Product Name | Ingredient Name | Quantity | Unit
const exportRecipeTemplate = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .populate('ingredients.material', 'name unit')
    .sort({ name: 1 });

  const rows = [];

  for (const p of products) {
    if (p.ingredients && p.ingredients.length > 0) {
      for (const ing of p.ingredients) {
        rows.push({
          'Product Code': p.code || '',
          'Product Name': p.name,
          'Ingredient Name': ing.material?.name || '',
          'Quantity': ing.quantity,
          'Unit': ing.material?.unit || '',
        });
      }
    } else {
      // Include products with no recipe so user can easily add one
      rows.push({
        'Product Code': p.code || '',
        'Product Name': p.name,
        'Ingredient Name': '',
        'Quantity': '',
        'Unit': '',
      });
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [14, 28, 26, 10, 10].map((w) => ({ wch: w }));

  // Add a bright-yellow Instructions sheet so users know the format
  const instructions = [
    { 'HOW TO USE THIS TEMPLATE': '1. Do NOT rename or reorder columns.' },
    { 'HOW TO USE THIS TEMPLATE': '2. "Product Code" OR "Product Name" must match an existing product.' },
    { 'HOW TO USE THIS TEMPLATE': '3. "Ingredient Name" must exactly match a Raw Material name in the system.' },
    { 'HOW TO USE THIS TEMPLATE': '4. "Quantity" is the amount of the ingredient per 1 unit of the product.' },
    { 'HOW TO USE THIS TEMPLATE': '5. "Unit" is informational — the system reads the unit from the raw material.' },
    { 'HOW TO USE THIS TEMPLATE': '6. To REPLACE a product\'s entire recipe: list all ingredients in consecutive rows.' },
    { 'HOW TO USE THIS TEMPLATE': '7. Leave "Ingredient Name" blank to clear / skip that product\'s recipe.' },
    { 'HOW TO USE THIS TEMPLATE': '8. Save as .xlsx and use the "Import Recipes" button in the Products page.' },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Recipes');
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="recipe_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});


// POST /api/products/import/recipes
// Accepts the recipe template Excel file and bulk-updates product ingredients.
// Rows are grouped by Product Code / Name; all rows for the same product
// collectively REPLACE that product's entire ingredient list.
const importRecipesExcel = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No file uploaded'); }

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]]; // always read first sheet
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Filter out blank / header rows
  const validRows = rows.filter((r) => {
    const name = String(r['Product Name'] || '').trim();
    const code = String(r['Product Code'] || '').trim();
    return name || code;
  });

  const total = validRows.length;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  // Stream progress via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: 'start', total });

  // Pre-load all active Items once (name → ObjectId map, case-insensitive)
  const allMaterials = await RawMaterial.find({ isActive: { $ne: false } }).select('name unit').lean();
  const materialMap = new Map(allMaterials.map((m) => [m.name.trim().toLowerCase(), m]));

  // Group rows by product identifier (code takes precedence over name)
  // Map: productKey → { code, name, ingredientRows[] }
  const productGroups = new Map();
  for (const row of validRows) {
    const code = String(row['Product Code'] || '').trim();
    const name = String(row['Product Name'] || '').trim();
    const key = code || name.toLowerCase();
    if (!productGroups.has(key)) {
      productGroups.set(key, { code, name, rows: [] });
    }
    productGroups.get(key).rows.push(row);
  }

  let processed = 0;
  for (const [, group] of productGroups) {
    const { code, name, rows: groupRows } = group;

    try {
      // Resolve the product
      let product = null;
      if (code) {
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        product = await Product.findOne({ code: { $regex: `^${escaped}-?$`, $options: 'i' }, isActive: true });
      }
      if (!product && name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        product = await Product.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' }, isActive: true });
      }

      if (!product) {
        errors.push(`Product not found: "${code || name}" — skipped`);
        skipped += groupRows.length;
        processed += groupRows.length;
        send({ type: 'progress', current: processed, total, percent: Math.round((processed / total) * 100), updated, skipped });
        continue;
      }

      // Build ingredient array from all rows for this product
      const ingredients = [];
      for (const row of groupRows) {
        const ingName = String(row['Ingredient Name'] || '').trim();
        if (!ingName) continue; // blank ingredient = skip row (not an error)

        const qty = parseFloat(row['Quantity']);
        if (!qty || qty <= 0) {
          errors.push(`Row for "${product.name}" — ingredient "${ingName}": invalid quantity "${row['Quantity']}"`);
          continue;
        }

        const mat = materialMap.get(ingName.toLowerCase());
        if (!mat) {
          errors.push(`Row for "${product.name}" — raw material "${ingName}" not found in system`);
          continue;
        }

        // Avoid duplicate ingredients for the same material in the same product
        if (!ingredients.find((i) => i.material.toString() === mat._id.toString())) {
          ingredients.push({ material: mat._id, quantity: qty });
        }
      }

      // Replace the product's ingredient list
      product.ingredients = ingredients;
      await product.save();
      updated++;
    } catch (err) {
      errors.push(`"${code || name}": ${err.message}`);
      skipped++;
    }

    processed += groupRows.length;
    send({
      type: 'progress',
      current: processed,
      total,
      percent: Math.round((processed / total) * 100),
      updated,
      skipped,
    });
  }

  invalidateDashboardCache();
  send({ type: 'done', updated, skipped, errors, total: productGroups.size });
  res.end();
});


module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  restoreProduct,
  permanentDeleteProduct,
  exportProductsExcel,
  validateProductsExcel,
  importProductsExcel,
  exportRecipeTemplate,
  importRecipesExcel,
};
