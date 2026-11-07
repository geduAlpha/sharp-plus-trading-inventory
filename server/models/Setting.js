const mongoose = require('mongoose');

const DEFAULT_NAV_VISIBILITY = {
  dashboard: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  subsystem_captain_order: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  salesMarketing: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  subsystem_cash_sales: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  cashSales: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  subsystem_pos_ordering: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  creditSales: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  raw_materials: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  items: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  Items: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  products: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  stock_movements: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  stockMovements: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  suppliers: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: false, developer: true },
  consumption: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  stockRequests: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: true, developer: true },
  reports: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true, employee: false, developer: true },
  overhead_expenses: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true, employee: false, developer: true },
  expenses: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true, employee: false, developer: true },
  finance: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true, employee: false, developer: true },
  analytics_pnl: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true, employee: false, developer: true },
  analytics: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true, employee: false, developer: true },
  staff_accounts: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true, employee: false, developer: true },
  staffAccounts: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true, employee: false, developer: true },
  employees: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true, employee: false, developer: true },
};

const DEFAULT_ROLE_PERMISSIONS = {
  // ── Workflow Capabilities ──
  recordGoods: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  checkReview: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  approveGoods: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  postLedger: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  voidTransactions: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  viewReports: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
  manageAccounts: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },

  // ── CRUD Action Privileges (Matching Screenshot) ──
  raw_materials: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  items: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  products: {
    view: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  suppliers: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  overhead_expenses: {
    view: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  expenses: {
    view: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  stock_movements: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  stockMovements: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  purchases: {
    view: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
  employees: {
    view: { storekeeper: true, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
    edit: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    delete: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  },
};

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Sharp Plus' },
    systemEmail: { type: String, default: 'info@Sharp Plus.com' },
    phone: { type: String, default: '+251 911 000 111' },
    address: { type: String, default: 'Addis Ababa, Ethiopia' },
    currency: { type: String, default: 'ETB' },
    currencySymbol: { type: String, default: 'ETB' },
    lowStockThresholdDefault: { type: Number, default: 15 },
    taxRate: { type: Number, default: 15 },
    autoGenerateVoucherNo: { type: Boolean, default: true },
    allowNegativeStock: { type: Boolean, default: false },
    rolePermissions: {
      type: Object,
      default: () => JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
    },
    navVisibility: {
      type: Object,
      default: DEFAULT_NAV_VISIBILITY,
    },
    // Authority Delegation: Developer/Owner can grant System Admin authority to manage employee permissions
    allowAdminManagePermissions: {
      type: Boolean,
      default: false,
    },
    // Authority Delegation: Developer/Owner can grant System Admin authority to void and delete inventory transactions (GRVs, etc.)
    allowAdminVoidDelete: {
      type: Boolean,
      default: false,
    },
    // Authority Delegation: Developer/Owner controls whether hotel admin can customize sidebar themes and icon modes
    allowAdminThemeCustomization: {
      type: Boolean,
      default: true,
    },
    // Telegram bot subscribers — array of { chatId, name, username, subscribedAt }
    telegramSubscribers: {
      type: Array,
      default: [],
    },
    notes: { type: String, default: 'Sharp Plus Trading PLC & Stock Control System' },

    // ── Company Profile & System Ownership ───────────────────────
    tradeName: { type: String, default: '' },
    tinNumber: { type: String, default: '' },
    companyLogo: { type: String, default: '/logo.png' },
    website: { type: String, default: '' },
    city: { type: String, default: 'Addis Ababa' },
    country: { type: String, default: 'Ethiopia' },
    ownerName: { type: String, default: 'System Owner' },
    ownerEmail: { type: String, default: 'admin@company.com' },
    ownerPhone: { type: String, default: '' },
    registeredAt: { type: Date, default: Date.now },
    isConfigured: { type: Boolean, default: false },

    // ── Pricing & Cost Parameters ─────────────────────────────────
    // Contingency: % buffer added on top of raw material cost (waste, price fluctuation)
    contingencyPercent: { type: Number, default: 10, min: 0, max: 100 },
    // Overhead: % of total cost added for electricity, labour, etc.
    overheadPercent: { type: Number, default: 25, min: 0, max: 100 },
    // Default Food Cost %: used to back-calculate suggested selling price
    // e.g. if food cost % = 30, selling price = totalCost / 0.30
    defaultFoodCostPercent: { type: Number, default: 30, min: 1, max: 100 },
    // Raw Material Price Adjustment: apply globally before recipe cost calculation
    // 'percent' = add X% to every unit cost | 'fixed' = add fixed ETB amount
    rawMaterialPriceAdjustType: { type: String, default: 'percent', enum: ['percent', 'fixed'] },
    rawMaterialPriceAdjustValue: { type: Number, default: 0, min: 0 },
    // Product Selling Price Bulk Adjustment — percentage to add to ALL product selling prices
    // ── Theme & Dynamic Sidebar Customization ────────────────────
    themeConfig: {
      type: Object,
      default: () => ({ ...DEFAULT_THEME_CONFIG }),
    },
    sidebarConfig: {
      type: Array,
      default: () => JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_CONFIG)),
    },

    // ── Dynamic System Modules Activation (System Owner & Developer Controlled) ──
    modulesEnabled: {
      type: Object,
      default: () => ({ ...DEFAULT_MODULES_ENABLED }),
    },

    // ── Hardware & POS Printer Settings ───────────────────────────
    printers: {
      type: Array,
      default: () => [
        { id: 'pos_counter', name: 'Main Counter Thermal POS (80mm)', type: 'thermal_80mm', paperWidth: 80, autoPrint: true, isDefault: true },
        { id: 'office_a4', name: 'Admin Office Laser (A4 Invoice)', type: 'standard_a4', paperWidth: 210, autoPrint: false, isDefault: false },
      ],
    },

    // ── Fiscal Service Charge & Digital Catalog ───────────────────
    serviceChargePercent: { type: Number, default: 0, min: 0, max: 100 },
    digitalMenuEnabled: { type: Boolean, default: true },

    // ── System Owner & Developer Audit Trail ───────────────────────
    auditLogs: {
      type: Array,
      default: () => [],
    },
  },
  { timestamps: true }
);

const DEFAULT_MODULES_ENABLED = {
  dashboard: true,
  items: true,
  stockMovements: true,
  stockRequests: true,
  salesMarketing: true,
  purchases: true,
  adjustments: true,
  accounting: true,
  reports: true,
  staff: true,
};

const DEFAULT_THEME_CONFIG = {
  theme: 'white', // 'navy' | 'white' | 'black' | 'gray' | 'emerald' | 'purple' | 'ocean' | 'warm' | 'teal' | 'burgundy' | 'glass' | 'adaptive' | 'nordic' | 'amber' | 'cyberpunk' | 'titanium'
  displayMode: 'system', // 'light' | 'dark' | 'system'
  accentColor: 'indigo', // 'indigo' | 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose'
  iconStyle: 'rounded', // 'rounded' | 'filled' | 'outlined' | 'sharp'
  iconBadgeShape: 'squircle', // 'squircle' | 'circle' | 'rounded' | 'plain'
  sidebarCompact: false,
  sidebarStyle: 'standard', // 'standard' | 'floating' | 'rounded'
  sidebarWidth: 'normal', // 'compact' | 'normal' | 'wide' | 'extra'
  menuSpacing: 'comfortable', // 'compact' | 'comfortable' | 'spacious'
  iconSize: 'medium', // 'small' | 'medium' | 'large' | 'xlarge'
  colorfulIcons: false,
  showSectionHeaders: true,
  iconLibrary: 'material',
};

const DEFAULT_SIDEBAR_CONFIG = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    icon: 'DashboardRounded',
    iconType: 'mui',
    section: 'main',
    navKey: 'dashboard',
    order: 1,
    visible: true,
    exact: true,
  },
  {
    id: 'allIds',
    label: "All ID's",
    icon: 'FolderRounded',
    iconType: 'mui',
    section: 'main',
    isGroup: true,
    order: 2,
    visible: true,
    children: [
      { id: 'materials', label: 'Items', to: '/materials', icon: 'Inventory2Rounded', iconType: 'mui', navKey: 'items', order: 1, visible: true },
      { id: 'products', label: 'Products', to: '/products', icon: 'RestaurantMenuRounded', iconType: 'mui', navKey: 'products', order: 2, visible: true },
      { id: 'employees', label: 'Employees', to: '/employees', icon: 'BadgeRounded', iconType: 'mui', navKey: 'staffAccounts', order: 3, visible: true },
      { id: 'suppliers', label: 'Suppliers', to: '/suppliers', icon: 'LocalShippingRounded', iconType: 'mui', navKey: 'suppliers', order: 4, visible: true },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & P&L',
    to: '/analytics',
    icon: 'TrendingUpRounded',
    iconType: 'mui',
    section: 'main',
    navKey: 'analytics',
    order: 3,
    visible: true,
  },
  {
    id: 'storeOps',
    label: 'Stock Management System',
    icon: 'AllInboxRounded',
    iconType: 'mui',
    section: 'operations',
    isGroup: true,
    order: 4,
    visible: true,
    children: [
      { id: 'movements_cash_grv', label: 'Cash Goods Receiving Voucher', to: '/transactions/cash-grv', icon: 'ShoppingBagRounded', iconType: 'mui', navKey: 'purchases', order: 1, visible: true },
      { id: 'movements_credit_grv', label: 'Credit Goods Receiving Voucher', to: '/transactions/credit-grv', icon: 'CreditCardRounded', iconType: 'mui', navKey: 'purchases', order: 2, visible: true },
      { id: 'movements_neg_adj', label: 'Negative Stock Adjustment Voucher', to: '/transactions/neg-adjustment', icon: 'RemoveCircleOutlineRounded', iconType: 'mui', navKey: 'stockMovements', order: 3, visible: true },
      { id: 'movements_pos_adj', label: 'Positive Stock Adjustment Voucher', to: '/transactions/pos-adjustment', icon: 'AddCircleOutlineRounded', iconType: 'mui', navKey: 'stockMovements', order: 4, visible: true },
      { id: 'report_inventory_count', label: 'Inventory Count', to: '/reports/inventory-count', icon: 'FactCheckRounded', iconType: 'mui', navKey: 'inventoryCount', order: 5, visible: true, onHold: true, disabled: true },
      { id: 'movements_all', label: 'All Documents', to: '/transactions', icon: 'SwapHorizRounded', iconType: 'mui', navKey: 'stockMovements', order: 6, visible: true, exact: true, onHold: true, disabled: true },
      { id: 'movements_sales_import', label: 'Import Sales Report', to: '/sales-import', icon: 'CloudUploadRounded', iconType: 'mui', navKey: 'stockMovements', order: 7, visible: true },
      { id: 'stock_requests', label: 'Stock Issue & Request', to: '/stock-requests', icon: 'CallSplitRounded', iconType: 'mui', navKey: 'stockRequests', order: 8, visible: true, onHold: true, disabled: true },
    ]
  },
  {
    id: 'salesMarketing',
    label: 'Sales and Marketing MS',
    icon: 'PointOfSaleRounded',
    iconType: 'mui',
    section: 'operations',
    isGroup: true,
    navKey: 'salesMarketing',
    order: 5,
    visible: true,
    children: [
      { id: 'sales_cash', label: 'Cash Sales', to: '/sales/cash', icon: 'PaymentsRounded', iconType: 'mui', navKey: 'cashSales', order: 1, visible: true },
      { id: 'sales_credit', label: 'Credit Sales', to: '/sales/credit', icon: 'ReceiptLongRounded', iconType: 'mui', navKey: 'creditSales', order: 2, visible: true },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'AssessmentRounded',
    iconType: 'mui',
    section: 'operations',
    isGroup: true,
    navKey: 'reports',
    order: 6,
    visible: true,
    children: [
      { id: 'report_summary', label: 'Overview', to: '/reports/summary', icon: 'BarChartRounded', iconType: 'mui', order: 1, visible: true },
      { id: 'report_balance', label: 'Stock Balance Sheet', to: '/reports/stock-balance', icon: 'BalanceRounded', iconType: 'mui', order: 2, visible: true },
      { id: 'report_inventory_count', label: 'Inventory Count', to: '/reports/inventory-count', icon: 'FactCheckRounded', iconType: 'mui', order: 3, visible: true },
      { id: 'report_daily', label: 'Daily Report', to: '/reports/daily', icon: 'TodayRounded', iconType: 'mui', order: 4, visible: true },
      { id: 'report_cash_grv', label: 'Cash GRV Report', to: '/reports/cash-grv', icon: 'ShoppingBagRounded', iconType: 'mui', order: 5, visible: true },
      { id: 'report_credit_grv', label: 'Credit GRV Report', to: '/reports/credit-grv', icon: 'CreditCardRounded', iconType: 'mui', order: 6, visible: true },
      { id: 'report_pos_adj', label: '+ve Adjustment Report', to: '/reports/pos-adjustment', icon: 'TrendingUpRounded', iconType: 'mui', order: 7, visible: true },
      { id: 'report_disposal', label: 'Disposal Report', to: '/reports/disposal', icon: 'LocalFireDepartmentRounded', iconType: 'mui', order: 8, visible: false },
      { id: 'report_neg_adj', label: '−ve Adjustment Report', to: '/reports/neg-adjustment', icon: 'TrendingDownRounded', iconType: 'mui', order: 9, visible: true },
      { id: 'report_levels', label: 'Stock Levels', to: '/reports/stock-levels', icon: 'AllInboxRounded', iconType: 'mui', order: 10, visible: true },
      { id: 'report_purchases', label: 'Purchase History', to: '/reports/purchases', icon: 'ShoppingCartRounded', iconType: 'mui', order: 11, visible: true },
    ]
  },
  {
    id: 'staffAccounts',
    label: 'Staff Accounts',
    to: '/users',
    icon: 'GroupRounded',
    iconType: 'mui',
    section: 'admin',
    navKey: 'staffAccounts',
    order: 7,
    visible: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: 'SettingsRounded',
    iconType: 'mui',
    section: 'admin',
    order: 8,
    visible: true,
  },
  {
    id: 'recycleBin',
    label: 'Recycle Bin',
    to: '/recycle-bin',
    icon: 'DeleteOutlineRounded',
    iconType: 'mui',
    section: 'admin',
    navKey: 'recycleBin',
    order: 9,
    visible: true,
  }
];

module.exports = mongoose.model('Setting', settingSchema);
module.exports.DEFAULT_NAV_VISIBILITY = DEFAULT_NAV_VISIBILITY;
module.exports.DEFAULT_THEME_CONFIG = DEFAULT_THEME_CONFIG;
module.exports.DEFAULT_SIDEBAR_CONFIG = DEFAULT_SIDEBAR_CONFIG;
module.exports.DEFAULT_MODULES_ENABLED = DEFAULT_MODULES_ENABLED;
