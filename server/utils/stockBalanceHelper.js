const RawMaterial = require('../models/RawMaterial');
const Setting = require('../models/Setting');

/**
 * Standardize store location names
 */
const normalizeStore = (store, fallback = 'Main Store') => {
  const s = (store || '').trim();
  return s || fallback;
};

/**
 * Look up stock balance of a material for a specific store location
 */
const getStoreStock = (material, storeName) => {
  if (!material) return 0;
  const target = normalizeStore(storeName, material.storeLocation || 'Main Store').toLowerCase();
  const matStore = normalizeStore(material.storeLocation || 'Main Store').toLowerCase();

  if (Array.isArray(material.storeBalances) && material.storeBalances.length > 0) {
    const entry = material.storeBalances.find(
      (b) => (b.store || '').trim().toLowerCase() === target
    );
    if (entry !== undefined && entry.balance !== undefined && entry.balance !== null) {
      return Number(entry.balance);
    }
  }

  // If storeBalances is not yet initialized for this store:
  // If it's the material's primary storeLocation, return currentStock; otherwise 0
  if (target === matStore) {
    return Number(material.currentStock) || 0;
  }
  return 0;
};

/**
 * Check if negative stock is permitted in system settings
 */
const isNegativeStockAllowed = async () => {
  try {
    const setting = await Setting.findOne().select('allowNegativeStock').lean();
    return Boolean(setting?.allowNegativeStock);
  } catch {
    return false;
  }
};

/**
 * Validate that reductions (out movements) do not violate the allowNegativeStock rule
 * Aggregates multiple lines for the same material & store within the transaction.
 */
const validateStockForReduction = async (items, defaultStore, session = null) => {
  const allowNegative = await isNegativeStockAllowed();
  if (allowNegative) {
    return { valid: true };
  }

  // Aggregate quantity per materialId + store
  const requirements = {};
  for (const item of items) {
    const matId = String(item.material?._id || item.material);
    const store = normalizeStore(item.storeLocation || defaultStore);
    const key = `${matId}:::${store}`;
    requirements[key] = (requirements[key] || 0) + Number(item.quantity || 0);
  }

  for (const [key, reqQty] of Object.entries(requirements)) {
    const [matId, store] = key.split(':::');
    const q = RawMaterial.findById(matId);
    if (session) q.session(session);
    const mat = await q;

    if (!mat) {
      return {
        valid: false,
        error: `Material with ID ${matId} not found during stock validation.`,
      };
    }

    const available = getStoreStock(mat, store);
    if (available < reqQty) {
      return {
        valid: false,
        error: `Insufficient stock in "${store}" for item "${mat.name}". Available stock is ${available} ${mat.unit || ''}, but voucher requests reduction of ${reqQty} ${mat.unit || ''}. Negative stock is disabled in system settings.`,
      };
    }
  }

  return { valid: true };
};

/**
 * Apply atomic stock movement (in or out) to RawMaterial document and per-store balances
 */
const applyStockMovement = async (items, direction, session = null, options = {}) => {
  const { defaultStore = 'Main Store', updateWac = false } = options;

  for (const item of items) {
    const matId = item.material?._id || item.material;
    const q = RawMaterial.findById(matId);
    if (session) q.session(session);
    const mat = await q;

    if (!mat) {
      throw new Error(`Material not found: ${matId}`);
    }

    const store = normalizeStore(item.storeLocation || defaultStore || mat.storeLocation);
    const targetStoreLower = store.toLowerCase();
    const qty = Number(item.quantity) || 0;
    const delta = direction === 'in' ? qty : -qty;

    // Ensure storeBalances array exists
    if (!Array.isArray(mat.storeBalances)) {
      mat.storeBalances = [];
    }

    // If storeBalances is completely empty, initialize it with the current stock at the primary store
    if (mat.storeBalances.length === 0) {
      const primary = normalizeStore(mat.storeLocation || 'Main Store');
      mat.storeBalances.push({
        store: primary,
        balance: Number(mat.currentStock) || 0,
      });
    }

    // Find the entry for this store
    let entry = mat.storeBalances.find(
      (b) => (b.store || '').trim().toLowerCase() === targetStoreLower
    );

    if (!entry) {
      // If entry doesn't exist, start with 0 (or currentStock if it was the primary store)
      const initial =
        targetStoreLower === normalizeStore(mat.storeLocation).toLowerCase()
          ? Number(mat.currentStock) || 0
          : 0;
      entry = { store, balance: initial };
      mat.storeBalances.push(entry);
    }

    // Update store balance and currentStock
    entry.balance = Math.round((entry.balance + delta) * 10000) / 10000;
    mat.currentStock = Math.round(((mat.currentStock || 0) + delta) * 10000) / 10000;
    mat.markModified('storeBalances');

    // WAC (Weighted Average Cost) update for IN movements with valid unitCost
    if (updateWac && direction === 'in' && Number(item.unitCost) > 0) {
      const oldStock = (mat.currentStock - qty) > 0 ? (mat.currentStock - qty) : 0;
      const oldCost  = mat.unitCost || 0;
      const inCost   = Number(item.unitCost) || oldCost;
      const totalQty = oldStock + qty;
      if (totalQty > 0) {
        mat.unitCost = Math.round((((oldStock * oldCost) + (qty * inCost)) / totalQty) * 10000) / 10000;
      }
    }

    await mat.save({ session: session || undefined });
  }
};

/**
 * Reverse an earlier applied stock movement (e.g. on voucher edit, void, or delete)
 */
const reverseStockMovement = async (items, originalDirection, session = null, options = {}) => {
  const reversedDirection = originalDirection === 'in' ? 'out' : 'in';
  await applyStockMovement(items, reversedDirection, session, {
    ...options,
    updateWac: false, // Reversal should not skew WAC cost upwards
  });
};

module.exports = {
  normalizeStore,
  getStoreStock,
  isNegativeStockAllowed,
  validateStockForReduction,
  applyStockMovement,
  reverseStockMovement,
};
