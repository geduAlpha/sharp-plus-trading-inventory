const User = require('../models/User');
const Supplier = require('../models/Supplier');
const RawMaterial = require('../models/RawMaterial');
const Customer = require('../models/Customer');
const Setting = require('../models/Setting');

let isSeeding = false;

const runAutoSeed = async () => {
  if (isSeeding) return;
  isSeeding = true;

  try {
    // 1. Ensure all standard staff accounts exist and are active
    const defaults = [
      { name: 'System Developer & Owner', email: 'developer@company.com', password: 'admin123', role: 'developer', phone: '0912627366' },
      { name: 'Sharp Plus Admin', email: 'admin@company.com', password: 'admin123', role: 'admin', phone: '0912627366' },
      { name: 'Company Manager', email: 'manager@company.com', password: 'admin123', role: 'manager', phone: '+251911000333' },
      { name: 'Store Keeper', email: 'storekeeper@company.com', password: 'admin123', role: 'storekeeper', phone: '+251999985154' },
      { name: 'Cashier', email: 'cashier@company.com', password: 'admin123', role: 'cashier', phone: '+251911223344' },
    ];

    for (const u of defaults) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create({ ...u, isActive: true });
        console.log(`[SEED] Created ${u.role} -> ${u.email}`);
      } else {
        let changed = false;
        if (exists.isActive !== true) {
          exists.isActive = true;
          changed = true;
        }
        if (u.phone && (!exists.phone || exists.phone.trim() === '')) {
          exists.phone = u.phone;
          changed = true;
        }
        const matches = await exists.matchPassword('admin123');
        if (!matches) {
          exists.password = 'admin123';
          changed = true;
        }
        if (changed) {
          await exists.save();
          console.log(`[SEED] Ensured active status & credentials for ${u.email}`);
        }
      }
    }

    // 2. Ensure Settings include Items visibility for Cashier & Storekeeper
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }
    const nav = setting.navVisibility || {};
    let navChanged = false;
    ['Items', 'items', 'products', 'dashboard', 'salesMarketing'].forEach(key => {
      if (!nav[key]) nav[key] = {};
      if (nav[key].cashier !== true) {
        nav[key].cashier = true;
        navChanged = true;
      }
      if (nav[key].storekeeper !== true) {
        nav[key].storekeeper = true;
        navChanged = true;
      }
    });
    if (navChanged) {
      setting.navVisibility = nav;
      setting.markModified('navVisibility');
      await setting.save();
      console.log('[SEED] Ensured navigation permissions for cashier & storekeeper in Settings.');
    }

    // 3. Ensure Default Company exists
    const { ensureDefaultCompany } = require('../controllers/companyController');
    if (ensureDefaultCompany) {
      await ensureDefaultCompany().catch(err => console.warn('[SEED] Company init error:', err.message));
    }

    // 4. Ensure Suppliers
    const supplierCount = await Supplier.countDocuments();
    if (supplierCount === 0) {
      await Supplier.insertMany([
        { name: 'Green Valley Farms', category: 'Produce', contactPerson: 'Abel Tesfaye', phone: '+251911000111' },
        { name: 'Addis Meat Suppliers', category: 'Meat & Poultry', contactPerson: 'Sara Girma', phone: '+251911000222' },
        { name: 'Blue Nile Beverages', category: 'Beverages', contactPerson: 'Yonas Bekele', phone: '+251911000333' },
      ]);
      console.log('[SEED] Seeded sample suppliers.');
    }

    // 5. Ensure Raw Materials / Items
    const materialCount = await RawMaterial.countDocuments();
    if (materialCount === 0) {
      await RawMaterial.insertMany([
        { code: 'RM-0001', name: 'Basmati Rice', category: 'Grains', unit: 'Kilogram (kg)', currentStock: 120, reorderLevel: 30, unitCost: 85, storeLocation: 'Main Store', storeBalances: [{ store: 'Main Store', balance: 120 }] },
        { code: 'RM-0002', name: 'Cooking Oil', category: 'Pantry', unit: 'Litre (L)', currentStock: 40, reorderLevel: 15, unitCost: 210, storeLocation: 'Main Store', storeBalances: [{ store: 'Main Store', balance: 40 }] },
        { code: 'FP-0001', name: 'Bottled Water 500ml', category: 'Beverages', itemType: 'Finished Product', unit: 'Piece (Pcs)', currentStock: 300, reorderLevel: 100, unitCost: 8, storeLocation: 'Main Store', storeBalances: [{ store: 'Main Store', balance: 300 }] },
      ]);
      console.log('[SEED] Seeded initial Items / Raw Materials.');
    }

    // 6. Ensure Customers
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      await Customer.insertMany([
        { name: 'Addis International Hotel', phone: '+251911223344', address: 'Bole, Addis Ababa', customerType: 'corporate', creditLimit: 100000 },
        { name: 'Sheger Cafe & Business', phone: '+251922334455', address: 'Piassa, Addis Ababa', customerType: 'credit', creditLimit: 50000 },
        { name: 'Walelgn Mart & Grocery', phone: '+251933445566', address: 'Merkato, Addis Ababa', customerType: 'regular', creditLimit: 25000 },
      ]);
      console.log('[SEED] Seeded sample customers.');
    }
  } catch (err) {
    console.error('[SEED] Auto-seed error:', err.message);
  } finally {
    isSeeding = false;
  }
};

module.exports = { runAutoSeed };

