import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Boxes, ShoppingCart,
  ArrowLeftRight, FileBarChart, Users, UtensilsCrossed,
  ChevronDown, ChevronRight,
  ShoppingBag, CreditCard, TrendingUp, Flame, TrendingDown,
  BarChart2, Calendar, PackageOpen, Settings as SettingsIcon, UploadCloud,
  Scale, ClipboardList, Trash2, Coffee, UserCog, Sparkles,
  SendToBack, X, Rocket, ClipboardCheck, ArrowRightLeft, History,
  BadgeDollarSign, Banknote, FolderOpen, Package, Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SALES_ITEMS = [
  { to: '/sales/cash', label: 'Cash Sales', icon: ShoppingBag },
  { to: '/sales/credit', label: 'Credit Sales', icon: CreditCard },
];

const STOCK_ITEMS = [
  { to: '/transactions', label: 'All Movements', icon: ArrowLeftRight, end: true },
  { to: '/transactions/cash-grv', label: 'Cash Goods Receiving', icon: ShoppingBag },
  { to: '/transactions/credit-grv', label: 'Credit Goods Receiving', icon: CreditCard },
  { to: '/transactions/pos-adjustment', label: 'Positive Adjustment', icon: TrendingUp },
  { to: '/transactions/disposal', label: 'Goods Disposal', icon: Flame },
  { to: '/transactions/neg-adjustment', label: 'Negative Adjustment', icon: TrendingDown },
  { to: '/sales-import', label: 'Import Sales Report', icon: UploadCloud },
];

const REPORT_ITEMS = [
  { to: '/reports/summary', label: 'Overview', icon: BarChart2 },
  { to: '/reports/stock-balance', label: 'Stock Balance Sheet', icon: Scale },
  { to: '/reports/inventory-count', label: 'Inventory Count', icon: ClipboardList },
  { to: '/reports/daily', label: 'Daily Report', icon: Calendar },
  { to: '/reports/cash-grv', label: 'Cash GRV Report', icon: ShoppingBag },
  { to: '/reports/credit-grv', label: 'Credit GRV Report', icon: CreditCard },
  { to: '/reports/pos-adjustment', label: '+ve Adjustment Report', icon: TrendingUp },
  { to: '/reports/disposal', label: 'Disposal Report', icon: Flame },
  { to: '/reports/neg-adjustment', label: '−ve Adjustment Report', icon: TrendingDown },
  { to: '/reports/stock-levels', label: 'Stock Levels', icon: PackageOpen },
  { to: '/reports/purchases', label: 'Purchase History', icon: ShoppingCart },
];

/* ── Sub-item link ── */
const SubLink = ({ to, label, icon: Icon, end = false, onClick }) => (
  <NavLink to={to} end={end} onClick={onClick}
    className={({ isActive }) =>
      `group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${isActive
        ? 'bg-indigo-50 text-indigo-700 font-bold'
        : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 font-medium'
      }`
    }
  >
    <span className={`h-1.5 w-1.5 rounded-full transition-colors ${to ? 'bg-slate-300 group-hover:bg-indigo-500' : ''}`} />
    <Icon size={13} className="shrink-0" />
    <span className="truncate">{label}</span>
  </NavLink>
);

/* ── Section label ── */
const SectionLabel = ({ children, collapsed }) =>
  collapsed ? <div className="my-2 border-t border-slate-200" /> : (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
      {children}
    </p>
  );

/* ── Collapsible section ── */
const CollapsibleNav = ({ label, icon: Icon, isActive, open, onToggle, children, collapsed }) => (
  <div>
    <button onClick={onToggle} title={collapsed ? label : undefined}
      className={`group w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''
        } ${isActive || open
          ? 'bg-slate-100 text-slate-900 font-bold'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${isActive || open ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800'
        }`}>
        <Icon size={15} strokeWidth={2} />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left text-[13px] font-semibold tracking-tight">{label}</span>
          <span className={`transition-transform duration-200 text-slate-400 ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={14} />
          </span>
        </>
      )}
    </button>
    {open && !collapsed && (
      <div className="mt-1 ml-4 border-l-2 border-slate-200/80 pl-2 space-y-0.5">
        {children}
      </div>
    )}
  </div>
);

/* ══════════════════════════════════════════
   COMING SOON MODAL — Stock Issue & Request
══════════════════════════════════════════ */
const COMING_SOON_FEATURES = [
  {
    icon: ClipboardCheck,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    title: 'Stock Request',
    desc: 'branch, Bar & Housekeeping request items from the main store with quantity and urgency level.',
  },
  {
    icon: SendToBack,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    title: 'Stock Issue / Dispatch',
    desc: 'Main store approves and issues requested stock to branches. Auto-deducts from main inventory.',
  },
  {
    icon: ArrowRightLeft,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    title: 'Branch-to-Branch Transfer',
    desc: 'Transfer excess stock between departments (e.g. Bar → branch) with full audit trail.',
  },
  {
    icon: History,
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    title: 'Issue & Request History',
    desc: 'Full log of all inter-department stock movements with status tracking (Pending → Approved → Issued).',
  },
];

const StockIssueComingSoonModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60"
    onClick={onClose}>
    <div
      className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header gradient */}
      <div className="relative px-7 pt-8 pb-6 text-center"
        style={{ background: 'linear-gradient(135deg, #1a56db 0%, #4f46e5 60%, #7c3aed 100%)' }}>
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition">
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
          <SendToBack size={30} className="text-white" />
        </div>

        <h2 className="text-xl font-black text-white leading-tight">
          Stock Issue & Request
        </h2>
        <p className="mt-1.5 text-sm text-blue-200 font-medium">
          Inter-department stock workflow — coming soon
        </p>

        {/* Coming soon badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold text-white border border-white/30">
          <Rocket size={11} />
          Under Development
        </div>
      </div>

      {/* Feature list */}
      <div className="px-6 py-5 space-y-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">
          What's being built
        </p>
        {COMING_SOON_FEATURES.map((f) => (
          <div key={f.title}
            className="flex items-start gap-3.5 rounded-2xl border border-ink-100 bg-ink-50/40 p-3.5 hover:bg-ink-50 transition">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-sm`}>
              <f.icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink-900 leading-tight">{f.title}</p>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <button onClick={onClose}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white hover:from-blue-700 hover:to-indigo-700 transition shadow-sm">
          Got it, notify me when ready
        </button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
const Sidebar = ({ open, onClose, collapsed = false }) => {
  const { user, canSeeNav, companyInfo } = useAuth();
  const location = useLocation();

  const onTransactions = location.pathname.startsWith('/transactions');
  const onReports = location.pathname.startsWith('/reports');
  const onSales = location.pathname.startsWith('/sales');
  const onAllItems = [
    '/materials', '/products', '/employees', '/suppliers'
  ].some(p => location.pathname.startsWith(p));
const onStoreOps = [
  '/transactions', '/consumption', '/stock-requests'
].some(p => location.pathname.startsWith(p));

// Accordion: only one menu open at a time
const initialOpen =
  onAllItems ? 'allItems' :
  onStoreOps ? 'storeOps' :
  onSales ? 'sales' :
  onReports ? 'reports' : null;

const [openMenu, setOpenMenu] = useState(initialOpen);

// Auto-open the matching section when route changes
React.useEffect(() => {
  if (onAllItems)       setOpenMenu('allItems');
  else if (onStoreOps)  setOpenMenu('storeOps');
  else if (onSales)     setOpenMenu('sales');
  else if (onReports)   setOpenMenu('reports');
}, [onAllItems, onStoreOps, onSales, onReports]);

  const toggleMenu = (key) => setOpenMenu(prev => (prev === key ? null : key));

const linkCls = (isActive) =>
  `group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''
  } ${isActive
    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 shadow-xs'
    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
  }`;

const iconSpan = (isActive) =>
  `flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800'
  }`;

const fullLink = (to, Icon, label, end = false) => (
  <NavLink to={to} end={end} onClick={onClose}
    className={({ isActive }) => linkCls(isActive)}>
    {({ isActive }) => (
      <>
        <span className={iconSpan(isActive)}><Icon size={15} strokeWidth={2} /></span>
        {!collapsed && <span className="text-[13px] tracking-tight">{label}</span>}
        {isActive && !collapsed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
        )}
      </>
    )}
  </NavLink>
);

const iconLink = (to, Icon, label, end = false) => (
  <NavLink to={to} end={end} onClick={onClose} title={label}
    className={({ isActive }) => linkCls(isActive)}>
    {({ isActive }) => (
      <span className={iconSpan(isActive)}><Icon size={15} strokeWidth={2} /></span>
    )}
  </NavLink>
);

const navLink = (to, Icon, label, end = false) =>
  collapsed ? iconLink(to, Icon, label, end) : fullLink(to, Icon, label, end);

const roleBadges = {
  admin: 'bg-amber-50 text-amber-700 border-amber-200',
  manager: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  storekeeper: 'bg-blue-50 text-blue-700 border-blue-200',
};

return (
  <>
    {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}

    <aside
      className={`
        fixed z-40 flex h-full flex-col bg-white border-r border-slate-200/90
        transition-all duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}
      style={{
        boxShadow: '2px 0 16px rgba(0,0,0,0.02)',
      }}
    >
      {/* ── Brand Logo Header ── */}
      <div className={`flex items-center gap-3 py-4 border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <NavLink to="/" onClick={onClose} className="flex items-center gap-3 hover:opacity-90 transition-opacity min-w-0">
          {companyInfo?.companyLogo ? (
            <img
              src={companyInfo.companyLogo}
              alt={companyInfo.companyName}
              className="h-9 w-9 shrink-0 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5 shadow-sm"
            />
          ) : (
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
              {(companyInfo?.companyName || 'SP').slice(0, 2).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[14px] font-black leading-tight text-slate-900 tracking-tight truncate max-w-[170px]">
                {companyInfo?.companyName || 'Sharp Plus'}
              </p>
              <p className="text-[10px] text-indigo-600 mt-0.5 tracking-wide font-semibold uppercase truncate max-w-[170px]">
                {companyInfo?.tradeName ? companyInfo.tradeName : 'Trading & Stock'}
              </p>
            </div>
          )}
        </NavLink>
      </div>

      {/* ── Nav ── */}
      <nav className="relative flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-2
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">

        <SectionLabel collapsed={collapsed}>Main</SectionLabel>
        {canSeeNav('dashboard') && navLink('/', LayoutDashboard, 'Dashboard', true)}

        {/* ── All ID's folder: Items, Products, Employees, Suppliers ── */}
        {collapsed ? (
          <NavLink to="/materials" onClick={onClose} title="All ID's"
            className={({ isActive }) => linkCls(isActive || onAllItems)}>
            {({ isActive }) => (
              <span className={iconSpan(isActive || onAllItems)}>
                <FolderOpen size={15} strokeWidth={2} />
              </span>
            )}
          </NavLink>
        ) : (
          <CollapsibleNav
            label="All ID's"
            icon={FolderOpen}
            isActive={onAllItems}
            open={openMenu === 'allItems'}
            onToggle={() => toggleMenu('allItems')}
            collapsed={collapsed}
          >
            <SubLink to="/materials" label="Items" icon={Boxes} onClick={onClose} />
            {canSeeNav('products') && <SubLink to="/products" label="Products" icon={UtensilsCrossed} onClick={onClose} />}
            {canSeeNav('staffAccounts') && <SubLink to="/employees" label="Employees" icon={UserCog} onClick={onClose} />}
            {canSeeNav('suppliers') && <SubLink to="/suppliers" label="Suppliers" icon={Truck} onClick={onClose} />}
          </CollapsibleNav>
        )}

{ canSeeNav('analytics') && navLink('/analytics', TrendingUp, 'Analytics & P&L') }

<SectionLabel collapsed={collapsed}>Operations</SectionLabel>

{/* ── Store Operations folder ── */ }
{
  collapsed ? (
    <NavLink to="/transactions" onClick={onClose} title="Store Operations"
      className={({ isActive }) => linkCls(isActive || onStoreOps)}>
      {({ isActive }) => (
        <span className={iconSpan(isActive || onStoreOps)}>
          <PackageOpen size={15} strokeWidth={2} />
        </span>
      )}
    </NavLink>
  ) : (
    <CollapsibleNav
      label="Store Operations"
      icon={PackageOpen}
      isActive={onStoreOps}
      open={openMenu === 'storeOps'}
      onToggle={() => toggleMenu('storeOps')}
      collapsed={collapsed}
    >
      {/* Stock Movements sub-items */}
      {canSeeNav('stockMovements') && (
        <>
          {STOCK_ITEMS.map(item => <SubLink key={item.to} {...item} onClick={onClose} />)}
        </>
      )}
      {/* Consumption */}
      {canSeeNav('consumption') && (
        <SubLink to="/consumption" label="Consumption" icon={Coffee} onClick={onClose} />
      )}
      {/* Stock Issue & Request */}
      <SubLink to="/stock-requests" label="Stock Issue & Request" icon={SendToBack} onClick={onClose} />
    </CollapsibleNav>
  )
}

{/* Sales and Marketing MS */ }
{
  canSeeNav('salesMarketing') && (
    collapsed ? (
      <NavLink to="/sales" onClick={onClose} title="Sales and Marketing MS"
        className={({ isActive }) => linkCls(isActive || onSales)}>
        {({ isActive }) => (
          <span className={iconSpan(isActive || onSales)}>
            <BadgeDollarSign size={15} strokeWidth={2} />
          </span>
        )}
      </NavLink>
    ) : (
      <CollapsibleNav label="Sales and Marketing MS" icon={BadgeDollarSign}
        isActive={onSales} open={openMenu === 'sales'}
        onToggle={() => toggleMenu('sales')} collapsed={collapsed}>
        {SALES_ITEMS.map(item => <SubLink key={item.to} {...item} onClick={onClose} />)}
      </CollapsibleNav>
    )
  )
}

{/* Reports */ }
{
  canSeeNav('reports') && (
    collapsed ? (
      <NavLink to="/reports" onClick={onClose} title="Reports"
        className={({ isActive }) => linkCls(isActive || onReports)}>
        {({ isActive }) => (
          <span className={iconSpan(isActive || onReports)}>
            <FileBarChart size={15} strokeWidth={2} />
          </span>
        )}
      </NavLink>
    ) : (
      <CollapsibleNav label="Reports" icon={FileBarChart}
        isActive={onReports} open={openMenu === 'reports'}
        onToggle={() => toggleMenu('reports')} collapsed={collapsed}>
        {REPORT_ITEMS.map(item => <SubLink key={item.to} {...item} onClick={onClose} />)}
      </CollapsibleNav>
    )
  )
}

        <SectionLabel collapsed={collapsed}>Admin & System</SectionLabel>
        {canSeeNav('staffAccounts') && navLink('/users', Users, 'Staff Accounts')}
        {navLink('/settings', SettingsIcon, 'Settings')}

        {/* Recycle Bin */}
        {(canSeeNav('staffAccounts') || user?.role === 'admin' || user?.role === 'manager') && (
          <NavLink to="/recycle-bin" onClick={onClose} title="Recycle Bin"
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''
              } ${isActive
                ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                : 'text-rose-600/80 hover:bg-rose-50 hover:text-rose-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${isActive ? 'bg-rose-100 text-rose-700' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'
                  }`}>
                  <Trash2 size={14} strokeWidth={2} />
                </span>
                {!collapsed && <span className="text-[13px]">Recycle Bin</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* ── Footer quick icons matching Aone Admin ── */}
      <div className={`border-t border-slate-100 p-2.5 flex items-center ${collapsed ? 'justify-center' : 'justify-around'} text-slate-400`}>
        <NavLink to="/settings" title="Settings" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition">
          <SettingsIcon size={16} />
        </NavLink>
        {!collapsed && (
          <>
            <NavLink to="/stock-requests" title="Issues & Requests" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition">
              <SendToBack size={16} />
            </NavLink>
            <NavLink to="/settings?tab=security" title="Security & Passwords" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition">
              <Lock size={16} />
            </NavLink>
          </>
        )}
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
