import React, { useState, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useThemeSidebar } from '../../context/ThemeSidebarContext';
import MuiIconResolver from '../common/MuiIconResolver';

/* ── Avoided / Inactive Navigation Items ── */
const INACTIVE_AVOIDED_SIDEBAR_IDS = [
  'movements_disposal',
  'consumption',
  'report_disposal',
];

const isAvoidedNavItem = (it) => {
  if (!it) return false;
  if (INACTIVE_AVOIDED_SIDEBAR_IDS.includes(it.id)) return true;
  if (it.to === '/transactions/disposal' || it.to === '/consumption' || it.to === '/reports/disposal') return true;
  return false;
};

/* ── Fallback resolver to map legacy / custom sidebar items to Role Privilege module keys ── */
const resolveItemNavKey = (item) => {
  if (!item) return null;
  if (item.navKey) return item.navKey;
  if (item.id === 'sales_cash' || item.to === '/sales/cash') return 'cashSales';
  if (item.id === 'sales_credit' || item.to === '/sales/credit') return 'creditSales';
  if (item.id === 'stock_requests' || item.to === '/stock-requests') return 'stockRequests';
  if (item.to === '/reports/inventory-count') return 'inventoryCount';
  if (item.id === 'movements_cash_grv' || item.id === 'movements_credit_grv') return 'purchases';
  return null;
};

/* ── Section label ── */
const SectionLabel = ({ children, collapsed, isDark, showHeaders = true }) => {
  if (!showHeaders && !collapsed) {
    return <div className={`my-1.5 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`} />;
  }
  return collapsed ? (
    <div className={`my-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
  ) : (
    <p
      className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider select-none sidebar-section-label ${
        isDark ? 'text-slate-400' : 'text-slate-400'
      }`}
    >
      {children}
    </p>
  );
};

/* ── Collapsible Group Nav ── */
const DynamicCollapsibleNav = ({
  label,
  iconName,
  isOpen,
  isActive,
  onToggle,
  collapsed,
  isDark,
  badgeRadius,
  accentHex,
  children,
}) => {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? label : undefined}
        className={`group w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-semibold transition-all duration-150 rounded-xl sidebar-nav-link ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive || isOpen
            ? isDark
              ? 'bg-white/10 text-white font-bold'
              : 'bg-slate-100 text-slate-900 font-bold'
            : isDark
            ? 'text-slate-300 hover:bg-white/5 hover:text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center transition-all ${badgeRadius} sidebar-icon-badge ${
            isActive || isOpen
              ? 'text-white shadow-xs'
              : isDark
              ? 'bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:text-white'
              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800'
          }`}
          style={
            isActive || isOpen
              ? { backgroundColor: accentHex || '#4f46e5', color: '#ffffff' }
              : undefined
          }
        >
          <MuiIconResolver name={iconName} size={15} />
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 text-left text-[13px] font-semibold tracking-tight truncate">
              {label}
            </span>
            <span
              className={`transition-transform duration-200 ${isDark ? 'text-slate-400' : 'text-slate-400'} ${
                isOpen ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown size={14} />
            </span>
          </>
        )}
      </button>

      {isOpen && !collapsed && (
        <div
          className={`mt-1 ml-4 pl-2 space-y-0.5 border-l-2 sidebar-divider ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ── Dynamic Sidebar ── */
export default function Sidebar({ open, onClose, collapsed = false }) {
  const { user, canSeeNav, companyInfo, modulesEnabled: authModulesEnabled } = useAuth();
  const { activeTheme, activeSidebar, modulesEnabled: themeModulesEnabled } = useThemeSidebar();
  const modulesEnabled = themeModulesEnabled || authModulesEnabled;
  const location = useLocation();

  const themeMode = activeTheme?.theme || 'white';
  const darkThemes = ['navy', 'blue', 'black', 'gray', 'emerald', 'purple', 'warm', 'teal', 'burgundy', 'glass', 'nordic', 'amber', 'cyberpunk', 'titanium'];
  const isDark = darkThemes.includes(themeMode);

  // Badge shape radius
  const badgeRadius = useMemo(() => {
    switch (activeTheme?.iconBadgeShape) {
      case 'circle':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'plain':
        return 'rounded-none bg-transparent';
      case 'squircle':
      default:
        return 'rounded-xl';
    }
  }, [activeTheme?.iconBadgeShape]);

  // Accent color mapping
  const accentHex = useMemo(() => {
    switch (activeTheme?.accentColor) {
      case 'blue':
        return '#2563eb';
      case 'emerald':
        return '#059669';
      case 'amber':
        return '#d97706';
      case 'purple':
        return '#7c3aed';
      case 'cyan':
        return '#0891b2';
      case 'rose':
        return '#e11d48';
      case 'indigo':
      default:
        return '#4f46e5';
    }
  }, [activeTheme?.accentColor]);

  // Sidebar Width class
  const sidebarWidthClass = useMemo(() => {
    if (collapsed) return 'w-[72px]';
    switch (activeTheme?.sidebarWidth) {
      case 'compact':
        return 'w-60';
      case 'wide':
        return 'w-72';
      case 'extra':
        return 'w-[312px]';
      case 'normal':
      default:
        return 'w-[264px]';
    }
  }, [collapsed, activeTheme?.sidebarWidth]);

  // Sidebar container style (standard, floating, rounded)
  const sidebarStyleClass = useMemo(() => {
    if (activeTheme?.sidebarStyle === 'floating') return 'sidebar-style-floating';
    if (activeTheme?.sidebarStyle === 'rounded') return 'sidebar-style-rounded';
    return '';
  }, [activeTheme?.sidebarStyle]);

  // Menu item spacing
  const spacingClass = useMemo(() => {
    switch (activeTheme?.menuSpacing) {
      case 'compact':
        return 'py-1.5 px-2';
      case 'spacious':
        return 'py-2.5 px-3';
      case 'comfortable':
      default:
        return 'py-2 px-2.5';
    }
  }, [activeTheme?.menuSpacing]);

  // Dynamic icon size
  const resolvedIconSize = useMemo(() => {
    switch (activeTheme?.iconSize) {
      case 'small':
        return 14;
      case 'large':
        return 19;
      case 'xlarge':
        return 21;
      case 'medium':
      default:
        return 16;
    }
  }, [activeTheme?.iconSize]);

  // Colorful icon accent helper
  const getItemAccent = (item) => {
    if (!activeTheme?.colorfulIcons) return accentHex;
    const sec = (item.section || 'main').toLowerCase();
    if (item.id === 'dashboard') return '#2563eb';
    if (item.id === 'analytics') return '#059669';
    if (sec === 'operations') return '#d97706';
    if (sec === 'admin') return '#7c3aed';
    return accentHex;
  };

  // Accordion state
  const [openMenu, setOpenMenu] = useState(null);

  // Auto-detect which group is active on initial load or route change
  React.useEffect(() => {
    const currentPath = location.pathname;
    const matchingGroup = activeSidebar.find(
      (item) =>
        item.isGroup &&
        item.children?.some(
          (c) =>
            currentPath === c.to ||
            (c.to !== '/' && currentPath.startsWith(c.to))
        )
    );
    if (matchingGroup) {
      setOpenMenu(matchingGroup.id);
    }
  }, [location.pathname, activeSidebar]);

  const toggleMenu = (key) => setOpenMenu((prev) => (prev === key ? null : key));

  // Sort top-level items by order
  const sortedSidebar = useMemo(() => {
    return [...(activeSidebar || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activeSidebar]);

  // Helper to test if a leaf nav item is allowed for current user based on Role Privileges and Company Module Activation
  const canDisplayItem = useCallback((item) => {
    if (!item) return false;
    if (isAvoidedNavItem(item)) return false;
    if (item.visible === false) return false;

    // Company-level Sales & Marketing gate: Owner must have enabled it for company users to see it
    const isSales =
      item.id === 'salesMarketing' ||
      item.navKey === 'salesMarketing' ||
      item.navKey === 'cashSales' ||
      item.navKey === 'creditSales' ||
      item.id === 'sales_cash' ||
      item.id === 'sales_credit' ||
      (typeof item.to === 'string' && (item.to.startsWith('/sales') || item.to === '/sales-import'));

    if (isSales && modulesEnabled?.salesMarketing === false && user?.role !== 'developer') {
      return false;
    }

    const resolvedKey = resolveItemNavKey(item);
    if (resolvedKey && !canSeeNav(resolvedKey)) return false;
    return true;
  }, [canSeeNav, modulesEnabled?.salesMarketing, user?.role]);

  // Group items by section — respect modulesEnabled and role privileges
  const sections = useMemo(() => {
    const main = [];
    const operations = [];
    const admin = [];

    sortedSidebar.forEach((item) => {
      if (!canDisplayItem(item)) return;

      // If group, verify it has at least one accessible child
      if (item.isGroup) {
        const visibleKids = (item.children || []).filter(canDisplayItem);
        if (visibleKids.length === 0) return;
      }

      // If salesMarketing module is disabled, hide the salesMarketing sidebar section
      if (item.id === 'salesMarketing' || item.navKey === 'salesMarketing') {
        if (modulesEnabled?.salesMarketing === false && user?.role !== 'developer') return;
      }

      const sec = (item.section || 'main').toLowerCase();
      if (sec === 'operations') operations.push(item);
      else if (sec === 'admin') admin.push(item);
      else main.push(item);
    });

    return { main, operations, admin };
  }, [sortedSidebar, canDisplayItem, modulesEnabled, user?.role]);

  // Check if a group currently has an active child
  const isGroupActive = (item) => {
    if (!item.children) return false;
    return item.children.some(
      (c) =>
        location.pathname === c.to ||
        (c.to !== '/' && location.pathname.startsWith(c.to))
    );
  };

  // NavLink styling generator
  const getLinkClasses = (isActive) => {
    const base = `group flex items-center gap-2.5 rounded-xl ${spacingClass} font-semibold transition-all duration-150 sidebar-nav-link ${
      collapsed ? 'justify-center' : ''
    }`;

    if (isActive) {
      if (isDark) {
        return `${base} bg-white/15 text-white font-bold active-link shadow-xs`;
      }
      return `${base} bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 active-link shadow-xs`;
    }

    if (isDark) {
      return `${base} text-slate-300 hover:bg-white/5 hover:text-white font-medium`;
    }
    return `${base} text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium`;
  };

  // Icon Badge styling generator
  const getIconBadgeClasses = (isActive) => {
    const base = `flex h-7 w-7 shrink-0 items-center justify-center transition-all ${badgeRadius} sidebar-icon-badge`;

    if (isActive) {
      return `${base} text-white shadow-xs active-badge`;
    }

    if (isDark) {
      return `${base} bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:text-white`;
    }
    return `${base} bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800`;
  };

  // Render a single leaf navigation link
  const renderNavLink = (item) => {
    const itemColor = getItemAccent(item);
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={Boolean(item.exact)}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) => getLinkClasses(isActive)}
      >
        {({ isActive }) => (
          <>
            <span
              className={getIconBadgeClasses(isActive)}
              style={isActive ? { backgroundColor: itemColor, color: '#ffffff' } : undefined}
            >
              <MuiIconResolver name={item.icon} size={resolvedIconSize} />
            </span>
            {!collapsed && (
              <span className="text-[13px] tracking-tight truncate flex-1">
                {item.label}
              </span>
            )}
            {isActive && !collapsed && (
              <span
                className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: itemColor }}
              />
            )}
          </>
        )}
      </NavLink>
    );
  };

  // Render a collapsible folder with sub-items
  const renderGroup = (group) => {
    const active = isGroupActive(group);
    const isOpen = openMenu === group.id;
    const groupColor = getItemAccent(group);
    const visibleChildren = (group.children || [])
      .filter(canDisplayItem)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (visibleChildren.length === 0) return null;

    if (collapsed) {
      return (
        <NavLink
          key={group.id}
          to={visibleChildren[0]?.to || '/'}
          onClick={onClose}
          title={group.label}
          className={({ isActive }) => getLinkClasses(isActive || active)}
        >
          {({ isActive }) => (
            <span
              className={getIconBadgeClasses(isActive || active)}
              style={isActive || active ? { backgroundColor: groupColor, color: '#ffffff' } : undefined}
            >
              <MuiIconResolver name={group.icon} size={resolvedIconSize} />
            </span>
          )}
        </NavLink>
      );
    }

    return (
      <DynamicCollapsibleNav
        key={group.id}
        label={group.label}
        iconName={group.icon}
        isOpen={isOpen}
        isActive={active}
        onToggle={() => toggleMenu(group.id)}
        collapsed={collapsed}
        isDark={isDark}
        badgeRadius={badgeRadius}
        accentHex={groupColor}
      >
        {visibleChildren.map((sub) => (
          <NavLink
            key={sub.id}
            to={sub.to}
            end={Boolean(sub.exact)}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 sidebar-nav-link ${
                isActive
                  ? isDark
                    ? 'bg-white/15 text-white font-bold'
                    : 'bg-indigo-50 text-indigo-700 font-bold'
                  : isDark
                  ? 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
                  : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-colors shrink-0 ${
                    isActive
                      ? 'bg-indigo-500'
                      : isDark
                      ? 'bg-slate-600 group-hover:bg-slate-400'
                      : 'bg-slate-300 group-hover:bg-indigo-500'
                  }`}
                  style={isActive ? { backgroundColor: groupColor } : undefined}
                />
                <MuiIconResolver name={sub.icon} size={Math.max(12, resolvedIconSize - 3)} className="shrink-0" />
                <span className="truncate">{sub.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </DynamicCollapsibleNav>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed z-40 flex h-full flex-col dynamic-themed-sidebar border-r
          transition-all duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarWidthClass}
          ${sidebarStyleClass}
        `}
      >
        {/* ── Brand Logo Header ── */}
        <div
          className={`flex items-center gap-3 py-4 border-b sidebar-divider ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          } ${collapsed ? 'justify-center px-2' : 'px-5'}`}
        >
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity min-w-0"
          >
            {companyInfo?.companyLogo ? (
              <img
                src={companyInfo.companyLogo}
                alt={companyInfo.companyName}
                className="h-9 w-9 shrink-0 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm"
              />
            ) : (
              <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: accentHex }}
              >
                {(companyInfo?.companyName || 'SP').slice(0, 2).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[14px] font-black leading-tight sidebar-brand-title tracking-tight truncate max-w-[170px]">
                  {companyInfo?.companyName || 'Sharp Plus'}
                </p>
                <p
                  className="text-[10px] sidebar-brand-sub mt-0.5 tracking-wide font-semibold uppercase truncate max-w-[170px]"
                  style={{ color: isDark ? '#38bdf8' : accentHex }}
                >
                  {companyInfo?.tradeName ? companyInfo.tradeName : 'Trading & Stock'}
                </p>
              </div>
            )}
          </NavLink>
        </div>

        {/* ── Nav Sections ── */}
        <nav className="relative flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-2 scrollbar-thin scrollbar-track-transparent">
          {/* Main Section */}
          {sections.main.length > 0 && (
            <>
              <SectionLabel collapsed={collapsed} isDark={isDark} showHeaders={activeTheme?.showSectionHeaders !== false}>
                Main
              </SectionLabel>
              {sections.main.map((item) =>
                item.isGroup ? renderGroup(item) : renderNavLink(item)
              )}
            </>
          )}

          {/* Operations Section */}
          {sections.operations.length > 0 && (
            <>
              <SectionLabel collapsed={collapsed} isDark={isDark} showHeaders={activeTheme?.showSectionHeaders !== false}>
                Operations
              </SectionLabel>
              {sections.operations.map((item) =>
                item.isGroup ? renderGroup(item) : renderNavLink(item)
              )}
            </>
          )}

          {/* Developer Console (Exclusive to Developer Role) */}
          {user?.role === 'developer' && (
            <>
              <SectionLabel collapsed={collapsed} isDark={isDark} showHeaders={activeTheme?.showSectionHeaders !== false}>
                Platform Owner
              </SectionLabel>
              <NavLink
                to="/developer-console"
                onClick={onClose}
                title="System Developer Console"
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md'
                      : isDark
                      ? 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/40'
                      : 'bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center ${badgeRadius} transition-all ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isDark
                          ? 'bg-indigo-900 text-indigo-200'
                          : 'bg-indigo-200/70 text-indigo-800'
                      }`}
                    >
                      <Building2 size={15} strokeWidth={2.5} />
                    </span>
                    {!collapsed && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[13px] font-bold">Developer Console</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-700 text-white uppercase tracking-wider">
                          Owner
                        </span>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </>
          )}

          {/* Admin & System Section */}
          {sections.admin.length > 0 && (
            <>
              <SectionLabel collapsed={collapsed} isDark={isDark} showHeaders={activeTheme?.showSectionHeaders !== false}>
                Admin &amp; System
              </SectionLabel>
              {sections.admin.map((item) =>
                item.isGroup ? renderGroup(item) : renderNavLink(item)
              )}
            </>
          )}
        </nav>

        {/* ── Footer Quick Icons ── */}
        <div
          className={`border-t sidebar-divider p-2.5 flex items-center ${
            collapsed ? 'justify-center' : 'justify-around'
          } ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'}`}
        >
          <NavLink
            to="/settings?tab=sidebar"
            title="Sidebar & Theme Customization"
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <MuiIconResolver name="TuneRounded" size={17} />
          </NavLink>
          <NavLink
            to="/settings"
            title="System Settings"
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <MuiIconResolver name="SettingsRounded" size={17} />
          </NavLink>
          {!collapsed && (
            <>
              <NavLink
                to="/stock-requests"
                title="Issues & Requests"
                className={`p-1.5 rounded-lg transition ${
                  isDark
                    ? 'hover:bg-white/10 hover:text-white'
                    : 'hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <MuiIconResolver name="CallSplitRounded" size={17} />
              </NavLink>
              <NavLink
                to="/settings?tab=security"
                title="Security & Passwords"
                className={`p-1.5 rounded-lg transition ${
                  isDark
                    ? 'hover:bg-white/10 hover:text-white'
                    : 'hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Lock size={15} />
              </NavLink>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
