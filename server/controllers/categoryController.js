const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const RawMaterial = require('../models/RawMaterial');

const DEFAULT_CATEGORIES = [
  'Produce',
  'Meat & Poultry',
  'Fish & Seafood',
  'Dairy & Eggs',
  'Bakery & Pastry',
  'Grains',
  'Spices & Seasonings',
  'Pantry',
  'Frozen Foods',
  'Beverages',
  'Soft Drinks & Juices',
  'Beer & Wine',
  'Liquor & Spirits',
  'Coffee & Tea',
  'Mineral Water',
  'Housekeeping',
  'Cleaning Supplies',
  'Disposables & Packaging',
  'Maintenance & Hardware',
  'Stationery',
  'General',
];

const escapeRegex = (str) => String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { isActive: true };
  if (search) {
    const escaped = escapeRegex(search.trim());
    filter.name = { $regex: new RegExp(escaped, 'i') };
  }

  let categories = await Category.find(filter).sort({ name: 1 }).lean();

  // Auto-seed if database has no categories yet
  if (!search && categories.length === 0) {
    const seedDocs = DEFAULT_CATEGORIES.map((name) => ({ name, description: 'Default category' }));
    await Category.insertMany(seedDocs);
    categories = await Category.find(filter).sort({ name: 1 }).lean();
  }

  // Aggregate item count per category
  const itemCounts = await RawMaterial.aggregate([
    { $match: { isActive: true, deletedAt: null } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = {};
  itemCounts.forEach((c) => {
    if (c._id) countMap[String(c._id).trim().toLowerCase()] = c.count;
  });

  const enriched = categories.map((cat) => ({
    ...cat,
    itemCount: countMap[cat.name.trim().toLowerCase()] || 0,
  }));

  res.json(enriched);
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();

  if (!name) {
    res.status(400);
    throw new Error('Category name is required.');
  }

  const escaped = escapeRegex(name);
  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
  });

  if (existing) {
    res.status(400);
    throw new Error(`Category "${existing.name}" already exists.`);
  }

  const category = await Category.create({ name, description, isActive: true });
  res.status(201).json(category);
});

// PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  const newName = (req.body.name || '').trim();
  const description = req.body.description !== undefined ? req.body.description.trim() : category.description;

  if (!newName) {
    res.status(400);
    throw new Error('Category name cannot be empty.');
  }

  const escaped = escapeRegex(newName);
  const existing = await Category.findOne({
    _id: { $ne: id },
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
  });

  if (existing) {
    res.status(400);
    throw new Error(`Category "${existing.name}" already exists.`);
  }

  const oldName = category.name;
  category.name = newName;
  category.description = description;
  await category.save();

  // If category name was renamed, cascade update to RawMaterials
  if (oldName.toLowerCase() !== newName.toLowerCase()) {
    await RawMaterial.updateMany(
      { category: { $regex: new RegExp(`^${escapeRegex(oldName)}$`, 'i') } },
      { category: newName }
    );
  }

  res.json(category);
});

// DELETE /api/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  // Check if any items belong to this category
  const count = await RawMaterial.countDocuments({
    category: { $regex: new RegExp(`^${escapeRegex(category.name)}$`, 'i') },
    isActive: true,
    deletedAt: null,
  });

  if (count > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete category "${category.name}": ${count} active item(s) are currently assigned to this category. Please reassign them first.`
    );
  }

  await category.deleteOne();
  res.json({ message: `Category "${category.name}" removed successfully.` });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
