import React, { useState, useMemo } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit2,
  Folder,
  Layers,
  Sparkles,
  Search,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Lock,
  Maximize2,
  LayoutGrid,
  Paintbrush,
  Undo2,
  ChevronRight,
  ChevronDown,
  Monitor,
} from 'lucide-react';
import {
  useThemeSidebar,
  THEMES,
  ACCENT_COLORS,
  ICON_STYLES,
  ICON_BADGE_SHAPES,
  SIDEBAR_STYLES,
  SIDEBAR_WIDTHS,
  MENU_SPACINGS,
  ICON_SIZES,
} from '../../context/ThemeSidebarContext';
import { useAuth } from '../../context/AuthContext';
import MuiIconResolver, {
  AVAILABLE_MUI_ICONS,
  AVAILABLE_ICON_LIBRARIES,
} from '../common/MuiIconResolver';
import Card from '../ui/Card';

export default function SidebarThemeSettings() {
  const { user } = useAuth();
  const {
    activeTheme,
    activeSidebar,
    themeConfig,
    sidebarConfig,
    saveThemeAndSidebar,
    resetToDefaults,
    setPreviewTheme,
    setPreviewSidebar,
    saving,
  } = useThemeSidebar();

  // Role check: Only System Owner (admin) or Developer can modify global appearance
  const isOwnerOrDev = user?.role === 'developer' || user?.role === 'admin';

  // Local working copy for settings editing
  const [localTheme, setLocalTheme] = useState(() => ({ ...activeTheme }));
  const [localSidebar, setLocalSidebar] = useState(() => JSON.parse(JSON.stringify(activeSidebar)));

  // Notification feedback
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Icon Selector Modal State
  const [iconModal, setIconModal] = useState({
    isOpen: false,
    itemId: null,
    parentId: null,
    currentIcon: '',
    searchQuery: '',
    selectedCategory: 'All',
    selectedLibrary: 'all',
  });

  // Edit Item Modal State (for label, route, etc.)
  const [editingItem, setEditingItem] = useState(null);

  // Preview interactive state
  const [previewOpenGroup, setPreviewOpenGroup] = useState('storeOps');

  // Update theme option with live preview
  const handleThemeChange = (field, value) => {
    if (!isOwnerOrDev) return;
    const updated = { ...localTheme, [field]: value };
    setLocalTheme(updated);
    setPreviewTheme(updated); // Live preview across the app immediately
  };

  // Update sidebar items with live preview
  const handleSidebarChange = (updatedItems) => {
    if (!isOwnerOrDev) return;
    setLocalSidebar(updatedItems);
    setPreviewSidebar(updatedItems); // Live preview across the app immediately
  };

  // Reordering helpers
  const moveItem = (index, direction, parentId = null) => {
    if (!isOwnerOrDev) return;
    if (parentId) {
      const updated = localSidebar.map((parent) => {
        if (parent.id !== parentId || !parent.children) return parent;
        const list = [...parent.children];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= list.length) return parent;
        const [moved] = list.splice(index, 1);
        list.splice(targetIndex, 0, moved);
        return {
          ...parent,
          children: list.map((item, idx) => ({ ...item, order: idx + 1 })),
        };
      });
      handleSidebarChange(updated);
    } else {
      const list = [...localSidebar];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return;
      const [moved] = list.splice(index, 1);
      list.splice(targetIndex, 0, moved);
      const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
      handleSidebarChange(updated);
    }
  };

  // Visibility toggle
  const toggleVisibility = (id, parentId = null) => {
    if (!isOwnerOrDev) return;
    if (parentId) {
      const updated = localSidebar.map((parent) => {
        if (parent.id !== parentId || !parent.children) return parent;
        return {
          ...parent,
          children: parent.children.map((child) =>
            child.id === id ? { ...child, visible: child.visible === false ? true : false } : child
          ),
        };
      });
      handleSidebarChange(updated);
    } else {
      const updated = localSidebar.map((item) =>
        item.id === id ? { ...item, visible: item.visible === false ? true : false } : item
      );
      handleSidebarChange(updated);
    }
  };

  // Hold / Inactive status toggle
  const toggleHold = (id, parentId = null) => {
    if (!isOwnerOrDev) return;
    if (parentId) {
      const updated = localSidebar.map((parent) => {
        if (parent.id !== parentId || !parent.children) return parent;
        return {
          ...parent,
          children: parent.children.map((child) => {
            if (child.id !== id) return child;
            const newHold = !child.onHold;
            return { ...child, onHold: newHold, disabled: newHold };
          }),
        };
      });
      handleSidebarChange(updated);
    } else {
      const updated = localSidebar.map((item) => {
        if (item.id !== id) return item;
        const newHold = !item.onHold;
        return { ...item, onHold: newHold, disabled: newHold };
      });
      handleSidebarChange(updated);
    }
  };

  // Open Icon Modal
  const openIconPicker = (itemId, currentIcon, parentId = null) => {
    if (!isOwnerOrDev) return;
    setIconModal({
      isOpen: true,
      itemId,
      parentId,
      currentIcon: currentIcon || 'DashboardRounded',
      searchQuery: '',
      selectedCategory: 'All',
      selectedLibrary: 'all',
    });
  };

  // Select Icon from Modal
  const selectIcon = (iconName) => {
    if (!isOwnerOrDev) return;
    const { itemId, parentId } = iconModal;
    if (parentId) {
      const updated = localSidebar.map((parent) => {
        if (parent.id !== parentId || !parent.children) return parent;
        return {
          ...parent,
          children: parent.children.map((child) =>
            child.id === itemId ? { ...child, icon: iconName, iconType: 'mui' } : child
          ),
        };
      });
      handleSidebarChange(updated);
    } else {
      const updated = localSidebar.map((item) =>
        item.id === itemId ? { ...item, icon: iconName, iconType: 'mui' } : item
      );
      handleSidebarChange(updated);
    }
    setIconModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Save Item Label / Route Edit
  const saveItemEdit = (e) => {
    e.preventDefault();
    if (!isOwnerOrDev || !editingItem) return;
    const { id, parentId, label, to } = editingItem;

    if (parentId) {
      const updated = localSidebar.map((parent) => {
        if (parent.id !== parentId || !parent.children) return parent;
        return {
          ...parent,
          children: parent.children.map((child) =>
            child.id === id ? { ...child, label, to } : child
          ),
        };
      });
      handleSidebarChange(updated);
    } else {
      const updated = localSidebar.map((item) =>
        item.id === id ? { ...item, label, to: to || item.to } : item
      );
      handleSidebarChange(updated);
    }
    setEditingItem(null);
  };

  // Save everything to Database
  const handleSave = async () => {
    if (!isOwnerOrDev) {
      setFeedback({
        type: 'error',
        message: 'Only the System Owner or Developer can save global theme changes.',
      });
      return;
    }
    setFeedback({ type: '', message: '' });
    const res = await saveThemeAndSidebar(localTheme, localSidebar);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Theme and sidebar configurations successfully saved to database & activated across the system!',
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
    } else {
      let errorMsg = res.error || 'Failed to persist theme settings.';
      if (errorMsg.includes('500') || errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = 'Backend server communication error. Please ensure the backend server is running on port 5000 and database connection is healthy.';
      }
      setFeedback({
        type: 'error',
        message: errorMsg,
      });
    }
  };

  // Discard live preview
  const handleDiscard = () => {
    setLocalTheme({ ...themeConfig });
    setLocalSidebar(JSON.parse(JSON.stringify(sidebarConfig)));
    setPreviewTheme(null);
    setPreviewSidebar(null);
    setFeedback({
      type: 'info',
      message: 'Reverted unapplied preview changes back to active configuration.',
    });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
  };

  // Reset to default
  const handleReset = async () => {
    if (!isOwnerOrDev) return;
    if (
      !window.confirm(
        'Reset theme, icons, and sidebar layout to system defaults? Any customizations will be restored to factory settings.'
      )
    )
      return;
    const res = await resetToDefaults();
    if (res.success) {
      setLocalTheme({ ...activeTheme });
      setLocalSidebar(JSON.parse(JSON.stringify(activeSidebar)));
      setFeedback({
        type: 'success',
        message: 'Restored system defaults successfully.',
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    }
  };

  // Filter available icons for modal picker
  const categories = ['All', 'Core', 'Inventory', 'Operations', 'Sales', 'Analytics', 'Management'];
  const filteredIcons = useMemo(() => {
    return AVAILABLE_MUI_ICONS.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(iconModal.searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(iconModal.searchQuery.toLowerCase());
      const matchesCategory =
        iconModal.selectedCategory === 'All' || item.category === iconModal.selectedCategory;
      const matchesLibrary =
        iconModal.selectedLibrary === 'all' || item.library === iconModal.selectedLibrary;
      return matchesSearch && matchesCategory && matchesLibrary;
    });
  }, [iconModal.searchQuery, iconModal.selectedCategory, iconModal.selectedLibrary]);

  // Current selected theme swatch metadata
  const currentThemeMeta = THEMES.find((t) => t.id === localTheme.theme) || THEMES[0];
  const currentAccent = ACCENT_COLORS.find((a) => a.id === localTheme.accentColor) || ACCENT_COLORS[0];

  return (
    <div className="space-y-8">
      {/* ── Top Bar Action Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Palette size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Appearance &amp; Navigation Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Owner Controlled
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                Configure sidebar themes, accent colors, icon libraries, layout spacing, and dynamic menu structure with live preview and database persistence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isOwnerOrDev && (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
                title="Discard unsaved preview"
              >
                <Undo2 size={13} /> Discard
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition disabled:opacity-50"
                title="Reset to factory defaults"
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? 'Saving to Database…' : 'Save & Apply Globally'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Authorization Notice Banner (if not owner) ── */}
      {!isOwnerOrDev && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-medium text-amber-900">
          <Lock size={18} className="text-amber-600 shrink-0" />
          <div>
            <strong className="font-bold">Locked Mode:</strong> You are currently viewing in read-only mode. Only the authorized System Owner or Developer can modify and save global sidebar themes, icon libraries, and layout styles.
          </div>
        </div>
      )}

      {/* ── Status Feedback Banner ── */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold ${feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedback.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : feedback.type === 'info' ? (
            <Sparkles size={18} className="text-blue-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── SECTION 1: THEME SELECTION (All 12 Curated Themes) ── */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Sparkles size={14} />
              </span>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                1. Select Sidebar &amp; Application Theme
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose from 12 best-in-class themes. Live previews update immediately across the sidebar, cards, active borders, and badges.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Active: <strong className="text-indigo-600">{currentThemeMeta.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {THEMES.map((theme) => {
            const isSelected = localTheme.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange('theme', theme.id)}
                disabled={!isOwnerOrDev}
                className={`relative flex flex-col items-start text-left p-3.5 rounded-2xl border-2 transition-all ${isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                  } ${!isOwnerOrDev ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {/* Visual Swatch Card */}
                <div
                  className="w-full h-24 rounded-xl border mb-3 p-2.5 flex flex-col justify-between shadow-inner overflow-hidden"
                  style={{
                    background: theme.sidebarBg,
                    borderColor: theme.border,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-3.5 w-3.5 rounded-full shadow-xs"
                        style={{
                          backgroundColor:
                            theme.id === 'white'
                              ? '#4f46e5'
                              : theme.id === 'emerald'
                                ? '#10b981'
                                : theme.id === 'purple'
                                  ? '#c084fc'
                                  : theme.id === 'warm'
                                    ? '#f59e0b'
                                    : theme.id === 'teal'
                                      ? '#2dd4bf'
                                      : theme.id === 'burgundy'
                                        ? '#fb7185'
                                        : '#38bdf8',
                        }}
                      />
                      <div
                        className="h-2 w-12 rounded-full opacity-60"
                        style={{
                          backgroundColor: theme.id === 'white' ? '#94a3b8' : '#ffffff',
                        }}
                      />
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                        <Check size={18} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Mock Menu Lines */}
                  <div className="space-y-1">
                    <div
                      className="h-2 w-3/4 rounded-sm"
                      style={{
                        backgroundColor:
                          theme.id === 'white'
                            ? '#e2e8f0'
                            : 'rgba(255, 255, 255, 0.35)',
                      }}
                    />
                    <div
                      className="h-2 w-1/2 rounded-sm"
                      style={{
                        backgroundColor:
                          theme.id === 'white' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.15)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <p className="text-xs font-black text-slate-900">{theme.name}</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── SECTION 2: ACCENTS & ICON CUSTOMIZATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accent Colors */}
        <Card className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Theme Accent Color</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Highlight color for active menu pills, notification dots, and focus rings.
          </p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((col) => {
              const isSelected = (localTheme.accentColor || 'indigo') === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleThemeChange('accentColor', col.id)}
                  disabled={!isOwnerOrDev}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${isSelected
                      ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span>{col.name}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Icon Badge Shape */}
        <Card className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Icon Badge Contour</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Shape silhouette surrounding icons in navigation items.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ICON_BADGE_SHAPES.map((shape) => {
              const isSelected = (localTheme.iconBadgeShape || 'squircle') === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => handleThemeChange('iconBadgeShape', shape.id)}
                  disabled={!isOwnerOrDev}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center bg-indigo-600 text-white text-[10px] ${shape.radius}`}
                  >
                    ★
                  </span>
                  <span>{shape.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Material Icon Style */}
        <Card className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-1">Icon Style Aesthetics</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Contour rendering style for Google Material Symbols.
          </p>
          <div className="space-y-1.5">
            {ICON_STYLES.map((style) => {
              const isSelected = (localTheme.iconStyle || 'rounded') === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleThemeChange('iconStyle', style.id)}
                  disabled={!isOwnerOrDev}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition ${isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span>{style.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{style.description}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── SECTION 3: ADVANCED LAYOUT CONTROLS & LIVE MINIATURE PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layout Options (2 cols) */}
        <Card className="p-6 lg:col-span-2 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders size={16} className="text-indigo-600" />
              <span>3. Sidebar Layout, Dimensions &amp; Typography</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize width dimensions, floating rounded borders, icon sizes, and menu vertical spacing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Sidebar Width */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sidebar Width Dimension
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SIDEBAR_WIDTHS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleThemeChange('sidebarWidth', w.id)}
                    disabled={!isOwnerOrDev}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition ${(localTheme.sidebarWidth || 'normal') === w.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-2xs font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Container Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sidebar Style &amp; Frame
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {SIDEBAR_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleThemeChange('sidebarStyle', st.id)}
                    disabled={!isOwnerOrDev}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-medium transition ${(localTheme.sidebarStyle || 'standard') === st.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <span>{st.label}</span>
                    <span className="text-[10px] text-slate-400">{st.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Spacing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Menu Item Vertical Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MENU_SPACINGS.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleThemeChange('menuSpacing', sp.id)}
                    disabled={!isOwnerOrDev}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center transition ${(localTheme.menuSpacing || 'comfortable') === sp.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Sizing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Icon Size &amp; Scale
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ICON_SIZES.map((is) => (
                  <button
                    key={is.id}
                    type="button"
                    onClick={() => handleThemeChange('iconSize', is.id)}
                    disabled={!isOwnerOrDev}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center transition ${(localTheme.iconSize || 'medium') === is.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {is.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            {/* Compact Sidebar Default */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={Boolean(localTheme.sidebarCompact)}
                onChange={(e) => handleThemeChange('sidebarCompact', e.target.checked)}
                disabled={!isOwnerOrDev}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Compact Icon Mode
              </span>
            </label>

            {/* Colorful Line Icons */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={Boolean(localTheme.colorfulIcons)}
                onChange={(e) => handleThemeChange('colorfulIcons', e.target.checked)}
                disabled={!isOwnerOrDev}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Colorful Line Icons
              </span>
            </label>

            {/* Show Section Headers */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={localTheme.showSectionHeaders !== false}
                onChange={(e) => handleThemeChange('showSectionHeaders', e.target.checked)}
                disabled={!isOwnerOrDev}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Section Group Headers
              </span>
            </label>
          </div>
        </Card>

        {/* Live Miniature Preview Box (1 col) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Monitor size={14} className="text-indigo-600" />
                <span>Live Preview</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Interactive
              </span>
            </div>

            {/* Mock Mini Sidebar */}
            <div
              className={`rounded-2xl border p-3 shadow-lg transition-all overflow-hidden ${localTheme.sidebarStyle === 'floating' ? 'ring-2 ring-indigo-500/20' : ''
                }`}
              style={{
                background: currentThemeMeta.sidebarBg,
                borderColor: currentThemeMeta.border,
                color: currentThemeMeta.textColor,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 border-b pb-2 mb-2" style={{ borderColor: currentThemeMeta.border }}>
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                  style={{ backgroundColor: currentAccent.hex }}
                >
                  SP
                </div>
                <div>
                  <p className="text-xs font-black leading-none truncate" style={{ color: currentThemeMeta.textColor }}>
                    Sharp Plus
                  </p>
                  <p className="text-[9px] opacity-75 font-semibold">Trading System</p>
                </div>
              </div>

              {/* Mock Nav Items */}
              <div className="space-y-1 text-xs">
                {localTheme.showSectionHeaders !== false && (
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 px-1 pt-1">
                    Main
                  </p>
                )}

                {/* Dashboard (Active) */}
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg font-bold shadow-2xs"
                  style={{
                    backgroundColor: currentAccent.hex,
                    color: '#ffffff',
                  }}
                >
                  <MuiIconResolver name="DashboardRounded" size={13} />
                  <span className="text-[11px] truncate">Dashboard</span>
                </div>

                {/* Items */}
                <div
                  className="flex items-center gap-2 px-2 py-1 rounded-lg opacity-80 hover:opacity-100 transition"
                  style={{ color: currentThemeMeta.textColor }}
                >
                  <MuiIconResolver name="Inventory2Rounded" size={13} />
                  <span className="text-[11px] truncate">Items</span>
                </div>

                {/* Operations folder */}
                <div
                  className="flex items-center justify-between px-2 py-1 rounded-lg opacity-80 hover:opacity-100 transition cursor-pointer"
                  onClick={() => setPreviewOpenGroup((prev) => (prev ? null : 'storeOps'))}
                  style={{ color: currentThemeMeta.textColor }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MuiIconResolver name="AllInboxRounded" size={13} />
                    <span className="text-[11px] font-medium truncate">Store Operations</span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform ${previewOpenGroup ? 'rotate-180' : ''}`} />
                </div>

                {/* Sub-items */}
                {previewOpenGroup && (
                  <div className="ml-4 pl-1.5 border-l space-y-1 opacity-90" style={{ borderColor: currentThemeMeta.border }}>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: currentAccent.hex }} />
                      <span className="truncate">Movements</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="h-1 w-1 rounded-full opacity-40" style={{ backgroundColor: currentAccent.hex }} />
                      <span className="truncate">Consumption</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            The actual left sidebar updates live as you tweak settings above.
          </div>
        </Card>
      </div>

      {/* ── SECTION 4: NAVIGATION MENU ITEMS & ORDERING MANAGEMENT ── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Sliders size={14} />
              </span>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                4. Navigation Menu Ordering, Labels, Routes &amp; Icons
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reorder items using ▲ and ▼, rename menu labels, change routes, assign icons from Google Material Symbols, Lucide, Tabler, Iconoir or Font Awesome.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {localSidebar.length} Top-level Items
          </span>
        </div>

        {/* Tree Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-12 text-center">Order</th>
                <th className="py-3 px-4 w-16 text-center">Icon</th>
                <th className="py-3 px-4">Menu Label</th>
                <th className="py-3 px-4">Target Route / Type</th>
                <th className="py-3 px-4 w-44 text-center">Visibility &amp; Status</th>
                <th className="py-3 px-4 w-32 text-center">Reorder</th>
                <th className="py-3 px-4 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localSidebar.map((item, index) => {
                const isGroup = Boolean(item.isGroup);
                const isVisible = item.visible !== false;

                return (
                  <React.Fragment key={item.id}>
                    {/* Top-Level Item Row */}
                    <tr
                      className={`hover:bg-slate-50/60 transition ${!isVisible ? 'opacity-40 bg-slate-50/40' : ''
                        }`}
                    >
                      {/* Order Index */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {item.order || index + 1}
                      </td>

                      {/* Icon with Picker Trigger */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openIconPicker(item.id, item.icon)}
                          disabled={!isOwnerOrDev}
                          className="group relative flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition mx-auto shadow-2xs border border-slate-200"
                          title="Click to change icon"
                        >
                          <MuiIconResolver name={item.icon} size={16} />
                          {isOwnerOrDev && (
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] text-white opacity-0 group-hover:opacity-100 transition">
                              ✎
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Label */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {isGroup && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              Folder
                            </span>
                          )}
                          <span className="text-[13px]">{item.label}</span>
                        </div>
                      </td>

                      {/* Target Route */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {isGroup ? (
                          <span className="text-slate-400 italic">
                            Accordion ({item.children?.length || 0} sub-items)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            {item.to}
                          </span>
                        )}
                      </td>

                      {/* Visibility & Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => toggleVisibility(item.id)}
                            disabled={!isOwnerOrDev}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${isVisible
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                          >
                            {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            {isVisible ? 'Visible' : 'Hidden'}
                          </button>
                          {!isGroup && (
                            <button
                              type="button"
                              onClick={() => toggleHold(item.id)}
                              disabled={!isOwnerOrDev}
                              title={item.onHold ? 'Currently On Hold. Click to activate' : 'Click to put on hold'}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${item.onHold
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                              {item.onHold ? 'On Hold' : 'Active'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Reorder Up/Down */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(index, -1)}
                            disabled={!isOwnerOrDev || index === 0}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition"
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 1)}
                            disabled={!isOwnerOrDev || index === localSidebar.length - 1}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition"
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {isOwnerOrDev ? (
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...item })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition border border-blue-200"
                          >
                            <Edit2 size={11} /> Edit
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Locked</span>
                        )}
                      </td>
                    </tr>

                    {/* Sub-Items (if folder/group) */}
                    {isGroup &&
                      item.children &&
                      item.children.map((child, childIdx) => {
                        const childVisible = child.visible !== false;
                        return (
                          <tr
                            key={child.id}
                            className={`bg-slate-50/40 hover:bg-indigo-50/20 transition ${!childVisible ? 'opacity-40' : ''
                              }`}
                          >
                            <td className="py-2.5 px-4 text-center font-medium text-slate-400 pl-6">
                              {index + 1}.{childIdx + 1}
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => openIconPicker(child.id, child.icon, item.id)}
                                disabled={!isOwnerOrDev}
                                className="group relative flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition mx-auto shadow-2xs border border-slate-200"
                                title="Change sub-item icon"
                              >
                                <MuiIconResolver name={child.icon} size={14} />
                              </button>
                            </td>

                            <td className="py-2.5 px-4 pl-8 font-medium text-slate-700">
                              <span className="text-slate-300 mr-2">↳</span>
                              <span>{child.label}</span>
                            </td>

                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                                {child.to}
                              </span>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => toggleVisibility(child.id, item.id)}
                                  disabled={!isOwnerOrDev}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${childVisible
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                    }`}
                                >
                                  {childVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                                  {childVisible ? 'Visible' : 'Hidden'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleHold(child.id, item.id)}
                                  disabled={!isOwnerOrDev}
                                  title={child.onHold ? 'Currently On Hold. Click to activate' : 'Click to put on hold'}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${child.onHold
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                  {child.onHold ? 'On Hold' : 'Active'}
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveItem(childIdx, -1, item.id)}
                                  disabled={!isOwnerOrDev || childIdx === 0}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 transition"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(childIdx, 1, item.id)}
                                  disabled={!isOwnerOrDev || childIdx === item.children.length - 1}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 transition"
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              {isOwnerOrDev ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingItem({ ...child, parentId: item.id })}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                >
                                  Edit
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">Locked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── SELECTABLE ICON LIBRARY MODAL (Material, Lucide, Tabler, Iconoir, Font Awesome) ── */}
      {iconModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Selectable Icon Library
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Google Material Symbols, Lucide, Tabler, Iconoir &amp; Font Awesome.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIconModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Library Filters */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={iconModal.searchQuery}
                  onChange={(e) =>
                    setIconModal((prev) => ({ ...prev, searchQuery: e.target.value }))
                  }
                  placeholder="Search icons by name or function (e.g. Dashboard, Inventory, POS, Card, Box, Archive)..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  autoFocus
                />
              </div>

              {/* Library Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {AVAILABLE_ICON_LIBRARIES.map((lib) => (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() =>
                      setIconModal((prev) => ({ ...prev, selectedLibrary: lib.id }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${iconModal.selectedLibrary === lib.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {lib.label}
                  </button>
                ))}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Category:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setIconModal((prev) => ({ ...prev, selectedCategory: cat }))
                    }
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition whitespace-nowrap ${iconModal.selectedCategory === cat
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {filteredIcons.map((item) => {
                const isSelected = iconModal.currentIcon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectIcon(item.key)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition group ${isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition mb-1.5 shadow-2xs">
                      <MuiIconResolver name={item.key} size={22} />
                    </span>
                    <span className="text-[11px] font-bold truncate max-w-full leading-tight">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 px-1 rounded bg-slate-100">
                        {item.library}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredIcons.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <p className="font-semibold text-sm">No icons matched "{iconModal.searchQuery}"</p>
                  <p className="text-xs mt-1">Try another search keyword or switch library filter to 'All'</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredIcons.length} available icons</span>
              <button
                type="button"
                onClick={() => setIconModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MENU ITEM MODAL (Label & Route) ── */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900">
                Edit Menu Item: {editingItem.label}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveItemEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Menu Display Label *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.label}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, label: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  placeholder="e.g. Dashboard, Inventory Box, Stock Records"
                />
              </div>

              {!editingItem.isGroup && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Route URL Target
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.to || ''}
                    onChange={(e) =>
                      setEditingItem((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-mono outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    placeholder="/materials, /transactions, /reports..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Matches application routes in React Router.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => openIconPicker(editingItem.id, editingItem.icon, editingItem.parentId)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  <MuiIconResolver name={editingItem.icon} size={15} /> Change Icon
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs transition"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
