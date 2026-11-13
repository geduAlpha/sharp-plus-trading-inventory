import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Shield,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Mail,
  Phone,
  MapPin,
  Coins,
  BadgeAlert,
  Sparkles,
  Layers,
  Check,
  Camera,
  Upload,
  Trash2,
  Clock,
  Send,
  Building2,
  FileBadge2,
  Globe,
  Percent,
  Palette,
  Printer,
  QrCode,
  ExternalLink,
  Copy,
  Plus,
  RotateCcw,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sliders,
  DollarSign,
  Activity,
  BarChart3,
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  UserX,
  Pencil,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useThemeSidebar, THEMES } from '../context/ThemeSidebarContext';
import { useSessionTimeout, TIMEOUT_OPTIONS } from '../context/SessionTimeoutContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import RolePrivilegesManager from '../components/admin/RolePrivilegesManager';
import SidebarThemeSettings from '../components/admin/SidebarThemeSettings';
import ModuleManagement from '../components/admin/ModuleManagement';

const CAPABILITIES = [
  { key: 'recordGoods', label: 'Record Goods Receiving (Cash/Credit GRV)' },
  { key: 'checkReview', label: 'Check & Review Transactions (Stage 1)' },
  { key: 'approveGoods', label: 'Approve Goods & Vouchers (Stage 2)' },
  { key: 'postLedger', label: 'Post Documents to Ledger (Final Stage)' },
  { key: 'voidTransactions', label: 'Void / Reverse Transactions' },
  { key: 'viewReports', label: 'View Financial & Valuation Reports' },
  { key: 'manageAccounts', label: 'Manage Staff Accounts & Passwords' },
];

const MATRIX_ROLES = [
  { key: 'storekeeper', label: 'Storekeeper' },
  { key: 'cashier', label: 'Cashier' },
  { key: 'manager', label: 'Manager' },
  { key: 'admin', label: 'Admin' },
];

const DEFAULT_CAPABILITY_DEFAULTS = {
  recordGoods: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  checkReview: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  approveGoods: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  postLedger: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  voidTransactions: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  viewReports: { storekeeper: false, cashier: false, waiter: false, supervisor: true, manager: true, admin: true },
  manageAccounts: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
};

export const SIDEBAR_NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    route: '/',
    navKey: 'dashboard',
    desc: 'Main executive inventory, financial metrics & activity dashboard',
    submenus: ['Overview KPI Cards', 'Quick Action Buttons', 'Recent Activity Stream'],
    childrenKeys: ['dashboard'],
  },
  {
    key: 'allIds',
    label: "All ID's (Master Registry)",
    route: 'Dropdown Group',
    navKey: 'allIds',
    desc: 'Master directory of stock items, finished products, staff employees, and suppliers',
    submenus: ['Items (Raw Materials)', 'Products (Finished Goods)', 'Employees Directory', 'Suppliers Directory'],
    childrenKeys: ['allIds', 'items', 'materials', 'products', 'employees', 'suppliers', 'raw_materials'],
  },
  {
    key: 'analytics',
    label: 'Analytics & P&L',
    route: '/analytics',
    navKey: 'analytics',
    desc: 'Business intelligence, profit & loss statements, revenue and operational financial analysis',
    submenus: ['Revenue vs Expense', 'P&L Statement', 'Financial Indicators'],
    childrenKeys: ['analytics', 'finance', 'overhead_expenses', 'expenses'],
  },
  {
    key: 'storeOps',
    label: 'Stock Management System',
    route: 'Dropdown Group',
    navKey: 'storeOps',
    desc: 'Core warehouse receiving, issuing, adjustment vouchers, and physical stock operations',
    submenus: [
      'Cash Goods Receiving Voucher (GRV)',
      'Credit Goods Receiving Voucher (GRV)',
      'Negative Stock Adjustment Voucher',
      'Positive Stock Adjustment Voucher',
      'Inventory Count',
      'All Documents / Transactions',
      'Import Sales Report',
      'Stock Issue & Request',
      'Stock Management Voucher Report'
    ],
    childrenKeys: [
      'storeOps',
      'stock_operations',
      'purchases',
      'purchases_grv',
      'movements_cash_grv',
      'movements_credit_grv',
      'movements_neg_adj',
      'movements_pos_adj',
      'stockMovements',
      'stock_movements',
      'inventoryCount',
      'report_inventory_count',
      'movements_all',
      'movements_sales_import',
      'stockRequests',
      'stock_requests',
      'consumption',
      'stockManagementVoucherReportUnderStoreOps',
      'stockManagementVoucherReport'
    ],
  },
  {
    key: 'salesMarketing',
    label: 'Sales and Marketing MS',
    route: 'Dropdown Group',
    navKey: 'salesMarketing',
    desc: 'Point-of-sale customer checkout and direct sales transaction vouchers',
    submenus: ['Cash Sales Voucher', 'Credit Sales Voucher'],
    childrenKeys: ['salesMarketing', 'cashSales', 'creditSales', 'sales_cash', 'sales_credit'],
  },
  {
    key: 'subSystem',
    label: 'Sub System',
    route: 'Dropdown Group',
    navKey: 'subSystem',
    desc: 'Subsystem stock management reports and multi-channel sales execution modules',
    submenus: [
      'Subsystem Stock Management (Voucher Report)',
      'Cash Sales Voucher',
      'Credit Sales Voucher',
      'Zeroing Voucher',
      'Security Report',
      'Sales Closing',
      'Sales Route Mapping'
    ],
    childrenKeys: [
      'subSystem',
      'subsystem',
      'subsystem_stock_management',
      'subsystem_sales_marketing',
      'subsystem_captain_order',
      'subsystem_cash_sales',
      'subsystem_credit_sales',
      'subsystem_pos_ordering',
      'subsystem_zeroing_voucher',
      'subsystem_security_report',
      'subsystem_sales_closing',
      'subsystem_sales_route_mapping',
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Audits',
    route: 'Dropdown Group',
    navKey: 'reports',
    desc: 'Comprehensive stock balances, GRV audit trails, daily activity logs, and stock levels',
    submenus: [
      'Overview Summary',
      'Stock Balance Report (Evaluations & Bincard)',
      'Inventory Count',
      'Daily Transaction Report',
      'Cash GRV Audit Report',
      'Credit GRV Audit Report',
      '+ve Stock Adjustment Report',
      '−ve Stock Adjustment Report',
      'Stock Levels & Reorder Thresholds',
      'Purchase History Audit'
    ],
    childrenKeys: [
      'reports',
      'reports_analytics',
      'report_summary',
      'report_balance',
      'report_inventory_count',
      'report_daily',
      'report_cash_grv',
      'report_credit_grv',
      'report_pos_adj',
      'report_neg_adj',
      'report_levels',
      'report_purchases',
      'report_disposal'
    ],
  },
  {
    key: 'staffAccounts',
    label: 'Staff Accounts',
    route: '/users',
    navKey: 'staffAccounts',
    desc: 'Staff roster directory, system user logins, and credential account administration',
    submenus: ['User Accounts Directory', 'Staff Access Profiles'],
    childrenKeys: ['staffAccounts', 'staff', 'staff_accounts', 'users'],
  },
  {
    key: 'recycleBin',
    label: 'Recycle Bin',
    route: '/recycle-bin',
    navKey: 'recycleBin',
    desc: 'Soft-deleted master items and historical records safety vault with restore controls',
    submenus: ['Deleted Items Restoration', 'Audit Tombstones'],
    childrenKeys: ['recycleBin', 'recycle_bin'],
  },
  {
    key: 'settings',
    label: 'Settings & Administration',
    route: '/settings',
    navKey: 'settings',
    desc: 'Role privileges matrix, theme customizer, company profile, and hardware configurations',
    submenus: ['Role Privileges', 'System Configuration', 'Theme & Sidebar Styles', 'Printers & Backups'],
    childrenKeys: ['settings', 'system_settings'],
  },
];

export const SCREENSHOT_NAV_DEFAULTS = {
  dashboard: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  allIds: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  analytics: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
  storeOps: { storekeeper: true, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  salesMarketing: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true },
  subSystem: { storekeeper: true, cashier: true, waiter: true, supervisor: true, manager: true, admin: true },
  reports: { storekeeper: false, cashier: true, waiter: false, supervisor: true, manager: true, admin: true },
  staffAccounts: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  recycleBin: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
  settings: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
};

export const CRUD_ACTIONS = [
  { key: 'view', label: 'VIEW', color: 'text-emerald-600', bg: 'bg-emerald-50/60', dot: 'bg-emerald-500', desc: 'Permission to view and read records' },
  { key: 'create', label: 'CREATE', color: 'text-blue-600', bg: 'bg-blue-50/60', dot: 'bg-blue-600', desc: 'Permission to add new records' },
  { key: 'edit', label: 'EDIT', color: 'text-amber-500', bg: 'bg-amber-50/60', dot: 'bg-amber-500', desc: 'Permission to update and modify existing records' },
  { key: 'delete', label: 'DELETE', color: 'text-red-600', bg: 'bg-red-50/60', dot: 'bg-red-600', desc: 'Permission to delete records' },
  { key: 'approve', label: 'APPROVE', color: 'text-purple-600', bg: 'bg-purple-50/60', dot: 'bg-purple-600', desc: 'Permission to approve pending records, requests, or transactions' },
  { key: 'reject', label: 'REJECT', color: 'text-rose-800', bg: 'bg-rose-50/60', dot: 'bg-rose-800', desc: 'Permission to reject submitted records, requests, or transactions' },
  { key: 'export', label: 'PRINT / EXPORT', color: 'text-slate-600', bg: 'bg-slate-50/80', dot: 'bg-slate-500', desc: 'Permission to print reports and export data' },
];

export const CRUD_MODULE_ROWS = [
  { key: 'raw_materials', label: 'Raw Materials', alias: 'items', desc: 'Stock items, inventory units & master catalogue' },
  { key: 'products', label: 'Products', alias: 'products', desc: 'Finished goods, sales menu items & recipes' },
  { key: 'suppliers', label: 'Suppliers', alias: 'suppliers', desc: 'Vendor records, contracts & contact directory' },
  { key: 'overhead_expenses', label: 'Overhead Expenses', alias: 'expenses', desc: 'Operating expenses, utility vouchers & payments' },
  { key: 'stock_movements', label: 'Stock Movements', alias: 'stockMovements', desc: 'Stock transfers, adjustments & SIV vouchers' },
  { key: 'purchases', label: 'Purchases / GRV', alias: 'purchases_grv', desc: 'Goods Receiving Vouchers, invoices & purchase orders' },
  { key: 'employees', label: 'Employees', alias: 'staffAccounts', desc: 'Staff directory, permissions & login accounts' },
];

export const CRUD_SCREENSHOT_DEFAULTS = {
  raw_materials: {
    view:    { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: true,  cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    export:  { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
  },
  products: {
    view:    { storekeeper: true,  cashier: true,  waiter: true,  supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    export:  { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
  },
  suppliers: {
    view:    { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    export:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
  },
  overhead_expenses: {
    view:    { storekeeper: true,  cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    export:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
  },
  stock_movements: {
    view:    { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: true,  cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    export:  { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
  },
  purchases: {
    view:    { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: true,  cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    export:  { storekeeper: true,  cashier: true,  waiter: false, supervisor: true,  manager: true, admin: true },
  },
  employees: {
    view:    { storekeeper: true,  cashier: false, waiter: false, supervisor: true,  manager: true, admin: true },
    create:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    edit:    { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
    delete:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    approve: { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    reject:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: false, admin: true },
    export:  { storekeeper: false, cashier: false, waiter: false, supervisor: false, manager: true, admin: true },
  },
};

const NAV_ITEMS = SIDEBAR_NAV_ITEMS;

const DEFAULT_PRINTERS = [
  { id: 'pos_counter', name: 'Main Counter Thermal POS (80mm)', type: 'thermal_80mm', paperWidth: 80, autoPrint: true, isDefault: true, ip: '192.168.1.201' },
  { id: 'office_a4', name: 'Admin Office Laser (A4 Invoice)', type: 'standard_a4', paperWidth: 210, autoPrint: false, isDefault: false, ip: '192.168.1.202' },
];

const SETTINGS_TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'security', label: 'Security & Password', icon: Shield },
  { id: 'system', label: 'Company & System Config', icon: Building2, adminOnly: true },
  { id: 'permissions', label: 'Role Privileges', icon: Layers, adminOnly: true },
  { id: 'telegram', label: 'Telegram Subscribers', icon: Send, adminOnly: true },
  { id: 'printers', label: 'Order Printers', icon: Printer, adminOnly: true },
  { id: 'dev', label: 'Developer Controls', icon: Lock, devOnly: true, badge: 'OWNER' },
];

export default function Settings() {
  const { user, updateUser, hasRole, refreshPermissions, companyInfo, updateCompanyInfo } = useAuth();
  const { activeTheme, themeConfig, saveThemeAndSidebar, modulesEnabled: themeModules, toggleModule } = useThemeSidebar();
  const { timeoutMinutes, setTimeoutMinutes } = useSessionTimeout();
  const [sessionTimeoutSuccess, setSessionTimeoutSuccess] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // Redirect non-authorized users away from restricted tabs
  useEffect(() => {
    if ((currentTab === 'appearance' || currentTab === 'sidebar' || currentTab === 'modules' || currentTab === 'dev') && user?.role !== 'developer') {
      setTab('profile');
    }
    if (currentTab === 'permissions' && !hasRole('admin') && user?.role !== 'developer') {
      setTab('profile');
    }
    if (['system', 'telegram', 'printers'].includes(currentTab) && !hasRole('admin') && user?.role !== 'developer') {
      setTab('profile');
    }
    if (currentTab === 'serviceCharge' || currentTab === 'digitalMenu') {
      setTab('system');
    }
  }, [currentTab, user]);

  // UI state for additional feature tabs
  const [showGranularCRUD, setShowGranularCRUD] = useState(false);
  const [testSlipModal, setTestSlipModal] = useState(null); // printer object or null
  const [addPrinterModal, setAddPrinterModal] = useState(false);
  const [newPrinterForm, setNewPrinterForm] = useState({ name: '', type: 'thermal_80mm', paperWidth: 80, autoPrint: true, ip: '192.168.1.205' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [devSubTab, setDevSubTab] = useState('modules'); // 'modules' | 'appearance' | 'delegation' | 'audit'
  const [navSearch, setNavSearch] = useState('');
  const [navRoleFilter, setNavRoleFilter] = useState('all'); // 'all' or role key

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // System settings state (Admin)
  const [systemForm, setSystemForm] = useState({
    companyName: 'Sharp Plus',
    tradeName: '',
    tinNumber: '',
    systemEmail: 'info@Sharp Plus.com',
    phone: '+251 911 000 111',
    address: 'Addis Ababa, Ethiopia',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    currency: 'ETB',
    currencySymbol: 'ETB',
    companyLogo: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    registeredAt: null,
    isConfigured: false,
    lowStockThresholdDefault: 15,
    taxRate: 15,
    taxMode: 'inclusive',
    autoGenerateVoucherNo: true,
    allowNegativeStock: false,
    // Pricing & Cost Parameters
    contingencyPercent: 10,
    overheadPercent: 25,
    defaultFoodCostPercent: 30,
    rawMaterialPriceAdjustType: 'percent',
    rawMaterialPriceAdjustValue: 0,
    productSellingPriceAdjustPercent: 0,
    printers: DEFAULT_PRINTERS,
    serviceChargePercent: 0,
    digitalMenuEnabled: true,
    allowAdminThemeCustomization: true,
    allowAdminManagePermissions: false,
    allowAdminVoidDelete: false,
    modulesEnabled: { salesMarketing: true, accounting: true, items: true, digitalMenu: true },
    rolePermissions: {
      ...DEFAULT_CAPABILITY_DEFAULTS,
      ...CRUD_SCREENSHOT_DEFAULTS,
    },
    navVisibility: {
      dashboard: { cashier: true, storekeeper: true, manager: true, admin: true },
      items: { cashier: false, storekeeper: true, manager: true, admin: true },
      products: { cashier: true, storekeeper: true, manager: true, admin: true },
      stockMovements: { cashier: false, storekeeper: true, manager: true, admin: true },
      stockRequests: { cashier: false, storekeeper: true, manager: true, admin: true },
      purchases: { cashier: false, storekeeper: true, manager: true, admin: true },
      suppliers: { cashier: false, storekeeper: false, manager: true, admin: true },
      reports: { cashier: false, storekeeper: false, manager: true, admin: true },
      analytics: { cashier: false, storekeeper: false, manager: true, admin: true },
      staffAccounts: { cashier: false, storekeeper: false, manager: false, admin: true },
    },
    notes: '',
  });
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemSuccess, setSystemSuccess] = useState('');
  const [systemError, setSystemError] = useState('');
  const [hasUnsavedPerms, setHasUnsavedPerms] = useState(false);
  const settingsLoadedRef = useRef(false);

  // Bulk product price adjustment state
  const [bulkPricePercent, setBulkPricePercent] = useState('');
  const [bulkPriceApplying, setBulkPriceApplying] = useState(false);
  const [bulkPriceSuccess, setBulkPriceSuccess] = useState('');
  const [bulkPriceError, setBulkPriceError] = useState('');

  // Telegram subscribers state (Admin)
  const [tgSubscribers, setTgSubscribers] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgRemoving, setTgRemoving] = useState(null);
  const [tgSuccess, setTgSuccess] = useState('');
  const [tgError, setTgError] = useState('');
  // Phone registration inline edit state
  const [tgEditPhone, setTgEditPhone] = useState(null);  // chatId being edited
  const [tgPhoneVal, setTgPhoneVal] = useState('');
  const [tgPhoneSaving, setTgPhoneSaving] = useState(false);
  // Manual add subscriber modal
  const [tgAddOpen, setTgAddOpen] = useState(false);
  const [tgAddForm, setTgAddForm] = useState({ name: '', phone: '', username: '', chatId: '' });
  const [tgAddSaving, setTgAddSaving] = useState(false);
  // Action dropdown & edit modal state for Telegram subscribers
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [tgEditModalSub, setTgEditModalSub] = useState(null);
  const [tgEditForm, setTgEditForm] = useState({ name: '', username: '', phone: '' });
  const [tgEditSaving, setTgEditSaving] = useState(false);

  // Close active action dropdown when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Sync profile when user updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load system settings (guarded against overwriting unsaved user edits)
  useEffect(() => {
    if (user && !settingsLoadedRef.current) {
      setSystemLoading(true);
      api
        .get('/settings')
        .then((res) => {
          if (res.data) {
            settingsLoadedRef.current = true;
            setSystemForm((prev) => ({ ...prev, ...res.data }));
          }
        })
        .catch((err) => console.error('Failed to load settings', err))
        .finally(() => setSystemLoading(false));
    }
  }, [user?._id]);

  // Load Telegram subscribers (admin only)
  const loadTgSubscribers = () => {
    if (!hasRole('admin')) return;
    setTgLoading(true);
    setTgError('');
    api.get('/telegram/subscribers')
      .then(res => setTgSubscribers(res.data || []))
      .catch(() => {
        setTgError('Failed to load subscribers.');
        setTimeout(() => setTgError(''), 3000);
      })
      .finally(() => setTgLoading(false));
  };
  useEffect(() => {
    if (currentTab === 'telegram' && hasRole('admin')) loadTgSubscribers();
  }, [currentTab]);

  // Handle Telegram subscriber removal
  const handleRemoveTgSubscriber = async (chatId, name) => {
    if (!window.confirm(`Remove "${name}" from bot subscribers? They will stop receiving notifications.`)) return;
    setTgRemoving(chatId);
    setTgError('');
    try {
      await api.delete(`/telegram/subscribers/${chatId}`);
      setTgSuccess(`"${name}" removed from subscribers.`);
      setTimeout(() => setTgSuccess(''), 4000);
      loadTgSubscribers();
    } catch (err) {
      setTgError(err.response?.data?.message || 'Failed to remove subscriber.');
    } finally {
      setTgRemoving(null);
    }
  };

  // Handle phone number registration for a subscriber
  const handleRegisterPhone = async (chatId) => {
    if (!tgPhoneVal.trim()) return;
    setTgPhoneSaving(true);
    setTgError('');
    try {
      await api.put(`/telegram/subscribers/${chatId}/phone`, { phone: tgPhoneVal.trim() });
      setTgSuccess('Phone number registered — this number can now receive OTP codes.');
      setTimeout(() => setTgSuccess(''), 5000);
      setTgEditPhone(null);
      setTgPhoneVal('');
      loadTgSubscribers();
    } catch (err) {
      setTgError(err.response?.data?.message || 'Failed to register phone.');
    } finally {
      setTgPhoneSaving(false);
    }
  };

  // Handle manually adding a new subscriber
  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    setTgAddSaving(true);
    setTgError('');
    try {
      await api.post('/telegram/subscribers', tgAddForm);
      setTgSuccess(`"${tgAddForm.name}" added successfully.`);
      setTimeout(() => setTgSuccess(''), 4000);
      setTgAddOpen(false);
      setTgAddForm({ name: '', phone: '', username: '', chatId: '' });
      loadTgSubscribers();
    } catch (err) {
      setTgError(err.response?.data?.message || 'Failed to add subscriber.');
    } finally {
      setTgAddSaving(false);
    }
  };

  const handleOpenEditModal = (sub) => {
    setTgEditModalSub(sub);
    setTgEditForm({
      name: sub.name || '',
      username: sub.username || '',
      phone: sub.phone || '',
    });
    setActiveActionMenu(null);
  };

  const handleUpdateSubscriber = async (e) => {
    e.preventDefault();
    if (!tgEditModalSub) return;
    setTgEditSaving(true);
    setTgError('');
    try {
      await api.put(`/telegram/subscribers/${tgEditModalSub.chatId}`, tgEditForm);
      setTgSuccess(`Subscriber "${tgEditForm.name || tgEditModalSub.name}" updated successfully.`);
      setTimeout(() => setTgSuccess(''), 4000);
      setTgEditModalSub(null);
      loadTgSubscribers();
    } catch (err) {
      setTgError(err.response?.data?.message || 'Failed to update subscriber.');
    } finally {
      setTgEditSaving(false);
    }
  };

  const handleDeleteSubscriber = async (chatId, name) => {
    if (!window.confirm(`Permanently delete subscriber record for "${name}"? This will completely remove them.`)) return;
    setTgRemoving(chatId);
    setTgError('');
    try {
      await api.delete(`/telegram/subscribers/${chatId}`);
      setTgSuccess(`Subscriber "${name}" deleted permanently.`);
      setTimeout(() => setTgSuccess(''), 4000);
      loadTgSubscribers();
    } catch (err) {
      setTgError(err.response?.data?.message || 'Failed to delete subscriber.');
    } finally {
      setTgRemoving(null);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await api.put('/auth/profile', profileForm);
      updateUser(res.data);
      setProfileSuccess('Profile details successfully updated.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Profile Photo Upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    setAvatarUploading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      // Compress image client-side to max 500x500 JPEG
      const compressedBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const maxWidth = 500;
            const maxHeight = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      const res = await api.put('/auth/profile', { avatar: compressedBase64 });
      updateUser(res.data);
      setProfileSuccess('Profile photo updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };
  // Handle Remove Profile Photo
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setAvatarUploading(true);
    setProfileError('');
    try {
      const res = await api.put('/auth/profile', { avatar: '' });
      updateUser(res.data);
      setProfileSuccess('Profile photo removed.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to remove profile photo.');
    } finally {
      setAvatarUploading(false);
    }
  };
  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      setPasswordSaving(false);
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password successfully updated!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };
  // Handle System Settings Update
  const handleSystemSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setSystemSaving(true);
    setSystemSuccess('');
    setSystemError('');
    try {
      const res = await api.put('/settings', systemForm);
      setSystemForm((prev) => ({ ...prev, ...res.data }));
      setHasUnsavedPerms(false);
      settingsLoadedRef.current = true;
      if (updateCompanyInfo) {
        updateCompanyInfo(res.data);
      }
      if (res.data?.rolePermissions || res.data?.navVisibility) {
        await refreshPermissions(res.data);
      } else {
        await refreshPermissions();
      }
      setSystemSuccess(
        `✓ Role Privileges & System Settings saved successfully! All permissions and sidebar visibility are now permanently stored in the database and active immediately across all user sessions.`
      );
      setTimeout(() => setSystemSuccess(''), 7000);
    } catch (err) {
      console.error('Failed to update system settings:', err);
      setSystemError(err.response?.data?.message || 'Failed to update system settings.');
      setTimeout(() => setSystemError(''), 7000);
    } finally {
      setSystemSaving(false);
    }
  };

  // Handle Bulk Product Price Adjustment
  const handleBulkPriceApply = async () => {
    const pct = Number(bulkPricePercent);
    if (!pct || pct <= 0) { setBulkPriceError('Enter a valid percentage greater than 0.'); return; }
    if (!window.confirm(`This will permanently increase ALL product selling prices by +${pct}%. This cannot be undone automatically. Continue?`)) return;
    setBulkPriceApplying(true);
    setBulkPriceError('');
    setBulkPriceSuccess('');
    try {
      const res = await api.post('/settings/apply-product-price-adjustment', { percent: pct });
      setBulkPriceSuccess(`✓ ${res.data.message}`);
      setBulkPricePercent('');
      setTimeout(() => setBulkPriceSuccess(''), 6000);
    } catch (err) {
      setBulkPriceError(err.response?.data?.message || 'Failed to apply price adjustment.');
    } finally {
      setBulkPriceApplying(false);
    }
  };

  // Handle Role Capability Toggle
  const handleCapabilityToggle = (capKey, roleKey, checked) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const currentCap = prev.rolePermissions?.[capKey] || DEFAULT_CAPABILITY_DEFAULTS[capKey] || {};
      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [capKey]: {
            ...currentCap,
            [roleKey]: checked,
          },
        },
      };
    });
  };

  // Bulk Capability Handlers
  const handleSelectAllCapabilities = (forceValue = true) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      CAPABILITIES.forEach((cap) => {
        const currentCap = { ...(perms[cap.key] || DEFAULT_CAPABILITY_DEFAULTS[cap.key] || {}) };
        MATRIX_ROLES.forEach((r) => {
          currentCap[r.key] = forceValue;
        });
        perms[cap.key] = currentCap;
      });
      return { ...prev, rolePermissions: perms };
    });
  };

  const handleBulkToggleCapabilityRole = (roleKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        const allChecked = CAPABILITIES.every((cap) => {
          const capObj = perms[cap.key] || DEFAULT_CAPABILITY_DEFAULTS[cap.key] || {};
          return Boolean(capObj[roleKey]);
        });
        targetVal = !allChecked;
      }
      CAPABILITIES.forEach((cap) => {
        const currentCap = { ...(perms[cap.key] || DEFAULT_CAPABILITY_DEFAULTS[cap.key] || {}) };
        currentCap[roleKey] = targetVal;
        perms[cap.key] = currentCap;
      });
      return { ...prev, rolePermissions: perms };
    });
  };

  const handleToggleCapabilityRow = (capKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      const currentCap = { ...(perms[capKey] || DEFAULT_CAPABILITY_DEFAULTS[capKey] || {}) };
      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        const allChecked = MATRIX_ROLES.every((r) => Boolean(currentCap[r.key]));
        targetVal = !allChecked;
      }
      MATRIX_ROLES.forEach((r) => {
        currentCap[r.key] = targetVal;
      });
      perms[capKey] = currentCap;
      return { ...prev, rolePermissions: perms };
    });
  };

  // Reset Role Capabilities to default
  const handleResetCapabilityDefaults = () => {
    if (!window.confirm('Reset all role capabilities to system standard defaults?')) return;
    setHasUnsavedPerms(true);
    setSystemForm((prev) => ({
      ...prev,
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_CAPABILITY_DEFAULTS)),
    }));
    setSystemSuccess('Role capabilities reset to standard defaults. Click Save Changes to apply permanently.');
    setTimeout(() => setSystemSuccess(''), 6000);
  };

  // Dedicated helper to safely resolve navigation visibility for any item and role
  const getNavVisibility = (itemKey, roleKey) => {
    const item = SIDEBAR_NAV_ITEMS.find((i) => i.key === itemKey);
    const nav = systemForm.navVisibility || {};
    if (nav[itemKey]?.[roleKey] !== undefined) {
      return Boolean(nav[itemKey][roleKey]);
    }
    if (item?.navKey && nav[item.navKey]?.[roleKey] !== undefined) {
      return Boolean(nav[item.navKey][roleKey]);
    }
    const defaultVal = SCREENSHOT_NAV_DEFAULTS[itemKey]?.[roleKey];
    if (defaultVal !== undefined) return Boolean(defaultVal);
    return true;
  };

  // Handle Hierarchical Sidebar Navigation Visibility Toggle:
  // Toggling any main sidebar menu directly cascades to all of its controlled submenus
  const handleNavVisibilityToggle = (itemKey, roleKey, checked) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      const item = SIDEBAR_NAV_ITEMS.find((i) => i.key === itemKey);

      // 1. Set main sidebar menu visibility for this role
      nav[itemKey] = { ...(nav[itemKey] || {}), [roleKey]: checked };

      // Sync primary navKey alias if different
      if (item?.navKey && item.navKey !== itemKey) {
        nav[item.navKey] = { ...(nav[item.navKey] || {}), [roleKey]: checked };
      }

      // 2. Cascade control: Set all submenus controlled by this main menu to the same value
      if (item?.childrenKeys && Array.isArray(item.childrenKeys)) {
        item.childrenKeys.forEach((ck) => {
          nav[ck] = { ...(nav[ck] || {}), [roleKey]: checked };
        });
      }

      return { ...prev, navVisibility: nav };
    });
  };

  // Bulk Navigation Visibility actions across all displayed roles
  const handleSelectAllNav = (forceValue = true) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      SIDEBAR_NAV_ITEMS.forEach((item) => {
        const itemObj = { ...(nav[item.key] || {}) };
        displayedRoles.forEach((r) => {
          itemObj[r.key] = forceValue;
        });
        nav[item.key] = itemObj;

        if (item.navKey && item.navKey !== item.key) {
          const altObj = { ...(nav[item.navKey] || {}) };
          displayedRoles.forEach((r) => {
            altObj[r.key] = forceValue;
          });
          nav[item.navKey] = altObj;
        }

        if (item.childrenKeys && Array.isArray(item.childrenKeys)) {
          item.childrenKeys.forEach((ck) => {
            const childObj = { ...(nav[ck] || {}) };
            displayedRoles.forEach((r) => {
              childObj[r.key] = forceValue;
            });
            nav[ck] = childObj;
          });
        }
      });
      return { ...prev, navVisibility: nav };
    });
  };

  const handleSelectAllNavForRole = (roleKey) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      SIDEBAR_NAV_ITEMS.forEach((item) => {
        nav[item.key] = { ...(nav[item.key] || {}), [roleKey]: true };
        if (item.navKey && item.navKey !== item.key) {
          nav[item.navKey] = { ...(nav[item.navKey] || {}), [roleKey]: true };
        }
        if (item.childrenKeys && Array.isArray(item.childrenKeys)) {
          item.childrenKeys.forEach((ck) => {
            nav[ck] = { ...(nav[ck] || {}), [roleKey]: true };
          });
        }
      });
      return { ...prev, navVisibility: nav };
    });
  };

  const handleDeselectAllNavForRole = (roleKey) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      SIDEBAR_NAV_ITEMS.forEach((item) => {
        nav[item.key] = { ...(nav[item.key] || {}), [roleKey]: false };
        if (item.navKey && item.navKey !== item.key) {
          nav[item.navKey] = { ...(nav[item.navKey] || {}), [roleKey]: false };
        }
        if (item.childrenKeys && Array.isArray(item.childrenKeys)) {
          item.childrenKeys.forEach((ck) => {
            nav[ck] = { ...(nav[ck] || {}), [roleKey]: false };
          });
        }
      });
      return { ...prev, navVisibility: nav };
    });
  };

  const handleToggleNavRow = (itemKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      const item = SIDEBAR_NAV_ITEMS.find((i) => i.key === itemKey);
      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        const allChecked = displayedRoles.every((r) => getNavVisibility(itemKey, r.key));
        targetVal = !allChecked;
      }

      displayedRoles.forEach((r) => {
        nav[itemKey] = { ...(nav[itemKey] || {}), [r.key]: targetVal };
        if (item?.navKey && item.navKey !== itemKey) {
          nav[item.navKey] = { ...(nav[item.navKey] || {}), [r.key]: targetVal };
        }
        if (item?.childrenKeys && Array.isArray(item.childrenKeys)) {
          item.childrenKeys.forEach((ck) => {
            nav[ck] = { ...(nav[ck] || {}), [r.key]: targetVal };
          });
        }
      });

      return { ...prev, navVisibility: nav };
    });
  };

  const handleResetNavDefaults = () => {
    if (!window.confirm('Reset all sidebar navigation visibility settings to standard system defaults?')) return;
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const nav = { ...(prev.navVisibility || {}) };
      Object.entries(SCREENSHOT_NAV_DEFAULTS).forEach(([key, roleMap]) => {
        nav[key] = { ...(nav[key] || {}), ...roleMap };
        const item = SIDEBAR_NAV_ITEMS.find((i) => i.key === key);
        if (item?.navKey && item.navKey !== key) {
          nav[item.navKey] = { ...(nav[item.navKey] || {}), ...roleMap };
        }
        if (item?.childrenKeys && Array.isArray(item.childrenKeys)) {
          item.childrenKeys.forEach((ck) => {
            nav[ck] = { ...(nav[ck] || {}), ...roleMap };
          });
        }
      });
      return { ...prev, navVisibility: nav };
    });
    setSystemSuccess('Sidebar navigation visibility reset to standard defaults. Click Save Changes to apply permanently.');
    setTimeout(() => setSystemSuccess(''), 6000);
  };

  // CRUD Action Privileges Handlers (Matching Screenshot 3)
  const getCrudPermission = (moduleKey, actionKey, roleKey) => {
    const aliasMap = {
      raw_materials: 'items',
      items: 'raw_materials',
      overhead_expenses: 'expenses',
      expenses: 'overhead_expenses',
      stock_movements: 'stockMovements',
      stockMovements: 'stock_movements',
      purchases: 'purchases_grv',
      purchases_grv: 'purchases',
      employees: 'staffAccounts',
      staffAccounts: 'employees',
    };
    const altKey = aliasMap[moduleKey];

    const perms = systemForm.rolePermissions;
    if (perms?.[moduleKey]?.[actionKey]?.[roleKey] !== undefined) {
      return Boolean(perms[moduleKey][actionKey][roleKey]);
    }
    if (altKey && perms?.[altKey]?.[actionKey]?.[roleKey] !== undefined) {
      return Boolean(perms[altKey][actionKey][roleKey]);
    }

    const defaultVal =
      CRUD_SCREENSHOT_DEFAULTS[moduleKey]?.[actionKey]?.[roleKey] ??
      CRUD_SCREENSHOT_DEFAULTS[altKey]?.[actionKey]?.[roleKey] ??
      (roleKey === 'admin');
    return Boolean(defaultVal);
  };

  const handleCrudToggle = (moduleKey, actionKey, roleKey, checked) => {
    setHasUnsavedPerms(true);
    const aliasMap = {
      raw_materials: 'items',
      items: 'raw_materials',
      overhead_expenses: 'expenses',
      expenses: 'overhead_expenses',
      stock_movements: 'stockMovements',
      stockMovements: 'stock_movements',
      purchases: 'purchases_grv',
      purchases_grv: 'purchases',
      employees: 'staffAccounts',
      staffAccounts: 'employees',
    };
    const altKey = aliasMap[moduleKey];

    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };

      const updateTarget = (key) => {
        const modObj = { ...(perms[key] || {}) };
        const actObj = { ...(modObj[actionKey] || {}) };
        actObj[roleKey] = checked;
        modObj[actionKey] = actObj;
        perms[key] = modObj;
      };

      updateTarget(moduleKey);
      if (altKey) updateTarget(altKey);

      return {
        ...prev,
        rolePermissions: perms,
      };
    });
  };

  // Bulk Permission Controls for 7 Actions & Individual Roles
  const handleBulkToggleAction = (actionKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };

      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        // Determine if all visible checkboxes for this action are currently checked
        let allChecked = true;
        for (const mod of CRUD_MODULE_ROWS) {
          for (const role of displayedRoles) {
            if (!getCrudPermission(mod.key, actionKey, role.key)) {
              allChecked = false;
              break;
            }
          }
          if (!allChecked) break;
        }
        targetVal = !allChecked;
      }

      CRUD_MODULE_ROWS.forEach((mod) => {
        const aliasMap = {
          raw_materials: 'items',
          items: 'raw_materials',
          overhead_expenses: 'expenses',
          expenses: 'overhead_expenses',
          stock_movements: 'stockMovements',
          stockMovements: 'stock_movements',
          purchases: 'purchases_grv',
          purchases_grv: 'purchases',
          employees: 'staffAccounts',
          staffAccounts: 'employees',
        };
        const altKey = aliasMap[mod.key];

        const updateKey = (k) => {
          const modObj = { ...(perms[k] || {}) };
          const actObj = { ...(modObj[actionKey] || {}) };
          displayedRoles.forEach((r) => {
            actObj[r.key] = targetVal;
          });
          modObj[actionKey] = actObj;
          perms[k] = modObj;
        };

        updateKey(mod.key);
        if (altKey) updateKey(altKey);
      });

      return { ...prev, rolePermissions: perms };
    });
  };

  const handleToggleCrudModuleRow = (moduleKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      const aliasMap = {
        raw_materials: 'items',
        items: 'raw_materials',
        overhead_expenses: 'expenses',
        expenses: 'overhead_expenses',
        stock_movements: 'stockMovements',
        stockMovements: 'stock_movements',
        purchases: 'purchases_grv',
        purchases_grv: 'purchases',
        employees: 'staffAccounts',
        staffAccounts: 'employees',
      };
      const altKey = aliasMap[moduleKey];

      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        let allChecked = true;
        for (const act of CRUD_ACTIONS) {
          for (const r of displayedRoles) {
            if (!getCrudPermission(moduleKey, act.key, r.key)) {
              allChecked = false;
              break;
            }
          }
          if (!allChecked) break;
        }
        targetVal = !allChecked;
      }

      const updateKey = (k) => {
        const modObj = { ...(perms[k] || {}) };
        CRUD_ACTIONS.forEach((act) => {
          const actObj = { ...(modObj[act.key] || {}) };
          displayedRoles.forEach((r) => {
            actObj[r.key] = targetVal;
          });
          modObj[act.key] = actObj;
        });
        perms[k] = modObj;
      };

      updateKey(moduleKey);
      if (altKey) updateKey(altKey);

      return { ...prev, rolePermissions: perms };
    });
  };

  const handleBulkToggleRole = (roleKey, forceValue) => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };

      let targetVal = forceValue;
      if (typeof targetVal !== 'boolean') {
        let allChecked = true;
        for (const mod of CRUD_MODULE_ROWS) {
          for (const act of CRUD_ACTIONS) {
            if (!getCrudPermission(mod.key, act.key, roleKey)) {
              allChecked = false;
              break;
            }
          }
          if (!allChecked) break;
        }
        targetVal = !allChecked;
      }

      CRUD_MODULE_ROWS.forEach((mod) => {
        const aliasMap = {
          raw_materials: 'items',
          items: 'raw_materials',
          overhead_expenses: 'expenses',
          expenses: 'overhead_expenses',
          stock_movements: 'stockMovements',
          stockMovements: 'stock_movements',
          purchases: 'purchases_grv',
          purchases_grv: 'purchases',
          employees: 'staffAccounts',
          staffAccounts: 'employees',
        };
        const altKey = aliasMap[mod.key];

        const updateKey = (k) => {
          const modObj = { ...(perms[k] || {}) };
          CRUD_ACTIONS.forEach((act) => {
            const actObj = { ...(modObj[act.key] || {}) };
            actObj[roleKey] = targetVal;
            modObj[act.key] = actObj;
          });
          perms[k] = modObj;
        };

        updateKey(mod.key);
        if (altKey) updateKey(altKey);
      });

      return { ...prev, rolePermissions: perms };
    });
  };

  const handleSelectAllCrud = () => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      CRUD_MODULE_ROWS.forEach((mod) => {
        const aliasMap = {
          raw_materials: 'items',
          items: 'raw_materials',
          overhead_expenses: 'expenses',
          expenses: 'overhead_expenses',
          stock_movements: 'stockMovements',
          stockMovements: 'stock_movements',
          purchases: 'purchases_grv',
          purchases_grv: 'purchases',
          employees: 'staffAccounts',
          staffAccounts: 'employees',
        };
        const altKey = aliasMap[mod.key];

        const updateKey = (k) => {
          const modObj = { ...(perms[k] || {}) };
          CRUD_ACTIONS.forEach((act) => {
            const actObj = { ...(modObj[act.key] || {}) };
            displayedRoles.forEach((r) => {
              actObj[r.key] = true;
            });
            modObj[act.key] = actObj;
          });
          perms[k] = modObj;
        };

        updateKey(mod.key);
        if (altKey) updateKey(altKey);
      });
      return { ...prev, rolePermissions: perms };
    });
  };

  const handleDeselectAllCrud = () => {
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      CRUD_MODULE_ROWS.forEach((mod) => {
        const aliasMap = {
          raw_materials: 'items',
          items: 'raw_materials',
          overhead_expenses: 'expenses',
          expenses: 'overhead_expenses',
          stock_movements: 'stockMovements',
          stockMovements: 'stock_movements',
          purchases: 'purchases_grv',
          purchases_grv: 'purchases',
          employees: 'staffAccounts',
          staffAccounts: 'employees',
        };
        const altKey = aliasMap[mod.key];

        const updateKey = (k) => {
          const modObj = { ...(perms[k] || {}) };
          CRUD_ACTIONS.forEach((act) => {
            const actObj = { ...(modObj[act.key] || {}) };
            displayedRoles.forEach((r) => {
              actObj[r.key] = false;
            });
            modObj[act.key] = actObj;
          });
          perms[k] = modObj;
        };

        updateKey(mod.key);
        if (altKey) updateKey(altKey);
      });
      return { ...prev, rolePermissions: perms };
    });
  };

  const handleResetCrudDefaults = () => {
    if (!window.confirm('Reset all 7 CRUD Action Privileges to system standard defaults?')) return;
    setHasUnsavedPerms(true);
    setSystemForm((prev) => {
      const perms = { ...(prev.rolePermissions || {}) };
      Object.entries(CRUD_SCREENSHOT_DEFAULTS).forEach(([modKey, modVal]) => {
        perms[modKey] = JSON.parse(JSON.stringify(modVal));
        const aliasMap = {
          raw_materials: 'items',
          overhead_expenses: 'expenses',
          stock_movements: 'stockMovements',
          purchases: 'purchases_grv',
          employees: 'staffAccounts',
        };
        if (aliasMap[modKey]) {
          perms[aliasMap[modKey]] = JSON.parse(JSON.stringify(modVal));
        }
      });
      return { ...prev, rolePermissions: perms };
    });
    setSystemSuccess('Role action privileges reset to defaults. Click "Save Changes" to apply permanently.');
    setTimeout(() => setSystemSuccess(''), 6000);
  };

  // ── Developer / Owner Controls Handlers (Matching Screenshots) ──
  const handleDevModuleToggle = async (moduleKey, newValue) => {
    if (toggleModule) {
      toggleModule(moduleKey, newValue);
    }
    setSystemForm((prev) => {
      const updatedModules = { ...(prev.modulesEnabled || {}), [moduleKey]: newValue };
      const next = { ...prev, modulesEnabled: updatedModules };
      if (moduleKey === 'digitalMenu') {
        next.digitalMenuEnabled = newValue;
      }
      return next;
    });

    try {
      const payload = {
        modulesEnabled: { [moduleKey]: newValue },
      };
      if (moduleKey === 'digitalMenu') {
        payload.digitalMenuEnabled = newValue;
      }
      const res = await api.put('/settings', payload);
      if (res.data) {
        setSystemForm((prev) => ({ ...prev, ...res.data }));
        await refreshPermissions(res.data);
      }
      setSystemSuccess(`Module "${moduleKey}" licensing status updated successfully.`);
      setTimeout(() => setSystemSuccess(''), 3000);
    } catch (err) {
      setSystemError(err.response?.data?.message || 'Failed to update module licensing status.');
      setTimeout(() => setSystemError(''), 4000);
    }
  };

  const handleDevAdminThemeToggle = async (newValue) => {
    setSystemForm((prev) => ({ ...prev, allowAdminThemeCustomization: newValue }));
    try {
      const res = await api.put('/settings', { allowAdminThemeCustomization: newValue });
      if (res.data) {
        setSystemForm((prev) => ({ ...prev, ...res.data }));
        await refreshPermissions(res.data);
      }
      setSystemSuccess(`Company Admin Theme & Icon Customization set to ${newValue ? 'ALLOWED (VISIBLE TO ADMIN)' : 'RESTRICTED / HIDDEN'}.`);
      setTimeout(() => setSystemSuccess(''), 3000);
    } catch (err) {
      setSystemError(err.response?.data?.message || 'Failed to update theme customization delegation.');
      setTimeout(() => setSystemError(''), 4000);
    }
  };

  const handleDevIconModeToggle = async (newValue) => {
    const updatedTheme = {
      ...(themeConfig || {}),
      iconLibrary: newValue ? 'material' : 'classic',
      colorfulIcons: newValue,
    };
    if (saveThemeAndSidebar) {
      saveThemeAndSidebar(updatedTheme, undefined);
    }
    setSystemSuccess(`Icon mode updated to ${newValue ? 'Modern Material UI Icons Mode' : 'Classic Clean Mode'}.`);
    setTimeout(() => setSystemSuccess(''), 3000);
  };

  const handleDevThemeSelect = (themeId) => {
    const selectedTheme = THEMES?.find((t) => t.id === themeId);
    if (!selectedTheme) return;
    const updatedTheme = {
      ...(themeConfig || {}),
      theme: selectedTheme.id,
      accentColor: selectedTheme.accentDefault || 'blue',
    };
    if (saveThemeAndSidebar) {
      saveThemeAndSidebar(updatedTheme, undefined);
    }
    setSystemSuccess(`Sidebar appearance theme updated to "${selectedTheme.name}".`);
    setTimeout(() => setSystemSuccess(''), 3000);
  };

  // Printer Management Handlers
  const handleAddPrinter = (e) => {
    e.preventDefault();
    if (!newPrinterForm.name.trim()) return;
    const newPrinter = {
      id: 'printer_' + Date.now(),
      name: newPrinterForm.name.trim(),
      type: newPrinterForm.type,
      paperWidth: Number(newPrinterForm.paperWidth) || 80,
      autoPrint: Boolean(newPrinterForm.autoPrint),
      ip: newPrinterForm.ip.trim() || '192.168.1.100',
      isDefault: (systemForm.printers || []).length === 0,
    };
    const updatedPrinters = [...(systemForm.printers || []), newPrinter];
    setSystemForm((prev) => ({ ...prev, printers: updatedPrinters }));
    setAddPrinterModal(false);
    setNewPrinterForm({ name: '', type: 'thermal_80mm', paperWidth: 80, autoPrint: true, ip: '192.168.1.205' });
  };

  const handleDeletePrinter = (id) => {
    if (!window.confirm('Are you sure you want to remove this printer?')) return;
    const updated = (systemForm.printers || []).filter((p) => p.id !== id);
    setSystemForm((prev) => ({ ...prev, printers: updated }));
  };

  const handleSetDefaultPrinter = (id) => {
    const updated = (systemForm.printers || []).map((p) => ({
      ...p,
      isDefault: p.id === id,
    }));
    setSystemForm((prev) => ({ ...prev, printers: updated }));
  };

  // Copy Catalog Link
  const handleCopyCatalogLink = () => {
    const url = `${window.location.origin}/catalog`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered Navigation Items & Roles for Visibility Matrix
  const filteredNavItems = React.useMemo(() => {
    return SIDEBAR_NAV_ITEMS.filter((item) => {
      if (!navSearch.trim()) return true;
      const query = navSearch.toLowerCase().trim();
      return (
        item.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        (item.desc && item.desc.toLowerCase().includes(query)) ||
        (item.route && item.route.toLowerCase().includes(query)) ||
        (item.submenus && item.submenus.some((s) => s.toLowerCase().includes(query)))
      );
    });
  }, [navSearch]);

  const displayedRoles = React.useMemo(() => {
    if (navRoleFilter === 'all') return MATRIX_ROLES;
    return MATRIX_ROLES.filter((r) => r.key === navRoleFilter);
  }, [navRoleFilter]);

  const roleBadgeColor = {
    admin: 'bg-brass-100 text-brass-800 border-brass-300',
    manager: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    storekeeper: 'bg-blue-50 text-blue-700 border-blue-200',
  }[user?.role || 'storekeeper'];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Modern Account & System Settings Header (Matching Screenshot) ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-ink-900">
            Account &amp; System Settings
          </h1>
          <p className="text-xs font-semibold text-ink-400 mt-1">
            Manage your personal credentials, profile identity, and {companyInfo?.companyName || 'Bloom Bar and Restaurant Café/hotel'} management configurations
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center flex-wrap">
          {/* Real-Time Functional Save Badge (Header Location) */}
          {hasUnsavedPerms && (
            <button
              type="button"
              onClick={handleSystemSubmit}
              disabled={systemSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-md hover:shadow-amber-500/25 transition active:scale-95 disabled:opacity-60 cursor-pointer animate-in fade-in"
              title="You have unsaved changes. Click to save now!"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <Save size={13} className={systemSaving ? 'animate-spin' : ''} />
              <span>{systemSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          )}

          {/* Session Timeout Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-xs">
            <Clock size={13} className="text-ink-400" />
            <span>Timeout: {timeoutMinutes > 0 ? `${timeoutMinutes}m` : 'Off'}</span>
          </div>

          {/* Active User Pill (Matching Screenshot top-right) */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 shadow-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white uppercase shadow-xs">
              {user?.name?.[0] || 'S'}
            </div>
            <div className="text-left leading-tight pr-1">
              <p className="font-bold text-ink-900 text-xs">{user?.name || 'System Developer'}</p>
              <p className="text-[10px] text-ink-400 font-semibold">{user?.role === 'developer' ? 'Dev' : user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Single Horizontal Settings Navigation Bar (Exact Match to Screenshot) ── */}
      <div className="flex border-b border-ink-200 space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar scroll-smooth bg-white px-1">
        {SETTINGS_TABS.map((tab) => {
          if (tab.devOnly && user?.role !== 'developer') return null;
          if (tab.adminOnly && !hasRole('admin') && user?.role !== 'developer') return null;
          const isActive = currentTab === tab.id || (tab.id === 'dev' && (currentTab === 'modules' || currentTab === 'appearance' || currentTab === 'sidebar'));
          const Icon = tab.icon;
          const isDevTab = tab.id === 'dev';

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${isActive
                  ? isDevTab
                    ? 'border-amber-500 text-amber-600 font-bold'
                    : 'border-blue-600 text-blue-600 font-bold'
                  : isDevTab
                    ? 'border-transparent text-amber-700 hover:text-amber-900'
                    : 'border-transparent text-ink-500 hover:text-ink-800'
                }`}
            >
              <Icon size={16} className={isDevTab ? 'text-amber-500' : isActive ? 'text-blue-600' : 'text-ink-400'} />
              <span>{tab.label}</span>
              {tab.id === 'permissions' && hasUnsavedPerms && (
                <span className="relative flex h-2 w-2" title="Unsaved changes pending">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
              {tab.badge && (
                <span className="rounded-full bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 uppercase tracking-wide border border-amber-200 shadow-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Profile ── */}
      {currentTab === 'profile' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Identity Card */}
          <Card className="lg:col-span-1 flex flex-col items-center text-center p-6">
            {/* Avatar with Photo Upload */}
            <div className="relative mb-3 group">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-3xl font-black text-white shadow-md overflow-hidden ring-4 ring-white border border-ink-100">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>

              {/* Upload Badge Button */}
              <label
                className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white transition hover:bg-blue-700 hover:scale-105 ${avatarUploading ? 'animate-pulse pointer-events-none opacity-80' : ''
                  }`}
                title="Upload profile photo"
              >
                <Camera size={15} />
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>
            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 mb-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-xs hover:bg-ink-50 hover:border-ink-300 transition">
                <Upload size={12} className="text-blue-600" />
                {avatarUploading ? 'Uploading...' : user?.avatar ? 'Change Photo' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>

              {user?.avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                  title="Remove profile photo"
                >
                  <Trash2 size={11} /> Remove
                </button>
              )}
            </div>
            <h3 className="font-display text-lg font-bold text-ink-900">{user?.name}</h3>
            <p className="text-xs text-ink-400 mt-0.5">{user?.email}</p>

            <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold capitalize ${roleBadgeColor}`}>
              {user?.role} Account
            </span>

            <div className="mt-6 w-full border-t border-ink-100 pt-4 text-left text-xs space-y-2.5 text-ink-500">
              <div className="flex justify-between">
                <span>Account Status:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span>Enterprise:</span>
                <span className="font-semibold text-ink-800">Sharp Plus</span>
              </div>
              <div className="flex justify-between">
                <span>Contact Phone:</span>
                <span className="font-semibold text-ink-800">{user?.phone || 'Not specified'}</span>
              </div>
            </div>
          </Card>
          {/* Edit Profile Form */}
          <Card className="lg:col-span-2">
            <h3 className="font-display text-base font-bold text-ink-900 mb-1">
              Personal Information
            </h3>
            <p className="text-xs text-ink-400 mb-5">
              Update your display name and email address used for sign-in and audit logs
            </p>

            {profileSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. company Admin"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Email Address (Login Account)
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+251 911 000 000"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={profileSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save size={15} /> {profileSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {/* ── Tab 2: Security & Password ── */}
      {currentTab === 'security' && (
        <div className="max-w-2xl">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                <KeyRound size={16} />
              </span>
              <h3 className="font-display text-base font-bold text-ink-900">
                Change Password
              </h3>
            </div>
            <p className="text-xs text-ink-400 mb-5">
              Ensure your account uses a secure password to protect stock transactions and sign-offs
            </p>

            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500 space-y-1">
                <p className="font-semibold text-ink-700">Security Recommendation:</p>
                <p>• Avoid reusing common passwords.</p>
                <p>• Remember that this password is also used for voucher check, approval, and receipt gates.</p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={passwordSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Lock size={15} /> {passwordSaving ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Session Inactivity Timeout Card */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
                  <Clock size={16} />
                </span>
                <h3 className="font-display text-base font-bold text-ink-900">
                  Session Inactivity &amp; Auto-Logout
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${timeoutMinutes === 0
                ? 'bg-slate-100 text-slate-600 border-slate-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {timeoutMinutes === 0 ? 'Auto-Logout: Disabled' : `Active Policy: ${timeoutMinutes} min idle`}
              </span>
            </div>
            <p className="text-xs text-ink-400 mb-5">
              Automatically logs out when idle (no mouse, typing, or touch activity) to prevent unauthorized access at storerooms, reception, or cash counters.
            </p>

            {sessionTimeoutSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 animate-in fade-in">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{sessionTimeoutSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-2">
                  Choose Inactivity Idle Timeout Duration:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TIMEOUT_OPTIONS.map((opt) => {
                    const isSelected = timeoutMinutes === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTimeoutMinutes(opt.value);
                          setSessionTimeoutSuccess(`Session timeout updated to ${opt.label}.`);
                          setTimeout(() => setSessionTimeoutSuccess(''), 3500);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                          : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50/50'
                          }`}
                      >
                        <div>
                          <p className="text-xs font-bold leading-tight">{opt.label}</p>
                          <p className="text-[10px] text-ink-400 mt-0.5">
                            {opt.value === 0
                              ? 'Remain logged in indefinitely'
                              : opt.value === 2
                                ? 'Recommended security standard'
                                : `Signs out after ${opt.value} minutes idle`}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <Shield size={14} className="text-amber-600" />
                  How Auto-Logout Protects You:
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  • 35 seconds prior to auto-logout, a warning dialog appears allowing you to extend your session with 1 click.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  • Any active keystrokes, item scanning, or navigation instantly refreshes your session timer.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab 3: company & System Config (Admin Only) ── */}
      {currentTab === 'system' && hasRole('admin') && (
        <div className="space-y-6">
          <Card className="max-w-3xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-brass-100 p-1.5 text-brass-700">
                  <Building size={16} />
                </span>
                <h3 className="font-display text-base font-bold text-ink-900">
                  company &amp; Inventory Parameters
                </h3>
              </div>
              <span className="rounded-full bg-brass-50 border border-brass-200 px-2.5 py-0.5 text-xs font-bold text-brass-800">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-ink-400 mb-6">
              Configure company branding, currency symbols, and default stock safety thresholds
            </p>

            {systemSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{systemSuccess}</span>
              </div>
            )}
            {systemError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{systemError}</span>
              </div>
            )}

            {/* Active Company Ownership Badge */}
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-indigo-900/10 border border-indigo-200/60 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 p-1 text-white font-black text-lg shadow-sm overflow-hidden">
                    <img
                      src={systemForm.companyLogo || '/logo.png'}
                      alt={systemForm.companyName || 'Company Logo'}
                      className="h-full w-full object-contain rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink-900">{systemForm.companyName}</h3>
                    <p className="text-xs text-indigo-600 font-semibold">
                      Registered Owner: {systemForm.ownerName || user?.name || 'Primary Admin'} {systemForm.ownerEmail ? `(${systemForm.ownerEmail})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={12} /> System Active
                  </span>
                  {systemForm.tinNumber && (
                    <span className="text-xs text-ink-500 font-medium">
                      TIN: <strong>{systemForm.tinNumber}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSystemSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Company / Organization Name
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      required
                      value={systemForm.companyName}
                      onChange={(e) => setSystemForm({ ...systemForm, companyName: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 font-medium"
                      placeholder="e.g. Acme Trading PLC"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Trade / Brand Name
                  </label>
                  <div className="relative">
                    <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      value={systemForm.tradeName || ''}
                      onChange={(e) => setSystemForm({ ...systemForm, tradeName: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. Acme Stores"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    TIN / Business Registration Number
                  </label>
                  <div className="relative">
                    <FileBadge2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      value={systemForm.tinNumber || ''}
                      onChange={(e) => setSystemForm({ ...systemForm, tinNumber: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. 0012345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Currency Symbol / Code
                  </label>
                  <div className="relative">
                    <Coins size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      required
                      value={systemForm.currency}
                      onChange={(e) => setSystemForm({ ...systemForm, currency: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 font-bold"
                      placeholder="ETB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Official Contact Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="email"
                      value={systemForm.systemEmail}
                      onChange={(e) => setSystemForm({ ...systemForm, systemEmail: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      placeholder="info@Sharp Plus.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Official Phone
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      value={systemForm.phone}
                      onChange={(e) => setSystemForm({ ...systemForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      placeholder="+251 911 000 111"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Physical Address / Headquarters Location
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      value={systemForm.address}
                      onChange={(e) => setSystemForm({ ...systemForm, address: e.target.value })}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Addis Ababa, Ethiopia"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    City / Region
                  </label>
                  <input
                    type="text"
                    value={systemForm.city || ''}
                    onChange={(e) => setSystemForm({ ...systemForm, city: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Addis Ababa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={systemForm.country || ''}
                    onChange={(e) => setSystemForm({ ...systemForm, country: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Ethiopia"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Company Logo URL
                  </label>
                  <input
                    type="text"
                    value={systemForm.companyLogo || ''}
                    onChange={(e) => setSystemForm({ ...systemForm, companyLogo: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="https://... or /logo.png"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Default Low Stock Safety Threshold (Units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={systemForm.lowStockThresholdDefault}
                    onChange={(e) => setSystemForm({ ...systemForm, lowStockThresholdDefault: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Applicable VAT / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={systemForm.taxRate}
                    onChange={(e) => setSystemForm({ ...systemForm, taxRate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-ink-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-ink-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemForm.autoGenerateVoucherNo}
                    onChange={(e) => setSystemForm({ ...systemForm, autoGenerateVoucherNo: e.target.checked })}
                    className="h-4 w-4 rounded border-ink-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink-900">Auto-generate Voucher Numbers</p>
                    <p className="text-[11px] text-ink-400">Automatically creates serial voucher codes (e.g. CGRV-2026-001) if left blank</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemForm.allowNegativeStock}
                    onChange={(e) => setSystemForm({ ...systemForm, allowNegativeStock: e.target.checked })}
                    className="h-4 w-4 rounded border-ink-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink-900">Permit Negative Stock Quantities</p>
                    <p className="text-[11px] text-ink-400">Allows issuing or disposing stock even when logged balance is below zero</p>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex justify-end">
                <Button type="submit" disabled={systemSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save size={15} /> {systemSaving ? 'Saving Settings…' : 'Save company Settings'}
                </Button>
              </div>
            </form>
          </Card>

          {/* ── Pricing & Cost Parameters Card ── */}
          <Card className="mt-6 max-w-3xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                  <Coins size={16} />
                </span>
                <h3 className="font-display text-base font-bold text-ink-900">Pricing &amp; Cost Parameters</h3>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">Admin Exclusive</span>
            </div>
            <p className="text-xs text-ink-400 mb-6">
              Configure contingency, overhead, food cost %, and raw material price adjustments. These are applied automatically when calculating recipe costs and suggested selling prices on all products.
            </p>

            {/* Live Preview */}
            {(() => {
              const adjType = systemForm.rawMaterialPriceAdjustType;
              const adjVal = Number(systemForm.rawMaterialPriceAdjustValue) || 0;
              const cont = Number(systemForm.contingencyPercent) || 0;
              const ovhd = Number(systemForm.overheadPercent) || 0;
              const fc = Math.max(Number(systemForm.defaultFoodCostPercent) || 30, 1);
              // Example: raw material cost = 357.90 ETB (from the screenshot)
              const exampleRaw = 357.90;
              const adjCost = adjType === 'percent'
                ? exampleRaw * (1 + adjVal / 100)
                : exampleRaw + adjVal;
              const withCont = adjCost * (1 + cont / 100);
              const total = withCont * (1 + ovhd / 100);
              const selling = total / (fc / 100);
              const fmt = (n) => `ETB ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 mb-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">Live Preview (example: {fmt(exampleRaw)} raw material cost)</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                    {[
                      { label: 'Adjusted Cost', value: fmt(adjCost), color: 'text-ink-700' },
                      { label: `+ Contingency ${cont}%`, value: fmt(withCont - adjCost), color: 'text-amber-600' },
                      { label: 'After Contingency', value: fmt(withCont), color: 'text-ink-700' },
                      { label: `+ Overhead ${ovhd}%`, value: fmt(total - withCont), color: 'text-violet-600' },
                      { label: 'Total Cost', value: fmt(total), color: 'text-ink-900 font-black' },
                      { label: `Selling @ ${fc}% FC`, value: fmt(selling), color: 'text-emerald-700 font-black' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl bg-white border border-emerald-100 px-3 py-2 text-center">
                        <p className="text-[10px] text-ink-400 mb-0.5">{label}</p>
                        <p className={`font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Selling price at all benchmarks */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[30, 35, 40, 50].map(pct => (
                      <span key={pct} className="rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                        Food cost {pct}% → Sell at {fmt(total / (pct / 100))}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSystemSubmit} className="space-y-5">
              {/* Raw Material Price Adjustment */}
              <div className="rounded-2xl border border-ink-100 bg-ink-50/30 p-4 space-y-3">
                <p className="text-xs font-bold text-ink-800">Raw Material Price Adjustment</p>
                <p className="text-[11px] text-ink-400">Apply a global adjustment to all raw material unit costs before calculating recipe costs. Use this to simulate future price increases.</p>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl border border-ink-200 overflow-hidden">
                    {[
                      { val: 'percent', label: '% Percent' },
                      { val: 'fixed', label: 'ETB Fixed' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setSystemForm(p => ({ ...p, rawMaterialPriceAdjustType: opt.val }))}
                        className={`px-4 py-2 text-xs font-semibold transition ${systemForm.rawMaterialPriceAdjustType === opt.val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-ink-600 hover:bg-ink-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 max-w-[160px]">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={systemForm.rawMaterialPriceAdjustValue}
                      onChange={e => setSystemForm(p => ({ ...p, rawMaterialPriceAdjustValue: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400">
                      {systemForm.rawMaterialPriceAdjustType === 'percent' ? '%' : 'ETB'}
                    </span>
                  </div>
                  {Number(systemForm.rawMaterialPriceAdjustValue) > 0 && (
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      {systemForm.rawMaterialPriceAdjustType === 'percent'
                        ? `+${systemForm.rawMaterialPriceAdjustValue}% on all material costs`
                        : `+ETB ${systemForm.rawMaterialPriceAdjustValue} per unit`}
                    </span>
                  )}
                </div>
              </div>

              {/* Contingency & Overhead */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">
                    Contingency % <span className="font-normal text-ink-400">(waste, spoilage, price buffer)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={systemForm.contingencyPercent}
                      onChange={e => setSystemForm(p => ({ ...p, contingencyPercent: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">%</span>
                  </div>
                  <p className="text-[10px] text-ink-400 mt-1">Added to raw material cost. Industry standard: 5–15%</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1.5">
                    Overhead % <span className="font-normal text-ink-400">(electricity, labour, equipment)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={systemForm.overheadPercent}
                      onChange={e => setSystemForm(p => ({ ...p, overheadPercent: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="25"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-500">%</span>
                  </div>
                  <p className="text-[10px] text-ink-400 mt-1">Applied after contingency. Industry standard: 20–30%</p>
                </div>
              </div>

              {/* Default Food Cost % */}
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">
                  Default Food Cost % <span className="font-normal text-ink-400">(used to calculate suggested selling price)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-48">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={systemForm.defaultFoodCostPercent}
                      onChange={e => setSystemForm(p => ({ ...p, defaultFoodCostPercent: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">%</span>
                  </div>
                  <div className="flex gap-2">
                    {[25, 30, 35, 40].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSystemForm(p => ({ ...p, defaultFoodCostPercent: pct }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${Number(systemForm.defaultFoodCostPercent) === pct
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-ink-600 border-ink-200 hover:border-emerald-400 hover:text-emerald-700'
                          }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-ink-400 mt-1">
                  If total cost = ETB 492, at 30% food cost → suggested price = ETB 1,640. Industry standard: 28–35%
                </p>
              </div>

              {systemSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                  <CheckCircle2 size={14} className="flex-shrink-0" /> {systemSuccess}
                </div>
              )}
              {systemError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0" /> {systemError}
                </div>
              )}

              {/* ── Bulk Product Selling Price Adjustment ── */}
              <div className="rounded-2xl overflow-hidden border border-blue-100">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Bulk Product Price Increase</p>
                      <p className="text-[11px] text-blue-200">Apply a % increase to all product selling prices at once</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">Permanent Action</span>
                </div>

                <div className="p-5 space-y-4 bg-blue-50/30">
                  <p className="text-xs text-ink-600">
                    Use this when your menu prices need to increase across the board — for example, a 10% price rise due to inflation.
                    This <strong>permanently updates</strong> the selling price stored on every active product.
                  </p>

                  {/* Input row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        max="500"
                        step="0.1"
                        value={bulkPricePercent}
                        onChange={e => { setBulkPricePercent(e.target.value); setBulkPriceError(''); setBulkPriceSuccess(''); }}
                        placeholder="e.g. 10"
                        className="w-36 rounded-xl border-2 border-blue-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-blue-500">%</span>
                    </div>

                    {/* Live example */}
                    {Number(bulkPricePercent) > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[100, 250, 500, 1000].map(ex => (
                          <div key={ex} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-center">
                            <p className="text-[10px] text-ink-400">ETB {ex} →</p>
                            <p className="text-xs font-black text-blue-700">
                              ETB {(ex * (1 + Number(bulkPricePercent) / 100)).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick % buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <p className="text-[11px] font-semibold text-ink-500 self-center">Quick:</p>
                    {[5, 10, 15, 20, 25].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => { setBulkPricePercent(pct); setBulkPriceError(''); }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition ${Number(bulkPricePercent) === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-ink-600 border-ink-200 hover:border-blue-400 hover:text-blue-700'
                          }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>

                  {/* Feedback */}
                  {bulkPriceSuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={14} className="flex-shrink-0" /> {bulkPriceSuccess}
                    </div>
                  )}
                  {bulkPriceError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                      <AlertCircle size={14} className="flex-shrink-0" /> {bulkPriceError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBulkPriceApply}
                    disabled={bulkPriceApplying || !Number(bulkPricePercent)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {bulkPriceApplying
                      ? <><Sparkles size={15} className="animate-spin" /> Applying…</>
                      : <><Sparkles size={15} /> Apply +{bulkPricePercent || '0'}% to All Products</>
                    }
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={systemSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save size={15} /> {systemSaving ? 'Saving…' : 'Save Pricing Settings'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Company Appearance Customizer (Controlled by Developer) */}
          {systemForm.allowAdminThemeCustomization !== false && (
            <Card className="max-w-3xl">
              <div className="flex items-center justify-between pb-4 border-b border-ink-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink-900">Company Appearance &amp; Brand Color Theme</h3>
                    <p className="text-xs text-ink-400 mt-0.5">Customize your company sidebar and branding colors</p>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                  DELEGATED TO ADMIN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {[
                  { id: 'navy', name: 'Royal Midnight Navy', description: 'Signature deep navy & sapphire blue glow', swatchBg: '#0b1528', glowBg: '#2563eb' },
                  { id: 'black', name: 'Charcoal & Onyx Slate', description: 'Ultra modern dark carbon & indigo accents', swatchBg: '#09090b', glowBg: '#6366f1' },
                  { id: 'warm', name: 'Espresso Caramel Dark', description: 'Artisan bakery dark coffee & amber highlights', swatchBg: '#1c1917', glowBg: '#d97706' },
                ].map((th) => {
                  const isSelected = activeTheme?.id === th.id || themeConfig?.theme === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => handleDevThemeSelect(th.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${isSelected
                          ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20 shadow-xs'
                          : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-20 rounded-xl relative flex items-center justify-center border border-white/10 shadow-xs" style={{ backgroundColor: th.swatchBg }}>
                            <div className="h-4 w-4 rounded-full shadow-xs" style={{ backgroundColor: th.glowBg }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5">DARK</span>
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center transition ${isSelected ? 'bg-amber-500 text-white shadow-xs' : 'border border-ink-300'}`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                        <h5 className="font-bold text-xs text-ink-900">{th.name}</h5>
                        <p className="text-[11px] text-ink-400 mt-0.5 leading-snug">{th.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Role Privileges (Exact Match to Screenshot) ── */}
      {currentTab === 'permissions' && (hasRole('admin') || user?.role === 'developer') && (
        <div className="space-y-6 w-full max-w-6xl">
          {/* Floating Functional Quick-Save Widget (Specific Fixed Bottom-Right Location) */}
          {hasUnsavedPerms && (
            <div className="fixed bottom-6 right-8 z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                type="button"
                onClick={handleSystemSubmit}
                disabled={systemSaving}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white px-5 py-3 text-xs font-black shadow-2xl hover:shadow-amber-500/30 transition-all duration-200 active:scale-95 ring-4 ring-amber-400/30 cursor-pointer"
                title="Click to save all role privileges and visibility changes permanently to database"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
                  <Save size={17} className={systemSaving ? 'animate-spin' : 'group-hover:scale-110 transition-transform'} />
                </div>
                <div className="text-left leading-tight pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-amber-100 font-bold">Unsaved Changes</span>
                  </div>
                  <p className="text-xs font-black text-white mt-0.5">
                    {systemSaving ? 'Saving to Database…' : 'Save Changes Now'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {systemSuccess && currentTab === 'permissions' && (
            <div className="sticky top-2 z-40 flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 text-white p-4 shadow-xl border border-emerald-500 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white flex-shrink-0">
                  <CheckCircle2 size={22} className="stroke-[2.5]" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-100">
                    Changes Successfully Saved &amp; Active
                  </p>
                  <p className="text-xs font-semibold text-white mt-0.5 leading-relaxed">
                    {systemSuccess}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSystemSuccess('')}
                className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition"
                title="Dismiss notice"
              >
                ✕
              </button>
            </div>
          )}

          {systemError && currentTab === 'permissions' && (
            <div className="sticky top-2 z-40 flex items-center justify-between gap-3 rounded-2xl bg-rose-600 text-white p-4 shadow-xl border border-rose-500 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white flex-shrink-0">
                  <AlertCircle size={22} className="stroke-[2.5]" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-rose-100">
                    Save Failed
                  </p>
                  <p className="text-xs font-semibold text-white mt-0.5">
                    {systemError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSystemError('')}
                className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition"
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Matrix Card */}
          <Card className="p-6 border border-ink-100 shadow-sm rounded-2xl bg-white">
            {/* Header with shield icon */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-ink-100">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                  <Shield size={22} className="stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-ink-900 tracking-tight">
                    System Roles &amp; Permissions Matrix
                  </h2>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Your current assigned role is <span className="font-bold text-ink-700">{user?.role === 'developer' ? 'Dev' : user?.role}</span>. You can modify the system permissions below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetCapabilityDefaults}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition shadow-xs"
                >
                  <RotateCcw size={13} /> Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSystemSubmit}
                  disabled={systemSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  <Save size={14} /> {systemSaving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Bulk Action Controls Bar for Capabilities */}
            <div className="mt-4 rounded-xl border border-ink-200/80 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                    <SlidersHorizontal size={13} />
                  </span>
                  <span className="text-xs font-bold text-ink-800 uppercase tracking-wide">
                    Capability Controls
                  </span>
                  <span className="text-[11px] text-ink-400">
                    (Bulk toggle role capabilities across all system roles)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAllCapabilities(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <CheckSquare size={13} className="text-blue-600" />
                    <span>All ON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllCapabilities(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <Square size={13} className="text-red-600" />
                    <span>None (OFF)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Table matching screenshot */}
            <div className="overflow-x-auto mt-4 rounded-xl border border-ink-100">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-slate-50/70 text-xs font-bold text-ink-700">
                    <th className="py-3.5 px-4 font-bold">System Capability</th>
                    {MATRIX_ROLES.map((r) => (
                      <th key={r.key} className="py-3.5 px-3 text-center font-bold">
                        <div className="flex flex-col items-center gap-1">
                          <span>{r.label}</span>
                          <div className="flex items-center gap-1 text-[10px] font-normal text-ink-400">
                            <button
                              type="button"
                              onClick={() => handleBulkToggleCapabilityRole(r.key, true)}
                              className="hover:text-blue-600 hover:underline font-bold"
                              title={`Enable all capabilities for ${r.label}`}
                            >
                              All
                            </button>
                            <span>/</span>
                            <button
                              type="button"
                              onClick={() => handleBulkToggleCapabilityRole(r.key, false)}
                              className="hover:text-red-600 hover:underline font-bold"
                              title={`Disable all capabilities for ${r.label}`}
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 text-xs text-ink-800">
                  {CAPABILITIES.map((cap) => (
                    <tr key={cap.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-ink-800 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{cap.label}</span>
                          <div className="flex items-center gap-1 text-[10px] font-bold opacity-75 hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleToggleCapabilityRow(cap.key, true)}
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                              title={`Enable ${cap.label} for all roles`}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCapabilityRow(cap.key, false)}
                              className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition"
                              title={`Disable ${cap.label} for all roles`}
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </td>
                      {MATRIX_ROLES.map((r) => {
                        const isChecked = systemForm.rolePermissions?.[cap.key]?.[r.key] !== undefined
                          ? Boolean(systemForm.rolePermissions[cap.key][r.key])
                          : (DEFAULT_CAPABILITY_DEFAULTS[cap.key]?.[r.key] ?? false);

                        return (
                          <td key={r.key} className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleCapabilityToggle(cap.key, r.key, e.target.checked)}
                              className="h-4 w-4 rounded border-ink-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition hover:border-blue-400"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save notice footer */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-400 pt-3 border-t border-ink-50">
              <p>💡 Changes made to capabilities take effect in real-time across user sessions.</p>
              <button
                type="button"
                onClick={handleSystemSubmit}
                disabled={systemSaving}
                className="self-end inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800"
              >
                <Save size={13} /> {systemSaving ? 'Saving…' : 'Quick Save Matrix'}
              </button>
            </div>
          </Card>

          {/* ── Sidebar Navigation Visibility Matrix Card (Matching Screenshot) ── */}
          <Card className="p-6 border border-ink-100 shadow-sm rounded-2xl bg-white space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-ink-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <Layers size={22} className="stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-ink-900 tracking-tight">Sidebar Navigation Visibility</h3>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Control which sidebar menu items each role can see. Unchecking a section hides it completely for that role.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetNavDefaults}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition shadow-xs"
                >
                  <RotateCcw size={13} /> Reset Defaults
                </button>
                <Button
                  type="button"
                  onClick={handleSystemSubmit}
                  disabled={systemSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-4 shadow-sm"
                >
                  <Save size={13} /> {systemSaving ? 'Saving Visibility…' : 'Save Changes'}
                </Button>
              </div>
            </div>

            {/* Visibility Bulk Controls Bar */}
            <div className="rounded-xl border border-ink-200/80 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                    <SlidersHorizontal size={13} />
                  </span>
                  <span className="text-xs font-bold text-ink-800 uppercase tracking-wide">
                    Visibility Controls
                  </span>
                  <span className="text-[11px] text-ink-400">
                    (Bulk toggle sidebar menu visibility across active roles)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAllNav(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <CheckSquare size={13} className="text-emerald-600" />
                    <span>All Visible (ON)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllNav(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <Square size={13} className="text-red-600" />
                    <span>Hide All (OFF)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-3 text-ink-400" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search sidebar menus and submenus..."
                  className="w-full rounded-xl border border-ink-200 pl-9 pr-8 py-2 text-xs outline-none focus:border-emerald-500 bg-white"
                />
                {navSearch && (
                  <button
                    type="button"
                    onClick={() => setNavSearch('')}
                    className="absolute right-2.5 top-2.5 text-xs text-ink-400 hover:text-ink-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                  <Filter size={13} className="text-ink-400" />
                  <span>Role:</span>
                </div>
                <select
                  value={navRoleFilter}
                  onChange={(e) => setNavRoleFilter(e.target.value)}
                  className="rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 bg-white outline-none focus:border-emerald-500"
                >
                  <option value="all">All Roles ({MATRIX_ROLES.length})</option>
                  {MATRIX_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-ink-100">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-ink-100 bg-slate-50/80 text-ink-700 font-bold">
                    <th className="py-3 px-4 font-bold text-[13px]">Sidebar Section</th>
                    {displayedRoles.map((r) => (
                      <th key={r.key} className="py-3 px-3 text-center font-bold text-[13px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>{r.label}</span>
                          <div className="flex items-center gap-1 text-[10px] font-normal text-ink-400">
                            <button
                              type="button"
                              onClick={() => handleSelectAllNavForRole(r.key)}
                              className="hover:text-emerald-600 hover:underline"
                            >
                              All
                            </button>
                            <span>/</span>
                            <button
                              type="button"
                              onClick={() => handleDeselectAllNavForRole(r.key)}
                              className="hover:text-red-600 hover:underline"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 text-ink-700">
                  {filteredNavItems.length === 0 ? (
                    <tr>
                      <td colSpan={displayedRoles.length + 1} className="py-8 text-center text-xs text-ink-400 italic">
                        No sidebar items match "{navSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredNavItems.map((nav) => {
                      return (
                        <tr key={nav.key} className="hover:bg-slate-50/70 transition-colors bg-white">
                          <td className="py-3.5 px-4 font-semibold text-ink-900">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] text-ink-900 font-bold">
                                    {nav.label}
                                  </span>
                                  {nav.route && (
                                    <code className="hidden sm:inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-ink-500">
                                      {nav.route}
                                    </code>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold opacity-75 hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleNavRow(nav.key, true)}
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                    title={`Make ${nav.label} visible for all roles`}
                                  >
                                    All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleNavRow(nav.key, false)}
                                    className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition"
                                    title={`Hide ${nav.label} for all roles`}
                                  >
                                    None
                                  </button>
                                </div>
                              </div>
                              {nav.desc && (
                                <p className="text-[11px] text-ink-400 font-normal leading-tight">
                                  {nav.desc}
                                </p>
                              )}
                              {nav.submenus && nav.submenus.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider mr-0.5">Controls:</span>
                                  {nav.submenus.map((sub, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-[10px] text-ink-600 font-medium"
                                    >
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          {displayedRoles.map((r) => {
                            const isChecked = getNavVisibility(nav.key, r.key);

                            return (
                              <td key={r.key} className="py-3 px-3 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleNavVisibilityToggle(nav.key, r.key, e.target.checked)}
                                  className="h-4 w-4 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition hover:border-emerald-400"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-400 border-t border-ink-50">
              <p>🔒 Parent items automatically control submenus. Unchecking a menu item immediately hides it from that role's sidebar and prevents URL navigation.</p>
              <button
                type="button"
                onClick={handleSystemSubmit}
                disabled={systemSaving}
                className="self-end inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-800"
              >
                <Save size={13} /> {systemSaving ? 'Saving…' : 'Quick Save Visibility'}
              </button>
            </div>
          </Card>

          {/* ── Upgraded 7-Action Role-Based Permission Matrix Card ── */}
          <Card className="p-6 border border-ink-100 shadow-sm rounded-2xl bg-white space-y-5">
            {/* Header with Title, Description & Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between pb-4 border-b border-ink-100 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-xs flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-ink-900">
                      CRUD Action Privileges — Role-Based Permission Matrix
                    </h3>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                      7 Actions
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Control which roles can <strong className="text-emerald-600">View</strong>, <strong className="text-blue-600">Create</strong>, <strong className="text-amber-500">Edit</strong>, <strong className="text-red-600">Delete</strong>, <strong className="text-purple-600">Approve</strong>, <strong className="text-rose-800">Reject</strong>, and <strong className="text-slate-600">Print / Export</strong> records in each module.
                  </p>
                </div>
              </div>

              {/* Quick Save & Reset Controls */}
              <div className="flex items-center gap-2.5 self-end lg:self-center">
                <button
                  type="button"
                  onClick={handleResetCrudDefaults}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 px-3.5 py-2 text-xs font-bold text-ink-600 transition shadow-xs"
                  title="Reset CRUD permissions to standard defaults"
                >
                  <RotateCcw size={13} className="text-ink-500" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleSystemSubmit}
                  disabled={systemSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{systemSaving ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            {/* Bulk Permission Controls Bar */}
            <div className="rounded-xl border border-ink-200/80 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                    <SlidersHorizontal size={13} />
                  </span>
                  <span className="text-xs font-bold text-ink-800 uppercase tracking-wide">
                    Bulk Permission Controls
                  </span>
                  <span className="text-[11px] text-ink-400">
                    (Click an action to toggle across all modules and active roles)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllCrud}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <CheckSquare size={13} className="text-blue-600" />
                    <span>Select All</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllCrud}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 px-2.5 py-1 text-[11px] font-bold text-ink-700 shadow-xs transition"
                  >
                    <Square size={13} className="text-red-600" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* 7 Action Bulk Toggles with Distinct Colors & ON/OFF Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-ink-200/60">
                {CRUD_ACTIONS.map((act) => (
                  <div
                    key={act.key}
                    className="inline-flex items-center rounded-lg border border-ink-200 bg-white overflow-hidden shadow-2xs hover:border-ink-300 transition"
                  >
                    <button
                      type="button"
                      onClick={() => handleBulkToggleAction(act.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold ${act.color} hover:bg-slate-50 transition border-r border-ink-100`}
                      title={`Toggle ${act.label} across all modules and roles`}
                    >
                      <span className={`w-2 h-2 rounded-full ${act.dot}`} />
                      <span>{act.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleAction(act.key, true)}
                      className="px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition border-r border-ink-100"
                      title={`Turn ON ${act.label} for all modules & roles`}
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleAction(act.key, false)}
                      className="px-2 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition"
                      title={`Turn OFF ${act.label} for all modules & roles`}
                    >
                      OFF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgraded 7-Action Role-Based Permission Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-ink-200 shadow-2xs max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-30 bg-white shadow-2xs">
                  {/* Top Level: Module Header & Grouped Role Headers */}
                  <tr className="border-b border-ink-200 bg-slate-100/90 text-ink-900">
                    <th
                      rowSpan={2}
                      className="sticky left-0 top-0 z-40 py-3 px-4 font-black text-xs text-ink-900 align-middle border-r-2 border-b border-ink-200 bg-slate-100 min-w-[200px] shadow-sm uppercase tracking-wider"
                    >
                      Module / Feature
                    </th>
                    {displayedRoles.map((role) => (
                      <th
                        key={role.key}
                        colSpan={7}
                        className="py-2.5 px-3 text-center font-extrabold text-xs text-ink-900 border-r-2 border-b border-ink-200 bg-slate-100/90 min-w-[480px]"
                      >
                        <div className="flex items-center justify-between px-2">
                          <span className="font-extrabold text-xs uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                            {role.label}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleBulkToggleRole(role.key, true)}
                              className="rounded px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                              title={`Check all 7 permissions for ${role.label}`}
                            >
                              ✓ All
                            </button>
                            <span className="text-ink-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleBulkToggleRole(role.key, false)}
                              className="rounded px-2 py-0.5 bg-red-50 text-red-700 hover:bg-red-100 transition"
                              title={`Uncheck all permissions for ${role.label}`}
                            >
                              ✕ None
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>

                  {/* Second Level: 7 Individual Action Headers per Role */}
                  <tr className="border-b border-ink-200 bg-slate-50 text-[10px] font-black">
                    {displayedRoles.map((role) => (
                      <React.Fragment key={role.key}>
                        {CRUD_ACTIONS.map((act) => (
                          <th
                            key={`${role.key}-${act.key}`}
                            className={`py-2 px-1 text-center font-black tracking-wider ${act.color} ${act.bg} ${
                              act.key === 'export' ? 'border-r-2 border-ink-200' : 'border-r border-ink-100'
                            }`}
                            title={`${role.label}: ${act.desc}`}
                          >
                            {act.label}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink-100 text-ink-800 bg-white">
                  {CRUD_MODULE_ROWS.map((mod) => (
                    <tr key={mod.key} className="hover:bg-blue-50/20 transition-colors">
                      {/* Sticky Left Column: Module / Feature */}
                      <td className="sticky left-0 z-20 py-3.5 px-4 font-bold text-ink-900 border-r-2 border-ink-200 bg-white whitespace-nowrap shadow-xs">
                        <div className="pr-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-ink-900 leading-tight">{mod.label}</p>
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleToggleCrudModuleRow(mod.key, true)}
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                                title={`Enable all 7 actions for ${mod.label}`}
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCrudModuleRow(mod.key, false)}
                                className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition"
                                title={`Disable all 7 actions for ${mod.label}`}
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-ink-400 font-normal leading-tight mt-0.5">{mod.desc}</p>
                        </div>
                      </td>

                      {/* 7 Permission Checkboxes per Role */}
                      {displayedRoles.map((role) => (
                        <React.Fragment key={role.key}>
                          {CRUD_ACTIONS.map((act) => (
                            <td
                              key={`${mod.key}-${role.key}-${act.key}`}
                              className={`py-3 px-1 text-center align-middle ${
                                act.key === 'export' ? 'border-r-2 border-ink-200' : 'border-r border-ink-100'
                              } hover:bg-blue-50/40 transition-colors`}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={getCrudPermission(mod.key, act.key, role.key)}
                                  onChange={(e) => handleCrudToggle(mod.key, act.key, role.key, e.target.checked)}
                                  className="h-4 w-4 rounded border-ink-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition hover:border-blue-500"
                                  title={`${mod.label} • ${role.label} • ${act.label} (${act.desc})`}
                                />
                              </div>
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Legend & Save Action Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-ink-100">
              {/* 7 Permission Actions Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>View</span> <span className="font-normal text-[11px] text-ink-500">— Read records</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Create</span> <span className="font-normal text-[11px] text-ink-500">— Add records</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Edit</span> <span className="font-normal text-[11px] text-ink-500">— Update records</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span>Delete</span> <span className="font-normal text-[11px] text-ink-500">— Remove records</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Approve</span> <span className="font-normal text-[11px] text-ink-500">— Approve vouchers</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-800" />
                  <span>Reject</span> <span className="font-normal text-[11px] text-ink-500">— Reject vouchers</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Print / Export</span> <span className="font-normal text-[11px] text-ink-500">— Export reports</span>
                </div>
              </div>

              {/* Save & Reset Buttons */}
              <div className="flex items-center gap-2.5 self-end lg:self-auto">
                <button
                  type="button"
                  onClick={handleResetCrudDefaults}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 px-3.5 py-2 text-xs font-bold text-ink-600 transition shadow-xs"
                >
                  <RotateCcw size={13} className="text-ink-500" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleSystemSubmit}
                  disabled={systemSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{systemSaving ? 'Saving…' : 'Save Role Permissions'}</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Optional Collapsible Advanced Field-Level Permissions */}
          <div className="rounded-2xl border border-ink-200 bg-white shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGranularCRUD(!showGranularCRUD)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink-900">
                    Advanced Field-Level Privileges Matrix (Approve, Post, Export)
                  </h4>
                  <p className="text-xs text-ink-400">
                    Configure specialized document approval and posting stages across user roles
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                <span>{showGranularCRUD ? 'Collapse' : 'Expand Advanced Matrix'}</span>
                {showGranularCRUD ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showGranularCRUD && (
              <div className="p-4 border-t border-ink-100 bg-white">
                <RolePrivilegesManager />
              </div>
            )}
          </div>

          {systemSuccess && currentTab === 'permissions' && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 shadow-xs">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{systemSuccess}</span>
            </div>
          )}
          {systemError && currentTab === 'permissions' && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-800 shadow-xs">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>{systemError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 5: Telegram Subscribers (Admin only) ── */}
      {currentTab === 'telegram' && hasRole('admin') && (
        <Card className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                <Send size={16} />
              </span>
              <div>
                <h3 className="font-bold text-base text-ink-900">Telegram Bot Subscribers</h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  Everyone who started <strong>@Sharp PlusBot</strong> and receives notifications
                </p>
              </div>
            </div>
            <button
              onClick={loadTgSubscribers}
              disabled={tgLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition"
            >
              {tgLoading ? 'Loading…' : '↻ Refresh'}
            </button>
            <button
              onClick={() => { setTgAddOpen(true); setTgError(''); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition"
            >
              + Add Manually
            </button>
          </div>

          {/* How to add people */}
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <p className="font-bold mb-1">📢 How to add someone</p>
            <p>1. Share <strong>t.me/Sharp PlusBot</strong> — they tap Start to subscribe.</p>
            <p className="mt-0.5">2. Come back here and click <strong>"Register Phone"</strong> next to their name.</p>
            <p className="mt-0.5 text-blue-600">Only subscribers with a registered phone can receive OTP login codes.</p>
          </div>

          {tgSuccess && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              {tgSuccess}
            </div>
          )}
          {tgError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
              <AlertCircle size={15} className="flex-shrink-0" />
              {tgError}
            </div>
          )}

          {/* Subscriber list */}
          {tgLoading ? (
            <div className="py-8 text-center text-xs text-ink-400">Loading subscribers…</div>
          ) : tgSubscribers.length === 0 ? (
            <div className="py-8 text-center">
              <Send size={28} className="mx-auto mb-2 text-ink-200" />
              <p className="text-sm font-semibold text-ink-400">No subscribers yet</p>
              <p className="text-xs text-ink-300 mt-1">Share t.me/Sharp PlusBot to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible rounded-xl border border-ink-100 min-h-[180px]">
              <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>
                  <tr>
                    {['#', 'Name', 'Username', 'Phone (OTP)', 'Subscribed At', 'Action'].map((h, idx) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-blue-100 ${
                          idx === 5 ? 'text-right' : 'text-left'
                        }`}
                        style={{ borderBottom: '1px solid rgba(147,197,253,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tgSubscribers.map((sub, i) => (
                    <tr
                      key={sub.chatId}
                      className={`hover:bg-ink-50/40 ${activeActionMenu === sub.chatId ? 'relative z-20 bg-blue-50/20' : ''}`}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td className="px-4 py-3 text-xs text-ink-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ink-800">{sub.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-blue-600">
                        {sub.username ? `@${sub.username}` : '—'}
                      </td>

                      {/* Phone column with inline register/edit */}
                      <td className="px-4 py-3 min-w-[180px]">
                        {tgEditPhone === sub.chatId ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="tel"
                              value={tgPhoneVal}
                              onChange={e => setTgPhoneVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRegisterPhone(sub.chatId);
                                if (e.key === 'Escape') { setTgEditPhone(null); setTgPhoneVal(''); }
                              }}
                              placeholder="e.g. 0912627366"
                              autoFocus
                              className="w-32 rounded-lg border border-blue-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleRegisterPhone(sub.chatId)}
                              disabled={tgPhoneSaving}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-2 py-1 text-[10px] font-bold text-white transition disabled:opacity-50"
                            >
                              {tgPhoneSaving ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setTgEditPhone(null); setTgPhoneVal(''); }}
                              className="text-ink-400 hover:text-ink-600 text-xs"
                            >✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {sub.phone ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                ✅ {sub.phone}
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-300 italic">Not registered</span>
                            )}
                            <button
                              onClick={() => { setTgEditPhone(sub.chatId); setTgPhoneVal(sub.phone || ''); setTgError(''); }}
                              className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 hover:underline"
                            >
                              {sub.phone ? 'Edit' : '+ Register'}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">
                        {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenu(activeActionMenu === sub.chatId ? null : sub.chatId);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white hover:bg-blue-50/50 hover:border-blue-400 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <span>Action</span>
                            <ChevronDown
                              size={13}
                              className={`text-ink-400 transition-transform duration-150 ${activeActionMenu === sub.chatId ? 'rotate-180 text-blue-600' : ''}`}
                            />
                          </button>

                          {activeActionMenu === sub.chatId && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 z-50 mt-1.5 w-52 rounded-xl border border-ink-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 text-left"
                            >
                              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 border-b border-ink-100 mb-1">
                                Action Menu
                              </div>

                              {/* 1. Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(sub)}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-ink-700 hover:bg-blue-50 hover:text-blue-700 transition"
                              >
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                  <Pencil size={13} />
                                </div>
                                <div>
                                  <div className="font-bold text-ink-900">Edit Details</div>
                                  <div className="text-[10px] text-ink-400">Name, username &amp; phone</div>
                                </div>
                              </button>

                              {/* 2. Remove */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handleRemoveTgSubscriber(sub.chatId, sub.name);
                                }}
                                disabled={tgRemoving === sub.chatId}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
                              >
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                  <UserX size={13} />
                                </div>
                                <div>
                                  <div className="font-bold text-amber-900">Remove</div>
                                  <div className="text-[10px] text-amber-700/70">Unsubscribe from bot</div>
                                </div>
                              </button>

                              <div className="my-1 border-t border-ink-100" />

                              {/* 3. Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handleDeleteSubscriber(sub.chatId, sub.name);
                                }}
                                disabled={tgRemoving === sub.chatId}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition"
                              >
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                  <Trash2 size={13} />
                                </div>
                                <div>
                                  <div className="font-bold text-red-700">Delete</div>
                                  <div className="text-[10px] text-red-500/70">Permanently delete record</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-ink-100 px-4 py-2 text-xs text-ink-400">
                {tgSubscribers.length} subscriber{tgSubscribers.length !== 1 ? 's' : ''} total
                {' · '}
                {tgSubscribers.filter(s => s.phone).length} with registered phone
              </div>
            </div>
          )}

          {/* ── Add Subscriber Modal ── */}
          {tgAddOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                  <h3 className="font-bold text-ink-900">Add Subscriber Manually</h3>
                  <button onClick={() => setTgAddOpen(false)} className="text-ink-400 hover:text-ink-700 text-lg font-bold">✕</button>
                </div>
                <form onSubmit={handleAddSubscriber} className="p-5 space-y-3">
                  <p className="text-xs text-ink-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    Add a person who hasn't messaged the bot yet. They can still receive OTP codes if their phone is registered. To also receive system notifications, they need to message <strong>@Sharp PlusBot</strong>.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Full Name *</label>
                    <input required value={tgAddForm.name}
                      onChange={e => setTgAddForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Anteneh Bekele"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Phone Number * <span className="text-blue-600">(used for OTP login)</span></label>
                    <input required type="tel" value={tgAddForm.phone}
                      onChange={e => setTgAddForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. 0911000000"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Telegram Username <span className="text-ink-400">(optional, without @)</span></label>
                    <input value={tgAddForm.username}
                      onChange={e => setTgAddForm(f => ({ ...f, username: e.target.value.replace(/^@/, '') }))}
                      placeholder="e.g. anteneh21"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Telegram Chat ID <span className="text-ink-400">(optional — needed for notifications)</span></label>
                    <input value={tgAddForm.chatId}
                      onChange={e => setTgAddForm(f => ({ ...f, chatId: e.target.value }))}
                      placeholder="e.g. 1234567890"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    <p className="mt-1 text-[10px] text-ink-400">To get their Chat ID: have them message @Sharp PlusBot, then you'll see them appear in this list with their ID.</p>
                  </div>

                  {tgError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
                      ⚠ {tgError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setTgAddOpen(false)}
                      className="rounded-lg border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={tgAddSaving}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50">
                      {tgAddSaving ? 'Adding…' : 'Add Subscriber'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Edit Subscriber Modal ── */}
          {tgEditModalSub && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-ink-100 overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                      <Pencil size={15} />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink-900 text-sm">Edit Telegram Subscriber</h3>
                      <p className="text-[11px] text-ink-500">Update subscriber details and OTP phone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setTgEditModalSub(null); setTgError(''); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-white hover:text-ink-700 text-base font-bold transition"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUpdateSubscriber} className="p-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={tgEditForm.name}
                      onChange={e => setTgEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Gedamu Waleigh"
                      className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Phone Number * <span className="text-blue-600 font-normal">(used for OTP verification)</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={tgEditForm.phone}
                      onChange={e => setTgEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. 0912627366"
                      className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Telegram Username <span className="text-ink-400 font-normal">(without @)</span>
                    </label>
                    <input
                      type="text"
                      value={tgEditForm.username}
                      onChange={e => setTgEditForm(f => ({ ...f, username: e.target.value.replace(/^@/, '') }))}
                      placeholder="e.g. GreatestValue"
                      className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="rounded-xl bg-ink-50 p-3 border border-ink-200/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-ink-500">Telegram Chat ID:</span>
                      <span className="font-mono text-ink-700 font-bold">{tgEditModalSub.chatId || '—'}</span>
                    </div>
                    {tgEditModalSub.subscribedAt && (
                      <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-ink-200/50">
                        <span className="font-semibold text-ink-500">Subscribed At:</span>
                        <span className="text-ink-600">{new Date(tgEditModalSub.subscribedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {tgError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{tgError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => { setTgEditModalSub(null); setTgError(''); }}
                      className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={tgEditSaving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-xs"
                    >
                      <Save size={14} />
                      {tgEditSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Order Printers ── */}
      {currentTab === 'printers' && (hasRole('admin') || user?.role === 'developer') && (
        <div className="space-y-6 w-full max-w-5xl">
          <Card className="p-6 border border-ink-100 shadow-sm rounded-2xl bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ink-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900">Order &amp; POS Receipt Printers</h3>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Configure thermal receipt slips, kitchen/counter ticket routing, and office A4 vouchers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setAddPrinterModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3"
                >
                  <Plus size={14} /> Add Printer
                </Button>
                <Button
                  type="button"
                  onClick={handleSystemSubmit}
                  disabled={systemSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3.5"
                >
                  <Save size={13} /> {systemSaving ? 'Saving…' : 'Save Printers'}
                </Button>
              </div>
            </div>

            {/* Printers Grid */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(systemForm.printers || []).map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border-2 transition-all ${p.isDefault ? 'border-blue-500 bg-blue-50/20' : 'border-ink-100 bg-white hover:border-ink-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Printer size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-ink-900 text-sm flex items-center gap-2">
                          {p.name}
                          {p.isDefault && (
                            <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 uppercase tracking-wide">
                              Default
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-ink-400">
                          {p.type === 'thermal_80mm' ? '80mm ESC/POS Thermal' : p.type === 'thermal_58mm' ? '58mm ESC/POS Thermal' : 'Standard A4 Laser / Inkjet'} • {p.paperWidth}mm width
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePrinter(p.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Delete Printer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-ink-500 font-medium">
                      <span>IP / Host:</span>
                      <code className="text-ink-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">{p.ip || '127.0.0.1'}</code>
                    </div>

                    <div className="flex items-center gap-2">
                      {!p.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultPrinter(p.id)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTestSlipModal(p)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 text-xs font-bold transition"
                      >
                        <Receipt size={13} /> Print Test Slip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-blue-600 flex-shrink-0" />
                <span>Thermal receipt printing directly handles over-the-counter Cash Sales and GRV Receiving slips.</span>
              </div>
              <button
                type="button"
                onClick={() => setTestSlipModal(systemForm.printers?.[0] || DEFAULT_PRINTERS[0])}
                className="font-bold underline text-blue-700 hover:text-blue-900 shrink-0 ml-3"
              >
                Simulate 80mm Slip
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Developer Controls [OWNER] (Exact Match to Screenshots) ── */}
      {(currentTab === 'dev' || currentTab === 'modules' || currentTab === 'appearance' || currentTab === 'sidebar') && user?.role === 'developer' && (
        <div className="space-y-6 w-full max-w-6xl">
          {/* Main Developer / System Owner Controls Card */}
          <Card className="p-6 border border-ink-100 shadow-sm rounded-2xl bg-white space-y-6">
            {/* Header with Gold squircle lock icon and OWNER ONLY badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ink-100 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm flex-shrink-0">
                  <Lock size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg font-black text-ink-900">
                      Developer / System Owner Controls
                    </h3>
                    <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wide border border-amber-200">
                      OWNER ONLY
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Manage module licensing, lock/unlock restaurant subsystem per customer installation.
                  </p>
                </div>
              </div>

              {/* Developer badge */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <Sparkles size={14} className="text-amber-600" />
                <span>Dev Master Licensing</span>
              </div>
            </div>

            {/* Warning / Security Notice Box */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>⚠ Developer Security Area:</strong> Modules disabled here (Subsystem Suite, Finance &amp; Expenses, or Company Appearance Customizer) are locked and hidden across all Company accounts including Admin. Only users with the Developer (dev) role can re-enable or manage them.
              </div>
            </div>

            {/* ── Section 1: Module & Interface Licensing ── */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-ink-900 font-bold text-sm">
                  <SlidersHorizontal size={16} className="text-amber-600" />
                  <span>Module &amp; Interface Licensing</span>
                </div>
                <p className="text-xs text-ink-400">
                  Enable or disable premium Company modules and interface privileges per customer installation. Changes apply immediately across all devices.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Subsystem Suite (Restaurant POS & Ordering) */}
                {(() => {
                  const isLicensed = systemForm.modulesEnabled?.salesMarketing !== false;
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Subsystem Suite (Restaurant POS &amp; Ordering)
                          </h4>
                          {isLicensed ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 border border-purple-200">
                              LICENSED &amp; ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              LOCKED / HIDDEN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          POS Ordering, Captain Order, and Cash Sales. When off, completely hidden from non-developers.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isLicensed}
                        onClick={() => handleDevModuleToggle('salesMarketing', !isLicensed)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLicensed ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isLicensed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* 2. Digital Menu Suite (Customer QR & Self-Ordering) */}
                {(() => {
                  const isLicensed = systemForm.digitalMenuEnabled !== false && systemForm.modulesEnabled?.digitalMenu !== false;
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Digital Menu Suite (Customer QR &amp; Self-Ordering)
                          </h4>
                          {isLicensed ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 border border-purple-200">
                              LICENSED &amp; ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              LOCKED / HIDDEN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          Customer Digital Menu, QR Table self-ordering, interactive live tracker, and customer reviews. Can be licensed and sold as an independent subsystem.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isLicensed}
                        onClick={() => handleDevModuleToggle('digitalMenu', !isLicensed)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLicensed ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isLicensed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* 3. Finance & Expenses Suite */}
                {(() => {
                  const isLicensed = systemForm.modulesEnabled?.accounting !== false;
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Finance &amp; Expenses Suite
                          </h4>
                          {isLicensed ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 border border-purple-200">
                              LICENSED &amp; ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              LOCKED / HIDDEN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          Overhead Expenses &amp; Analytics P&amp;L reports. When disabled, completely hidden and locked from non-developer Company accounts.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isLicensed}
                        onClick={() => handleDevModuleToggle('accounting', !isLicensed)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLicensed ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isLicensed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* 4. Inventory & Items Suite (Raw Materials & Products) */}
                {(() => {
                  const isLicensed = systemForm.modulesEnabled?.items !== false;
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Inventory &amp; Items Suite (Raw Materials &amp; Products)
                          </h4>
                          {isLicensed ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 border border-purple-200">
                              LICENSED &amp; ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              LOCKED / HIDDEN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          Raw Materials, Products catalog, unit conversions, and stock valuation. When off, completely hidden from non-developers.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isLicensed}
                        onClick={() => handleDevModuleToggle('items', !isLicensed)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLicensed ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isLicensed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* 5. Allow Company Admin Theme & Icon Customization */}
                {(() => {
                  const isAllowed = systemForm.allowAdminThemeCustomization !== false;
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Allow Company Admin Theme &amp; Icon Customization
                          </h4>
                          {isAllowed ? (
                            <span className="rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                              ALLOWED (VISIBLE TO ADMIN)
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              RESTRICTED / HIDDEN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          When active, Company Admin can change sidebar themes and icon modes in System Settings. When disabled, the entire Appearance card disappears from Company Settings and is controlled exclusively by the developer.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isAllowed}
                        onClick={() => handleDevAdminThemeToggle(!isAllowed)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAllowed ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isAllowed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}

                {/* 6. Modern Material UI Icons Mode */}
                {(() => {
                  const isMaterial = themeConfig?.iconLibrary === 'material' || Boolean(themeConfig?.colorfulIcons);
                  return (
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-white hover:border-ink-200 transition">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-ink-900">
                            Modern Material UI Icons Mode
                          </h4>
                          {isMaterial ? (
                            <span className="rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-200">
                              MODERN MATERIAL (ON)
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border border-slate-200">
                              CLASSIC CLEAN (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400 leading-normal">
                          OFF: Displays classic minimalist icons without colorful squircle boxes (for customers who prefer the original layout).
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isMaterial}
                        onClick={() => handleDevIconModeToggle(!isMaterial)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isMaterial ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isMaterial ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── Section 2: Sidebar Appearance & Brand Color Theme (Exact Match to Screenshot 2) ── */}
            <div className="space-y-3 pt-4 border-t border-ink-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-ink-900 font-bold text-sm">
                  <Palette size={16} className="text-amber-600" />
                  <span>Sidebar Appearance &amp; Brand Color Theme</span>
                </div>
                <p className="text-xs text-ink-400">
                  Configure the Company sidebar color palette to match the customer brand identity.
                </p>
              </div>

              {/* 3 Theme Cards matching Screenshot 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                  {
                    id: 'navy',
                    name: 'Royal Midnight Navy',
                    description: 'Signature deep navy & sapphire blue glow',
                    swatchBg: '#0b1528',
                    glowBg: '#2563eb',
                  },
                  {
                    id: 'black',
                    name: 'Charcoal & Onyx Slate',
                    description: 'Ultra modern dark carbon & indigo accents',
                    swatchBg: '#09090b',
                    glowBg: '#6366f1',
                  },
                  {
                    id: 'warm',
                    name: 'Espresso Caramel Dark',
                    description: 'Artisan bakery dark coffee & amber highlights',
                    swatchBg: '#1c1917',
                    glowBg: '#d97706',
                  },
                ].map((th) => {
                  const isSelected = activeTheme?.id === th.id || themeConfig?.theme === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => handleDevThemeSelect(th.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${isSelected
                          ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20 shadow-xs'
                          : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          {/* Color preview swatch with center circle */}
                          <div
                            className="h-10 w-20 rounded-xl relative flex items-center justify-center border border-white/10 shadow-xs"
                            style={{ backgroundColor: th.swatchBg }}
                          >
                            <div
                              className="h-4 w-4 rounded-full shadow-xs"
                              style={{ backgroundColor: th.glowBg }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5">
                              DARK
                            </span>
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center transition ${isSelected ? 'bg-amber-500 text-white shadow-xs' : 'border border-ink-300'
                                }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>

                        <h5 className="font-bold text-xs text-ink-900">{th.name}</h5>
                        <p className="text-[11px] text-ink-400 mt-0.5 leading-snug">{th.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section 3: Administrator Authority Delegation ── */}
            <div className="space-y-3 pt-4 border-t border-ink-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-ink-900 font-bold text-sm">
                  <Shield size={16} className="text-amber-600" />
                  <span>Administrator Authority Delegation</span>
                </div>
                <p className="text-xs text-ink-400">
                  Grant or revoke special administrative privileges to the System Administrator role.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-slate-50/50">
                  <div className="space-y-0.5 pr-4">
                    <h5 className="font-bold text-xs text-ink-900">Grant Admin Role Permission Management Authority</h5>
                    <p className="text-[11px] text-ink-400">Allow System Administrator to view and adjust employee capabilities</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(systemForm.allowAdminManagePermissions)}
                    onChange={(e) => setSystemForm({ ...systemForm, allowAdminManagePermissions: e.target.checked })}
                    className="h-5 w-5 rounded border-ink-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-ink-100 bg-slate-50/50">
                  <div className="space-y-0.5 pr-4">
                    <h5 className="font-bold text-xs text-ink-900">Grant Admin Transaction Void &amp; Delete Authority</h5>
                    <p className="text-[11px] text-ink-400">Allow System Administrator to void or reverse inventory and sales vouchers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(systemForm.allowAdminVoidDelete)}
                    onChange={(e) => setSystemForm({ ...systemForm, allowAdminVoidDelete: e.target.checked })}
                    className="h-5 w-5 rounded border-ink-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-ink-100">
              <div className="flex items-center gap-2 text-xs text-ink-500 font-semibold">
                <Sparkles size={14} className="text-amber-600" />
                <span>Changes apply live across all devices and persist permanently in the database.</span>
              </div>

              <button
                type="button"
                onClick={handleSystemSubmit}
                disabled={systemSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition active:scale-[0.98] disabled:opacity-50 self-end sm:self-auto"
              >
                <Save size={15} />
                {systemSaving ? 'Saving…' : 'Save Developer Configurations'}
              </button>
            </div>
          </Card>

          {/* Optional Collapsible Advanced Enterprise Tools */}
          <div className="rounded-2xl border border-ink-200 bg-white shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGranularCRUD(!showGranularCRUD)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink-900">
                    Full Enterprise Module Catalog &amp; Advanced Theme Studio
                  </h4>
                  <p className="text-xs text-ink-400">
                    Access detailed granular sub-module configurations and deep custom theme options
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                <span>{showGranularCRUD ? 'Collapse' : 'Expand Advanced Studio'}</span>
                {showGranularCRUD ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showGranularCRUD && (
              <div className="p-4 border-t border-ink-100 bg-white space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-ink-900 mb-2">Advanced Theme Studio</h4>
                  <SidebarThemeSettings />
                </div>
                <div className="border-t border-ink-100 pt-6">
                  <h4 className="text-sm font-bold text-ink-900 mb-2">12-Module Enterprise Catalog</h4>
                  <ModuleManagement />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Test Slip Modal ── */}
      {testSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-ink-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Receipt size={16} />
                <span className="font-bold text-xs">Simulated POS Slip • {testSlipModal.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestSlipModal(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 font-mono text-[12px] bg-amber-50/30 text-ink-900 space-y-2 border-b border-ink-100">
              <div className="text-center font-bold pb-2 border-b border-dashed border-ink-300">
                <p className="text-sm">SHARP PLUS TRADING PLC</p>
                <p className="text-[10px] text-ink-500 font-sans">Stock Control &amp; Trade Inventory</p>
                <p className="text-[10px] text-ink-400 font-sans">Addis Ababa, Ethiopia</p>
              </div>

              <div className="text-[11px] space-y-0.5 text-ink-600">
                <div className="flex justify-between">
                  <span>RECEIPT NO:</span>
                  <span className="font-bold text-ink-900">TEST-RCP-0841</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{user?.name || 'Dev Operator'}</span>
                </div>
              </div>

              <div className="py-2 border-t border-b border-dashed border-ink-300 text-[11px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>1x Industrial Valve</span>
                  <span>450.00 ETB</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>2x Fitting Connector</span>
                  <span>240.00 ETB</span>
                </div>
              </div>

              <div className="text-[11px] space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>690.00 ETB</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({systemForm.taxRate}%):</span>
                  <span>{((690 * Number(systemForm.taxRate || 15)) / 100).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between font-black text-[13px] pt-1 text-blue-700">
                  <span>TOTAL:</span>
                  <span>{(690 + (690 * Number(systemForm.taxRate || 15)) / 100).toFixed(2)} ETB</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-ink-400 border-t border-dashed border-ink-300">
                <p>Hardware Communication: SUCCESS</p>
                <p>ESC/POS 80mm Thermal Emulation OK</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTestSlipModal(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Printer size={13} /> Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Printer Modal ── */}
      {addPrinterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-ink-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-bold text-ink-900 text-base">Add New Printer</h3>
              <button
                type="button"
                onClick={() => setAddPrinterModal(false)}
                className="text-ink-400 hover:text-ink-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPrinter} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Printer Name *</label>
                <input
                  required
                  value={newPrinterForm.name}
                  onChange={(e) => setNewPrinterForm({ ...newPrinterForm, name: e.target.value })}
                  placeholder="e.g. Sales Counter Thermal 80mm"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Printer Type *</label>
                <select
                  value={newPrinterForm.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const paperWidth = type === 'thermal_80mm' ? 80 : type === 'thermal_58mm' ? 58 : 210;
                    setNewPrinterForm({ ...newPrinterForm, type, paperWidth });
                  }}
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="thermal_80mm">Thermal POS (80mm ESC/POS)</option>
                  <option value="thermal_58mm">Thermal POS (58mm ESC/POS)</option>
                  <option value="standard_a4">Standard A4 Laser / Inkjet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">IP Address / Network Host</label>
                <input
                  value={newPrinterForm.ip}
                  onChange={(e) => setNewPrinterForm({ ...newPrinterForm, ip: e.target.value })}
                  placeholder="e.g. 192.168.1.200"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newPrinterForm.autoPrint}
                  onChange={(e) => setNewPrinterForm({ ...newPrinterForm, autoPrint: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-ink-700">Auto-cut and print slip on completed sale</span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddPrinterModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Add Printer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
