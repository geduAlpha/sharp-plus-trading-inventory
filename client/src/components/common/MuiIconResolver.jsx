import React from 'react';
// Material UI Icons
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import FolderRounded from '@mui/icons-material/FolderRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import RestaurantMenuRounded from '@mui/icons-material/RestaurantMenuRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import AllInboxRounded from '@mui/icons-material/AllInboxRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import LocalCafeRounded from '@mui/icons-material/LocalCafeRounded';
import CallSplitRounded from '@mui/icons-material/CallSplitRounded';
import PointOfSaleRounded from '@mui/icons-material/PointOfSaleRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import BarChartRounded from '@mui/icons-material/BarChartRounded';
import BalanceRounded from '@mui/icons-material/BalanceRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import TodayRounded from '@mui/icons-material/TodayRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import MonetizationOnRounded from '@mui/icons-material/MonetizationOnRounded';
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import PrecisionManufacturingRounded from '@mui/icons-material/PrecisionManufacturingRounded';
import WarehouseRounded from '@mui/icons-material/WarehouseRounded';
import PieChartRounded from '@mui/icons-material/PieChartRounded';
import QueryStatsRounded from '@mui/icons-material/QueryStatsRounded';
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import EmailRounded from '@mui/icons-material/EmailRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import LayersRounded from '@mui/icons-material/LayersRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import BusinessRounded from '@mui/icons-material/BusinessRounded';
import ListAltRounded from '@mui/icons-material/ListAltRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded';

// Lucide and extended icon library mappings
import {
  LayoutDashboard, FolderOpen, Boxes, UtensilsCrossed, UserCog,
  Truck, TrendingUp, TrendingDown, PackageOpen, ArrowLeftRight,
  ShoppingBag, CreditCard, Flame, UploadCloud, Coffee, SendToBack,
  BadgeDollarSign, Banknote, FileBarChart, BarChart2, Scale,
  ClipboardList, Calendar, Package, ShoppingCart, Users,
  Settings as SettingsLucide, Trash2, HelpCircle, Building2,
  ShieldAlert, Sliders, Palette, Sparkles, Database, FileText,
  Activity, Tag, ShieldCheck, LifeBuoy, Bell, Archive, RefreshCw,
  Layers, Compass, Globe, HeartHandshake, Award, KeyRound
} from 'lucide-react';

export const MUI_ICON_MAP = {
  // Navigation & Core
  DashboardRounded,
  DashboardOutlined,
  FolderRounded,
  BusinessRounded,
  LayersRounded,
  HistoryRounded,
  AutoAwesomeRounded,

  // Inventory & Products
  Inventory2Rounded,
  RestaurantMenuRounded,
  CategoryRounded,
  AllInboxRounded,
  PrecisionManufacturingRounded,
  WarehouseRounded,
  StorefrontRounded,

  // Stock Movements & Operations
  SwapHorizRounded,
  AddCircleOutlineRounded,
  RemoveCircleOutlineRounded,
  LocalFireDepartmentRounded,
  CloudUploadRounded,
  LocalCafeRounded,
  CallSplitRounded,
  ListAltRounded,
  QrCode2Rounded,

  // Sales & Finance
  PointOfSaleRounded,
  PaymentsRounded,
  ReceiptLongRounded,
  MonetizationOnRounded,
  AccountBalanceWalletRounded,
  ShoppingBagRounded,
  CreditCardRounded,
  ShoppingCartRounded,

  // Reports & Analytics
  AssessmentRounded,
  BarChartRounded,
  PieChartRounded,
  QueryStatsRounded,
  BalanceRounded,
  FactCheckRounded,
  TodayRounded,
  TrendingUpRounded,
  TrendingDownRounded,

  // People & Admin
  BadgeRounded,
  LocalShippingRounded,
  GroupRounded,
  ManageAccountsRounded,
  AdminPanelSettingsRounded,
  SettingsRounded,
  SecurityRounded,
  ShieldRounded,
  TuneRounded,
  DeleteOutlineRounded,
  NotificationsRounded,
  SendRounded,
  EmailRounded,
  SupportAgentRounded,
};

export const AVAILABLE_ICON_LIBRARIES = [
  { id: 'all', label: 'All Libraries' },
  { id: 'material', label: 'Google Material Symbols' },
  { id: 'lucide', label: 'Lucide Icons' },
  { id: 'tabler', label: 'Tabler Icons' },
  { id: 'iconoir', label: 'Iconoir' },
  { id: 'fontawesome', label: 'Font Awesome' },
];

// Available icons catalog for the Settings icon picker with multi-library prioritization
export const AVAILABLE_MUI_ICONS = [
  // Google Material Symbols / MUI
  { key: 'DashboardRounded', label: 'Dashboard Grid', category: 'Core', library: 'material', style: 'rounded' },
  { key: 'DashboardOutlined', label: 'Dashboard Outline', category: 'Core', library: 'material', style: 'outlined' },
  { key: 'BusinessRounded', label: 'Organization / Company', category: 'Core', library: 'material', style: 'rounded' },
  { key: 'FolderRounded', label: 'Folder / Collection', category: 'Core', library: 'material', style: 'rounded' },
  { key: 'LayersRounded', label: 'Multi-Layers', category: 'Core', library: 'material', style: 'rounded' },
  { key: 'AutoAwesomeRounded', label: 'Sparkles / AI', category: 'Core', library: 'material', style: 'rounded' },

  { key: 'Inventory2Rounded', label: 'Inventory Box', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'AllInboxRounded', label: 'All Inboxes', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'CategoryRounded', label: 'Categories / Classification', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'RestaurantMenuRounded', label: 'Menu & Recipes', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'PrecisionManufacturingRounded', label: 'Manufacturing / Production', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'WarehouseRounded', label: 'Warehouse Storage', category: 'Inventory', library: 'material', style: 'rounded' },
  { key: 'StorefrontRounded', label: 'Storefront / Retail', category: 'Inventory', library: 'material', style: 'rounded' },

  { key: 'SwapHorizRounded', label: 'Stock Movements', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'AddCircleOutlineRounded', label: 'Positive Adjustment', category: 'Operations', library: 'material', style: 'outlined' },
  { key: 'RemoveCircleOutlineRounded', label: 'Negative Adjustment', category: 'Operations', library: 'material', style: 'outlined' },
  { key: 'LocalFireDepartmentRounded', label: 'Disposal / Scrap', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'CloudUploadRounded', label: 'Sales Import', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'LocalCafeRounded', label: 'Consumption', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'CallSplitRounded', label: 'Stock Dispatch & Split', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'ListAltRounded', label: 'Order List', category: 'Operations', library: 'material', style: 'rounded' },
  { key: 'QrCode2Rounded', label: 'QR & Barcode Scan', category: 'Operations', library: 'material', style: 'rounded' },

  { key: 'PointOfSaleRounded', label: 'POS Terminal', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'PaymentsRounded', label: 'Cash Payments', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'ReceiptLongRounded', label: 'Credit Sales Receipt', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'MonetizationOnRounded', label: 'Revenue / Coins', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'AccountBalanceWalletRounded', label: 'Wallet / Funds', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'ShoppingBagRounded', label: 'Shopping Bag', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'CreditCardRounded', label: 'Credit Card', category: 'Sales', library: 'material', style: 'rounded' },
  { key: 'ShoppingCartRounded', label: 'Purchases Cart', category: 'Sales', library: 'material', style: 'rounded' },

  { key: 'AssessmentRounded', label: 'Assessment Report', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'BarChartRounded', label: 'Bar Analytics', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'PieChartRounded', label: 'Pie Breakdown', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'QueryStatsRounded', label: 'Query Stats & P&L', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'BalanceRounded', label: 'Stock Balance Sheet', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'FactCheckRounded', label: 'Inventory Count', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'TodayRounded', label: 'Daily Reports', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'TrendingUpRounded', label: 'Growth / Uptrend', category: 'Analytics', library: 'material', style: 'rounded' },
  { key: 'TrendingDownRounded', label: 'Downtrend', category: 'Analytics', library: 'material', style: 'rounded' },

  { key: 'BadgeRounded', label: 'Staff Badge', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'LocalShippingRounded', label: 'Suppliers / Freight', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'GroupRounded', label: 'Users & Staff', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'ManageAccountsRounded', label: 'Account Controls', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'AdminPanelSettingsRounded', label: 'Admin Security', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'SettingsRounded', label: 'Settings Gear', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'TuneRounded', label: 'Tuning & Options', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'SecurityRounded', label: 'Security Lock', category: 'Management', library: 'material', style: 'rounded' },
  { key: 'DeleteOutlineRounded', label: 'Recycle Bin', category: 'Management', library: 'material', style: 'outlined' },
  { key: 'SupportAgentRounded', label: 'Support Agent', category: 'Management', library: 'material', style: 'rounded' },

  // Lucide Icons
  { key: 'LayoutDashboard', label: 'Lucide Dashboard Grid', category: 'Core', library: 'lucide', style: 'outlined' },
  { key: 'Boxes', label: 'Lucide Inventory Boxes', category: 'Inventory', library: 'lucide', style: 'outlined' },
  { key: 'PackageOpen', label: 'Lucide Open Package', category: 'Inventory', library: 'lucide', style: 'outlined' },
  { key: 'ArrowLeftRight', label: 'Lucide Movement Transfer', category: 'Operations', library: 'lucide', style: 'outlined' },
  { key: 'BadgeDollarSign', label: 'Lucide Currency Badge', category: 'Sales', library: 'lucide', style: 'outlined' },
  { key: 'Activity', label: 'Lucide Live Activity', category: 'Analytics', library: 'lucide', style: 'outlined' },
  { key: 'ShieldCheck', label: 'Lucide Verified Shield', category: 'Management', library: 'lucide', style: 'outlined' },
  { key: 'Sliders', label: 'Lucide Preferences Sliders', category: 'Management', library: 'lucide', style: 'outlined' },
  { key: 'LifeBuoy', label: 'Lucide Help & Support', category: 'Management', library: 'lucide', style: 'outlined' },

  // Tabler / Font Awesome / Iconoir representations
  { key: 'Database', label: 'Tabler Ledger Database', category: 'Core', library: 'tabler', style: 'outlined' },
  { key: 'Tag', label: 'Tabler Pricing Tag', category: 'Sales', library: 'tabler', style: 'outlined' },
  { key: 'Archive', label: 'Tabler Stock Vault', category: 'Inventory', library: 'tabler', style: 'outlined' },
  { key: 'Compass', label: 'Iconoir Navigation Compass', category: 'Core', library: 'iconoir', style: 'outlined' },
  { key: 'Award', label: 'Iconoir Premium Badge', category: 'Management', library: 'iconoir', style: 'outlined' },
  { key: 'KeyRound', label: 'FontAwesome Master Key', category: 'Management', library: 'fontawesome', style: 'filled' },
  { key: 'RefreshCw', label: 'FontAwesome Realtime Sync', category: 'Operations', library: 'fontawesome', style: 'outlined' },
];

/**
 * Universal dynamic icon resolver.
 * Renders Material UI icons by string name, with fallback to Lucide, Tabler, Iconoir & FontAwesome icons.
 */
export default function MuiIconResolver({
  name,
  size = 18,
  className = '',
  style = {},
}) {
  if (!name) return <HelpCircle size={size} className={className} style={style} />;

  // 1. Direct match in MUI_ICON_MAP
  const MuiComponent = MUI_ICON_MAP[name];
  if (MuiComponent) {
    return (
      <MuiComponent
        className={className}
        style={{ fontSize: size, ...style }}
      />
    );
  }

  // 2. Case-insensitive or normalized match (e.g. "Dashboard" -> "DashboardRounded")
  const normalizedKey = Object.keys(MUI_ICON_MAP).find(
    k => k.toLowerCase() === name.toLowerCase() ||
         k.toLowerCase() === `${name.toLowerCase()}rounded` ||
         k.toLowerCase() === `${name.toLowerCase()}outlined`
  );
  if (normalizedKey) {
    const Component = MUI_ICON_MAP[normalizedKey];
    return <Component className={className} style={{ fontSize: size, ...style }} />;
  }

  // 3. Match in Lucide & Extended Library map
  const lucideMap = {
    layoutdashboard: LayoutDashboard,
    folderopen: FolderOpen,
    boxes: Boxes,
    utensilscrossed: UtensilsCrossed,
    usercog: UserCog,
    truck: Truck,
    trendingup: TrendingUp,
    trendingdown: TrendingDown,
    packageopen: PackageOpen,
    arrowleftright: ArrowLeftRight,
    shoppingbag: ShoppingBag,
    creditcard: CreditCard,
    flame: Flame,
    uploadcloud: UploadCloud,
    coffee: Coffee,
    sendtoback: SendToBack,
    badgedollarsign: BadgeDollarSign,
    banknote: Banknote,
    filebarchart: FileBarChart,
    barchart2: BarChart2,
    scale: Scale,
    clipboardlist: ClipboardList,
    calendar: Calendar,
    package: Package,
    shoppingcart: ShoppingCart,
    users: Users,
    settings: SettingsLucide,
    trash2: Trash2,
    building2: Building2,
    shieldalert: ShieldAlert,
    sliders: Sliders,
    palette: Palette,
    sparkles: Sparkles,
    database: Database,
    filetext: FileText,
    activity: Activity,
    tag: Tag,
    shieldcheck: ShieldCheck,
    lifebuoy: LifeBuoy,
    bell: Bell,
    archive: Archive,
    refreshcw: RefreshCw,
    layers: Layers,
    compass: Compass,
    globe: Globe,
    hearthandshake: HeartHandshake,
    award: Award,
    keyround: KeyRound,
  };

  const LucideComponent = lucideMap[name.toLowerCase()];
  if (LucideComponent) {
    return <LucideComponent size={size} className={className} style={style} />;
  }

  return <HelpCircle size={size} className={className} style={style} />;
}
