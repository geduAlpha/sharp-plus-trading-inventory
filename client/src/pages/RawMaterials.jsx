import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, Upload, Download, X, Zap, Boxes,
  History, CircleArrowDown, CircleArrowUp, ExternalLink, AlertCircle,
  Eye, EyeOff, Tag, Layers, CheckCircle2, AlertTriangle, XCircle,
  SlidersHorizontal, RefreshCw, Barcode as BarcodeIcon, Store, Check,
  Edit3, Package, DollarSign, Activity, ChevronRight
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ExportDropdown from '../components/ui/ExportDropdown';
import Pagination from '../components/ui/Pagination';

const ITEM_TYPES = ['Raw Material', 'Finished Product', 'Trading Item'];

const emptyForm = {
  code: '',
  name: '',
  category: '',
  itemType: 'Raw Material',
  unit: '',
  description: '',
  barcode: '',
  currentStock: '',
  openingBalance: '',
  minStock: 0,
  maxStock: 0,
  reorderLevel: 10,
  unitCost: '',
  storeLocation: 'Main Store',
  isActive: true,
};

// Common units for hospitality, trading & manufacturing
const UNITS = [
  { group: 'Count / Pack', items: ['Piece (Pcs)', 'Dozen', 'Pack', 'Box', 'Carton', 'Bag', 'Bottle', 'Can', 'Roll', 'Sheet', 'Set', 'Pair'] },
  { group: 'Weight', items: ['Kilogram (kg)', 'Gram (g)', 'Pound (lb)', 'Ounce (oz)', 'Quintal (q)', 'Metric Ton (t)'] },
  { group: 'Volume', items: ['Litre (L)', 'Millilitre (ml)', 'Gallon', 'Fluid oz', 'Barrel'] },
  { group: 'Length & Area', items: ['Metre (m)', 'Centimetre (cm)', 'Millimetre (mm)', 'Square Metre (m²)', 'Yard'] },
  { group: 'Hospitality / Kitchen', items: ['Portion', 'Serving', 'Tray', 'Batch', 'Cup', 'Plate'] },
];

const statusBadge = (status) => {
  if (status === 'inactive') return <Badge color="gray">Inactive</Badge>;
  if (status === 'out_of_stock') return <Badge color="red">Out of stock</Badge>;
  if (status === 'low_stock') return <Badge color="amber">Low stock</Badge>;
  if (status === 'over_stock') return <Badge color="purple">Over stock</Badge>;
  return <Badge color="green">In stock</Badge>;
};

const itemTypeBadge = (type) => {
  if (type === 'Finished Product') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Finished Product</span>;
  if (type === 'Trading Item') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Trading Item</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Raw Material</span>;
};

const Items = () => {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [configuredStores, setConfiguredStores] = useState(['Main Store']);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [unitCustom, setUnitCustom] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Manager Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewMat, setViewMat] = useState(null);

  // Stock Movement History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMat, setHistoryMat] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [importResult, setImportResult] = useState(null);
  const importRef = useRef();
  const { hasRole, can } = useAuth();
  const canEdit = hasRole('admin', 'manager') || can('recordGoods');

  // Load items
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/materials', {
        params: {
          search,
          category: selectedCategory,
          itemType: selectedType,
          status: selectedStatus,
          storeLocation: selectedStore,
          isActive: 'all',
        },
      });
      setMaterials(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to load items:', err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Load store locations
  const loadStores = async () => {
    try {
      const res = await api.get('/inventory-count/stores');
      const storeList = res.data?.stores || [];
      const merged = Array.from(new Set(['Main Store', ...storeList])).filter(Boolean);
      setConfiguredStores(merged);
    } catch {
      setConfiguredStores(['Main Store']);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [search, selectedCategory, selectedType, selectedStatus, selectedStore]);

  useEffect(() => {
    loadCategories();
    loadStores();
  }, []);

  /* ── Stats Calculations ── */
  const stats = useMemo(() => {
    const total = materials.length;
    const inStock = materials.filter(m => m.status === 'in_stock').length;
    const lowStock = materials.filter(m => m.status === 'low_stock').length;
    const outOfStock = materials.filter(m => m.status === 'out_of_stock').length;
    const valuation = materials.reduce((sum, m) => sum + ((Number(m.currentStock) || 0) * (Number(m.unitCost) || 0)), 0);
    return { total, inStock, lowStock, outOfStock, valuation };
  }, [materials]);

  /* ── Pagination Slice ── */
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return materials.slice(start, start + pageSize);
  }, [materials, page, pageSize]);

  /* ── Selection ── */
  const allIds = paginatedData.map(m => m._id);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someChecked = allIds.some(id => selected.has(id));
  const toggleAll = () => allChecked
    ? setSelected(new Set())
    : setSelected(new Set(allIds));
  const toggleOne = id => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  /* ── Bulk Delete ── */
  const handleBulkDelete = async () => {
    if (!window.confirm(`Move ${selected.size} selected item(s) to recycle bin?`)) return;
    try {
      await api.delete('/materials/bulk', { data: { ids: [...selected] } });
      loadMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete selected items.');
    }
  };

  /* ── Active Status Toggle ── */
  const handleToggleStatus = async (m, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/materials/${m._id}/status`, { isActive: !m.isActive });
      loadMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status.');
    }
  };

  /* ── Auto-generate sequential item code ── */
  const handleGenerateCode = async (targetType = form.itemType) => {
    try {
      const res = await api.get('/materials/next-code', { params: { itemType: targetType } });
      if (res.data?.nextCode) {
        setForm(f => ({ ...f, code: res.data.nextCode }));
      }
    } catch {
      const prefix = targetType === 'Finished Product' ? 'FP' : targetType === 'Trading Item' ? 'TI' : 'RM';
      const nums = materials
        .map(m => {
          const match = String(m.code || '').match(new RegExp(`^${prefix}-?(\\d+)`, 'i'));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      setForm(f => ({ ...f, code: `${prefix}-${String(next).padStart(4, '0')}` }));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || 'General',
    });
    setUnitCustom(false);
    setFormError('');
    setModalOpen(true);
    handleGenerateCode('Raw Material');
  };

  const openEdit = (m) => {
    const allUnits = UNITS.flatMap(g => g.items);
    const isPresetUnit = allUnits.includes(m.unit);
    setEditing(m);
    setForm({
      code: m.code || '',
      name: m.name || '',
      category: m.category || 'General',
      itemType: m.itemType || 'Raw Material',
      unit: m.unit || '',
      description: m.description || '',
      barcode: m.barcode || '',
      currentStock: m.currentStock !== undefined ? m.currentStock : '',
      openingBalance: m.openingBalance !== undefined ? m.openingBalance : m.currentStock,
      minStock: m.minStock || 0,
      maxStock: m.maxStock || 0,
      reorderLevel: m.reorderLevel !== undefined ? m.reorderLevel : 10,
      unitCost: m.unitCost !== undefined ? m.unitCost : '',
      storeLocation: m.storeLocation || 'Main Store',
      isActive: m.isActive !== undefined ? m.isActive : true,
    });
    setUnitCustom(!isPresetUnit && !!m.unit);
    setFormError('');
    setModalOpen(true);
  };

  const openView = (m) => {
    setViewMat(m);
    setViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = (form.name || '').trim();
    if (!trimmedName) {
      setFormError('Item name is required.');
      return;
    }

    const trimmedUnit = (form.unit || '').trim();
    if (!trimmedUnit) {
      setFormError('Please select or specify a unit of measurement.');
      return;
    }

    const min = Number(form.minStock) || 0;
    const max = Number(form.maxStock) || 0;
    if (max > 0 && max < min) {
      setFormError(`Maximum stock (${max}) cannot be less than minimum stock (${min}).`);
      return;
    }

    // Pre-flight duplicate check against loaded items
    const trimmedCode = (form.code || '').trim();
    const duplicate = materials.find(m => {
      if (editing && m._id === editing._id) return false;
      const sameName = (m.name || '').trim().toLowerCase() === trimmedName.toLowerCase();
      const sameCode = trimmedCode && (m.code || '').trim().toLowerCase() === trimmedCode.toLowerCase();
      return sameName || sameCode;
    });

    if (duplicate) {
      if ((duplicate.name || '').trim().toLowerCase() === trimmedName.toLowerCase()) {
        setFormError(`An item named "${duplicate.name}" already exists.`);
        return;
      }
      if (trimmedCode && (duplicate.code || '').trim().toLowerCase() === trimmedCode.toLowerCase()) {
        setFormError(`Item code "${trimmedCode}" is already assigned to "${duplicate.name}".`);
        return;
      }
    }

    const payload = {
      ...form,
      name: trimmedName,
      code: trimmedCode,
      category: (form.category || 'General').trim(),
      itemType: form.itemType || 'Raw Material',
      unit: trimmedUnit,
      description: (form.description || '').trim(),
      barcode: (form.barcode || '').trim(),
      currentStock: Number(form.currentStock) || 0,
      openingBalance: Number(form.openingBalance !== '' ? form.openingBalance : form.currentStock) || 0,
      minStock: min,
      maxStock: max,
      reorderLevel: Number(form.reorderLevel) >= 0 ? Number(form.reorderLevel) : 10,
      unitCost: Number(form.unitCost) || 0,
      storeLocation: (form.storeLocation || 'Main Store').trim(),
      isActive: Boolean(form.isActive),
    };

    setIsSubmitting(true);
    try {
      if (editing) {
        await api.put(`/materials/${editing._id}`, payload);
      } else {
        await api.post('/materials', payload);
      }
      setModalOpen(false);
      loadMaterials();
      loadCategories();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save item.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Move this item to the recycle bin?')) return;
    try {
      await api.delete(`/materials/${id}`);
      loadMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  /* ── Category Manager Handlers ── */
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setCatError('');
    const name = newCatName.trim();
    if (!name) {
      setCatError('Category name is required.');
      return;
    }

    setCatSaving(true);
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat._id}`, { name, description: newCatDesc.trim() });
      } else {
        await api.post('/categories', { name, description: newCatDesc.trim() });
      }
      setNewCatName('');
      setNewCatDesc('');
      setEditingCat(null);
      await loadCategories();
      loadMaterials();
    } catch (err) {
      setCatError(err.response?.data?.message || 'Failed to save category.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      loadCategories();
      loadMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const handleExport = async () => {
    try {
      const res = await api.get('/materials/export/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_items.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export items to Excel.');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/materials/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      loadMaterials();
      loadCategories();
    } catch (err) {
      setImportResult({ message: err.response?.data?.message ?? 'Import failed' });
    }
    e.target.value = '';
  };

  const openHistory = async (m) => {
    setHistoryMat(m);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get('/transactions', { params: { material: m._id } });
      setHistoryList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load item stock history:', err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    ...(canEdit ? [{
      key: '__check',
      header: (
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
          onChange={toggleAll}
          className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r._id)}
          onChange={() => toggleOne(r._id)}
          className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
        />
      ),
    }] : []),
    {
      key: 'code',
      header: 'Code',
      render: (r) => (
        <span
          onClick={() => openView(r)}
          className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200"
          title="Click to view complete item profile"
        >
          {r.code || '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Item Name',
      render: (r) => (
        <div>
          <button
            onClick={() => openView(r)}
            className="font-semibold text-ink-900 hover:text-blue-600 text-left transition"
          >
            {r.name}
          </button>
          {r.barcode && (
            <span className="block text-xs font-mono text-ink-400">
              🏷 {r.barcode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'itemType',
      header: 'Type',
      render: (r) => itemTypeBadge(r.itemType || 'Raw Material'),
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-ink-700 font-medium">
          <Tag size={13} className="text-ink-400" />
          {r.category || 'General'}
        </span>
      ),
    },
    {
      key: 'currentStock',
      header: 'In Stock',
      render: (r) => (
        <div className="tabular font-bold text-ink-900">
          {r.currentStock} <span className="font-normal text-xs text-ink-500">{r.unit}</span>
          {r.storeStock !== undefined && selectedStore !== 'all' && (
            <span className="block text-[11px] text-blue-600 font-medium">
              In store: {r.storeStock} {r.unit}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder At',
      render: (r) => (
        <div className="tabular text-ink-600">
          <span className="font-semibold text-amber-700">{r.reorderLevel}</span> {r.unit}
          {(r.minStock > 0 || r.maxStock > 0) && (
            <span className="block text-[11px] text-ink-400">
              Min: {r.minStock || 0} · Max: {r.maxStock || '∞'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      render: (r) => (
        <span className="tabular font-semibold text-ink-800">
          ETB {Number(r.unitCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => statusBadge(r.status),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (r) => (
        <button
          onClick={(e) => canEdit && handleToggleStatus(r, e)}
          disabled={!canEdit}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            r.isActive ? 'bg-emerald-600' : 'bg-slate-300'
          } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={r.isActive ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              r.isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openView(r)}
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => openHistory(r)}
            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition"
            title="View Stock Movement History & GRV Vouchers"
          >
            <History size={15} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => openEdit(r)}
                className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition"
                title="Edit Item"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(r._id)}
                className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 transition"
                title="Move to Recycle Bin"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const exportData = useMemo(() => {
    return materials.map(m => ({
      'Item Code': m.code || '—',
      'Item Name': m.name,
      'Category': m.category || 'General',
      'Item Type': m.itemType || 'Raw Material',
      'Barcode': m.barcode || '—',
      'In Stock': `${m.currentStock} ${m.unit || ''}`.trim(),
      'Reorder Level': `${m.reorderLevel} ${m.unit || ''}`.trim(),
      'Min Stock': m.minStock || 0,
      'Max Stock': m.maxStock || '—',
      'Unit Cost (ETB)': Number(m.unitCost || 0).toFixed(2),
      'Store Location': m.storeLocation || 'Main Store',
      'Status': m.status || (m.currentStock <= m.reorderLevel ? 'Low Stock' : 'In Stock'),
    }));
  }, [materials]);

  const pdfColumns = [
    { header: 'Code', accessor: 'Item Code' },
    { header: 'Item Name', accessor: 'Item Name' },
    { header: 'Category', accessor: 'Category' },
    { header: 'Type', accessor: 'Item Type' },
    { header: 'In Stock', accessor: 'In Stock', align: 'right' },
    { header: 'Reorder', accessor: 'Reorder Level', align: 'right' },
    { header: 'Unit Cost', accessor: 'Unit Cost (ETB)', align: 'right' },
    { header: 'Status', accessor: 'Status', align: 'center' },
  ];

  return (
    <div className="space-y-5">
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Boxes size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Total Items</p>
            <p className="tabular text-xl font-bold text-ink-900 mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 text-emerald-700 p-2.5">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">In Stock</p>
            <p className="tabular text-xl font-bold text-emerald-900 mt-0.5">{stats.inStock}</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 text-amber-700 p-2.5">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Low Stock Alert</p>
            <p className="tabular text-xl font-bold text-amber-900 mt-0.5">{stats.lowStock}</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-xl bg-red-100 text-red-700 p-2.5">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-red-800 uppercase tracking-wider">Out of Stock</p>
            <p className="tabular text-xl font-bold text-red-900 mt-0.5">{stats.outOfStock}</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-slate-900 p-4 shadow-sm text-white flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2.5 text-amber-400">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">Total Valuation</p>
            <p className="tabular text-lg font-bold text-white mt-0.5">ETB {stats.valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* ── Search, Filters & Action Bar ── */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, code, barcode, or category…"
              className="w-full rounded-xl border border-ink-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryModalOpen(true)}
              className="border-ink-200 text-ink-700 hover:bg-ink-50"
            >
              <Tag size={15} className="text-blue-600" />
              Manage Categories
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.2 text-xs font-bold text-blue-700">
                {categories.length}
              </span>
            </Button>

            <ExportDropdown
              data={exportData}
              fileName="inventory_items"
              pdfTitle="Items & Raw Materials Inventory Report"
              pdfColumns={pdfColumns}
              showImport={canEdit}
              onImport={() => importRef.current?.click()}
              importLabel="Import Excel"
            />
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />

            {canEdit && (
              <Button variant="brass" onClick={openCreate} className="shadow-sm">
                <Plus size={16} /> Register Item
              </Button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink-100 text-xs">
          <span className="text-ink-500 font-medium flex items-center gap-1">
            <SlidersHorizontal size={13} /> Filters:
          </span>

          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
            className="rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1.5 text-xs text-ink-700 outline-none focus:border-blue-400"
          >
            <option value="all">All Item Types</option>
            {ITEM_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1.5 text-xs text-ink-700 outline-none focus:border-blue-400"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1.5 text-xs text-ink-700 outline-none focus:border-blue-400"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (Optimal)</option>
            <option value="low_stock">Low Stock (≤ Reorder Level)</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="over_stock">Over Stock (&gt; Max Stock)</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={selectedStore}
            onChange={(e) => { setSelectedStore(e.target.value); setPage(1); }}
            className="rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1.5 text-xs text-ink-700 outline-none focus:border-blue-400"
          >
            <option value="all">All Stores</option>
            {configuredStores.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(selectedType !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedStore !== 'all') && (
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedStore('all');
                setPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someChecked && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 animate-fadeIn">
          <span className="text-xs font-semibold text-red-800">{selected.size} item(s) selected</span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
          >
            <Trash2 size={13} /> Move Selected to Recycle Bin
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-red-400 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {importResult && (
        <div className="flex items-start justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
          <p className="font-medium">{importResult.message}</p>
          <button onClick={() => setImportResult(null)} className="ml-4 text-blue-500 hover:text-blue-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={paginatedData}
          emptyMessage={loading ? 'Loading inventory items…' : 'No items match your criteria. Add a new item or adjust filters.'}
          title="Items & Raw Materials Catalog"
          icon={<Boxes size={18} />}
        />

        {materials.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={materials.length}
            onPage={(p) => setPage(p)}
            onPageSize={(s) => { setPageSize(s); setPage(1); }}
            pageSizes={[10, 15, 25, 50, 100]}
          />
        )}
      </div>

      {/* ── Add / Edit Item Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Item: ${editing.name}` : 'Register New Item'}
        width="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1 font-medium leading-relaxed">{formError}</div>
              <button
                type="button"
                onClick={() => setFormError('')}
                className="text-red-400 hover:text-red-700 transition"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Section 1: Item Identification */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-blue-600" /> General Identification
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Item Type *</label>
                <select
                  value={form.itemType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setForm(f => ({ ...f, itemType: t }));
                    if (!editing) handleGenerateCode(t);
                  }}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  {ITEM_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Item Code *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. RM-0001"
                    className="flex-1 font-mono rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateCode(form.itemType)}
                    title="Auto-generate next sequential code"
                    className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition whitespace-nowrap"
                  >
                    <Zap size={13} className="text-amber-500" /> Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Barcode / SKU</label>
                <div className="relative">
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="EAN, UPC or Code128"
                    className="w-full font-mono rounded-lg border border-ink-200 px-3 py-2 pl-8 text-sm outline-none focus:border-blue-500"
                  />
                  <BarcodeIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Item Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Arabica Coffee Beans"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select category…</option>
                  {categories.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">Unit of Measurement *</label>
              {unitCustom ? (
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    autoFocus
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="Type custom unit (e.g. bundle, drum, sachet)…"
                    className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setUnitCustom(false); setForm(f => ({ ...f, unit: '' })); }}
                    className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs text-ink-500 hover:bg-ink-100 transition"
                  >
                    ← Presets
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={form.unit}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setUnitCustom(true);
                      setForm(f => ({ ...f, unit: '' }));
                    } else {
                      setForm({ ...form, unit: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select unit of measurement…</option>
                  {UNITS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__custom__">✏️ Custom Unit…</option>
                </select>
              )}
            </div>
          </div>

          {/* Section 2: Stock, Reorder & Store Management */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store size={14} className="text-emerald-600" /> Stock Balances & Reorder Configuration
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  {editing ? 'Current Stock' : 'Opening Balance *'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.currentStock}
                  placeholder="0.00"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setForm({ ...form, currentStock: v, openingBalance: v });
                  }}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Unit Cost (ETB)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.unitCost}
                  placeholder="0.00"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setForm({ ...form, unitCost: v });
                  }}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Reorder Level *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Primary Store *</label>
                <select
                  value={form.storeLocation}
                  onChange={(e) => setForm({ ...form, storeLocation: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  {configuredStores.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Minimum Stock (Safety Stock)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.minStock}
                  placeholder="0"
                  onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Maximum Stock (Cap)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.maxStock}
                  placeholder="0 (optional)"
                  onChange={(e) => setForm({ ...form, maxStock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Description & Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">Description & Storage Notes</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Specifications, supplier hints, shelf location, or quality grade notes…"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-ink-800">Item is active and available for vouchers</span>
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brass" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Register Item'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Category Management Modal ── */}
      <Modal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCat(null);
          setNewCatName('');
          setNewCatDesc('');
          setCatError('');
        }}
        title="Category Management"
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <form onSubmit={handleSaveCategory} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={14} className="text-blue-600" />
              {editingCat ? `Edit Category: ${editingCat.name}` : 'Add New Category'}
            </p>

            {catError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-medium">
                {catError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Category Name *</label>
                <input
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Packaging Materials"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Description (Optional)</label>
                <input
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Brief description or purpose"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingCat && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingCat(null);
                    setNewCatName('');
                    setNewCatDesc('');
                    setCatError('');
                  }}
                >
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="brass" disabled={catSaving}>
                {catSaving ? 'Saving…' : editingCat ? 'Update Category' : '+ Add Category'}
              </Button>
            </div>
          </form>

          {/* Category List & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-700">Existing Categories ({categories.length})</span>
              <div className="relative w-48">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full rounded-lg border border-ink-200 py-1 pl-7 pr-2 text-xs outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {filteredCategories.length === 0 ? (
                <p className="p-4 text-center text-xs text-ink-400">No categories found.</p>
              ) : (
                filteredCategories.map(c => (
                  <div key={c._id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink-900">{c.name}</span>
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-[11px] font-bold text-blue-700">
                          {c.itemCount || 0} item(s)
                        </span>
                      </div>
                      {c.description && <p className="text-xs text-ink-400 mt-0.5">{c.description}</p>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCat(c);
                          setNewCatName(c.name);
                          setNewCatDesc(c.description || '');
                          setCatError('');
                        }}
                        className="p-1 text-ink-400 hover:text-blue-600 rounded transition"
                        title="Edit category"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c)}
                        className="p-1 text-ink-400 hover:text-red-600 rounded transition"
                        title="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── View Item Details Modal ── */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewMat ? `${viewMat.name} (${viewMat.code || 'NO-CODE'})` : 'Item Profile'}
        width="max-w-2xl"
      >
        {viewMat && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-white">{viewMat.name}</span>
                  {statusBadge(viewMat.status)}
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Code: <strong className="text-amber-400">{viewMat.code || '—'}</strong>
                  {viewMat.barcode && <span> · Barcode: <strong className="text-blue-300">{viewMat.barcode}</strong></span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Type: <strong className="text-white">{viewMat.itemType || 'Raw Material'}</strong> · Category: <strong className="text-white">{viewMat.category || 'General'}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">Total Stock</span>
                <span className="text-2xl font-black text-amber-400 tabular">
                  {viewMat.currentStock} <span className="text-sm font-normal text-slate-300">{viewMat.unit}</span>
                </span>
                <span className="block text-xs text-slate-300">
                  Value: ETB {((Number(viewMat.currentStock) || 0) * (Number(viewMat.unitCost) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Thresholds & Stock Levels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Opening Balance</span>
                <span className="text-base font-bold text-slate-800">{viewMat.openingBalance ?? viewMat.currentStock} {viewMat.unit}</span>
              </div>
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-bold text-amber-800 uppercase block">Reorder Level</span>
                <span className="text-base font-bold text-amber-900">{viewMat.reorderLevel} {viewMat.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Minimum Stock</span>
                <span className="text-base font-bold text-slate-800">{viewMat.minStock || 0} {viewMat.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Maximum Stock</span>
                <span className="text-base font-bold text-slate-800">{viewMat.maxStock || 'No cap'} {viewMat.maxStock ? viewMat.unit : ''}</span>
              </div>
            </div>

            {/* Multi-Store Stock Balances */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Store size={14} className="text-blue-600" />
                Store Allocations & Real-Time Balances
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2">Store Location</th>
                      <th className="px-3.5 py-2 text-right">Available Balance</th>
                      <th className="px-3.5 py-2 text-right">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(viewMat.storeBalances) && viewMat.storeBalances.length > 0
                      ? viewMat.storeBalances
                      : [{ store: viewMat.storeLocation || 'Main Store', balance: viewMat.currentStock }]
                    ).map((sb, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2 font-medium text-slate-800 flex items-center gap-1.5">
                          <Store size={13} className="text-slate-400" />
                          {sb.store}
                          {sb.store === viewMat.storeLocation && (
                            <span className="ml-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">Primary</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                          {sb.balance} {viewMat.unit}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          {sb.balance <= 0 ? (
                            <span className="text-red-600 font-bold text-[11px]">Empty</span>
                          ) : sb.balance <= viewMat.reorderLevel ? (
                            <span className="text-amber-600 font-bold text-[11px]">Low</span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px]">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {viewMat.description && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Description & Storage Specifications</span>
                <p className="text-xs text-slate-800 leading-relaxed">{viewMat.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewModalOpen(false);
                  openHistory(viewMat);
                }}
                className="text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <History size={15} /> View Movement History & Vouchers
              </Button>

              <Button type="button" variant="ghost" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Stock Movement History Modal ── */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Stock Movement History: ${historyMat?.name || 'Item'}`}
        width="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          {historyMat && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="font-bold text-slate-800 text-sm">{historyMat.name}</span>
                <span className="font-mono text-xs text-slate-500 ml-2">[{historyMat.code || 'NO-CODE'}]</span>
                <p className="text-slate-500 text-[11px] mt-0.5">Category: {historyMat.category} · Store Location: {historyMat.storeLocation}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
                  <span className="text-sm font-black text-slate-900">{historyMat.currentStock} {historyMat.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Weighted Unit Cost</span>
                  <span className="text-sm font-black text-blue-700">ETB {Number(historyMat.unitCost || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
            <span className="text-blue-600 font-bold">ℹ Note:</span>
            <span>Inventory stock and store balances are automatically updated whenever a voucher (GRV, PSAV, NSAV) is saved or approved. Cancelled or voided vouchers automatically reverse stock movements.</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                  <th className="px-3 py-2.5">Voucher No</th>
                  <th className="px-3 py-2.5">Document Type</th>
                  <th className="px-2 py-2.5 text-center">Direction</th>
                  <th className="px-3 py-2.5 text-right">Movement Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Cost</th>
                  <th className="px-3 py-2.5 text-right">Total Cost</th>
                  <th className="px-3 py-2.5">Store / Consignee</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-center">Posting Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">Loading stock movement history…</td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      No stock transactions recorded for this item yet.
                    </td>
                  </tr>
                ) : (
                  historyList.map(t => {
                    const isIn = t.type === 'in';
                    const matchedItem = t.items?.find(it => (it.material?._id || it.material) === historyMat?._id);
                    const qty = matchedItem ? matchedItem.quantity : (t.quantity || 0);
                    const cost = matchedItem ? (matchedItem.unitCost || 0) : (t.unitCost || 0);
                    const total = qty * cost;
                    const statusStr = t.status === 'pending' ? 'Prepared' : (t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Prepared');

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">{t.voucherNo || '—'}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{t.voucherLabel || t.voucherType}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isIn ? <CircleArrowDown size={12}/> : <CircleArrowUp size={12}/>}
                            {isIn ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-black font-mono">
                          <span className={isIn ? 'text-emerald-700' : 'text-red-700'}>
                            {isIn ? '+' : '-'}{qty} {historyMat?.unit || ''}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{(cost || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-slate-600">{t.consigneeUnit || t.storeLocation || 'Main Store'}</td>
                        <td className="px-3 py-2 text-slate-600">{t.performedBy?.name || '—'}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                          {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            t.status === 'posted' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            t.status === 'approved' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                            t.status === 'checked' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            t.status === 'voided' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {statusStr}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setHistoryOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const RawMaterials = Items;
export default Items;
export { Items, RawMaterials };
