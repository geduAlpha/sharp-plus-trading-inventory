import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

export const THEMES = [
  {
    id: 'navy',
    name: 'Professional Navy',
    description: 'Deep royal sapphire & navy, bright azure highlights, high authority enterprise look',
    previewColor: '#0b1528',
    headerBg: '#0f172a',
    sidebarBg: '#0b1528',
    textColor: '#f8fafc',
    accentDefault: 'blue',
    border: '#1e293b',
  },
  {
    id: 'white',
    name: 'Clean White',
    description: 'Crisp pearl white canvas, soft slate borders, modern readability & clean aesthetics',
    previewColor: '#ffffff',
    headerBg: '#ffffff',
    sidebarBg: '#ffffff',
    textColor: '#0f172a',
    accentDefault: 'indigo',
    border: '#e2e8f0',
  },
  {
    id: 'black',
    name: 'Midnight Black',
    description: 'True obsidian dark theme, ultra-high contrast, sleek OLED aesthetics & neon emerald accents',
    previewColor: '#09090b',
    headerBg: '#121215',
    sidebarBg: '#09090b',
    textColor: '#fafafa',
    accentDefault: 'emerald',
    border: '#27272a',
  },
  {
    id: 'gray',
    name: 'Slate Gray',
    description: 'Balanced charcoal graphite, titanium neutral, soothing low-glare appearance',
    previewColor: '#1e293b',
    headerBg: '#334155',
    sidebarBg: '#1e293b',
    textColor: '#f1f5f9',
    accentDefault: 'cyan',
    border: '#334155',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Luxurious rainforest deep jade & mint accents, representing prosperity & balance',
    previewColor: '#022c22',
    headerBg: '#064e3b',
    sidebarBg: '#022c22',
    textColor: '#ecfdf5',
    accentDefault: 'emerald',
    border: '#065f46',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Regal amethyst & imperial violet with soft lilac accents, ultra-premium creative palette',
    previewColor: '#2e1065',
    headerBg: '#3b0764',
    sidebarBg: '#2e1065',
    textColor: '#faf5ff',
    accentDefault: 'purple',
    border: '#4c1d95',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue Gradient',
    description: 'Vivid maritime gradient from deep royal indigo to cyan teal, dynamic & refreshing',
    previewColor: '#0369a1',
    headerBg: '#0c4a6e',
    sidebarBg: 'linear-gradient(180deg, #0c4a6e 0%, #0369a1 40%, #1e3a8a 100%)',
    textColor: '#ffffff',
    accentDefault: 'blue',
    border: '#0284c7',
  },
  {
    id: 'warm',
    name: 'Warm Neutral',
    description: 'Refined espresso, cashmere & warm stone with amber highlights, friendly & grounded',
    previewColor: '#1c1917',
    headerBg: '#292524',
    sidebarBg: '#1c1917',
    textColor: '#fdfbf7',
    accentDefault: 'amber',
    border: '#44403c',
  },
  {
    id: 'teal',
    name: 'Dark Teal',
    description: 'Modern Nordic pine & deep petroleum cyan, tech-forward and calm visual presence',
    previewColor: '#042f2e',
    headerBg: '#134e4a',
    sidebarBg: '#042f2e',
    textColor: '#f0fdfa',
    accentDefault: 'cyan',
    border: '#115e59',
  },
  {
    id: 'burgundy',
    name: 'Burgundy Executive',
    description: 'Prestigious Bordeaux wine & dark crimson velvet, elite executive feel',
    previewColor: '#2e020d',
    headerBg: '#4c0519',
    sidebarBg: '#2e020d',
    textColor: '#fff1f2',
    accentDefault: 'rose',
    border: '#881337',
  },
  {
    id: 'glass',
    name: 'Glassmorphism',
    description: 'Frosted translucent glass with subtle backdrop blur & luminous glow borders',
    previewColor: '#0f172a',
    headerBg: 'rgba(15, 23, 42, 0.85)',
    sidebarBg: 'rgba(15, 23, 42, 0.82)',
    textColor: '#ffffff',
    accentDefault: 'blue',
    border: 'rgba(255, 255, 255, 0.15)',
  },
  {
    id: 'adaptive',
    name: 'Adaptive Light/Dark',
    description: 'Intelligently aligns with your operating system preference (switches light and dark automatically)',
    previewColor: '#475569',
    headerBg: '#1e293b',
    sidebarBg: '#0f172a',
    textColor: '#f8fafc',
    accentDefault: 'indigo',
    border: '#334155',
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    description: 'Cool Scandinavian blue-grey, icy white accents, ultra-clean Scandinavian minimalism',
    previewColor: '#1a2332',
    headerBg: '#1e2d3d',
    sidebarBg: '#1a2332',
    textColor: '#e2eaf4',
    accentDefault: 'cyan',
    border: '#2d4059',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Rich golden harvest, warm caramel depth with sunset orange highlights, energetic & warm',
    previewColor: '#1a1200',
    headerBg: '#292000',
    sidebarBg: '#1a1200',
    textColor: '#fef9c3',
    accentDefault: 'amber',
    border: '#713f12',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Electric neon on deep matte black, vivid cyan & hot magenta accents, futuristic sci-fi feel',
    previewColor: '#0a0012',
    headerBg: '#110020',
    sidebarBg: '#0a0012',
    textColor: '#f0e6ff',
    accentDefault: 'purple',
    border: '#4b0082',
  },
  {
    id: 'titanium',
    name: 'Titanium Pro',
    description: 'Matte titanium gray with brushed silver accents, refined ultra-premium industrial aesthetic',
    previewColor: '#1c1c1e',
    headerBg: '#2c2c2e',
    sidebarBg: '#1c1c1e',
    textColor: '#f5f5f7',
    accentDefault: 'blue',
    border: '#3a3a3c',
  },
];

export const ACCENT_COLORS = [
  { id: 'indigo', name: 'Indigo Spark', hex: '#4f46e5', badgeCls: 'bg-indigo-600 text-white' },
  { id: 'blue', name: 'Royal Blue', hex: '#2563eb', badgeCls: 'bg-blue-600 text-white' },
  { id: 'emerald', name: 'Emerald Mint', hex: '#059669', badgeCls: 'bg-emerald-600 text-white' },
  { id: 'amber', name: 'Warm Amber', hex: '#d97706', badgeCls: 'bg-amber-600 text-white' },
  { id: 'purple', name: 'Deep Violet', hex: '#7c3aed', badgeCls: 'bg-purple-600 text-white' },
  { id: 'cyan', name: 'Cyber Cyan', hex: '#0891b2', badgeCls: 'bg-cyan-600 text-white' },
  { id: 'rose', name: 'Crimson Rose', hex: '#e11d48', badgeCls: 'bg-rose-600 text-white' },
];

export const ICON_STYLES = [
  { id: 'rounded', label: 'Rounded Icons', description: 'Smooth, curved contours (friendly & modern)' },
  { id: 'filled', label: 'Filled Solid', description: 'Bold, high-visibility solid symbols' },
  { id: 'outlined', label: 'Outlined Crisp', description: 'Modern, slender line precision (minimalist)' },
  { id: 'sharp', label: 'Sharp Geometric', description: 'Architectural sharp edges (precise)' },
];

export const ICON_BADGE_SHAPES = [
  { id: 'squircle', label: 'Squircle', radius: 'rounded-xl' },
  { id: 'rounded', label: 'Rounded Square', radius: 'rounded-lg' },
  { id: 'circle', label: 'Circular Badge', radius: 'rounded-full' },
  { id: 'plain', label: 'Minimal / Plain', radius: 'rounded-none' },
];

export const SIDEBAR_STYLES = [
  { id: 'standard', label: 'Standard Flush', description: 'Classic full-height docked sidebar' },
  { id: 'floating', label: 'Floating Island', description: 'Detached floating container with curved border' },
  { id: 'rounded', label: 'Pill Rounded', description: 'Right edge rounded contours' },
];

export const SIDEBAR_WIDTHS = [
  { id: 'compact', label: 'Slim (240px)', width: 'w-60' },
  { id: 'normal', label: 'Standard (264px)', width: 'w-[264px]' },
  { id: 'wide', label: 'Spacious (288px)', width: 'w-72' },
  { id: 'extra', label: 'Wide (312px)', width: 'w-[312px]' },
];

export const MENU_SPACINGS = [
  { id: 'compact', label: 'Compact Spacing', py: 'py-1.5', gap: 'gap-1.5' },
  { id: 'comfortable', label: 'Comfortable', py: 'py-2', gap: 'gap-2.5' },
  { id: 'spacious', label: 'Spacious Luxury', py: 'py-2.5', gap: 'gap-3' },
];

export const ICON_SIZES = [
  { id: 'small', label: 'Small (15px)', size: 15 },
  { id: 'medium', label: 'Medium (18px)', size: 18 },
  { id: 'large', label: 'Large (20px)', size: 20 },
  { id: 'xlarge', label: 'Extra Large (22px)', size: 22 },
];

export const DEFAULT_THEME_CONFIG = {
  theme: 'white',
  displayMode: 'system',
  accentColor: 'indigo',
  iconStyle: 'rounded',
  iconBadgeShape: 'squircle',
  sidebarCompact: false,
  sidebarStyle: 'standard',
  sidebarWidth: 'normal',
  menuSpacing: 'comfortable',
  iconSize: 'medium',
  colorfulIcons: false,
  showSectionHeaders: true,
  iconLibrary: 'material',
};

export const DEFAULT_MODULES_ENABLED = {
  salesMarketing: true,
  accounting: true,
};

export const DEFAULT_SIDEBAR_CONFIG = [
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
      { id: 'movements_cash_grv', label: 'Cash Goods Receiving Voucher', to: '/transactions/cash-grv', icon: 'ShoppingBagRounded', iconType: 'mui', navKey: 'stockMovements', order: 1, visible: true },
      { id: 'movements_credit_grv', label: 'Credit Goods Receiving Voucher', to: '/transactions/credit-grv', icon: 'CreditCardRounded', iconType: 'mui', navKey: 'stockMovements', order: 2, visible: true },
      { id: 'movements_neg_adj', label: 'Negative Stock Adjustment Voucher', to: '/transactions/neg-adjustment', icon: 'RemoveCircleOutlineRounded', iconType: 'mui', navKey: 'stockMovements', order: 3, visible: true },
      { id: 'movements_pos_adj', label: 'Positive Stock Adjustment Voucher', to: '/transactions/pos-adjustment', icon: 'AddCircleOutlineRounded', iconType: 'mui', navKey: 'stockMovements', order: 4, visible: true },
      { id: 'report_inventory_count', label: 'Inventory Count', to: '/reports/inventory-count', icon: 'FactCheckRounded', iconType: 'mui', order: 5, visible: true },
      { id: 'movements_all', label: 'All Documents', to: '/transactions', icon: 'SwapHorizRounded', iconType: 'mui', navKey: 'stockMovements', order: 6, visible: true, exact: true },
      { id: 'movements_sales_import', label: 'Import Sales Report', to: '/sales-import', icon: 'CloudUploadRounded', iconType: 'mui', navKey: 'stockMovements', order: 7, visible: true },
      { id: 'stock_requests', label: 'Stock Issue & Request', to: '/stock-requests', icon: 'CallSplitRounded', iconType: 'mui', order: 8, visible: true },
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
      { id: 'sales_cash', label: 'Cash Sales', to: '/sales/cash', icon: 'PaymentsRounded', iconType: 'mui', order: 1, visible: true },
      { id: 'sales_credit', label: 'Credit Sales', to: '/sales/credit', icon: 'ReceiptLongRounded', iconType: 'mui', order: 2, visible: true },
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

export const sanitizeSidebarConfig = (config) => {
  if (!Array.isArray(config)) return config;
  const avoidedIds = ['movements_disposal', 'consumption', 'report_disposal'];
  return config.map((item) => {
    const isAvoided = avoidedIds.includes(item.id) || item.to === '/transactions/disposal' || item.to === '/consumption' || item.to === '/reports/disposal';
    let children = item.children;
    if (Array.isArray(children)) {
      children = children.map((c) => {
        if (avoidedIds.includes(c.id) || c.to === '/transactions/disposal' || c.to === '/consumption' || c.to === '/reports/disposal') {
          return { ...c, visible: false };
        }
        return c;
      });
    }
    return {
      ...item,
      ...(isAvoided ? { visible: false } : {}),
      ...(children ? { children } : {}),
    };
  });
};

const ThemeSidebarContext = createContext(null);

export const ThemeSidebarProvider = ({ children }) => {
  const { user } = useAuth();

  // Load initial theme from localStorage cache
  const [themeConfig, setThemeConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sharp_plus_theme_config');
      return saved ? { ...DEFAULT_THEME_CONFIG, ...JSON.parse(saved) } : DEFAULT_THEME_CONFIG;
    } catch {
      return DEFAULT_THEME_CONFIG;
    }
  });

  // Load initial sidebar items from localStorage cache
  const [sidebarConfig, setSidebarConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sharp_plus_sidebar_config');
      return saved ? sanitizeSidebarConfig(JSON.parse(saved)) : DEFAULT_SIDEBAR_CONFIG;
    } catch {
      return DEFAULT_SIDEBAR_CONFIG;
    }
  });

  // Module activation state (ON/OFF per system module)
  const [modulesEnabled, setModulesEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('sharp_plus_modules_enabled');
      return saved ? JSON.parse(saved) : DEFAULT_MODULES_ENABLED;
    } catch {
      return DEFAULT_MODULES_ENABLED;
    }
  });

  // Live preview states (in-memory edits in settings before saving)
  const [previewTheme, setPreviewTheme] = useState(null);
  const [previewSidebar, setPreviewSidebar] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeTheme = previewTheme || themeConfig;
  const activeSidebar = previewSidebar || sidebarConfig;

  // Apply theme attributes and CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    const theme = activeTheme.theme || 'white';
    const accent = activeTheme.accentColor || 'indigo';

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accent);

    // Class toggling
    THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${theme}`);

    // If dark theme active, flag for high contrast
    const darkThemes = ['navy', 'blue', 'black', 'gray', 'emerald', 'purple', 'warm', 'teal', 'burgundy', 'glass'];
    if (darkThemes.includes(theme)) {
      root.classList.add('dark-theme-active');
    } else {
      root.classList.remove('dark-theme-active');
    }
  }, [activeTheme]);

  // Fetch from server on mount / user login
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.themeConfig) {
        setThemeConfig(res.data.themeConfig);
        localStorage.setItem('sharp_plus_theme_config', JSON.stringify(res.data.themeConfig));
      }
      if (res.data?.sidebarConfig && Array.isArray(res.data.sidebarConfig) && res.data.sidebarConfig.length > 0) {
        const sanitized = sanitizeSidebarConfig(res.data.sidebarConfig);
        setSidebarConfig(sanitized);
        localStorage.setItem('sharp_plus_sidebar_config', JSON.stringify(sanitized));
      }
      if (res.data?.modulesEnabled && typeof res.data.modulesEnabled === 'object') {
        setModulesEnabled(res.data.modulesEnabled);
        localStorage.setItem('sharp_plus_modules_enabled', JSON.stringify(res.data.modulesEnabled));
      }
    } catch (err) {
      console.warn('[ThemeSidebar] Using cached or default configuration:', err.message);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  // Toggle a system module (salesMarketing, accounting, etc.)
  const toggleModule = async (moduleKey, enabled) => {
    try {
      const res = await api.put('/settings', {
        modulesEnabled: { [moduleKey]: enabled },
      });
      const updatedModules = res.data?.modulesEnabled || { ...modulesEnabled, [moduleKey]: enabled };
      setModulesEnabled(updatedModules);
      localStorage.setItem('sharp_plus_modules_enabled', JSON.stringify(updatedModules));
      return { success: true, data: res.data };
    } catch (err) {
      console.error('[ThemeSidebar] Failed to toggle module:', err);
      return { success: false, error: err.response?.data?.message || err.message || 'Failed to update module status' };
    }
  };

  // Save changes to database
  const saveThemeAndSidebar = async (newTheme, newSidebar) => {
    setSaving(true);
    try {
      const payload = {};
      if (newTheme) payload.themeConfig = newTheme;
      if (newSidebar) payload.sidebarConfig = newSidebar;

      const res = await api.put('/settings', payload);

      if (res.data?.themeConfig) {
        setThemeConfig(res.data.themeConfig);
        localStorage.setItem('sharp_plus_theme_config', JSON.stringify(res.data.themeConfig));
      } else if (newTheme) {
        setThemeConfig(newTheme);
        localStorage.setItem('sharp_plus_theme_config', JSON.stringify(newTheme));
      }

      if (res.data?.sidebarConfig) {
        setSidebarConfig(res.data.sidebarConfig);
        localStorage.setItem('sharp_plus_sidebar_config', JSON.stringify(res.data.sidebarConfig));
      } else if (newSidebar) {
        setSidebarConfig(newSidebar);
        localStorage.setItem('sharp_plus_sidebar_config', JSON.stringify(newSidebar));
      }

      // Clear live preview once saved
      setPreviewTheme(null);
      setPreviewSidebar(null);
      return { success: true, data: res.data };
    } catch (err) {
      console.error('[ThemeSidebar] Error saving theme/sidebar:', err);
      return {
        success: false,
        error: err.response?.data?.message || err.message || 'Failed to save theme and sidebar settings'
      };
    } finally {
      setSaving(false);
    }
  };

  // Reset to default settings
  const resetToDefaults = async () => {
    return await saveThemeAndSidebar(DEFAULT_THEME_CONFIG, DEFAULT_SIDEBAR_CONFIG);
  };

  return (
    <ThemeSidebarContext.Provider
      value={{
        themeConfig,
        sidebarConfig,
        modulesEnabled,
        activeTheme,
        activeSidebar,
        previewTheme,
        previewSidebar,
        setPreviewTheme,
        setPreviewSidebar,
        saveThemeAndSidebar,
        resetToDefaults,
        toggleModule,
        saving,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </ThemeSidebarContext.Provider>
  );
};

export const useThemeSidebar = () => {
  const ctx = useContext(ThemeSidebarContext);
  if (!ctx) {
    throw new Error('useThemeSidebar must be used within a ThemeSidebarProvider');
  }
  return ctx;
};
