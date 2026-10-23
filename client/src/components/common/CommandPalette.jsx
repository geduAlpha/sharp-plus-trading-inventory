import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Package,
  Layers,
  BarChart2,
  ArrowLeftRight,
  ShoppingCart,
  Users,
  Settings,
  HelpCircle,
  Maximize,
  Moon,
  Sun,
  Palette,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  PlusCircle,
  ClipboardList,
  Calendar,
  Trash2,
  ShieldCheck,
  Building2,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  CornerDownLeft,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useThemeSidebar } from '../../context/ThemeSidebarContext';

const RECENT_COMMANDS_KEY = 'sharp_plus_command_recents';

export default function CommandPalette({ onToggleSidebarCollapse }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, nav, action, frame, items
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Live materials search state
  const [materialResults, setMaterialResults] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const { user, hasRole } = useAuth();
  const { activeTheme, saveThemeAndSidebar, themeConfig, sidebarConfig } = useThemeSidebar();
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Global listener for Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = (e) => {
      setIsOpen(true);
      if (e.detail?.tab) setActiveTab(e.detail.tab);
      if (e.detail?.query) setQuery(e.detail.query);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input on open & disable background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Save to recent commands
  const recordRecent = (item) => {
    try {
      const updated = [
        { id: item.id, title: item.title, category: item.category, iconName: item.iconName, to: item.to },
        ...recentCommands.filter((r) => r.id !== item.id),
      ].slice(0, 6);
      setRecentCommands(updated);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
    } catch {
      // ignore local storage errors
    }
  };

  const clearRecents = (e) => {
    e.stopPropagation();
    setRecentCommands([]);
    try {
      localStorage.removeItem(RECENT_COMMANDS_KEY);
    } catch {}
  };

  // Helper action: Toggle Dim / Bright Mode
  const handleToggleDim = () => {
    try {
      const isCurrentlyDim = document.documentElement.classList.contains('dim-mode');
      const next = !isCurrentlyDim;
      localStorage.setItem('sharp_plus_dim_mode', String(next));
      if (next) {
        document.documentElement.classList.add('dim-mode', 'dark');
      } else {
        document.documentElement.classList.remove('dim-mode', 'dark');
      }
    } catch {}
  };

  // Helper action: Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Live materials lookup
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      setLoadingMaterials(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.get(`/materials?search=${encodeURIComponent(trimmed)}`);
          const items = Array.isArray(res.data) ? res.data.slice(0, 8) : [];
          setMaterialResults(items);
        } catch {
          setMaterialResults([]);
        } finally {
          setLoadingMaterials(false);
        }
      }, 250);
    } else {
      setMaterialResults([]);
      setLoadingMaterials(false);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Build command list based on user privileges and features
  const allCommands = useMemo(() => {
    const isOwnerOrDev = user?.role === 'developer' || user?.role === 'admin';
    const isManagerOrAdmin = hasRole('admin') || hasRole('manager');

    const navList = [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'Overview KPIs, stock values, reorder alerts',
        category: 'nav',
        icon: LayoutDashboard,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'home overview analytics kpi stock stats',
        action: () => navigate('/'),
      },
      {
        id: 'nav-materials',
        title: 'Items Directory',
        subtitle: 'Raw materials, stock levels, unit costs, reorder limits',
        category: 'nav',
        icon: Package,
        color: 'text-emerald-500 bg-emerald-500/10',
        keywords: 'items materials stock inventory products goods',
        action: () => navigate('/materials'),
      },
      {
        id: 'nav-products',
        title: 'Sales Products & Recipes',
        subtitle: 'Finished products, recipes, bill of materials',
        category: 'nav',
        icon: Layers,
        color: 'text-violet-500 bg-violet-500/10',
        keywords: 'products recipes bom sales goods finished',
        action: () => navigate('/products'),
      },
      {
        id: 'nav-analytics',
        title: 'Analytics & Performance',
        subtitle: 'Visual stock trends, consumption charts, cost metrics',
        category: 'nav',
        icon: BarChart2,
        color: 'text-amber-500 bg-amber-500/10',
        keywords: 'analytics charts trends graphs performance insights',
        action: () => navigate('/analytics'),
      },
      {
        id: 'nav-movements',
        title: 'Stock Movements Hub',
        subtitle: 'Voucher history, receipts, transfers, adjustments',
        category: 'nav',
        icon: ArrowLeftRight,
        color: 'text-indigo-500 bg-indigo-500/10',
        keywords: 'transactions movements grv vouchers transfers entries',
        action: () => navigate('/transactions'),
      },
      {
        id: 'nav-cash-grv',
        title: 'Cash GRV Entries',
        subtitle: 'Goods received with direct cash payment',
        category: 'nav',
        icon: ArrowLeftRight,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'cash grv goods receiving receiving cash voucher',
        action: () => navigate('/transactions/cash-grv'),
      },
      {
        id: 'nav-credit-grv',
        title: 'Credit GRV Entries',
        subtitle: 'Goods received on supplier credit invoice',
        category: 'nav',
        icon: ArrowLeftRight,
        color: 'text-purple-500 bg-purple-500/10',
        keywords: 'credit grv invoice supplier receiving',
        action: () => navigate('/transactions/credit-grv'),
      },
      {
        id: 'nav-stock-requests',
        title: 'Stock Issue & Requests',
        subtitle: 'Department requisition, transfer approvals, issuance',
        category: 'nav',
        icon: ClipboardList,
        color: 'text-teal-500 bg-teal-500/10',
        keywords: 'stock request issue dispatch requisition transfer',
        action: () => navigate('/stock-requests'),
      },
      ...(isManagerOrAdmin
        ? [
            {
              id: 'nav-purchases',
              title: 'Purchase Orders & Approvals',
              subtitle: 'Procurement workflows, approval gates, supplier orders',
              category: 'nav',
              icon: ShoppingCart,
              color: 'text-rose-500 bg-rose-500/10',
              keywords: 'purchases po orders approval supplier procurement',
              action: () => navigate('/purchases'),
            },
            {
              id: 'nav-suppliers',
              title: 'Suppliers Directory',
              subtitle: 'Vendor contact information, balances, order history',
              category: 'nav',
              icon: Building2,
              color: 'text-cyan-500 bg-cyan-500/10',
              keywords: 'suppliers vendors contacts partners directory',
              action: () => navigate('/suppliers'),
            },
          ]
        : []),
      {
        id: 'nav-reports',
        title: 'Reports & Analytics Center',
        subtitle: 'Comprehensive financial, stock balance, and audit reports',
        category: 'nav',
        icon: FileText,
        color: 'text-amber-500 bg-amber-500/10',
        keywords: 'reports stock balance daily movement audit statement',
        action: () => navigate('/reports'),
      },
      {
        id: 'nav-stock-balance',
        title: 'Stock Balance Sheet',
        subtitle: 'Current physical inventory, total asset valuation & export',
        category: 'nav',
        icon: FileText,
        color: 'text-emerald-500 bg-emerald-500/10',
        keywords: 'stock balance sheet valuation pdf excel export inventory value',
        action: () => navigate('/reports/stock-balance'),
      },
      {
        id: 'nav-inventory-count',
        title: 'Physical Inventory Count',
        subtitle: 'Stock take verification, reconciliation & variance reports',
        category: 'nav',
        icon: ClipboardList,
        color: 'text-indigo-500 bg-indigo-500/10',
        keywords: 'count stocktake inventory audit physical variance',
        action: () => navigate('/reports/inventory-count'),
      },
      {
        id: 'nav-daily-report',
        title: 'Daily Movement Report',
        subtitle: 'Day-to-day stock inflows, outflows, and net changes',
        category: 'nav',
        icon: Calendar,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'daily movement report inflows outflows summary',
        action: () => navigate('/reports/daily'),
      },
      ...(user?.role === 'admin' || user?.role === 'developer'
        ? [
            {
              id: 'nav-users',
              title: 'Staff Accounts & Privileges',
              subtitle: 'Manage user credentials, roles, and granular permissions',
              category: 'nav',
              icon: Users,
              color: 'text-rose-500 bg-rose-500/10',
              keywords: 'users staff accounts permissions privileges access security',
              action: () => navigate('/users'),
            },
            {
              id: 'nav-recycle-bin',
              title: 'Recycle Bin',
              subtitle: 'Restore or permanently purge archived records',
              category: 'nav',
              icon: Trash2,
              color: 'text-slate-500 bg-slate-500/10',
              keywords: 'recycle bin trash restore deleted archive items',
              action: () => navigate('/recycle-bin'),
            },
          ]
        : []),
      {
        id: 'nav-settings',
        title: 'System Settings',
        subtitle: 'Company profile, currency, session timeouts, preferences',
        category: 'nav',
        icon: Settings,
        color: 'text-slate-600 bg-slate-500/10',
        keywords: 'settings preferences profile configuration security company',
        action: () => navigate('/settings'),
      },
      {
        id: 'nav-theme-studio',
        title: 'Appearance & Navigation Studio',
        subtitle: 'Theme palettes, sidebar width, badge contours, layout framing',
        category: 'nav',
        icon: Palette,
        color: 'text-indigo-500 bg-indigo-500/10',
        keywords: 'appearance theme studio sidebar colors dark light customization',
        action: () => navigate('/settings?tab=sidebar'),
      },
      ...(user?.role === 'developer'
        ? [
            {
              id: 'nav-dev-console',
              title: 'System Developer Console',
              subtitle: 'Multi-company governance, system logs, master access',
              category: 'nav',
              icon: ShieldCheck,
              color: 'text-purple-500 bg-purple-500/10',
              keywords: 'developer console multi company logs governance master',
              action: () => navigate('/developer-console'),
            },
          ]
        : []),
    ];

    const actionList = [
      {
        id: 'act-new-cash-grv',
        title: 'New Cash GRV Voucher',
        subtitle: 'Record an incoming goods shipment paid via cash',
        category: 'action',
        icon: PlusCircle,
        color: 'text-emerald-500 bg-emerald-500/10',
        keywords: 'create new cash grv goods received voucher receive add entry',
        action: () => navigate('/transactions/cash-grv'),
      },
      {
        id: 'act-new-credit-grv',
        title: 'New Credit GRV Voucher',
        subtitle: 'Record incoming supplier goods on deferred credit',
        category: 'action',
        icon: PlusCircle,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'create new credit grv supplier invoice receiving',
        action: () => navigate('/transactions/credit-grv'),
      },
      {
        id: 'act-new-item',
        title: 'Add New Material / Item',
        subtitle: 'Create a new stock item with category and reorder threshold',
        category: 'action',
        icon: Package,
        color: 'text-violet-500 bg-violet-500/10',
        keywords: 'create add new item material product inventory',
        action: () => navigate('/materials?action=new'),
      },
      ...(isManagerOrAdmin
        ? [
            {
              id: 'act-new-po',
              title: 'Create Purchase Order',
              subtitle: 'Initiate a new procurement order for manager/admin approval',
              category: 'action',
              icon: ShoppingCart,
              color: 'text-indigo-500 bg-indigo-500/10',
              keywords: 'create new purchase order po requisition procurement',
              action: () => navigate('/purchases?action=new'),
            },
          ]
        : []),
      {
        id: 'act-pos-adjustment',
        title: 'Record Positive (+ve) Stock Adjustment',
        subtitle: 'Correct inventory upward for unrecorded gains or physical finds',
        category: 'action',
        icon: ArrowLeftRight,
        color: 'text-emerald-500 bg-emerald-500/10',
        keywords: 'positive adjustment add stock correct increase variance',
        action: () => navigate('/transactions/pos-adjustment'),
      },
      {
        id: 'act-neg-adjustment',
        title: 'Record Negative (−ve) Stock Adjustment',
        subtitle: 'Correct stock downward for shrinkage or discrepancy',
        category: 'action',
        icon: ArrowLeftRight,
        color: 'text-rose-500 bg-rose-500/10',
        keywords: 'negative adjustment decrease stock shrinkage correction variance',
        action: () => navigate('/transactions/neg-adjustment'),
      },
      {
        id: 'act-disposal',
        title: 'Record Goods Disposal',
        subtitle: 'Remove expired, damaged, or decommissioned stock from balance',
        category: 'action',
        icon: Trash2,
        color: 'text-amber-500 bg-amber-500/10',
        keywords: 'dispose disposal damaged expired goods scrap remove',
        action: () => navigate('/transactions/disposal'),
      },
      {
        id: 'act-start-inventory-count',
        title: 'Start Physical Stock Count',
        subtitle: 'Conduct warehouse stock check and record physical counts',
        category: 'action',
        icon: ClipboardList,
        color: 'text-cyan-500 bg-cyan-500/10',
        keywords: 'inventory count physical stocktake audit verify reconcile',
        action: () => navigate('/reports/inventory-count'),
      },
      {
        id: 'act-new-stock-request',
        title: 'Issue / Request Stock',
        subtitle: 'Submit or approve a departmental stock transfer requisition',
        category: 'action',
        icon: ClipboardList,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'request issue stock transfer requisition dispatch',
        action: () => navigate('/stock-requests'),
      },
    ];

    const frameList = [
      {
        id: 'frame-toggle-collapse',
        title: 'Toggle Sidebar Expand / Collapse',
        subtitle: 'Collapse sidebar to slim icon rail or restore full labels',
        category: 'frame',
        icon: Sliders,
        color: 'text-indigo-500 bg-indigo-500/10',
        shortcut: 'Menu',
        keywords: 'toggle sidebar collapse expand slim rail menu hide',
        action: () => {
          if (onToggleSidebarCollapse) onToggleSidebarCollapse();
        },
      },
      {
        id: 'frame-toggle-dim',
        title: 'Toggle Dim Mode / Bright Mode',
        subtitle: 'Switch between sleek eye-comfort dim theme and high-brightness mode',
        category: 'frame',
        icon: Moon,
        color: 'text-amber-500 bg-amber-500/10',
        shortcut: 'Theme',
        keywords: 'dark mode dim mode light mode brightness toggle contrast',
        action: handleToggleDim,
      },
      {
        id: 'frame-toggle-fullscreen',
        title: 'Toggle Fullscreen Mode',
        subtitle: 'Expand workspace to full monitor frame without browser address bar',
        category: 'frame',
        icon: Maximize,
        color: 'text-cyan-500 bg-cyan-500/10',
        shortcut: 'F11',
        keywords: 'fullscreen expand monitor window display frame',
        action: handleToggleFullscreen,
      },
      {
        id: 'frame-open-theme-studio',
        title: 'Open Theme & Appearance Studio',
        subtitle: 'Pick from 12 curated themes, custom accent colors, and icon styles',
        category: 'frame',
        icon: Palette,
        color: 'text-fuchsia-500 bg-fuchsia-500/10',
        keywords: 'theme sidebar color accent appearance styling frame layout',
        action: () => navigate('/settings?tab=sidebar'),
      },
      {
        id: 'frame-open-help',
        title: 'System Guides & Help Center',
        subtitle: 'Step-by-step procedures for every module, tips, and guidelines',
        category: 'frame',
        icon: HelpCircle,
        color: 'text-blue-500 bg-blue-500/10',
        keywords: 'help guide documentation documentation tutorial faq instructions',
        action: () => {
          // Trigger topbar help modal event
          window.dispatchEvent(new CustomEvent('open-help-modal'));
        },
      },
    ];

    return [...navList, ...actionList, ...frameList];
  }, [user, hasRole, navigate, onToggleSidebarCollapse]);

  // Filter commands by search query and active tab
  const filteredCommands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return allCommands.filter((cmd) => {
      // Tab filter
      if (activeTab === 'nav' && cmd.category !== 'nav') return false;
      if (activeTab === 'action' && cmd.category !== 'action') return false;
      if (activeTab === 'frame' && cmd.category !== 'frame') return false;
      if (activeTab === 'items') return false; // Handled separately in items section

      if (!trimmed) return true;

      const titleMatch = cmd.title.toLowerCase().includes(trimmed);
      const subtitleMatch = cmd.subtitle?.toLowerCase().includes(trimmed);
      const keywordsMatch = cmd.keywords?.toLowerCase().includes(trimmed);
      return titleMatch || subtitleMatch || keywordsMatch;
    });
  }, [allCommands, query, activeTab]);

  // Combine commands and live materials when applicable
  const displayItems = useMemo(() => {
    const list = [];

    // Recent items if query is empty and on 'all' tab
    if (!query.trim() && activeTab === 'all' && recentCommands.length > 0) {
      recentCommands.forEach((rec) => {
        const matchingCmd = allCommands.find((c) => c.id === rec.id);
        if (matchingCmd) {
          list.push({ ...matchingCmd, isRecent: true });
        }
      });
    }

    // Add filtered static commands
    if (activeTab !== 'items') {
      filteredCommands.forEach((cmd) => {
        // Avoid duplicate if already in recents section
        if (!list.some((item) => item.id === cmd.id)) {
          list.push(cmd);
        }
      });
    }

    // Add live materials (if on 'items' or 'all' with query)
    if ((activeTab === 'items' || activeTab === 'all') && materialResults.length > 0) {
      materialResults.forEach((mat) => {
        list.push({
          id: `mat-${mat._id}`,
          title: mat.name,
          subtitle: `Stock: ${mat.currentStock} ${mat.unit || ''} • Cat: ${mat.category || 'Standard'} • Status: ${
            mat.status === 'out_of_stock'
              ? 'Out of Stock'
              : mat.status === 'low_stock'
              ? 'Low Stock Alert'
              : 'In Stock'
          }`,
          category: 'items',
          icon: Package,
          color:
            mat.status === 'out_of_stock'
              ? 'text-rose-500 bg-rose-500/10'
              : mat.status === 'low_stock'
              ? 'text-amber-500 bg-amber-500/10'
              : 'text-emerald-500 bg-emerald-500/10',
          materialData: mat,
          action: () => navigate(`/materials?search=${encodeURIComponent(mat.name)}`),
        });
      });
    }

    return list;
  }, [query, activeTab, recentCommands, allCommands, filteredCommands, materialResults, navigate]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayItems.length, query, activeTab]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Execute an item
  const handleSelect = useCallback(
    (item) => {
      if (!item) return;
      if (item.category !== 'items') {
        recordRecent(item);
      }
      setIsOpen(false);
      if (typeof item.action === 'function') {
        item.action();
      }
    },
    [recordRecent]
  );

  // Key navigation (Up, Down, Enter, Tab)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayItems[selectedIndex]) {
        handleSelect(displayItems[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const tabs = ['all', 'nav', 'action', 'frame', 'items'];
      const nextIdx = (tabs.indexOf(activeTab) + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
      setActiveTab(tabs[nextIdx]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4 pb-8 transition-opacity duration-200"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={() => setIsOpen(false)}
    >
      {/* Modal Dialog Card */}
      <div
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all text-slate-900 dark:text-slate-100"
        style={{ maxHeight: '82vh' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header & Search Input Box */}
        <div className="relative flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <Search size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0 mr-3.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, action, or stock item..."
            className="flex-1 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent outline-none tracking-tight"
          />

          {loadingMaterials && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 mr-2 animate-pulse">
              <Sparkles size={11} /> Searching stock…
            </span>
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition mr-2"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-2xs select-none">
            ESC
          </kbd>
        </div>

        {/* Category Pills Navigation Filter */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 overflow-x-auto no-scrollbar text-xs font-semibold">
          {[
            { id: 'all', label: 'All Commands', count: allCommands.length },
            { id: 'nav', label: 'Pages & Menus', icon: LayoutDashboard },
            { id: 'action', label: 'Quick Actions', icon: PlusCircle },
            { id: 'frame', label: 'Frame & Theme Controls', icon: Sliders },
            { id: 'items', label: 'Stock Items', icon: Package },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {TabIcon && <TabIcon size={12} className={isActive ? 'text-white' : 'opacity-70'} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-transparent">
          {displayItems.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                <Search size={22} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching commands found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try searching for terms like <span className="font-semibold text-indigo-500">GRV</span>,{' '}
                <span className="font-semibold text-indigo-500">Items</span>,{' '}
                <span className="font-semibold text-indigo-500">Count</span>, or{' '}
                <span className="font-semibold text-indigo-500">Theme</span>.
              </p>
            </div>
          ) : (
            displayItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const IconComp = item.icon || Sparkles;

              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-50 ring-1 ring-indigo-500/30 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon container */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        item.color || 'text-indigo-600 bg-indigo-50'
                      }`}
                    >
                      <IconComp size={17} />
                    </div>

                    {/* Titles */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate tracking-tight text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {item.isRecent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">
                            <History size={10} /> Recent
                          </span>
                        )}
                        {item.category === 'action' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Action
                          </span>
                        )}
                        {item.category === 'frame' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300">
                            Frame
                          </span>
                        )}
                        {item.category === 'items' && item.materialData && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                              item.materialData.status === 'out_of_stock'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : item.materialData.status === 'low_stock'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {item.materialData.status === 'out_of_stock'
                              ? 'Out of Stock'
                              : item.materialData.status === 'low_stock'
                              ? 'Low Stock'
                              : 'In Stock'}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right shortcut or action hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <span>Select</span>
                        <CornerDownLeft size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Keyboard Navigation hints */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[10px]">
                ↓
              </kbd>
              <span className="hidden sm:inline">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[10px]">
                ↵
              </kbd>
              <span className="hidden sm:inline">to select</span>
            </span>
            <span className="hidden md:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[10px]">
                Tab
              </kbd>
              <span>to filter</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {recentCommands.length > 0 && !query && (
              <button
                type="button"
                onClick={clearRecents}
                className="hover:text-rose-500 transition font-semibold"
                title="Clear recent command history"
              >
                Clear history
              </button>
            )}
            <span className="text-[10px] opacity-75 hidden sm:inline">
              Sharp Plus Quick Navigation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
