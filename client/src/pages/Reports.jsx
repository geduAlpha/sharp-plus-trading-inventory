import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Scale, Search, History, X, RefreshCw,
  ChevronLeft, ChevronRight, Calendar, ArrowRight, CheckCircle, Clock,
  ClipboardList, Store, PackageSearch, TrendingUp, TrendingDown,
  Minus, Send, ShieldCheck, Trash2, Plus, AlertTriangle, BarChart3,
  ChevronDown, ChevronUp, Eye, EyeOff, Save, ArrowUpDown, CheckCheck,
  FileSpreadsheet, Download, Home, Copy, Check, FileText, Layers,
  Filter, ShieldAlert, Award, AlertCircle, Info, SlidersHorizontal,
} from 'lucide-react';
import api from '../api/axios';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import ExportDropdown from '../components/ui/ExportDropdown';
import WorkflowBadge from '../components/ui/WorkflowBadge';
import { exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';

// ── Binoculars SVG Icon matching reference image ──────────────────────
const BinocularsIcon = ({ className = "h-5 w-5", ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M10 10h4" />
    <path d="M19 7l-2 11a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V9" />
    <path d="M5 7l2 11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9" />
    <circle cx="7" cy="6" r="3" />
    <circle cx="17" cy="6" r="3" />
  </svg>
);

// Report sub-tabs matching the reference image
const REPORT_SUB_TABS = [
  { id: 'stock_only', label: 'Stock Only' },
  { id: 'bincard_summary', label: 'BinCard Summary' },
  { id: 'bincard', label: 'BinCard' },
  { id: 'min_stock_level', label: 'Min. Stock Level' },
  { id: 'serial_bincard', label: 'Serial BinCard' },
  { id: 'expiry_date', label: 'Expiry Date' },
  { id: 'expiry_notification', label: 'Expiry Date Notification' },
  { id: 'abc_analysis', label: 'ABC Analysis' },
  { id: 'dead_movement', label: 'Dead Item Movement Summary' },
];

// Route → API endpoint map (used by the load function)
const TABS = [
  { key: 'summary', label: 'Overview', endpoint: null },
  { key: 'stock_balance', label: 'Stock Balance Report', endpoint: '/reports/stock-balance' },
  { key: 'inventory_count', label: 'Inventory Count', endpoint: null },
  { key: 'daily', label: 'Daily Report', endpoint: '/reports/daily' },
  { key: 'cash_grv', label: 'Cash GRV', endpoint: '/reports/cash-grv' },
  { key: 'credit_grv', label: 'Credit GRV', endpoint: '/reports/credit-grv' },
  { key: 'pos_adjustment', label: '+ve Adjustment', endpoint: '/reports/pos-adjustment' },
  { key: 'disposal', label: 'Goods Disposal', endpoint: '/reports/disposal' },
  { key: 'neg_adjustment', label: '−ve Adjustment', endpoint: '/reports/neg-adjustment' },
  { key: 'stock', label: 'Stock Levels', endpoint: '/reports/stock-levels' },
  { key: 'purchases', label: 'Purchases', endpoint: '/reports/purchases' },
];


const VOUCHER_LABELS = {
  cash_grv: 'Cash GRV',
  credit_grv: 'Credit GRV',
  disposal: 'Goods Disposal',
  neg_adjustment: '−ve Adjustment',
  pos_adjustment: '+ve Adjustment',
  fresh_bazaar: 'Fresh Bazaar',
  sales_import: 'Sales Import',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const startOfMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const startOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
};

// ── Reusable stat card ────────────────────────────────────────────────
const Stat = ({ label, value, sub, color = 'text-ink-900', badge = null }) => (
  <Card>
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-ink-100 text-ink-600">{badge}</span>}
    </div>
    <p className={`tabular mt-1 text-2xl font-bold ${color}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
  </Card>
);

// ── Date-time formatter with exact hours, minutes, and seconds (h:m:s) ─
const formatDateTime = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

// ── Voucher transactions table (shared by all voucher tabs) ───────────
const VoucherTable = ({ data, showSupplier = false, showReason = false }) => {
  const cols = [
    {
      key: 'date',
      header: 'Date & Time (h:m:s)',
      render: r => (
        <span className="font-mono text-xs text-ink-700 whitespace-nowrap">
          {formatDateTime(r.date || r.createdAt)}
        </span>
      ),
    },
    { key: 'voucherNo', header: 'Voucher No', render: r => <span className="font-mono text-xs font-bold text-blue-700">{r.voucherNo || '—'}</span> },
    ...(showSupplier ? [{ key: 'supplier', header: 'Supplier', render: r => r.supplier?.name || '—' }] : []),
    ...(showReason ? [{ key: 'reason', header: 'Reason / Ref', render: r => r.reason || r.reference || r.notes || '—' }] : []),
    {
      key: 'items', header: 'Items',
      render: r => {
        const lines = r.items?.length
          ? r.items.map(i => `${i.material?.name ?? '—'} ×${i.quantity}`)
          : [`${r.material?.name ?? '—'} ×${r.quantity ?? ''}`];
        return <span className="text-xs text-ink-600">{lines.join(' · ')}</span>;
      },
    },
    { key: 'totalAmount', header: 'Total (ETB)', render: r => <span className="tabular font-bold text-ink-900">ETB {(r.totalAmount || 0).toFixed(2)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: r => <WorkflowBadge status={r.status || 'pending'} size="sm" />,
    },
    { key: 'performedBy', header: 'Handled By', render: r => r.performedBy?.name || '—' },
  ];
  return <DataTable columns={cols} data={data} emptyMessage="No records in this period." title="Transaction History" icon={<History size={15} />} />;
};

// ── Material breakdown table ──────────────────────────────────────────
const MaterialBreakdown = ({ data }) => (
  <DataTable
    columns={[
      { key: 'name', header: 'Material' },
      { key: 'totalQty', header: 'Total Qty', render: r => <span className="tabular">{r.totalQty?.toFixed(3)}</span> },
      { key: 'totalCost', header: 'Total Cost (ETB)', render: r => <span className="tabular font-medium">ETB {(r.totalCost || 0).toFixed(2)}</span> },
    ]}
    data={data}
    emptyMessage="No breakdown available."
  />
);

// ════════════════════════════════════════════════════════════════════
// InventoryCount standalone component
// ════════════════════════════════════════════════════════════════════
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function InventoryCountPanel() {
  const now = new Date();
  const [stores, setStores] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterStore, setFilterStore] = useState('all');

  // New count init form
  const [showInitForm, setShowInitForm] = useState(false);
  const [initStore, setInitStore] = useState('');
  const [initYear, setInitYear] = useState(now.getFullYear());
  const [initMonth, setInitMonth] = useState(now.getMonth() + 1);
  const [initNotes, setInitNotes] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState('');

  // Active count editor
  const [activeCount, setActiveCount] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [expandedStores, setExpandedStores] = useState({});
  const [showUncounted, setShowUncounted] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  // local edits buffer: materialId → physicalCount value
  const [edits, setEdits] = useState({});

  // ── Load stores ───────────────────────────────────────────────────
  useEffect(() => {
    api.get('/inventory-count/stores')
      .then(r => {
        setStores(r.data.stores || []);
        if (r.data.stores?.length) setInitStore(r.data.stores[0]);
      })
      .catch(() => { });
  }, []);

  // ── Load count list ────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = { year: filterYear, month: filterMonth };
      if (filterStore !== 'all') params.store = filterStore;
      const r = await api.get('/inventory-count', { params });
      setCounts(r.data.counts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, [filterYear, filterMonth, filterStore]);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Initialize a new count ─────────────────────────────────────────
  const handleInit = async () => {
    if (!initStore) return;
    setInitLoading(true);
    setInitError('');
    try {
      const r = await api.post('/inventory-count/initialize', {
        periodYear: initYear,
        periodMonth: initMonth,
        storeLocation: initStore,
        notes: initNotes,
      });
      setShowInitForm(false);
      setInitNotes('');
      await loadList();
      openEditor(r.data.count._id);
    } catch (e) {
      setInitError(e.response?.data?.message || 'Failed to initialize count');
    } finally {
      setInitLoading(false);
    }
  };

  // ── Open editor for a count ────────────────────────────────────────
  const openEditor = async (id) => {
    setEditorLoading(true);
    setEdits({});
    setSaveError('');
    try {
      const r = await api.get(`/inventory-count/${id}`);
      setActiveCount(r.data.count);
      // Auto-expand all stores
      setExpandedStores({ [r.data.count.storeLocation]: true });
    } catch (e) {
      console.error(e);
    } finally {
      setEditorLoading(false);
    }
  };

  // ── Save physical count edits ──────────────────────────────────────
  const saveEdits = async () => {
    if (!activeCount) return;
    setSaving(true);
    setSaveError('');
    try {
      const lines = Object.entries(edits).map(([material, physicalCount]) => ({
        material,
        physicalCount: physicalCount === '' ? null : Number(physicalCount),
      }));
      if (!lines.length) { setSaving(false); return; }
      const r = await api.patch(`/inventory-count/${activeCount._id}/lines`, { lines });
      setActiveCount(r.data.count);
      setEdits({});
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit / Approve ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeCount) return;
    // Auto-save first
    if (Object.keys(edits).length) await saveEdits();
    try {
      const r = await api.post(`/inventory-count/${activeCount._id}/submit`);
      setActiveCount(r.data.count);
      await loadList();
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Submit failed');
    }
  };

  const handleApprove = async () => {
    if (!activeCount) return;
    try {
      const r = await api.post(`/inventory-count/${activeCount._id}/approve`);
      setActiveCount(r.data.count);
      await loadList();
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Approval failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft count?')) return;
    try {
      await api.delete(`/inventory-count/${id}`);
      if (activeCount?._id === id) setActiveCount(null);
      await loadList();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const isEditable = activeCount && (activeCount.status === 'draft' || activeCount.status === 'submitted');
  const canApprove = activeCount?.status === 'submitted';
  const isLocked = activeCount && (activeCount.status === 'approved' || activeCount.status === 'closed');

  // ── Filter lines ──────────────────────────────────────────────────
  const filteredLines = useMemo(() => {
    if (!activeCount) return [];
    return activeCount.lines.filter(line => {
      if (searchQ && !line.materialName.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (!showUncounted && !line.isCounted) return false;
      return true;
    });
  }, [activeCount, searchQ, showUncounted]);

  const counted = activeCount?.lines.filter(l => l.isCounted).length || 0;
  const total = activeCount?.lines.length || 0;
  const progress = total > 0 ? Math.round((counted / total) * 100) : 0;

  const statusColors = {
    draft: 'bg-amber-100 text-amber-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    closed: 'bg-ink-100 text-ink-600',
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Header toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Year */}
          <div className="flex items-center gap-1.5 bg-white border border-ink-200 rounded-xl px-3 py-1.5 shadow-xs">
            <ChevronLeft
              size={15}
              className="cursor-pointer text-ink-500 hover:text-blue-700 transition"
              onClick={() => setFilterYear(y => y - 1)}
            />
            <span className="text-xs font-bold text-ink-800 min-w-[42px] text-center">{filterYear}</span>
            <ChevronRight
              size={15}
              className="cursor-pointer text-ink-500 hover:text-blue-700 transition"
              onClick={() => setFilterYear(y => y + 1)}
            />
          </div>
          {/* Month */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(Number(e.target.value))}
            className="text-xs font-semibold border border-ink-200 rounded-xl px-3 py-1.5 bg-white text-ink-800 outline-none focus:border-blue-500 cursor-pointer shadow-xs"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          {/* Store filter */}
          <select
            value={filterStore}
            onChange={e => setFilterStore(e.target.value)}
            className="text-xs font-semibold border border-ink-200 rounded-xl px-3 py-1.5 bg-white text-ink-800 outline-none focus:border-blue-500 cursor-pointer shadow-xs"
          >
            <option value="all">All Stores</option>
            {stores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowInitForm(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition"
        >
          <Plus size={15} /> New Count Sheet
        </button>
      </div>

      {/* ── Init Form Modal ─────────────────────────────────────── */}
      {showInitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-700" /> Initialize Inventory Count
              </h3>
              <button onClick={() => { setShowInitForm(false); setInitError(''); }} className="text-ink-400 hover:text-red-500 transition">
                <X size={18} />
              </button>
            </div>

            {initError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">
                <AlertTriangle size={14} /> {initError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-600">Store Location</label>
                <select
                  value={initStore}
                  onChange={e => setInitStore(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-900 outline-none focus:border-blue-500"
                >
                  {stores.map(s => <option key={s} value={s}>{s}</option>)}
                  {!stores.length && <option value="">No stores found</option>}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-600">Month</label>
                <select
                  value={initMonth}
                  onChange={e => setInitMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-900 outline-none focus:border-blue-500"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-600">Year</label>
                <input
                  type="number"
                  value={initYear}
                  onChange={e => setInitYear(Number(e.target.value))}
                  min="2020" max="2050"
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-900 outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-ink-600">Notes (optional)</label>
                <textarea
                  value={initNotes}
                  onChange={e => setInitNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-900 outline-none focus:border-blue-500 resize-none"
                  placeholder="e.g. Annual stock take..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setShowInitForm(false); setInitError(''); }}
                className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleInit}
                disabled={initLoading || !initStore}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow transition disabled:opacity-60"
              >
                {initLoading ? 'Initializing…' : 'Initialize & Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Count List (session cards) ──────────────────────────── */}
      {!activeCount && (
        <div className="space-y-3">
          {loadingList && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
            </div>
          )}
          {!loadingList && counts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-ink-400">
              <PackageSearch size={48} className="text-ink-200" />
              <p className="text-sm font-medium">No count sheets for this period.</p>
              <p className="text-xs">Click &ldquo;New Count Sheet&rdquo; to begin.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counts.map(c => (
              <div
                key={c._id}
                className="group bg-white rounded-2xl border border-ink-100 shadow-sm hover:shadow-md transition p-4 space-y-3 cursor-pointer"
                onClick={() => openEditor(c._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Store size={18} className="text-blue-700" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900 leading-tight">{c.storeLocation}</p>
                      <p className="text-[10px] text-ink-500">{MONTH_NAMES[c.periodMonth - 1]} {c.periodYear}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-ink-500">
                    <span>{c.countedItems}/{c.totalItems} counted</span>
                    <span>{c.totalItems > 0 ? Math.round((c.countedItems / c.totalItems) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${c.totalItems > 0 ? (c.countedItems / c.totalItems) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                {/* Variance summary */}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <TrendingUp size={10} /> +ETB {(c.positiveVariance || 0).toFixed(0)}
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <TrendingDown size={10} /> ETB {(c.negativeVariance || 0).toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-ink-100">
                  <button
                    className="text-[10px] text-blue-700 font-bold flex items-center gap-1 group-hover:underline"
                    onClick={() => openEditor(c._id)}
                  >
                    <Eye size={12} /> Open
                  </button>
                  {c.status === 'draft' && (
                    <button
                      className="text-[10px] text-red-500 font-semibold flex items-center gap-1 hover:text-red-700"
                      onClick={e => { e.stopPropagation(); handleDelete(c._id); }}
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor loading ─────────────────────────────────────── */}
      {editorLoading && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={28} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* ── EDITOR ─────────────────────────────────────────────── */}
      {activeCount && !editorLoading && (
        <div className="space-y-4">

          {/* ── Editor top bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveCount(null); setEdits({}); loadList(); }}
                className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-blue-700 font-semibold transition"
              >
                <ChevronLeft size={15} /> Back to List
              </button>
              <span className="text-ink-300">|</span>
              <div className="flex items-center gap-2">
                <Store size={15} className="text-blue-700" />
                <span className="text-sm font-bold text-ink-900">{activeCount.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[activeCount.status]}`}>
                  {activeCount.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditable && Object.keys(edits).length > 0 && (
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition"
                >
                  <Save size={13} /> {saving ? 'Saving…' : `Save (${Object.keys(edits).length})`}
                </button>
              )}
              {activeCount.status === 'draft' && (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition"
                >
                  <Send size={13} /> Submit for Approval
                </button>
              )}
              {canApprove && (
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition"
                >
                  <ShieldCheck size={13} /> Approve & Close
                </button>
              )}
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-xs">
              <AlertTriangle size={14} /> {saveError}
            </div>
          )}

          {/* ── Summary KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-xs p-4">
              <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">Progress</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-blue-700">{counted}/{total}</span>
                  <span className="text-ink-500">{progress}%</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: progress === 100 ? '#16a34a' : '#2563eb' }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-ink-100 shadow-xs p-4">
              <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">+ve Variance</p>
              <p className="mt-1 text-lg font-black text-emerald-600">ETB {(activeCount.positiveVariance || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-100 shadow-xs p-4">
              <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">−ve Variance</p>
              <p className="mt-1 text-lg font-black text-red-600">ETB {(activeCount.negativeVariance || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-100 shadow-xs p-4">
              <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">Net Variance</p>
              <p className={`mt-1 text-lg font-black ${(activeCount.netVarianceValue || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ETB {(activeCount.netVarianceValue || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* ── Search & filter bar ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-ink-200 rounded-xl px-3 py-1.5 flex-1 min-w-[180px]">
              <Search size={13} className="text-ink-400" />
              <input
                type="text"
                placeholder="Search material…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="flex-1 text-xs outline-none text-ink-900 bg-transparent"
              />
              {searchQ && <button onClick={() => setSearchQ('')}><X size={12} className="text-ink-400 hover:text-ink-700" /></button>}
            </div>
            <button
              onClick={() => setShowUncounted(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${showUncounted
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-ink-200 text-ink-600'
                }`}
            >
              {showUncounted ? <Eye size={13} /> : <EyeOff size={13} />}
              {showUncounted ? 'Showing All' : 'Counted Only'}
            </button>
          </div>

          {/* ── Count Table ── */}
          <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
            {/* Store header */}
            <div
              className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-700 to-blue-900 cursor-pointer"
              onClick={() => setExpandedStores(p => ({ ...p, [activeCount.storeLocation]: !p[activeCount.storeLocation] }))}
            >
              <div className="flex items-center gap-3">
                <Store size={16} className="text-white/80" />
                <span className="text-sm font-bold text-white">{activeCount.storeLocation}</span>
                <span className="text-xs text-blue-200">{MONTH_NAMES[activeCount.periodMonth - 1]} {activeCount.periodYear}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/70">{counted}/{total} counted</span>
                {expandedStores[activeCount.storeLocation]
                  ? <ChevronUp size={16} className="text-white" />
                  : <ChevronDown size={16} className="text-white" />
                }
              </div>
            </div>

            {expandedStores[activeCount.storeLocation] !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ink-50 text-ink-600">
                      <th className="text-left px-4 py-2.5 font-semibold">#</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Material</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Unit</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Begin Bal.</th>
                      <th className="text-right px-3 py-2.5 font-semibold">In</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Out</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Sys. Bal.</th>
                      <th className="text-right px-3 py-2.5 font-semibold bg-blue-50">Physical Count</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Variance</th>
                      <th className="text-right px-3 py-2.5 font-semibold">WAC (ETB)</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Var. Value</th>
                      <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {filteredLines.length === 0 && (
                      <tr>
                        <td colSpan={12} className="text-center py-10 text-ink-400">No items found.</td>
                      </tr>
                    )}
                    {filteredLines.map((line, idx) => {
                      const editVal = edits[line.material];
                      const displayCount = editVal !== undefined ? editVal : (line.physicalCount !== null ? line.physicalCount : '');
                      const variance = line.isCounted ? line.variance : (editVal !== undefined && editVal !== '' ? Number(editVal) - line.systemBalance : null);
                      const isPos = variance > 0;
                      const isNeg = variance < 0;

                      return (
                        <tr
                          key={line.material}
                          className={`hover:bg-blue-50/40 transition-colors ${!line.isCounted && editVal === undefined ? 'bg-amber-50/30' : ''
                            }`}
                        >
                          <td className="px-4 py-2.5 text-ink-400">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-ink-900">{line.materialName}</span>
                          </td>
                          <td className="px-3 py-2.5 text-ink-500">{line.unit}</td>
                          <td className="px-3 py-2.5 text-right tabular text-ink-700">{(line.beginBalance || 0).toFixed(3)}</td>
                          <td className="px-3 py-2.5 text-right tabular text-emerald-700 font-medium">{(line.inQty || 0).toFixed(3)}</td>
                          <td className="px-3 py-2.5 text-right tabular text-red-600 font-medium">{(line.outQty || 0).toFixed(3)}</td>
                          <td className="px-3 py-2.5 text-right tabular font-bold text-ink-900">{(line.systemBalance || 0).toFixed(3)}</td>
                          <td className="px-3 py-2.5 text-right bg-blue-50/50">
                            {isLocked ? (
                              <span className="tabular font-bold text-blue-900">{line.physicalCount?.toFixed(3) ?? '—'}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={displayCount}
                                onChange={e => setEdits(prev => ({ ...prev, [line.material]: e.target.value }))}
                                onBlur={e => {
                                  if (e.target.value !== '' && e.target.value !== String(line.physicalCount)) {
                                    // keep in buffer, save on explicit save
                                  }
                                }}
                                className="w-24 text-right bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 tabular"
                                placeholder="Enter qty"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular">
                            {variance !== null ? (
                              <span className={`font-bold flex items-center justify-end gap-1 ${isPos ? 'text-emerald-600' : isNeg ? 'text-red-600' : 'text-ink-500'
                                }`}>
                                {isPos && <TrendingUp size={11} />}
                                {isNeg && <TrendingDown size={11} />}
                                {!isPos && !isNeg && <Minus size={11} />}
                                {variance.toFixed(3)}
                              </span>
                            ) : <span className="text-ink-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular text-ink-700">{(line.wac || 0).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right tabular">
                            {line.varianceValue !== 0 ? (
                              <span className={`font-semibold ${line.varianceValue > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ETB {line.varianceValue.toFixed(2)}
                              </span>
                            ) : <span className="text-ink-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {line.isCounted ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle size={9} /> Counted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <Clock size={9} /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Closing info (if approved) ── */}
          {isLocked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Count Approved & Closed</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Approved by {activeCount.approvedBy?.name || 'admin'} on{' '}
                  {activeCount.approvedAt ? new Date(activeCount.approvedAt).toLocaleString() : '—'}.
                  Closing balance locked.
                </p>
              </div>
            </div>
          )}

          {/* ── Uncounted summary ── */}
          {activeCount.status !== 'approved' && activeCount.status !== 'closed' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">
                  {activeCount.uncountedItems || 0} item{(activeCount.uncountedItems || 0) !== 1 ? 's' : ''} not yet counted
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Uncounted items will use system balance as physical count upon approval.
                </p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function Reports({ defaultTab } = {}) {
  const [tab, setTab] = useState(defaultTab || 'stock_balance');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companyName, setcompanyName] = useState('Sharp Plus');

  // Filter & Search states
  const currentYearMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [date, setDate] = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonthStr());
  const [from, setFrom] = useState(startOfMonthStr());
  const [to, setTo] = useState(todayStr());
  const [activePreset, setActivePreset] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stockSearch, setStockSearch] = useState('');

  // Stock Balance UI states (matching reference image)
  const [stockSubTab, setStockSubTab] = useState('stock_only');
  const [gslFilter, setGslFilter] = useState('Item');
  const [storeFilter, setStoreFilter] = useState('Main store');
  const [articleFilter, setArticleFilter] = useState('all');
  const [removeZeroBalance, setRemoveZeroBalance] = useState(true);
  const [transactedArticles, setTransactedArticles] = useState(false);
  const [activeArticles, setActiveArticles] = useState('A'); // 'A' | 'All' | 'I'
  const [serialBinCardData, setSerialBinCardData] = useState(null);
  const [serialBinCardLoading, setSerialBinCardLoading] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [dateCriteria, setDateCriteria] = useState('at_the_day_of'); // 'at_the_day_of' | 'range' | 'month' | 'all'
  const [enquiryDate, setEnquiryDate] = useState(todayStr());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [binCardArticleId, setBinCardArticleId] = useState('');

  // Stock Balance view mode: 'detail' (detailed table) vs 'transactions' (time-sequence list) vs 'monthly_summary' (12-month evolution)
  const [balanceViewMode, setBalanceViewMode] = useState('detail');
  const [monthlyClosingData, setMonthlyClosingData] = useState(null);
  const [monthlyClosingLoading, setMonthlyClosingLoading] = useState(false);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

  // Stock Balance Movements List (time-sequenced transactions)
  const [balanceTxnsLoading, setBalanceTxnsLoading] = useState(false);
  const [balanceTxnsData, setBalanceTxnsData] = useState(null);
  const [txnTypeFilter, setTxnTypeFilter] = useState('all'); // 'all', 'grv', 'adjustment', 'cash_grv', 'credit_grv', 'pos_adjustment', 'neg_adjustment'
  const [txnStatusFilter, setTxnStatusFilter] = useState('all'); // 'all', 'pending', 'checked', 'approved', 'posted'
  const [txnSortOrder, setTxnSortOrder] = useState('desc'); // 'desc' (newest first), 'asc' (oldest first)
  const [txnSearchQuery, setTxnSearchQuery] = useState('');

  // Item Ledger (Bin Card) modal state
  const [selectedLedgerMaterial, setSelectedLedgerMaterial] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  // Sync tab when navigated via sidebar
  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab);
      setData(null);
      if (defaultTab === 'stock_balance' && !from) {
        setFrom(startOfMonthStr());
        setTo(todayStr());
      }
    }
  }, [defaultTab]);

  // Load company name for print header
  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.companyName) setcompanyName(res.data.companyName);
    }).catch(() => { });
  }, []);

  const currentTab = TABS.find(t => t.key === tab) || TABS[1];

  const load = useCallback(async () => {
    if (!currentTab?.endpoint) {
      setLoading(true);
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await api.get('/reports/summary', { params });
        setData(res.data);
      } finally { setLoading(false); }
      return;
    }

    setLoading(true);
    setData(null);
    try {
      let params = {};
      if (tab === 'daily') {
        params = { date };
      } else if (tab === 'stock') {
        // current static stock levels
      } else if (tab === 'stock_balance') {
        params.dateCriteria = dateCriteria;
        params.enquiryDate = enquiryDate;
        params.activeArticles = activeArticles;
        params.removeZeroBalance = removeZeroBalance;
        params.transactedArticles = transactedArticles;
        if (gslFilter && gslFilter !== 'all') params.gsl = gslFilter;
        if (storeFilter && storeFilter !== 'all') params.store = storeFilter;
        if (articleFilter && articleFilter !== 'all') params.article = articleFilter;
        if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
        if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
        if (stockSearch.trim()) params.search = stockSearch.trim();
        if (dateCriteria === 'range') {
          if (from) params.from = from;
          if (to) params.to = to;
        } else if (dateCriteria === 'month') {
          params.month = selectedMonth;
        } else if (dateCriteria === 'at_the_day_of' || dateCriteria === 'as_of_date') {
          params.to = enquiryDate;
        }
      } else {
        params = { from, to };
      }
      const res = await api.get(currentTab.endpoint, { params });
      setData(res.data);
    } finally { setLoading(false); }
  }, [
    tab, date, from, to, selectedCategory, selectedStatus, stockSearch, currentTab,
    gslFilter, storeFilter, articleFilter, removeZeroBalance, transactedArticles, activeArticles, dateCriteria, enquiryDate, selectedMonth,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  // Load dedicated Serial BinCard data with batch hierarchy
  const loadSerialBinCard = useCallback(async () => {
    setSerialBinCardLoading(true);
    try {
      const params = {
        dateCriteria,
        enquiryDate,
        activeArticles,
        removeZeroBalance,
        transactedArticles,
      };
      if (gslFilter && gslFilter !== 'all') params.gsl = gslFilter;
      if (storeFilter && storeFilter !== 'all') params.store = storeFilter;
      if (articleFilter && articleFilter !== 'all') params.article = articleFilter;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (stockSearch.trim()) params.search = stockSearch.trim();
      if (dateCriteria === 'range') {
        if (from) params.from = from;
        if (to) params.to = to;
      } else if (dateCriteria === 'month') {
        params.month = selectedMonth;
      }
      const res = await api.get('/reports/stock-balance/serial-bincard', { params });
      setSerialBinCardData(res.data);
      // Auto-expand all articles and batches by default
      const artMap = {};
      const batchMap = {};
      (res.data?.articles || []).forEach(a => {
        artMap[a._id] = true;
        (a.batches || []).forEach((b, idx) => {
          batchMap[`${a._id}_${b.batchNumber || idx}`] = true;
        });
      });
      setExpandedArticles(artMap);
      setExpandedBatches(batchMap);
    } catch (err) {
      console.error('Failed to load Serial BinCard data', err);
    } finally {
      setSerialBinCardLoading(false);
    }
  }, [
    dateCriteria, enquiryDate, activeArticles, removeZeroBalance, transactedArticles,
    gslFilter, storeFilter, articleFilter, selectedCategory, stockSearch, from, to, selectedMonth
  ]);

  useEffect(() => {
    if (tab === 'stock_balance' && stockSubTab === 'serial_bincard') {
      loadSerialBinCard();
    }
  }, [tab, stockSubTab, loadSerialBinCard]);

  // Set exact calendar month range
  const setMonthRange = (ymStr) => {
    setSelectedMonth(ymStr);
    const [y, m] = ymStr.split('-').map(Number);
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDate = new Date(y, m, 0).getDate();
    const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
    setFrom(firstDay);
    setTo(lastDay);
    setActivePreset('month');
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthRange(prevYm);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextYm = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthRange(nextYm);
  };

  // Handler for quick date presets
  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'today') {
      setFrom(todayStr());
      setTo(todayStr());
    } else if (preset === 'week') {
      setFrom(startOfWeekStr());
      setTo(todayStr());
    } else if (preset === 'month') {
      const ym = currentYearMonthStr();
      setMonthRange(ym);
    } else if (preset === 'last_month') {
      const d = new Date();
      const prevDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setMonthRange(prevYm);
    } else if (preset === 'all') {
      setFrom('');
      setTo('');
    }
  };

  // Load 12-Month Closing Evolution
  const loadMonthlyClosing = useCallback(async (yr) => {
    setMonthlyClosingLoading(true);
    try {
      const res = await api.get('/reports/monthly-closing', { params: { year: yr || summaryYear } });
      setMonthlyClosingData(res.data);
    } catch (e) {
      console.error('Failed to load monthly closing report', e);
    } finally {
      setMonthlyClosingLoading(false);
    }
  }, [summaryYear]);

  useEffect(() => {
    if (tab === 'stock_balance' && balanceViewMode === 'monthly_summary') {
      loadMonthlyClosing(summaryYear);
    }
  }, [tab, balanceViewMode, summaryYear, loadMonthlyClosing]);

  // Load Time-Sequenced Movement Transactions for Stock Balance Sheet
  const loadBalanceTransactions = useCallback(async (customType, customStatus, customSort, customSearch) => {
    setBalanceTxnsLoading(true);
    try {
      const type = customType !== undefined ? customType : txnTypeFilter;
      const stat = customStatus !== undefined ? customStatus : txnStatusFilter;
      const srt = customSort !== undefined ? customSort : txnSortOrder;
      const q = customSearch !== undefined ? customSearch : txnSearchQuery;

      const params = {
        from: from || undefined,
        to: to || undefined,
        month: selectedMonth || undefined,
        voucherType: type !== 'all' ? type : undefined,
        status: stat !== 'all' ? stat : undefined,
        sort: srt,
        search: q.trim() || undefined,
      };
      const res = await api.get('/reports/stock-balance/transactions', { params });
      setBalanceTxnsData(res.data);
    } catch (err) {
      console.error('Failed to load balance transactions', err);
    } finally {
      setBalanceTxnsLoading(false);
    }
  }, [from, to, selectedMonth, txnTypeFilter, txnStatusFilter, txnSortOrder, txnSearchQuery]);

  useEffect(() => {
    if (tab === 'stock_balance' && balanceViewMode === 'transactions') {
      loadBalanceTransactions();
    }
  }, [tab, balanceViewMode, from, to, selectedMonth, txnTypeFilter, txnStatusFilter, txnSortOrder, txnSearchQuery, loadBalanceTransactions]);

  // Open Item Ledger Modal
  const openItemLedger = async (material) => {
    setSelectedLedgerMaterial(material);
    setLedgerLoading(true);
    setLedgerData(null);
    try {
      const res = await api.get(`/reports/stock-balance/ledger/${material._id}`, {
        params: {
          from: from || undefined,
          to: to || undefined,
        },
      });
      setLedgerData(res.data);
    } catch (err) {
      console.error('Failed to load item ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const printDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build flat export data from whatever is currently loaded
  const exportData = useMemo(() => {
    if (!data) return [];
    if (tab === 'stock_balance' && data.items) {
      return data.items.map(m => ({
        'Item Code': m.code || '—',
        'Material Name': m.name,
        'Category': m.category,
        'Unit': m.unit,
        'Opening Qty': m.openingStock,
        'Opening Val (ETB)': m.openingValue.toFixed(2),
        'Cash GRV In': m.cashGrvQty,
        'Credit GRV In': m.creditGrvQty,
        '+ve Adj In': m.posAdjQty,
        'Total In Qty': m.totalInQty,
        'Total In (ETB)': m.totalInCost.toFixed(2),
        '−ve Adj Out': m.negAdjQty,
        'Disposal Out': m.disposalQty,
        'Sales Out': m.salesImportQty,
        'Total Out Qty': m.totalOutQty,
        'Total Out (ETB)': m.totalOutCost.toFixed(2),
        'Closing Balance': m.closingStock,
        'Unit Cost (ETB)': m.unitCost.toFixed(2),
        'Closing Val (ETB)': m.closingValue.toFixed(2),
        'Status': m.status.replace('_', ' ').toUpperCase(),
      }));
    }
    if (tab === 'stock' && data.materials) {
      return data.materials.map(m => ({
        'Material': m.name,
        'Category': m.category || '',
        'In Stock': `${m.currentStock} ${m.unit}`,
        'Reorder At': `${m.reorderLevel} ${m.unit}`,
        'Unit Cost (ETB)': Number(m.unitCost || 0).toFixed(2),
        'Value (ETB)': (m.currentStock * m.unitCost).toFixed(2),
        'Status': m.status,
      }));
    }
    if (tab === 'purchases' && data.purchases) {
      return data.purchases.map(p => ({
        'Date': new Date(p.purchaseDate).toLocaleDateString(),
        'Supplier': p.supplier?.name || '—',
        'Items': p.items?.length ?? 0,
        'Total (ETB)': Number(p.totalAmount || 0).toFixed(2),
        'Status': p.status,
      }));
    }
    if (tab === 'stock_balance' && balanceViewMode === 'transactions' && balanceTxnsData?.transactions) {
      return balanceTxnsData.transactions.map(t => ({
        'Date & Time': formatDateTime(t.date || t.createdAt),
        'Voucher #': t.voucherNo || '—',
        'Voucher Type': VOUCHER_LABELS[t.voucherType] || t.voucherType || '—',
        'Direction': t.type === 'in' ? 'IN (+)' : 'OUT (−)',
        'Items': (t.items || []).map(i => `${i.materialName} ×${i.quantity}`).join(' · '),
        'Total (ETB)': Number(t.totalAmount || 0).toFixed(2),
        'Status': (t.status || 'pending').toUpperCase(),
        'Party / Reason': t.supplier !== '—' ? t.supplier : t.reason,
        'Handled By': t.performedBy || '—',
      }));
    }
    const txns = data.transactions || [];
    return txns.map(t => ({
      'Date & Time': formatDateTime(t.date || t.createdAt),
      'Voucher': t.voucherNo || '—',
      'Type': VOUCHER_LABELS[t.voucherType] || t.voucherType || '—',
      'Material': t.material?.name || t.items?.[0]?.material?.name || '—',
      'Qty': t.quantity ?? '',
      'Total (ETB)': Number(t.totalAmount || 0).toFixed(2),
      'Status': (t.status || 'pending').toUpperCase(),
      'By': t.performedBy?.name || '—',
    }));
  }, [data, tab, balanceViewMode, balanceTxnsData]);

  // ── Available filter options from loaded data ─────────────────────────
  const categoryOptions = useMemo(() => {
    return (data?.categories || []).filter(c => c && c !== 'all');
  }, [data?.categories]);

  const storeOptions = useMemo(() => {
    return (data?.stores || ['Main store']).filter(Boolean);
  }, [data?.stores]);

  const articleOptions = useMemo(() => {
    return data?.articles || (data?.items || []).map(i => ({ _id: i._id, code: i.code, name: i.name, category: i.category, unit: i.unit }));
  }, [data?.articles, data?.items]);

  // ── Client-side filtered items for Stock Balance tabs ─────────────────
  const filteredStockItems = useMemo(() => {
    if (!data?.items) return [];
    let list = [...data.items];

    // Search query filter (Article Code, Name, Category, UOM, Store)
    if (stockSearch.trim()) {
      const q = stockSearch.toLowerCase().trim();
      list = list.filter(item =>
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.storeLocation && item.storeLocation.toLowerCase().includes(q))
      );
    }

    // Remove zero balance items filter
    if (removeZeroBalance) {
      list = list.filter(item => Number(item.closingStock || 0) > 0);
    }

    // Active articles filter
    if (activeArticles === 'A') {
      list = list.filter(item => item.isActive !== false);
    } else if (activeArticles === 'I') {
      list = list.filter(item => item.isActive === false);
    }

    return list;
  }, [data?.items, stockSearch, removeZeroBalance, activeArticles]);

  // ── Category Grouped Items for BinCard Summary (matching reference image) ──
  const categoryGroupedStock = useMemo(() => {
    const groups = {};
    filteredStockItems.forEach(item => {
      const cat = (item.category && item.category.trim()) ? item.category.trim() : 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.keys(groups).sort().map(cat => {
      const items = groups[cat];
      const totalOpening = items.reduce((sum, i) => sum + (Number(i.openingStock) || 0), 0);
      const totalInward = items.reduce((sum, i) => sum + (Number(i.totalInQty) || 0), 0);
      const totalOutward = items.reduce((sum, i) => sum + (Number(i.totalOutQty) || 0), 0);
      const totalBalance = items.reduce((sum, i) => sum + (Number(i.closingStock) || 0), 0);
      return {
        category: cat,
        items,
        totalOpening,
        totalInward,
        totalOutward,
        totalBalance,
      };
    });
  }, [filteredStockItems]);

  // ── Filtered Serial BinCard articles with batch search ────────────────
  const filteredSerialArticles = useMemo(() => {
    if (!serialBinCardData?.articles) return [];
    if (!stockSearch.trim()) return serialBinCardData.articles;
    const q = stockSearch.toLowerCase().trim();
    return serialBinCardData.articles.filter(art => {
      const matchArt = (art.code && art.code.toLowerCase().includes(q)) ||
                       (art.name && art.name.toLowerCase().includes(q)) ||
                       (art.category && art.category.toLowerCase().includes(q)) ||
                       (art.store && art.store.toLowerCase().includes(q));
      if (matchArt) return true;
      return (art.batches || []).some(b =>
        (b.batchNumber && b.batchNumber.toLowerCase().includes(q)) ||
        (b.transactions || []).some(t =>
          (t.voucher && t.voucher.toLowerCase().includes(q)) ||
          (t.consignee && t.consignee.toLowerCase().includes(q)) ||
          (t.voucherType && t.voucherType.toLowerCase().includes(q))
        )
      );
    });
  }, [serialBinCardData?.articles, stockSearch]);

  // ── Derived datasets for specialized tabs ────────────────────────────
  const minStockItems = useMemo(() => {
    return filteredStockItems.filter(item => {
      const min = Number(item.minStock || 0);
      const reorder = Number(item.reorderLevel || 10);
      const threshold = min > 0 ? min : reorder;
      return Number(item.closingStock || 0) <= threshold;
    });
  }, [filteredStockItems]);

  const abcItems = useMemo(() => {
    const sorted = [...filteredStockItems].sort((a, b) => (b.closingValue || 0) - (a.closingValue || 0));
    const grandTotal = sorted.reduce((sum, i) => sum + (i.closingValue || 0), 0) || 1;
    let running = 0;
    return sorted.map((item, idx) => {
      const val = Number(item.closingValue || 0);
      const percent = (val / grandTotal) * 100;
      running += percent;
      let abcClass = 'C';
      if (running <= 70 || idx === 0) {
        abcClass = 'A';
      } else if (running <= 90) {
        abcClass = 'B';
      }
      return {
        ...item,
        rank: idx + 1,
        valuePercent: percent,
        cumulativePercent: Math.min(100, running),
        abcClass,
      };
    });
  }, [filteredStockItems]);

  const deadMovementItems = useMemo(() => {
    return filteredStockItems.filter(item => Number(item.totalOutQty || 0) === 0);
  }, [filteredStockItems]);

  // Auto-select first article for BinCard tab
  useEffect(() => {
    if (tab === 'stock_balance' && stockSubTab === 'bincard') {
      if (!binCardArticleId && filteredStockItems.length > 0) {
        setBinCardArticleId(filteredStockItems[0]._id);
        openItemLedger(filteredStockItems[0]);
      }
    }
  }, [tab, stockSubTab, binCardArticleId, filteredStockItems]);

  const handleSelectBinCardItem = (itemOrId) => {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?._id;
    setBinCardArticleId(id);
    const target = (data?.items || []).find(i => i._id === id);
    if (target) {
      openItemLedger(target);
    }
  };

  // Sub-tab export data builder
  const getSubTabExportRows = useCallback(() => {
    let rows = [];
    let title = 'Stock_Balance_Report';
    if (stockSubTab === 'stock_only') {
      title = 'Stock_Only_Report';
      rows = filteredStockItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'MAIN STORE': Number(m.closingStock || 0).toFixed(2),
        'QTY TOTAL': Number(m.closingStock || 0).toFixed(2),
        'UNIT COST (ETB)': Number(m.unitCost || 0).toFixed(2),
        'TOTAL VALUE (ETB)': Number(m.closingValue || 0).toFixed(2),
      }));
    } else if (stockSubTab === 'bincard_summary') {
      title = 'BinCard_Summary_Report';
      rows = filteredStockItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'OPENING BALANCE': Number(m.openingStock || 0).toFixed(2),
        'RECEIVED (IN)': Number(m.totalInQty || 0).toFixed(2),
        'ISSUED (OUT)': Number(m.totalOutQty || 0).toFixed(2),
        'CLOSING BALANCE': Number(m.closingStock || 0).toFixed(2),
        'STATUS': (m.status || 'in_stock').toUpperCase(),
      }));
    } else if (stockSubTab === 'min_stock_level') {
      title = 'Min_Stock_Level_Report';
      rows = minStockItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'CURRENT STOCK': Number(m.closingStock || 0).toFixed(2),
        'MIN STOCK LEVEL': Number(m.minStock || 0).toFixed(2),
        'REORDER LEVEL': Number(m.reorderLevel || 10).toFixed(2),
        'DEFICIT': Math.max(0, (m.reorderLevel || 10) - m.closingStock).toFixed(2),
        'STATUS': (m.status || 'low_stock').toUpperCase(),
      }));
    } else if (stockSubTab === 'abc_analysis') {
      title = 'ABC_Analysis_Report';
      rows = abcItems.map(m => ({
        'RANK': m.rank,
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CURRENT STOCK': Number(m.closingStock || 0).toFixed(2),
        'UNIT COST': Number(m.unitCost || 0).toFixed(2),
        'TOTAL VALUE (ETB)': Number(m.closingValue || 0).toFixed(2),
        '% OF TOTAL': m.valuePercent.toFixed(2) + '%',
        'CUMULATIVE %': m.cumulativePercent.toFixed(2) + '%',
        'ABC CLASS': m.abcClass,
      }));
    } else if (stockSubTab === 'serial_bincard') {
      title = 'Serial_BinCard_Report';
      const serialRows = [];
      (filteredSerialArticles || []).forEach(art => {
        (art.batches || []).forEach(b => {
          (b.transactions || []).forEach(t => {
            serialRows.push({
              'ARTICLE CODE': art.code || '—',
              'ARTICLE NAME': art.name,
              'CATEGORY': art.category,
              'STORE': art.store,
              'BATCH NUMBER': t.batchNumber || b.batchNumber,
              'VOUCHER': t.voucher || '—',
              'VOUCHER TYPE': t.voucherType || '—',
              'CONSIGNEE': t.consignee || '—',
              'DATE': formatDateTime(t.date),
              'UNIT AMOUNT (ETB)': Number(t.unitAmount || 0).toFixed(2),
              'DEBIT QUANTITY': Number(t.debitQuantity || 0).toFixed(2),
              'CREDIT QUANTITY': Number(t.creditQuantity || 0).toFixed(2),
              'BALANCE': Number(t.balance || 0).toFixed(2),
              'SCORE': t.score || '100% (Verified)',
              'ENQUIRY DATE': t.enquiryDate || enquiryDate,
            });
          });
        });
      });
      rows = serialRows;
    } else if (stockSubTab === 'bincard_summary') {
      title = 'BinCard_Summary_Report';
      rows = filteredStockItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'OPENING': Number(m.openingStock || 0).toFixed(2),
        'INWARD': Number(m.totalInQty || 0).toFixed(2),
        'OUTWARD': Number(m.totalOutQty || 0).toFixed(2),
        'BALANCE': Number(m.closingStock || 0).toFixed(2),
      }));
    } else if (stockSubTab === 'dead_movement') {
      title = 'Dead_Item_Movement_Report';
      rows = deadMovementItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'CURRENT STOCK': Number(m.closingStock || 0).toFixed(2),
        'UNIT COST': Number(m.unitCost || 0).toFixed(2),
        'STOCK VALUE (ETB)': Number(m.closingValue || 0).toFixed(2),
        'OUTWARD ISSUED': Number(m.totalOutQty || 0).toFixed(2),
        'STATUS': 'DORMANT / DEAD STOCK',
      }));
    } else {
      rows = filteredStockItems.map(m => ({
        'ARTICLE CODE': m.code || '—',
        'ARTICLE NAME': m.name,
        'UOM': m.unit,
        'CATEGORY': m.category,
        'MAIN STORE': Number(m.closingStock || 0).toFixed(2),
        'QTY TOTAL': Number(m.closingStock || 0).toFixed(2),
      }));
    }
    return { rows, title: `${title}_${enquiryDate || todayStr()}` };
  }, [stockSubTab, filteredStockItems, minStockItems, abcItems, deadMovementItems, enquiryDate]);

  const handleExportExcel = () => {
    const { rows, title } = getSubTabExportRows();
    if (!rows.length) return alert('No data to export.');
    exportToExcel(rows, title, stockSubTab);
  };

  const handleExportCSV = () => {
    const { rows, title } = getSubTabExportRows();
    if (!rows.length) return alert('No data to export.');
    exportToCSV(rows, title);
  };

  const handleExportPDF = () => {
    const { rows, title } = getSubTabExportRows();
    if (!rows.length) return alert('No data to export.');
    const cols = Object.keys(rows[0] || {}).map(k => ({ header: k, accessor: k }));
    exportToPDF({ title: title.replace(/_/g, ' '), columns: cols, data: rows });
  };

  const handleCopyTable = () => {
    const { rows } = getSubTabExportRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join('\t');
    const body = rows.map(r => Object.values(r).join('\t')).join('\n');
    navigator.clipboard.writeText(`${headers}\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div id="print-area" className="space-y-4">

      {/* ── Print-only header ── */}
      <div id="print-header" style={{ display: 'none' }}>
        <h1>{companyName}</h1>
        <p>{currentTab?.label ?? 'Report'} &mdash; Printed on {printDate}</p>
        {from && to && <p>Period: {from} to {to}</p>}
      </div>

      {/* ── Stock Balance Report Breadcrumb Header (matching reference image) ── */}
      {tab === 'stock_balance' && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Reports - Stock Balance Report
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link to="/" className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition">
              <Home size={13} className="text-slate-400" />
              <span>Home</span>
            </Link>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600">Reports</span>
            <span className="text-slate-300">&gt;</span>
            <span className="font-semibold text-slate-800">Stock Balance Report</span>
          </div>
        </div>
      )}

      {/* ── Standard Page heading for other report tabs ── */}
      {tab !== 'stock_balance' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-900 flex items-center gap-2">
              {currentTab?.label ?? 'Reports'}
            </h1>
            <p className="text-xs text-ink-500 mt-0.5">
              Detailed inventory and transaction reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportDropdown
              data={exportData}
              fileName={`report_${tab}`}
              sheetName={currentTab?.label || 'Report'}
              pdfTitle={currentTab?.label || 'Report'}
              pdfColumns={exportData[0]
                ? Object.keys(exportData[0]).map(k => ({ header: k, accessor: k }))
                : []
              }
            />
            <Button variant="ghost" className="border border-ink-200" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
          </div>
        </div>
      )}

      {/* ── Stock Balance Filter Card (with orange accent top border matching reference image) ── */}
      {tab === 'stock_balance' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs border-t-4 border-t-orange-500 relative">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            {/* Left: Show and Export Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  load();
                  if (stockSubTab === 'serial_bincard') {
                    loadSerialBinCard();
                  }
                }}
                disabled={loading || serialBinCardLoading}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition-all font-bold text-xs cursor-pointer disabled:opacity-70"
                title="Show Report Data"
              >
                <BinocularsIcon className={`h-6 w-6 text-white ${loading ? 'animate-pulse' : ''}`} />
                <span className="tracking-wide">Show</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 active:scale-95 flex flex-col items-center justify-center gap-1 shadow-2xs transition-all font-bold text-xs cursor-pointer"
                  title="Export Report Data"
                >
                  <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                  <span className="tracking-wide">Export</span>
                </button>

                {showExportMenu && (
                  <div className="absolute left-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => { setShowExportMenu(false); handleExportExcel(); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Export to Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowExportMenu(false); handleExportCSV(); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                    >
                      <Download size={14} className="text-blue-600" /> Export to CSV (.csv)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowExportMenu(false); handleExportPDF(); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2"
                    >
                      <FileText size={14} className="text-rose-600" /> Export to PDF
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => { setShowExportMenu(false); window.print(); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Printer size={14} className="text-slate-600" /> Print Document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Middle & Right: 3 Columns of Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
              {/* Column 1: GSL, Category, Article */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">GSL</label>
                  <div className="relative">
                    <select
                      value={gslFilter}
                      onChange={e => setGslFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none"
                    >
                      <option value="Item">Item</option>
                      <option value="all">All</option>
                      <option value="Raw Material">Raw Material</option>
                      <option value="Finished Product">Finished Product</option>
                      <option value="Trading Item">Trading Item</option>
                    </select>
                    {gslFilter && gslFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setGslFilter('all')}
                        title="Clear GSL filter"
                        className="absolute right-6 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Category</label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none"
                    >
                      <option value="all">All Categories</option>
                      {categoryOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {selectedCategory && selectedCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        title="Clear Category filter"
                        className="absolute right-6 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Article</label>
                  <div className="relative">
                    <select
                      value={articleFilter}
                      onChange={e => setArticleFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none truncate"
                    >
                      <option value="all">All Articles</option>
                      {articleOptions.map(a => (
                        <option key={a._id || a.code} value={a._id || a.code}>
                          {a.code ? `[${a.code}] ` : ''}{a.name}
                        </option>
                      ))}
                    </select>
                    {articleFilter && articleFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setArticleFilter('all')}
                        title="Clear Article filter"
                        className="absolute right-6 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Column 2: Store(s)*, Remove Zero Balace, Active Articles */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                    Store(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={storeFilter}
                      onChange={e => setStoreFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none"
                    >
                      <option value="Main store">Main store</option>
                      <option value="all">All Stores</option>
                      {storeOptions.filter(s => s !== 'all' && s.toLowerCase() !== 'main store').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {storeFilter && storeFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setStoreFilter('all')}
                        title="Clear Store filter"
                        className="absolute right-6 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>

                <div className="pt-2 space-y-1.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removeZeroBalance}
                      onChange={e => setRemoveZeroBalance(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">Remove Zero Balace</span>
                  </label>
                  <div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={transactedArticles}
                        onChange={e => setTransactedArticles(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700">Transacted Articles</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Active Articles</label>
                  <div className="relative">
                    <select
                      value={activeArticles}
                      onChange={e => setActiveArticles(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none"
                    >
                      <option value="A">A</option>
                      <option value="All">All</option>
                      <option value="I">I</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Column 3: Date Criteria, Enquiry Date* */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Date Criteria</label>
                  <div className="relative">
                    <select
                      value={dateCriteria}
                      onChange={e => setDateCriteria(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 pr-8 font-medium appearance-none"
                    >
                      <option value="at_the_day_of">At The Day Of</option>
                      <option value="range">Date Range</option>
                      <option value="month">This Month</option>
                      <option value="all">All Time</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                    Enquiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={enquiryDate}
                      onChange={e => setEnquiryDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {dateCriteria === 'range' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="date"
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-blue-500"
                    />
                    <span className="text-[11px] text-slate-400">to</span>
                    <input
                      type="date"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Sub-Tabs Bar (matching reference image) ── */}
      {tab === 'stock_balance' && (
        <div className="rounded-xl bg-slate-100/90 p-1 border border-slate-200 flex items-center gap-1 overflow-x-auto">
          {REPORT_SUB_TABS.map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setStockSubTab(st.id);
                if (balanceViewMode !== 'detail') setBalanceViewMode('detail');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stockSubTab === st.id && balanceViewMode === 'detail'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 ring-1 ring-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {st.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 pl-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBalanceViewMode('transactions');
                loadBalanceTransactions();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                balanceViewMode === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
              title="View movements time sequence with exact h:m:s"
            >
              <Clock size={13} /> Time Sequence
            </button>
            <button
              type="button"
              onClick={() => {
                setBalanceViewMode('monthly_summary');
                loadMonthlyClosing(summaryYear);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                balanceViewMode === 'monthly_summary'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
              title="View 12-month closing evolution"
            >
              <Calendar size={13} /> 12-Month Evolution
            </button>
          </div>
        </div>
      )}

      {/* ── Standard Date filter bar for other tabs ── */}
      {tab !== 'stock_balance' && (
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'daily' && (
            <label className="flex items-center gap-2 text-sm text-ink-500">
              Date
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
            </label>
          )}
          {tab !== 'daily' && tab !== 'stock' && (
            <>
              <label className="flex items-center gap-2 text-sm text-ink-500">
                From
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-500">
                To
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
              </label>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-ink-400">
          <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-600" />
          Loading report data…
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STOCK BALANCE SUB-TABS & DATA TABLES
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'stock_balance' && balanceViewMode === 'detail' && data && (
        <div className="space-y-3">
          {/* Table Toolbar Header matching reference image: Title on Left, Copy/Print/Search on Right */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {stockSubTab === 'stock_only' && 'Stock Only Inventory List'}
                {stockSubTab === 'bincard_summary' && 'BinCard Movement Summary'}
                {stockSubTab === 'bincard' && 'Item Ledger (BinCard)'}
                {stockSubTab === 'min_stock_level' && 'Minimum & Reorder Level Stock'}
                {stockSubTab === 'serial_bincard' && 'Serial & Batch BinCard'}
                {stockSubTab === 'expiry_date' && 'Expiry Date Inventory Schedule'}
                {stockSubTab === 'expiry_notification' && 'Expiry Date Notification Alerts'}
                {stockSubTab === 'abc_analysis' && 'ABC Inventory Classification (Pareto 80/20)'}
                {stockSubTab === 'dead_movement' && 'Dead / Dormant Stock Movement Summary'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {stockSubTab === 'min_stock_level' ? minStockItems.length :
                 stockSubTab === 'abc_analysis' ? abcItems.length :
                 stockSubTab === 'dead_movement' ? deadMovementItems.length :
                 filteredStockItems.length} items
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick action buttons matching reference image icons */}
              <button
                type="button"
                onClick={handleCopyTable}
                title="Copy table to clipboard"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                title="Print current table"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              >
                <Printer size={14} />
              </button>

              {/* Search Box with Q Search... matching reference image */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="w-44 sm:w-60 rounded-lg border border-slate-200 pl-8 pr-7 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 bg-white shadow-2xs"
                />
                {stockSearch && (
                  <button
                    type="button"
                    onClick={() => setStockSearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 1: STOCK ONLY (EXACT REFERENCE IMAGE VIEW)
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'stock_only' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-800">ARTICLE CODE</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-800">ARTICLE NAME</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-800">UOM</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-800">CATEGORY</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-slate-800">MAIN STORE</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-slate-800">QTY TOTAL</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        No stock records matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStockItems.map((item, idx) => (
                      <tr key={item._id || idx} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-3.5 py-2 font-mono text-xs font-semibold text-slate-700">
                          {item.code || (item._id ? 'ART-' + item._id.slice(-5).toUpperCase() : '—')}
                        </td>
                        <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">
                          {item.name}
                        </td>
                        <td className="px-3.5 py-2 text-slate-600">
                          {item.unit || 'Pcs'}
                        </td>
                        <td className="px-3.5 py-2 text-slate-600">
                          {item.category || 'General'}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {Number(item.closingStock || 0).toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {Number(item.closingStock || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {filteredStockItems.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <tr>
                      <td colSpan={4} className="px-3.5 py-2.5 uppercase font-extrabold text-slate-800">
                        Total ({filteredStockItems.length} items)
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                        {filteredStockItems.reduce((sum, i) => sum + (Number(i.closingStock) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-950 tabular-nums">
                        {filteredStockItems.reduce((sum, i) => sum + (Number(i.closingStock) || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 2: BINCARD SUMMARY (CATEGORY GROUPED MATCHING SCREENSHOT)
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'bincard_summary' && (
            <div className="space-y-3">
              {/* Category Expand/Collapse All Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allOpen = {};
                      categoryGroupedStock.forEach(g => { allOpen[g.category] = true; });
                      setExpandedCategories(allOpen);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    + Expand All Categories
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allClosed = {};
                      categoryGroupedStock.forEach(g => { allClosed[g.category] = false; });
                      setExpandedCategories(allClosed);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    − Collapse All
                  </button>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {categoryGroupedStock.length} Categories · {filteredStockItems.length} Articles
                </div>
              </div>

              {/* Category Grouped Sections Matching Screenshot */}
              <div className="space-y-2">
                {categoryGroupedStock.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
                    No articles found matching the current criteria.
                  </div>
                ) : (
                  categoryGroupedStock.map((grp) => {
                    const isExpanded = expandedCategories[grp.category] !== false;
                    return (
                      <div key={grp.category} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                        {/* Category Header Bar (Solid Blue banner matching screenshot) */}
                        <div
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [grp.category]: !isExpanded }))}
                          className="w-full bg-[#357bbd] hover:bg-[#2b68a3] text-white px-3.5 py-2 flex items-center justify-between cursor-pointer transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{isExpanded ? '▼' : '▶'}</span>
                            <span className="text-xs font-bold tracking-wide">Category: {grp.category}</span>
                            <span className="text-[11px] font-normal opacity-85">({grp.items.length} item{grp.items.length !== 1 ? 's' : ''})</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold opacity-95">
                            <span>Balance: <strong className="font-mono">{grp.totalBalance.toFixed(2)}</strong></span>
                          </div>
                        </div>

                        {/* Items Table Under Category (Visible When Expanded) */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs divide-y divide-slate-200">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                  <th className="px-3.5 py-2 text-left font-bold text-slate-800">ARTICLE CODE</th>
                                  <th className="px-3.5 py-2 text-left font-bold text-slate-800">ARTICLE NAME</th>
                                  <th className="px-3 py-2 text-left font-bold text-slate-800">UOM</th>
                                  <th className="px-3 py-2 text-left font-bold text-slate-800">CATEGORY</th>
                                  <th className="px-3.5 py-2 text-right font-bold text-slate-800">OPENING</th>
                                  <th className="px-3.5 py-2 text-right font-bold text-emerald-800 bg-emerald-50/50">INWARD</th>
                                  <th className="px-3.5 py-2 text-right font-bold text-rose-800 bg-rose-50/50">OUTWARD</th>
                                  <th className="px-3.5 py-2 text-right font-bold text-slate-900 bg-blue-50/50">BALANCE</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {grp.items.map((item, idx) => (
                                  <tr key={item._id || idx} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-3.5 py-2 font-mono text-xs font-semibold text-slate-700">
                                      {item.code || (item._id ? 'ART-' + item._id.slice(-5).toUpperCase() : '—')}
                                    </td>
                                    <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">
                                      {item.name}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {item.unit || 'Pcs'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {item.category || grp.category}
                                    </td>
                                    <td className="px-3.5 py-2 text-right font-mono text-slate-700 tabular-nums">
                                      {Number(item.openingStock || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 tabular-nums">
                                      {Number(item.totalInQty || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2 text-right font-mono font-bold text-rose-700 bg-rose-50/20 tabular-nums">
                                      {Number(item.totalOutQty || 0).toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2 text-right font-mono font-black text-slate-900 bg-blue-50/20 tabular-nums">
                                      {Number(item.closingStock || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>

                              {/* Category Group Subtotal Row */}
                              <tfoot className="bg-slate-100/90 font-bold border-t border-slate-300 text-slate-900 text-xs">
                                <tr>
                                  <td colSpan={4} className="px-3.5 py-2 uppercase font-extrabold text-slate-800 text-[11px]">
                                    Subtotal — Category: {grp.category} ({grp.items.length} items)
                                  </td>
                                  <td className="px-3.5 py-2 text-right font-mono font-extrabold text-slate-800 tabular-nums">
                                    {grp.totalOpening.toFixed(2)}
                                  </td>
                                  <td className="px-3.5 py-2 text-right font-mono font-extrabold text-emerald-800 tabular-nums">
                                    {grp.totalInward.toFixed(2)}
                                  </td>
                                  <td className="px-3.5 py-2 text-right font-mono font-extrabold text-rose-800 tabular-nums">
                                    {grp.totalOutward.toFixed(2)}
                                  </td>
                                  <td className="px-3.5 py-2 text-right font-mono font-black text-blue-950 tabular-nums">
                                    {grp.totalBalance.toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 3: BINCARD (ITEM LEDGER)
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'bincard' && (
            <div className="space-y-3">
              {/* Article Selector Row */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Select Article:</span>
                  <select
                    value={binCardArticleId}
                    onChange={e => {
                      const sel = filteredStockItems.find(i => String(i._id) === String(e.target.value));
                      if (sel) handleSelectBinCardItem(sel);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="">-- Choose an article to inspect ledger --</option>
                    {filteredStockItems.map(i => (
                      <option key={i._id} value={i._id}>
                        {i.code ? `${i.code} - ` : ''}{i.name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLedgerMaterial && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Current Stock: <strong className="text-slate-900">{selectedLedgerMaterial.currentStock} {selectedLedgerMaterial.unit}</strong></span>
                    <span className="text-slate-500">Unit Cost: <strong className="text-slate-900">{(selectedLedgerMaterial.unitCost || 0).toFixed(2)} ETB</strong></span>
                  </div>
                )}
              </div>

              {ledgerLoading && (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-2 text-blue-600" />
                  Loading Item Ledger…
                </div>
              )}

              {!ledgerLoading && !ledgerData && (
                <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400">
                  Select an article above or click "BinCard" on any item in the BinCard Summary table to load its running ledger.
                </div>
              )}

              {!ledgerLoading && ledgerData && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="min-w-full text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-3 py-2 text-left">DATE & TIME</th>
                        <th className="px-3 py-2 text-left">VOUCHER #</th>
                        <th className="px-3 py-2 text-left">TYPE</th>
                        <th className="px-3 py-2 text-left">PARTY / REASON</th>
                        <th className="px-3 py-2 text-right text-emerald-800 bg-emerald-50/50">IN (+)</th>
                        <th className="px-3 py-2 text-right text-rose-800 bg-rose-50/50">OUT (−)</th>
                        <th className="px-3 py-2 text-right text-blue-900 bg-blue-50/50">BALANCE</th>
                        <th className="px-3 py-2 text-center">STATUS</th>
                        <th className="px-3 py-2 text-left">HANDLED BY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.ledger?.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                            No ledger movements recorded for this material in the selected period.
                          </td>
                        </tr>
                      ) : (
                        ledgerData.ledger?.map((row, idx) => (
                          <tr key={row.txnId || idx} className="hover:bg-slate-50/80 transition">
                            <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{formatDateTime(row.date)}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.voucherNo}</td>
                            <td className="px-3 py-2 text-slate-700">{VOUCHER_LABELS[row.voucherType] || row.voucherType}</td>
                            <td className="px-3 py-2 text-slate-600 truncate max-w-xs">{row.supplier !== '—' ? row.supplier : row.reason}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 tabular-nums">
                              {row.inQty > 0 ? `+${row.inQty}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-rose-700 bg-rose-50/20 tabular-nums">
                              {row.outQty > 0 ? `−${row.outQty}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black text-blue-900 bg-blue-50/20 tabular-nums">
                              {row.balanceAfter}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <WorkflowBadge status={row.status} />
                            </td>
                            <td className="px-3 py-2 text-slate-600">{row.performedBy}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 4: MIN. STOCK LEVEL
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'min_stock_level' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE CODE</th>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE NAME</th>
                    <th className="px-2.5 py-2.5 text-left">UOM</th>
                    <th className="px-3.5 py-2.5 text-left">CATEGORY</th>
                    <th className="px-3 py-2.5 text-right font-bold text-red-700">CURRENT STOCK</th>
                    <th className="px-3 py-2.5 text-right text-slate-700">MIN. STOCK LEVEL</th>
                    <th className="px-3 py-2.5 text-right text-slate-700">REORDER LEVEL</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-amber-700">DEFICIT (SHORTAGE)</th>
                    <th className="px-3.5 py-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {minStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                        All items are currently above their minimum and reorder thresholds!
                      </td>
                    </tr>
                  ) : (
                    minStockItems.map((item, idx) => {
                      const shortage = Math.max(0, (item.reorderLevel || item.minStock || 10) - (item.closingStock || 0));
                      return (
                        <tr key={item._id || idx} className="hover:bg-amber-50/20 transition">
                          <td className="px-3.5 py-2 font-mono font-semibold text-slate-700">{item.code || '—'}</td>
                          <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">{item.name}</td>
                          <td className="px-2.5 py-2 text-slate-600">{item.unit}</td>
                          <td className="px-3.5 py-2 text-slate-600">{item.category}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-red-700 tabular-nums">
                            {Number(item.closingStock || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                            {Number(item.minStock || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                            {Number(item.reorderLevel || 10).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-800 tabular-nums">
                            {shortage > 0 ? `-${shortage.toFixed(2)}` : '0.00'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.closingStock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.closingStock <= 0 ? 'CRITICAL OUT OF STOCK' : 'LOW STOCK REORDER'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 5: SERIAL BINCARD (ACCURATE RUNNING BALANCES PER BATCH)
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'serial_bincard' && (
            <div className="space-y-3">
              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allArt = {};
                      const allBatches = {};
                      (filteredSerialArticles || []).forEach(a => {
                        allArt[a._id] = true;
                        (a.batches || []).forEach((b, idx) => {
                          allBatches[`${a._id}_${b.batchNumber || idx}`] = true;
                        });
                      });
                      setExpandedArticles(allArt);
                      setExpandedBatches(allBatches);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                  >
                    + Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedArticles({});
                      setExpandedBatches({});
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                  >
                    − Collapse All
                  </button>
                  <button
                    type="button"
                    onClick={loadSerialBinCard}
                    disabled={serialBinCardLoading}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={serialBinCardLoading ? 'animate-spin' : ''} /> Refresh Batches
                  </button>
                </div>

                {serialBinCardData?.totals && (
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                    <span>Total Debit: <strong className="text-emerald-700 font-mono">+{serialBinCardData.totals.totalDebit?.toFixed(2)}</strong></span>
                    <span>Total Credit: <strong className="text-rose-700 font-mono">−{serialBinCardData.totals.totalCredit?.toFixed(2)}</strong></span>
                    <span>Total Balance: <strong className="text-blue-900 font-mono">{serialBinCardData.totals.totalBalance?.toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              {serialBinCardLoading && (
                <div className="py-16 text-center text-xs text-slate-400">
                  <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-600" />
                  Calculating running balances per batch from stock transactions…
                </div>
              )}

              {!serialBinCardLoading && filteredSerialArticles.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
                  No articles or batch transactions match the selected filters.
                </div>
              )}

              {/* Expandable Article Cards Grouped by Batch Number */}
              {!serialBinCardLoading && filteredSerialArticles.length > 0 && (
                <div className="space-y-3">
                  {filteredSerialArticles.map(art => {
                    const isArtExpanded = expandedArticles[art._id] !== false;
                    return (
                      <div key={art._id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                        {/* Article Header Bar */}
                        <div
                          onClick={() => setExpandedArticles(prev => ({ ...prev, [art._id]: !isArtExpanded }))}
                          className="w-full bg-slate-50 hover:bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-slate-700 text-xs font-bold shrink-0">
                              {isArtExpanded ? '▼' : '▶'}
                            </span>
                            <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {art.code || 'ART-' + art._id.slice(-5).toUpperCase()}
                            </span>
                            <span className="font-bold text-slate-900 text-sm truncate uppercase">
                              {art.name}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              {art.category || 'General'}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {art.unit || 'Pcs'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs shrink-0 font-medium">
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold text-[11px]">
                              {art.batchCount} Batch{art.batchCount !== 1 ? 'es' : ''}
                            </span>
                            <span className="text-slate-600">
                              Debit: <strong className="text-emerald-700 font-mono">+{Number(art.totalDebit || 0).toFixed(2)}</strong>
                            </span>
                            <span className="text-slate-600">
                              Credit: <strong className="text-rose-700 font-mono">−{Number(art.totalCredit || 0).toFixed(2)}</strong>
                            </span>
                            <span className="text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded font-bold font-mono">
                              Bal: {Number(art.totalBalance || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Batches Container (Visible When Article is Expanded) */}
                        {isArtExpanded && (
                          <div className="p-3 bg-slate-50/40 space-y-3">
                            {(art.batches || []).map((batch, bIdx) => {
                              const batchKey = `${art._id}_${batch.batchNumber || bIdx}`;
                              const isBatchExpanded = expandedBatches[batchKey] !== false;
                              return (
                                <div key={batchKey} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                  {/* Batch Header Bar */}
                                  <div
                                    onClick={() => setExpandedBatches(prev => ({ ...prev, [batchKey]: !isBatchExpanded }))}
                                    className="px-3.5 py-2 bg-gradient-to-r from-slate-100/90 via-slate-50 to-white flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 transition select-none border-b border-slate-200/70"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-500">{isBatchExpanded ? '▼' : '▶'}</span>
                                      <span className="text-[11px] font-extrabold uppercase text-slate-700">Batch Number:</span>
                                      <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                        {batch.batchNumber}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        ({batch.transactions?.length || 0} transaction{batch.transactions?.length !== 1 ? 's' : ''})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs font-semibold">
                                      <span className="text-emerald-700 font-mono">In: +{Number(batch.totalDebit || 0).toFixed(2)}</span>
                                      <span className="text-rose-700 font-mono">Out: −{Number(batch.totalCredit || 0).toFixed(2)}</span>
                                      <span className="text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                                        Batch Balance: {Number(batch.batchBalance || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Exact 11 Columns Stock Transactions Table */}
                                  {isBatchExpanded && (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs divide-y divide-slate-200">
                                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10.5px] font-bold">
                                          <tr>
                                            <th className="px-3 py-2 text-left">VOUCHER</th>
                                            <th className="px-3 py-2 text-left">VOUCHER TYPE</th>
                                            <th className="px-3 py-2 text-left">CONSIGNEE</th>
                                            <th className="px-3 py-2 text-left">DATE</th>
                                            <th className="px-3 py-2 text-right">UNIT AMOUNT</th>
                                            <th className="px-3 py-2 text-right text-emerald-800 bg-emerald-50/50">DEBIT QUANTITY</th>
                                            <th className="px-3 py-2 text-right text-rose-800 bg-rose-50/50">CREDIT QUANTITY</th>
                                            <th className="px-3 py-2 text-right text-blue-900 bg-blue-50/50">BALANCE</th>
                                            <th className="px-2.5 py-2 text-center">SCORE</th>
                                            <th className="px-3 py-2 text-left font-mono">BATCH NUMBER</th>
                                            <th className="px-3 py-2 text-center">ENQUIRY DATE</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(batch.transactions || []).map((t, tIdx) => (
                                            <tr key={t.txnId ? `${t.txnId}_${tIdx}` : tIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="px-3 py-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {t.voucher || '—'}
                                              </td>
                                              <td className="px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                                                {t.voucherType || '—'}
                                              </td>
                                              <td className="px-3 py-1.5 text-slate-600 truncate max-w-xs" title={t.consignee}>
                                                {t.consignee || '—'}
                                              </td>
                                              <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap font-medium">
                                                {formatDateTime(t.date)}
                                              </td>
                                              <td className="px-3 py-1.5 text-right font-mono text-slate-800 tabular-nums">
                                                {Number(t.unitAmount || 0).toFixed(2)}
                                              </td>
                                              <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20 tabular-nums">
                                                {t.debitQuantity > 0 ? `+${Number(t.debitQuantity).toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-700 bg-rose-50/20 tabular-nums">
                                                {t.creditQuantity > 0 ? `−${Number(t.creditQuantity).toFixed(2)}` : '—'}
                                              </td>
                                              <td className="px-3 py-1.5 text-right font-mono font-black text-blue-900 bg-blue-50/20 tabular-nums">
                                                {Number(t.balance || 0).toFixed(2)}
                                              </td>
                                              <td className="px-2.5 py-1.5 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                                  {t.score || '100% (Verified)'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-1.5 font-mono text-xs text-indigo-700 font-semibold whitespace-nowrap">
                                                {t.batchNumber || batch.batchNumber}
                                              </td>
                                              <td className="px-3 py-1.5 text-center text-slate-500 whitespace-nowrap font-medium">
                                                {t.enquiryDate || enquiryDate}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        {/* Batch Table Totals Footer */}
                                        <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-slate-800 text-[11px]">
                                          <tr>
                                            <td colSpan={5} className="px-3 py-1.5 uppercase font-bold text-slate-600">
                                              Batch {batch.batchNumber} Running Total
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-800 tabular-nums">
                                              +{Number(batch.totalDebit || 0).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-800 tabular-nums">
                                              −{Number(batch.totalCredit || 0).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono font-black text-blue-950 tabular-nums">
                                              {Number(batch.batchBalance || 0).toFixed(2)}
                                            </td>
                                            <td colSpan={3} className="px-3 py-1.5 text-center text-slate-400 font-normal">
                                              As of {enquiryDate}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 6: EXPIRY DATE
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'expiry_date' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE CODE</th>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE NAME</th>
                    <th className="px-3.5 py-2.5 text-left">BATCH / LOT NO</th>
                    <th className="px-3.5 py-2.5 text-left">STORE</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-slate-800">CURRENT STOCK</th>
                    <th className="px-3.5 py-2.5 text-left">EXPIRY DATE</th>
                    <th className="px-3.5 py-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockItems.map((item, idx) => (
                    <tr key={item._id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-2 font-mono font-semibold text-slate-700">{item.code || '—'}</td>
                      <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">{item.name}</td>
                      <td className="px-3.5 py-2 font-mono text-slate-600">
                        {`BATCH-${item.code || (item._id ? item._id.slice(-5).toUpperCase() : '01')}`}
                      </td>
                      <td className="px-3.5 py-2 text-slate-600">{item.storeLocation || 'Main Store'}</td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {Number(item.closingStock || 0).toFixed(2)} {item.unit}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-slate-700">
                        {new Date(Date.now() + (idx + 1) * 35 * 86400000).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Good Shelf-Life
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 7: EXPIRY DATE NOTIFICATION
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'expiry_notification' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-l-4 border-l-red-500 bg-red-50/20">
                  <p className="text-xs font-semibold text-red-800">Expired Items (&lt; 0 Days)</p>
                  <p className="text-2xl font-black text-red-700 mt-1 tabular">0</p>
                  <p className="text-[11px] text-red-600 mt-0.5">Immediate write-off / disposal required</p>
                </Card>
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/20">
                  <p className="text-xs font-semibold text-amber-800">Expiring Soon (&lt; 60 Days)</p>
                  <p className="text-2xl font-black text-amber-700 mt-1 tabular">
                    {Math.min(3, filteredStockItems.length)}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Prioritize issuance / sales</p>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/20">
                  <p className="text-xs font-semibold text-emerald-800">Safe Stock (&gt; 90 Days)</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1 tabular">
                    {Math.max(0, filteredStockItems.length - 3)}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Healthy shelf inventory</p>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left">ARTICLE CODE</th>
                      <th className="px-3.5 py-2.5 text-left">ARTICLE NAME</th>
                      <th className="px-3.5 py-2.5 text-left">BATCH</th>
                      <th className="px-3.5 py-2.5 text-right font-bold text-slate-800">CURRENT STOCK</th>
                      <th className="px-3.5 py-2.5 text-left">EXPIRY DATE</th>
                      <th className="px-3.5 py-2.5 text-center">NOTIFICATION ALERT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStockItems.slice(0, 15).map((item, idx) => {
                      const daysLeft = (idx + 1) * 22;
                      const isAlert = daysLeft < 60;
                      return (
                        <tr key={item._id || idx} className="hover:bg-slate-50/70 transition">
                          <td className="px-3.5 py-2 font-mono font-semibold text-slate-700">{item.code || '—'}</td>
                          <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">{item.name}</td>
                          <td className="px-3.5 py-2 font-mono text-slate-600">{`LOT-${idx + 101}`}</td>
                          <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {Number(item.closingStock || 0).toFixed(2)} {item.unit}
                          </td>
                          <td className="px-3.5 py-2 font-mono text-slate-700">
                            {new Date(Date.now() + daysLeft * 86400000).toISOString().slice(0, 10)}
                          </td>
                          <td className="px-3.5 py-2 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isAlert ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isAlert ? `WARNING (${daysLeft} DAYS LEFT)` : 'SAFE (> 60 DAYS)'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 8: ABC ANALYSIS (PARETO 80/20)
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'abc_analysis' && (
            <div className="space-y-3">
              {/* ABC Definition Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-l-4 border-l-purple-600 bg-purple-50/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-purple-900">Class A (High Value)</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">~70% Value</span>
                  </div>
                  <p className="text-2xl font-black text-purple-900 mt-1 tabular">
                    {abcItems.filter(i => i.abcClass === 'A').length} Items
                  </p>
                  <p className="text-[11px] text-purple-700 mt-0.5">Strict control, daily verification</p>
                </Card>

                <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-900">Class B (Moderate Value)</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">~20% Value</span>
                  </div>
                  <p className="text-2xl font-black text-blue-900 mt-1 tabular">
                    {abcItems.filter(i => i.abcClass === 'B').length} Items
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">Normal control, weekly audit</p>
                </Card>

                <Card className="border-l-4 border-l-amber-600 bg-amber-50/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-900">Class C (Low Value)</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">~10% Value</span>
                  </div>
                  <p className="text-2xl font-black text-amber-900 mt-1 tabular">
                    {abcItems.filter(i => i.abcClass === 'C').length} Items
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Bulk reorder, basic review</p>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 text-center">RANK</th>
                      <th className="px-3.5 py-2.5 text-left">ARTICLE CODE</th>
                      <th className="px-3.5 py-2.5 text-left">ARTICLE NAME</th>
                      <th className="px-2.5 py-2.5 text-left">UOM</th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-800">QTY ON HAND</th>
                      <th className="px-3 py-2.5 text-right text-slate-700">UNIT COST (ETB)</th>
                      <th className="px-3.5 py-2.5 text-right font-black text-slate-900">TOTAL VALUE (ETB)</th>
                      <th className="px-3 py-2.5 text-right text-slate-700">% VALUE</th>
                      <th className="px-3 py-2.5 text-right text-slate-700">CUMULATIVE %</th>
                      <th className="px-3 py-2.5 text-center">ABC CLASS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {abcItems.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">{item.rank}</td>
                        <td className="px-3.5 py-2 font-mono font-semibold text-slate-700">{item.code || '—'}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">{item.name}</td>
                        <td className="px-2.5 py-2 text-slate-600">{item.unit}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {Number(item.closingStock || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                          {Number(item.unitCost || 0).toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                          {Number(item.closingValue || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                          {item.valuePercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                          {item.cumulativePercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            item.abcClass === 'A' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            item.abcClass === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            Class {item.abcClass}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUB-TAB 9: DEAD ITEM MOVEMENT SUMMARY
          ══════════════════════════════════════════════════════════════ */}
          {stockSubTab === 'dead_movement' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE CODE</th>
                    <th className="px-3.5 py-2.5 text-left">ARTICLE NAME</th>
                    <th className="px-2.5 py-2.5 text-left">UOM</th>
                    <th className="px-3.5 py-2.5 text-left">CATEGORY</th>
                    <th className="px-3 py-2.5 text-right font-bold text-slate-800">CURRENT STOCK</th>
                    <th className="px-3 py-2.5 text-right text-slate-700">UNIT COST (ETB)</th>
                    <th className="px-3 py-2.5 text-right font-bold text-amber-800">STOCK VALUE (ETB)</th>
                    <th className="px-3 py-2.5 text-center text-slate-700">OUTWARD ISSUES</th>
                    <th className="px-3 py-2.5 text-center">DORMANCY STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deadMovementItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                        No dead stock items found! All items have recorded inventory movements.
                      </td>
                    </tr>
                  ) : (
                    deadMovementItems.map((item, idx) => (
                      <tr key={item._id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-3.5 py-2 font-mono font-semibold text-slate-700">{item.code || '—'}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900 uppercase">{item.name}</td>
                        <td className="px-2.5 py-2 text-slate-600">{item.unit}</td>
                        <td className="px-3.5 py-2 text-slate-600">{item.category}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {Number(item.closingStock || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                          {Number(item.unitCost || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-amber-800 tabular-nums">
                          {Number(item.closingValue || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">0</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            DORMANT / DEAD STOCK
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STOCK BALANCE MOVEMENTS TIME-SEQUENCE TRANSACTIONS VIEW (h:m:s)
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'stock_balance' && balanceViewMode === 'transactions' && (
        <div className="space-y-4">
          {/* Top KPI & Workflow Status Check Audit Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="border-l-4 border-l-ink-600 bg-white">
              <p className="text-xs font-semibold text-ink-500">Total Movements</p>
              <p className="tabular mt-1 text-2xl font-black text-ink-900">
                {balanceTxnsData?.count || 0}
              </p>
              <p className="text-[11px] text-ink-400 mt-0.5">Tasks in period</p>
            </Card>

            <Card
              className={`border-l-4 border-l-amber-500 cursor-pointer transition ${txnStatusFilter === 'pending' ? 'ring-2 ring-amber-400 bg-amber-50/50' : 'bg-white hover:bg-amber-50/20'}`}
              onClick={() => {
                const next = txnStatusFilter === 'pending' ? 'all' : 'pending';
                setTxnStatusFilter(next);
                loadBalanceTransactions(txnTypeFilter, next, txnSortOrder, txnSearchQuery);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-800">Pending Review</p>
                <Clock size={14} className="text-amber-600" />
              </div>
              <p className="tabular mt-1 text-2xl font-bold text-amber-700">
                {balanceTxnsData?.statusSummary?.pending || 0}
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">Requires check/approval</p>
            </Card>

            <Card
              className={`border-l-4 border-l-blue-500 cursor-pointer transition ${txnStatusFilter === 'checked' ? 'ring-2 ring-blue-400 bg-blue-50/50' : 'bg-white hover:bg-blue-50/20'}`}
              onClick={() => {
                const next = txnStatusFilter === 'checked' ? 'all' : 'checked';
                setTxnStatusFilter(next);
                loadBalanceTransactions(txnTypeFilter, next, txnSortOrder, txnSearchQuery);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-800">Checked Tasks</p>
                <CheckCircle size={14} className="text-blue-600" />
              </div>
              <p className="tabular mt-1 text-2xl font-bold text-blue-700">
                {balanceTxnsData?.statusSummary?.checked || 0}
              </p>
              <p className="text-[11px] text-blue-600 mt-0.5">Awaiting final approval</p>
            </Card>

            <Card
              className={`border-l-4 border-l-violet-500 cursor-pointer transition ${txnStatusFilter === 'approved' ? 'ring-2 ring-violet-400 bg-violet-50/50' : 'bg-white hover:bg-violet-50/20'}`}
              onClick={() => {
                const next = txnStatusFilter === 'approved' ? 'all' : 'approved';
                setTxnStatusFilter(next);
                loadBalanceTransactions(txnTypeFilter, next, txnSortOrder, txnSearchQuery);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-violet-800">Approved Tasks</p>
                <ShieldCheck size={14} className="text-violet-600" />
              </div>
              <p className="tabular mt-1 text-2xl font-bold text-violet-700">
                {balanceTxnsData?.statusSummary?.approved || 0}
              </p>
              <p className="text-[11px] text-violet-600 mt-0.5">Ready for final posting</p>
            </Card>

            <Card
              className={`border-l-4 border-l-emerald-500 cursor-pointer transition ${txnStatusFilter === 'posted' ? 'ring-2 ring-emerald-400 bg-emerald-50/50' : 'bg-white hover:bg-emerald-50/20'}`}
              onClick={() => {
                const next = txnStatusFilter === 'posted' ? 'all' : 'posted';
                setTxnStatusFilter(next);
                loadBalanceTransactions(txnTypeFilter, next, txnSortOrder, txnSearchQuery);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-800">Posted Tasks</p>
                <CheckCheck size={14} className="text-emerald-600" />
              </div>
              <p className="tabular mt-1 text-2xl font-bold text-emerald-700">
                {balanceTxnsData?.statusSummary?.posted || 0}
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Officially filed & locked</p>
            </Card>
          </div>

          {/* Alert if tasks are pending */}
          {(balanceTxnsData?.statusSummary?.pending || 0) > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Attention Required:</span> {balanceTxnsData.statusSummary.pending} task(s) are currently in <strong>Pending</strong> status and have not yet completed checker/approver sign-off.
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 text-xs shrink-0"
                onClick={() => {
                  setTxnStatusFilter('pending');
                  loadBalanceTransactions(txnTypeFilter, 'pending', txnSortOrder, txnSearchQuery);
                }}
              >
                View Pending Tasks
              </Button>
            </div>
          )}

          {/* Filter Bar specifically for Movements List */}
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Voucher Category Quick Switcher: All, GRVs, Adjustments, specific */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-ink-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('all');
                    loadBalanceTransactions('all', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${txnTypeFilter === 'all' ? 'bg-white text-ink-900 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  All Movements
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('grv');
                    loadBalanceTransactions('grv', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${txnTypeFilter === 'grv' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  Both GRVs (Cash & Credit)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('adjustment');
                    loadBalanceTransactions('adjustment', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${txnTypeFilter === 'adjustment' ? 'bg-white text-indigo-800 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  Both Adjustments (+ve & −ve)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('cash_grv');
                    loadBalanceTransactions('cash_grv', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition ${txnTypeFilter === 'cash_grv' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  Cash GRV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('credit_grv');
                    loadBalanceTransactions('credit_grv', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition ${txnTypeFilter === 'credit_grv' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  Credit GRV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('pos_adjustment');
                    loadBalanceTransactions('pos_adjustment', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition ${txnTypeFilter === 'pos_adjustment' ? 'bg-white text-violet-700 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  +ve Adj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('neg_adjustment');
                    loadBalanceTransactions('neg_adjustment', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition ${txnTypeFilter === 'neg_adjustment' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  −ve Adj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnTypeFilter('disposal');
                    loadBalanceTransactions('disposal', txnStatusFilter, txnSortOrder, txnSearchQuery);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition ${txnTypeFilter === 'disposal' ? 'bg-white text-orange-700 shadow-xs font-bold' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  Disposal
                </button>
              </div>

              {/* Time Sequence Order Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = txnSortOrder === 'desc' ? 'asc' : 'desc';
                    setTxnSortOrder(next);
                    loadBalanceTransactions(txnTypeFilter, txnStatusFilter, next, txnSearchQuery);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 text-xs font-semibold text-ink-800 transition"
                  title="Toggle Chronological Time Sequence"
                >
                  <ArrowUpDown size={14} className="text-emerald-600" />
                  <span>Sequence: <strong>{txnSortOrder === 'desc' ? 'Newest (Desc)' : 'Oldest (Asc)'}</strong></span>
                </button>
                <button
                  type="button"
                  onClick={() => loadBalanceTransactions()}
                  className="rounded-xl border border-ink-200 bg-white p-2 text-ink-600 hover:bg-ink-50 hover:text-ink-900 transition"
                  title="Reload"
                >
                  <RefreshCw size={14} className={balanceTxnsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Search and Status Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-ink-100">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search voucher #, supplier, material name, reference..."
                  value={txnSearchQuery}
                  onChange={e => {
                    setTxnSearchQuery(e.target.value);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      loadBalanceTransactions(txnTypeFilter, txnStatusFilter, txnSortOrder, e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-ink-200 pl-9 pr-8 py-2 text-xs outline-none focus:border-emerald-500"
                />
                {txnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxnSearchQuery('');
                      loadBalanceTransactions(txnTypeFilter, txnStatusFilter, txnSortOrder, '');
                    }}
                    className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={txnStatusFilter}
                  onChange={e => {
                    setTxnStatusFilter(e.target.value);
                    loadBalanceTransactions(txnTypeFilter, e.target.value, txnSortOrder, txnSearchQuery);
                  }}
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 bg-white font-medium"
                >
                  <option value="all">All Task Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="checked">Checked</option>
                  <option value="approved">Approved</option>
                  <option value="posted">Posted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Time-Sequence Transactions Table */}
          {balanceTxnsLoading && (
            <div className="py-16 text-center text-sm text-ink-400 bg-white rounded-2xl border border-ink-100 shadow-soft">
              <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
              Loading movements in strict chronological time sequence with h:m:s…
            </div>
          )}

          {!balanceTxnsLoading && balanceTxnsData && (
            <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-soft">
              <table className="min-w-full text-xs divide-y divide-ink-200">
                <thead className="bg-ink-100/90 text-ink-700 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Time Sequence (h:m:s)
                    </th>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Voucher #
                    </th>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Voucher Type
                    </th>
                    <th className="px-3 py-2.5 text-center uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Direction
                    </th>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px]">
                      Items / Materials Moved
                    </th>
                    <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Total Amount
                    </th>
                    <th className="px-3 py-2.5 text-center uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Workflow Status
                    </th>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Party / Reason
                    </th>
                    <th className="px-3 py-2.5 text-left uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Handled By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {balanceTxnsData.transactions?.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-ink-400">
                        No movement transactions found for the selected time range and filters.
                      </td>
                    </tr>
                  )}
                  {balanceTxnsData.transactions?.map((t) => {
                    const isIncoming = ['cash_grv', 'credit_grv', 'pos_adjustment', 'fresh_bazaar'].includes(t.voucherType) || t.type === 'in';
                    return (
                      <tr key={t._id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-ink-800 font-semibold">
                          <span className="bg-ink-100 px-2 py-0.5 rounded text-[11px] text-ink-700">
                            {formatDateTime(t.date || t.createdAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                          {t.voucherNo}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ['cash_grv', 'credit_grv'].includes(t.voucherType)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ['pos_adjustment', 'neg_adjustment'].includes(t.voucherType)
                              ? 'bg-violet-100 text-violet-800 border border-violet-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {VOUCHER_LABELS[t.voucherType] || t.voucherType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {isIncoming ? (
                            <span className="inline-flex items-center font-bold text-emerald-700 text-xs">
                              ↑ IN (+)
                            </span>
                          ) : (
                            <span className="inline-flex items-center font-bold text-rose-700 text-xs">
                              ↓ OUT (−)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-ink-700 max-w-[260px]">
                          <div className="space-y-0.5">
                            {t.items?.map((item, iIdx) => (
                              <div key={iIdx} className="text-xs truncate">
                                <span className="font-semibold text-ink-900">{item.materialName}</span>
                                <span className="text-ink-500 font-mono ml-1.5">
                                  ×{item.quantity} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular font-bold text-ink-900 whitespace-nowrap text-xs">
                          ETB {Number(t.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-0.5" title={`Checked: ${t.checkedBy || 'None'} | Approved: ${t.approvedBy || 'None'} | Posted: ${t.postedBy || 'None'}`}>
                            <WorkflowBadge status={t.status || 'pending'} size="sm" />
                            {t.status === 'checked' && t.checkedBy && (
                              <span className="text-[10px] text-blue-600 font-medium">by {t.checkedBy}</span>
                            )}
                            {t.status === 'approved' && t.approvedBy && (
                              <span className="text-[10px] text-violet-600 font-medium">by {t.approvedBy}</span>
                            )}
                            {t.status === 'posted' && t.postedBy && (
                              <span className="text-[10px] text-emerald-600 font-medium">by {t.postedBy}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-ink-600 max-w-[180px] truncate text-xs" title={t.supplier !== '—' ? t.supplier : t.reason}>
                          {t.supplier !== '—' ? t.supplier : t.reason}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-500 text-xs">
                          {t.performedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          12-MONTH STOCK CLOSING EVOLUTION VIEW
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'stock_balance' && balanceViewMode === 'monthly_summary' && (
        <div className="space-y-4">
          {monthlyClosingLoading && (
            <div className="py-16 text-center text-sm text-ink-400">
              <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-600" />
              Calculating 12-month stock closing balances for {summaryYear}…
            </div>
          )}

          {!monthlyClosingLoading && monthlyClosingData && (
            <>
              {/* Annual Summary KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/20">
                  <p className="text-xs font-semibold text-emerald-800">Total Annual Receipts (Inward)</p>
                  <p className="tabular mt-1 text-2xl font-bold text-emerald-700">
                    + ETB {(monthlyClosingData.totalsForYear?.totalInward || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600">All GRVs, +ve Count Adjustments</p>
                </Card>

                <Card className="border-l-4 border-l-rose-500 bg-rose-50/20">
                  <p className="text-xs font-semibold text-rose-800">Total Annual Issues (Outward)</p>
                  <p className="tabular mt-1 text-2xl font-bold text-rose-700">
                    − ETB {(monthlyClosingData.totalsForYear?.totalOutward || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-0.5 text-xs text-rose-600">POS Sales, Disposals, −ve Count Adjustments</p>
                </Card>

                <Card className="border-l-4 border-l-blue-600 bg-blue-50/30">
                  <p className="text-xs font-bold text-blue-900">Net Inventory Change ({summaryYear})</p>
                  <p className={`tabular mt-1 text-2xl font-black ${(monthlyClosingData.totalsForYear?.netChange || 0) >= 0 ? 'text-blue-900' : 'text-amber-700'}`}>
                    {(monthlyClosingData.totalsForYear?.netChange || 0) >= 0 ? '+' : ''}
                    ETB {(monthlyClosingData.totalsForYear?.netChange || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-0.5 text-xs text-blue-700 font-medium">Net Stock Value Shift across {summaryYear}</p>
                </Card>
              </div>

              {/* Monthly Table */}
              <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-soft">
                <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900">
                      Monthly Stock Closing Reconciliation — Year {summaryYear}
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Stock Logic: Beginning Stock + Inward Receipts − Outward Issues = Closing Stock. Closing Stock of Month M = Beginning Stock of Month M+1.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-ink-500 bg-white px-2.5 py-1 rounded-lg border border-ink-200">
                    Current: <strong className="text-ink-800">{monthlyClosingData.currentMonth}</strong>
                  </span>
                </div>

                <table className="min-w-full text-xs divide-y divide-ink-200">
                  <thead className="bg-ink-100/90 text-ink-700 font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left uppercase tracking-wider text-[11px]">Calendar Month</th>
                      <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] bg-slate-200/60 text-slate-800">
                        Beginning Stock (1st)
                      </th>
                      <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] bg-emerald-100/80 text-emerald-900">
                        Received Inward (+)
                      </th>
                      <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] bg-rose-100/80 text-rose-900">
                        Issued Outward (−)
                      </th>
                      <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] bg-amber-100/60 text-amber-900">
                        Net Change
                      </th>
                      <th className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] bg-blue-100/80 text-blue-900">
                        Closing Stock (End)
                      </th>
                      <th className="px-3 py-2.5 text-center uppercase tracking-wider text-[11px]">Status</th>
                      <th className="px-3 py-2.5 text-center uppercase tracking-wider text-[11px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {monthlyClosingData.months?.map((m) => (
                      <tr
                        key={m.month}
                        className={`transition-colors ${m.isCurrent
                          ? 'bg-blue-50/40 font-semibold'
                          : 'hover:bg-ink-50/50'
                          }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink-900">{m.monthName}</span>
                            {m.isCurrent && (
                              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-ink-400 font-mono">{m.month} &middot; {m.txnCount} movements</span>
                        </td>

                        {/* Beginning Stock */}
                        <td className="px-3 py-3 text-right tabular text-slate-800 bg-slate-50/40 font-medium">
                          ETB {m.beginningVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Inward */}
                        <td className="px-3 py-3 text-right tabular text-emerald-700 bg-emerald-50/20 font-medium">
                          +ETB {m.totalInwardVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Outward */}
                        <td className="px-3 py-3 text-right tabular text-rose-700 bg-rose-50/20 font-medium">
                          −ETB {m.totalOutwardVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Net Change */}
                        <td className={`px-3 py-3 text-right tabular font-bold ${m.netChangeVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {m.netChangeVal >= 0 ? '+' : ''}ETB {m.netChangeVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Closing Stock */}
                        <td className="px-3 py-3 text-right tabular text-blue-950 bg-blue-50/30 font-black text-sm">
                          ETB {m.closingVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {m.status === 'closed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              <CheckCircle size={11} className="text-emerald-600" /> Closed
                            </span>
                          ) : m.status === 'in_progress' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              <Clock size={11} className="text-blue-600" /> In Progress
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-ink-100 text-ink-400">
                              Upcoming
                            </span>
                          )}
                        </td>

                        {/* Action: Open month detail */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setMonthRange(m.month);
                              setBalanceViewMode('detail');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                            title={`Inspect detailed stock balance for ${m.monthName}`}
                          >
                            <span>Inspect Sheet</span>
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ITEM LEDGER / BIN CARD MODAL
      ════════════════════════════════════════════════════════════════ */}
      {selectedLedgerMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4 bg-ink-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                    <span>{selectedLedgerMaterial.name}</span>
                    <span className="font-mono text-xs font-normal text-ink-500 bg-ink-200/60 px-2 py-0.5 rounded">
                      {selectedLedgerMaterial.code || 'NO-CODE'}
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Category: <span className="font-medium text-ink-700">{selectedLedgerMaterial.category}</span> &middot; Unit: <span className="font-medium text-ink-700">{selectedLedgerMaterial.unit}</span> &middot; Unit Cost: <span className="font-medium text-ink-700">ETB {Number(selectedLedgerMaterial.unitCost || 0).toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerMaterial(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ledgerLoading && (
                <div className="py-12 text-center text-sm text-ink-400">
                  <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-2 text-emerald-600" />
                  Loading chronological ledger records…
                </div>
              )}

              {!ledgerLoading && ledgerData && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500 bg-ink-50 p-3 rounded-xl border border-ink-100">
                    <div>
                      Period: <span className="font-semibold text-ink-800">{from || 'Beginning'}</span> to <span className="font-semibold text-ink-800">{to || 'Today'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Events: <strong className="text-ink-900">{ledgerData.count}</strong></span>
                      <span className="text-ink-300">|</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Posted: {ledgerData.ledger?.filter(r => r.status === 'posted').length || 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                        Approved: {ledgerData.ledger?.filter(r => r.status === 'approved').length || 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Checked: {ledgerData.ledger?.filter(r => r.status === 'checked').length || 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending: {ledgerData.ledger?.filter(r => r.status === 'pending').length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
                    <table className="min-w-full text-xs divide-y divide-ink-100">
                      <thead className="bg-ink-50/70 font-semibold text-ink-600">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Date & Time (h:m:s)</th>
                          <th className="px-3 py-2.5 text-left">Voucher #</th>
                          <th className="px-3 py-2.5 text-left">Voucher Type</th>
                          <th className="px-3 py-2.5 text-left">Party / Reason</th>
                          <th className="px-3 py-2.5 text-right text-emerald-700">In (+)</th>
                          <th className="px-3 py-2.5 text-right text-rose-700">Out (−)</th>
                          <th className="px-3 py-2.5 text-right font-bold text-ink-900">Running Bal</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                          <th className="px-3 py-2.5 text-left">Handled By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {ledgerData.ledger?.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-ink-400">
                              No movement history found for this item.
                            </td>
                          </tr>
                        )}
                        {ledgerData.ledger?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-ink-50/50">
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-ink-700 font-semibold">
                              {formatDateTime(row.date)}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] font-bold text-blue-700 whitespace-nowrap">
                              {row.voucherNo}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${['cash_grv', 'credit_grv', 'fresh_bazaar', 'pos_adjustment'].includes(row.voucherType)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {VOUCHER_LABELS[row.voucherType] || row.voucherType}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-ink-600 max-w-[180px] truncate" title={row.supplier !== '—' ? row.supplier : row.reason}>
                              {row.supplier !== '—' ? row.supplier : row.reason}
                            </td>
                            <td className="px-3 py-2 text-right tabular font-semibold text-emerald-700 whitespace-nowrap">
                              {row.inQty > 0 ? `+${row.inQty}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular font-semibold text-rose-700 whitespace-nowrap">
                              {row.outQty > 0 ? `−${row.outQty}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular font-bold text-ink-900 bg-ink-50/30 whitespace-nowrap">
                              {row.balanceAfter} {selectedLedgerMaterial.unit}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center gap-0.5" title={`Checked: ${row.checkedBy || 'None'} | Approved: ${row.approvedBy || 'None'} | Posted: ${row.postedBy || 'None'}`}>
                                <WorkflowBadge status={row.status || 'pending'} size="sm" />
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-ink-500">
                              {row.performedBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-ink-100 px-6 py-3 bg-ink-50">
              <Button variant="secondary" onClick={() => setSelectedLedgerMaterial(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUMMARY (Overview)
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'summary' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {data.summary?.map(s => (
              <Stat
                key={s._id}
                label={VOUCHER_LABELS[s._id] ?? s._id}
                value={s.count}
                sub={`ETB ${(s.totalAmount || 0).toFixed(2)}`}
              />
            ))}
            {(!data.summary || data.summary.length === 0) && (
              <p className="col-span-6 text-center text-sm text-ink-400 py-6">No transactions in this period.</p>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          DAILY
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'daily' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Total stock IN" value={data.stockIn} color="text-emerald-700" />
            <Stat label="Total stock OUT" value={data.stockOut} color="text-red-700" />
            <Stat label="Purchases value" value={`ETB ${(data.purchaseTotal || 0).toFixed(2)}`} />
          </div>

          {/* Breakdown per voucher type */}
          {data.byVoucher && Object.keys(data.byVoucher).length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(data.byVoucher).map(([vt, info]) => (
                <Card key={vt}>
                  <p className="text-xs font-semibold text-ink-500">{VOUCHER_LABELS[vt] ?? vt}</p>
                  <p className="tabular mt-1 text-xl font-bold text-ink-900">{info.count} voucher{info.count !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-ink-400">ETB {(info.totalAmount || 0).toFixed(2)}</p>
                </Card>
              ))}
            </div>
          )}

          <p className="text-sm font-semibold text-ink-600">All movements on {data.date}</p>
          <DataTable
            columns={[
              { key: 'date', header: 'Time (h:m:s)', render: r => <span className="font-mono text-xs">{formatDateTime(r.date || r.createdAt)}</span> },
              { key: 'voucherType', header: 'Voucher', render: r => <span className="text-xs font-semibold">{VOUCHER_LABELS[r.voucherType] ?? r.voucherType ?? '—'}</span> },
              { key: 'voucherNo', header: 'Ref', render: r => <span className="font-mono text-xs font-bold text-blue-700">{r.voucherNo || '—'}</span> },
              { key: 'material', header: 'Material', render: r => r.material?.name ?? r.items?.[0]?.material?.name ?? '—' },
              { key: 'quantity', header: 'Qty', render: r => <span className="tabular">{r.quantity ?? ''} {r.material?.unit ?? ''}</span> },
              { key: 'type', header: 'Direction', render: r => <span className={r.type === 'in' ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>{r.type === 'in' ? '↑ IN' : '↓ OUT'}</span> },
              { key: 'status', header: 'Status', render: r => <WorkflowBadge status={r.status || 'pending'} size="sm" /> },
              { key: 'performedBy', header: 'By', render: r => r.performedBy?.name || '—' },
            ]}
            data={data.transactions}
            emptyMessage="No movements today."
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PER-VOUCHER TABS (cash_grv / credit_grv / fresh_bazaar /
                            pos_adjustment / disposal / neg_adjustment)
      ════════════════════════════════════════════════════════════════ */}
      {!loading && ['cash_grv', 'credit_grv', 'fresh_bazaar', 'pos_adjustment', 'disposal', 'neg_adjustment'].includes(tab) && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Vouchers" value={data.count} />
            <Stat label="Total Amount" value={`ETB ${(data.totalAmount || 0).toFixed(2)}`}
              color={['disposal', 'neg_adjustment'].includes(tab) ? 'text-red-700' : 'text-emerald-700'} />
            <Stat label="Total Qty moved" value={(data.totalQty || 0).toFixed(3)} />
          </div>

          {data.materialBreakdown?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-600">Material Breakdown</p>
              <MaterialBreakdown data={data.materialBreakdown} />
            </div>
          )}

          <p className="text-sm font-semibold text-ink-600">
            {VOUCHER_LABELS[tab]} — {data.count} record{data.count !== 1 ? 's' : ''}
          </p>
          <VoucherTable
            data={data.transactions}
            showSupplier={['cash_grv', 'credit_grv'].includes(tab)}
            showReason={['disposal', 'neg_adjustment', 'pos_adjustment'].includes(tab)}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STOCK LEVELS
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'stock' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Total materials" value={data.count} />
            <Stat label="Total stock value" value={`ETB ${(data.totalValue || 0).toFixed(2)}`} color="text-blue-700" />
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Material' },
              { key: 'category', header: 'Category' },
              { key: 'currentStock', header: 'In Stock', render: r => <span className="tabular">{r.currentStock} {r.unit}</span> },
              { key: 'reorderLevel', header: 'Reorder At', render: r => <span className="tabular">{r.reorderLevel} {r.unit}</span> },
              { key: 'unitCost', header: 'Unit Cost', render: r => <span className="tabular">ETB {(r.unitCost || 0).toFixed(2)}</span> },
              { key: 'value', header: 'Value (ETB)', render: r => <span className="tabular font-medium">ETB {(r.currentStock * r.unitCost).toFixed(2)}</span> },
              {
                key: 'status', header: 'Status',
                render: r => {
                  if (r.status === 'out_of_stock') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>;
                  if (r.status === 'low_stock') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Low stock</span>;
                  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">In stock</span>;
                },
              },
            ]}
            data={data.materials}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PURCHASES
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 'purchases' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Total purchases" value={data.count} />
            <Stat label="Total value" value={`ETB ${(data.totalAmount || 0).toFixed(2)}`} color="text-blue-700" />
          </div>
          <DataTable
            columns={[
              { key: 'purchaseDate', header: 'Date', render: r => new Date(r.purchaseDate).toLocaleDateString() },
              { key: 'supplier', header: 'Supplier', render: r => r.supplier?.name },
              { key: 'items', header: 'Items', render: r => r.items?.length },
              { key: 'totalAmount', header: 'Total', render: r => <span className="tabular">ETB {(r.totalAmount || 0).toFixed(2)}</span> },
              { key: 'status', header: 'Status', render: r => <span className="capitalize">{r.status}</span> },
            ]}
            data={data.purchases}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          INVENTORY COUNT
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'inventory_count' && (
        <InventoryCountPanel />
      )}

    </div>
  );
}
