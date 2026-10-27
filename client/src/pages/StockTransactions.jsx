import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Search, CircleArrowDown, CircleArrowUp,
  ShoppingBag, CreditCard, TrendingDown, TrendingUp, X, Eye, Paperclip, Pencil,
  Printer, SlidersHorizontal, RefreshCw, CheckCircle2, ChevronRight, Check,
  AlertTriangle, Building, FileText, Calendar, Filter, Sparkles, Zap, Package,
  Upload, FileSpreadsheet, Lock, Clock, Info, ShieldCheck, ArrowLeft, ArrowRight,
  Save, FileCheck, Layers, MapPin, Tag, Hash, DollarSign, UserCheck, Scale,
  CheckSquare, ArrowUpRight, ArrowDownRight, Compass
} from 'lucide-react';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import WorkflowBadge from '../components/ui/WorkflowBadge';
import ApproveModal, { TrailTimeline } from '../components/ui/ApproveModal';
import ExportDropdown from '../components/ui/ExportDropdown';
import AttachmentUploader, { AttachmentViewer } from '../components/ui/AttachmentUploader';
import Pagination from '../components/ui/Pagination';
import { useAuth } from '../context/AuthContext';
import { useThemeSidebar } from '../context/ThemeSidebarContext';

// ── Voucher configurations ────────────────────────────────────────────
const VOUCHERS = [
  {
    key: 'cash_grv',
    label: 'Cash GRV',
    fullLabel: 'Cash Goods Receiving Voucher',
    icon: ShoppingBag,
    badgeCls: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    activeCls: 'bg-emerald-600 hover:bg-emerald-700',
    direction: 'in',
    needsSupplier: true,
    needsEmployee: false,
    needsCost: true,
    description: 'Goods received and paid in cash',
  },
  {
    key: 'credit_grv',
    label: 'Credit GRV',
    fullLabel: 'Credit Goods Receiving Voucher',
    icon: CreditCard,
    badgeCls: 'bg-blue-100 text-blue-800 border border-blue-300',
    activeCls: 'bg-blue-600 hover:bg-blue-700',
    direction: 'in',
    needsSupplier: true,
    needsEmployee: false,
    needsCost: true,
    description: 'Goods received on credit / invoice',
  },
  {
    key: 'pos_adjustment',
    label: '+ve Adjustment',
    fullLabel: 'Positive Stock Adjustment Voucher',
    icon: TrendingUp,
    badgeCls: 'bg-violet-100 text-violet-800 border border-violet-300',
    activeCls: 'bg-violet-600 hover:bg-violet-700',
    direction: 'in',
    needsSupplier: false,
    needsEmployee: true,
    needsCost: false,
    isAdjustment: true,
    isPositive: true,
    description: 'Increase stock when system stock is below physical count',
  },
  {
    key: 'neg_adjustment',
    label: '−ve Adjustment',
    fullLabel: 'Negative Stock Adjustment Voucher',
    icon: TrendingDown,
    badgeCls: 'bg-red-100 text-red-800 border border-red-300',
    activeCls: 'bg-red-600 hover:bg-red-700',
    direction: 'out',
    needsSupplier: false,
    needsEmployee: true,
    needsCost: false,
    isAdjustment: true,
    isNegative: true,
    description: 'Decrease stock when system stock exceeds physical count',
  },
];

const voucherByKey = Object.fromEntries(VOUCHERS.map(v => [v.key, v]));

const emptyDirectLine = () => ({
  material: '',
  code: '',
  name: '',
  description: '',
  category: 'Item',
  uom: 'Pcs',
  location: 'Main store',
  quantity: '1',
  unitCost: '0.000',
  serialNumber: '',
  activity: '',
  hasAdditionalCharge: false,
  additionalCharge: '0.00',
  hasDiscount: false,
  discount: '0.00',
  systemStock: 0,
  physicalCount: '',
  variance: 0,
  projectedBalance: 0,
  reconciliationNote: '',
});

const emptyForm = key => ({
  voucherType: key || 'cash_grv',
  voucherNo: '',
  supplier: '',
  tin: '',
  supplierCode: '',
  employee: '',
  employeeName: '',
  employeeCode: '',
  employeePhone: '',
  storeLocation: 'Main store',
  consigneeUnit: 'Main store',
  deviceName: 'Web Client',
  reason: '',
  reference: '',
  notes: '',
  remark: '',
  activity: '',
  creditTerms: 'Net 30',
  dueDate: '',
  date: new Date().toISOString().slice(0, 10),
  isVatInclusive: true,
  taxRate: 15,
  items: [],
  attachments: [],
});

const quickProductEmptyForm = {
  name: '',
  code: '',
  category: 'Item',
  unit: 'Pcs',
  unitCost: 0,
  reorderLevel: 10,
  storeLocation: 'Main store',
};

const quickSupplierEmptyForm = {
  name: '',
  tin: '',
  category: 'Standard',
  contactPerson: '',
  phone: '',
  address: '',
};

const quickEmployeeEmptyForm = {
  firstName: '',
  lastName: '',
  employeeId: '',
  phone: '',
  department: 'Other',
};

export default function StockTransactions({ defaultVoucher } = {}) {
  const { user, can, hasRole, canApprove, companyInfo } = useAuth();
  const navigate = useNavigate();
  const canEdit   = can('recordGoods');
  const canDelete = can('voidTransactions');
  const isAdmin   = hasRole('admin') || user?.role === 'developer';

  const [searchParams, setSearchParams] = useSearchParams();
  const { navItems } = useThemeSidebar();
  const parentCategory = useMemo(() => {
    const group = (navItems || []).find(
      (n) => n.id === 'storeOps' || (n.children && n.children.some((c) => c.to?.startsWith('/transactions')))
    );
    return group?.label || 'Stock Management System';
  }, [navItems]);

  const activeVoucherKey = defaultVoucher ?? searchParams.get('voucherType') ?? 'cash_grv';
  const currentVoucherConfig = voucherByKey[activeVoucherKey] || voucherByKey['cash_grv'];
  const isAdjustmentVoucher = currentVoucherConfig.isAdjustment === true;

  // View mode: 'list' (Voucher table) or 'preparation' (Screenshot layout)
  const [viewMode, setViewMode] = useState('list');

  const [transactions, setTransactions] = useState([]);
  const [materials,    setMaterials]    = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [usersList,    setUsersList]    = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Selected single row (for the "Show" button and row highlighting)
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedBulk,  setSelectedBulk]  = useState(new Set());

  // Filters matching screenshot
  const [filterCode,    setFilterCode]    = useState('');
  const [filterStore,   setFilterStore]   = useState('all');
  const [filterState,   setFilterState]   = useState('all');
  const [filterDevice,  setFilterDevice]  = useState('all');
  const [filterUser,    setFilterUser]    = useState('all');
  const [dateRange,     setDateRange]     = useState({ from: '', to: '' });
  const [presetFilter,  setPresetFilter]  = useState('all');

  // Preparation Form state
  const [form,          setForm]          = useState(null);
  const [directLine,    setDirectLine]    = useState(emptyDirectLine());
  const [editingLineIdx, setEditingLineIdx] = useState(null);
  const [editingTxn,    setEditingTxn]    = useState(null);
  const [formError,     setFormError]     = useState('');
  const [formSuccess,   setFormSuccess]   = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  // Modals
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText,      setImportText]      = useState('');
  const [importErrors,    setImportErrors]    = useState([]);

  // Smart Reconciliation Modal
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileList,      setReconcileList]      = useState([]);
  const [reconcileLoading,   setReconcileLoading]   = useState(false);
  const [reconcileFilter,    setReconcileFilter]    = useState('all');

  // Quick Add Product inline modal
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState(quickProductEmptyForm);
  const [quickProductSubmitting, setQuickProductSubmitting] = useState(false);

  // Quick Add Supplier modal
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickSupplierForm, setQuickSupplierForm] = useState(quickSupplierEmptyForm);
  const [quickSupplierSubmitting, setQuickSupplierSubmitting] = useState(false);

  // Quick Add Employee modal
  const [quickEmployeeOpen, setQuickEmployeeOpen] = useState(false);
  const [quickEmployeeForm, setQuickEmployeeForm] = useState(quickEmployeeEmptyForm);
  const [quickEmployeeSubmitting, setQuickEmployeeSubmitting] = useState(false);

  // Voucher Details ("Show") Modal
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailTxn,     setDetailTxn]     = useState(null);

  // Workflow Advance / Approve Modal
  const [approveOpen,    setApproveOpen]    = useState(false);
  const [approveAction,  setApproveAction]  = useState(null);
  const [approveTxn,     setApproveTxn]     = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError,   setApproveError]   = useState(null);

  // Options Modal (Refresh, Column visibility, density)
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Print ref
  const printAreaRef = useRef(null);

  // Fetch Next Voucher Code from API
  const fetchNextVoucherNo = useCallback(async (type) => {
    try {
      const res = await api.get('/transactions/next-voucher-no', { params: { voucherType: type } });
      return res.data?.voucherNo || '';
    } catch {
      let prefix = 'TXN';
      if (type === 'pos_adjustment' || type === 'psav') prefix = 'PSAV';
      else if (type === 'neg_adjustment' || type === 'nsav') prefix = 'NSAV';
      else if (type === 'credit_grv') prefix = 'CRGRV';
      else if (type === 'cash_grv') prefix = 'CGRV';
      return `${prefix}-00044-`;
    }
  }, []);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeVoucherKey) params.voucherType = activeVoucherKey;
      if (filterCode) params.code = filterCode;
      if (filterStore !== 'all') params.consigneeUnit = filterStore;
      if (filterState !== 'all') params.objectState = filterState;
      if (filterDevice !== 'all') params.device = filterDevice;
      if (filterUser !== 'all') params.user = filterUser;
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;

      const res = await api.get('/transactions', { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setTransactions(data);
      if (selectedRowId && !data.some(d => d._id === selectedRowId)) {
        setSelectedRowId(null);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [activeVoucherKey, filterCode, filterStore, filterState, filterDevice, filterUser, dateRange, selectedRowId]);

  // Load Master Data (Materials, Suppliers, Employees, Users)
  const loadMasterData = useCallback(async () => {
    try {
      const [matRes, supRes, userRes, empRes] = await Promise.all([
        api.get('/materials'),
        api.get('/suppliers'),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
      ]);
      setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setUsersList(Array.isArray(userRes.data) ? userRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Available Store Locations derived from materials & transactions
  const storeOptions = useMemo(() => {
    const set = new Set(['Main store', 'Store 1', 'Store 2', 'Warehouse A', 'Warehouse B', 'Cold Room']);
    materials.forEach(m => { if (m.storeLocation) set.add(m.storeLocation); });
    transactions.forEach(t => {
      if (t.consigneeUnit) set.add(t.consigneeUnit);
      if (t.storeLocation) set.add(t.storeLocation);
    });
    return Array.from(set);
  }, [materials, transactions]);

  // Available Categories
  const categoryOptions = useMemo(() => {
    const set = new Set(['Item', 'Tab', 'Cap', 'Syrup', 'Injection', 'Raw Material', 'Packaging', 'Spare Parts', 'Chemicals', 'Finished Good']);
    materials.forEach(m => { if (m.category) set.add(m.category); });
    return Array.from(set);
  }, [materials]);

  // Current selected transaction object
  const selectedTransaction = useMemo(() => {
    return transactions.find(t => t._id === selectedRowId) || null;
  }, [transactions, selectedRowId]);

  // Current selected material in Direct Line editor
  const selectedDirectMaterial = useMemo(() => {
    return materials.find(m => m._id === directLine?.material) || null;
  }, [materials, directLine?.material]);

  // Current Available Balance of the selected item in the editor (store-aware)
  const currentAvailableBalance = useMemo(() => {
    if (!directLine?.material) return null;
    const targetStore = (directLine?.location || form?.storeLocation || 'Main Store').trim().toLowerCase();
    if (selectedDirectMaterial?.storeBalances?.length) {
      const match = selectedDirectMaterial.storeBalances.find(
        b => (b.store || '').trim().toLowerCase() === targetStore
      );
      if (match !== undefined && match.balance !== undefined && match.balance !== null) {
        return Number(match.balance);
      }
    }
    if (selectedDirectMaterial && selectedDirectMaterial.currentStock !== undefined && selectedDirectMaterial.currentStock !== null) {
      return Number(selectedDirectMaterial.currentStock);
    }
    return directLine?.systemStock !== undefined && directLine?.systemStock !== null ? Number(directLine.systemStock) : 0;
  }, [selectedDirectMaterial, directLine?.material, directLine?.location, form?.storeLocation, directLine?.systemStock]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  useEffect(() => { setPage(1); }, [filterCode, filterStore, filterState, filterDevice, filterUser, dateRange, activeVoucherKey]);

  const paginatedTransactions = useMemo(() => {
    return transactions.slice((page - 1) * pageSize, page * pageSize);
  }, [transactions, page, pageSize]);

  // Export Data formatted for Excel / CSV
  const exportData = useMemo(() => {
    return transactions.map((t) => {
      const party = t.employee?.name || (t.employeeName ? `${t.employeeName} (${t.employeePhone || ''})` : null) || t.supplier?.name || t.customerName || '—';
      const itemsList = t.items && t.items.length > 0
        ? t.items.map(i => `${i.material?.name || 'Item'} (${i.quantity} ${i.uom || i.material?.unit || ''})`).join('; ')
        : (t.material?.name || '—');

      return {
        'Code': t.voucherNo || '—',
        'Customer / Supplier / Employee': party,
        'TIN / Emp Code': t.tin || t.employeeCode || t.supplier?.tin || '—',
        'Issued Date': t.date ? new Date(t.date).toISOString().replace('T', ' ').slice(0, 19) : '—',
        'Grand Total': Number(t.totalAmount || 0).toFixed(2),
        'User Name': t.performedBy?.name || '—',
        'Device Name': t.deviceName || 'Web Client',
        'Last State': (t.status === 'pending' ? 'Prepared' : t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Prepared'),
        'Items': itemsList,
        'Sub Total': Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0).toFixed(2),
        'VAT': Number(t.vatAmount || 0).toFixed(2),
      };
    });
  }, [transactions]);

  const pdfColumns = [
    { header: 'Code', accessor: 'Code' },
    { header: 'Party / Employee', accessor: 'Customer / Supplier / Employee' },
    { header: 'TIN / Emp Code', accessor: 'TIN / Emp Code' },
    { header: 'Issued Date', accessor: 'Issued Date' },
    { header: 'Grand Total (ETB)', accessor: 'Grand Total', align: 'right' },
    { header: 'User Name', accessor: 'User Name' },
    { header: 'Last State', accessor: 'Last State', align: 'center' },
    { header: 'Sub Total', accessor: 'Sub Total', align: 'right' },
    { header: 'VAT', accessor: 'VAT', align: 'right' },
  ];

  // ── Open Form to Create New Voucher (Matches "New" in reference) ──
  const handleOpenNew = useCallback(async () => {
    setEditingTxn(null);
    const vNo = await fetchNextVoucherNo(activeVoucherKey);
    const newF = emptyForm(activeVoucherKey);
    newF.voucherNo = vNo;

    // Default employee to first active employee or logged in user
    if (isAdjustmentVoucher && employees.length > 0) {
      const defEmp = employees[0];
      newF.employee = defEmp._id;
      newF.employeeName = `${defEmp.firstName} ${defEmp.lastName}`;
      newF.employeeCode = defEmp.employeeId || `Emp-${defEmp._id.slice(-5)}-`;
      newF.employeePhone = defEmp.phone || '0910601252';
    }

    setForm(newF);
    setDirectLine(emptyDirectLine());
    setEditingLineIdx(null);
    setFormError('');
    setFormSuccess('');
    setViewMode('preparation');
  }, [activeVoucherKey, isAdjustmentVoucher, employees, fetchNextVoucherNo]);

  // ── Open Form to Edit an Existing Voucher (Only in Prepared/Pending status) ──
  const handleOpenEdit = useCallback((txn) => {
    if (txn.status && txn.status !== 'pending') {
      alert(`Cannot edit voucher in "${txn.status}" status. Only Prepared (pending) vouchers can be modified.`);
      return;
    }
    setEditingTxn(txn);

    let itemsList = [];
    if (txn.items && txn.items.length > 0) {
      itemsList = txn.items.map(it => {
        const mat = it.material;
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitCost) || 0;
        const disc = Number(it.discount) || 0;
        const addChg = Number(it.additionalCharge) || 0;
        const total = Math.max(0, (qty * price) - disc + addChg);

        return {
          material: mat?._id || it.material || '',
          code: mat?.code || '',
          name: mat?.name || 'Item',
          description: it.description || mat?.name || '',
          category: it.category || mat?.category || 'Item',
          uom: it.uom || mat?.unit || 'Pcs',
          location: it.storeLocation || mat?.storeLocation || txn.storeLocation || 'Main store',
          quantity: qty,
          unitCost: price,
          discount: disc,
          additionalCharge: addChg,
          taxRate: it.taxRate ?? 15,
          taxAmount: it.taxAmount ?? 0,
          subTotal: it.subTotal ?? total,
          totalAmount: total,
          serialNumber: it.serialNumber || '',
          systemStock: it.systemStock ?? mat?.currentStock ?? 0,
          physicalCount: it.physicalCount ?? null,
          projectedBalance: it.projectedBalance ?? 0,
          reconciliationNote: it.reconciliationNote || '',
        };
      });
    }

    const supId = txn.supplier?._id || txn.supplier || '';
    const supObj = suppliers.find(s => s._id === supId);
    const empId = txn.employee?._id || txn.employee || '';
    const empObj = employees.find(e => e._id === empId);

    setForm({
      voucherType: txn.voucherType || activeVoucherKey,
      voucherNo: txn.voucherNo || '',
      supplier: supId,
      tin: txn.tin || supObj?.tin || '',
      supplierCode: supObj?.code || (supId ? `Sup-${supId.slice(-5)}-` : ''),
      employee: empId,
      employeeName: txn.employeeName || (empObj ? `${empObj.firstName} ${empObj.lastName}` : ''),
      employeeCode: txn.employeeCode || empObj?.employeeId || (empId ? `Emp-${empId.slice(-5)}-` : ''),
      employeePhone: txn.employeePhone || empObj?.phone || '',
      storeLocation: txn.storeLocation || 'Main store',
      consigneeUnit: txn.consigneeUnit || 'Main store',
      deviceName: txn.deviceName || 'Web Client',
      reason: txn.reason || '',
      reference: txn.reference || '',
      notes: txn.notes || '',
      remark: txn.remark || '',
      activity: txn.activity || '',
      creditTerms: txn.creditTerms || 'Net 30',
      dueDate: txn.dueDate ? new Date(txn.dueDate).toISOString().slice(0, 10) : '',
      date: txn.date ? new Date(txn.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      isVatInclusive: txn.isVatInclusive !== false,
      taxRate: txn.taxRate ?? 15,
      items: itemsList,
      attachments: txn.attachments || [],
    });

    setDirectLine(emptyDirectLine());
    setEditingLineIdx(null);
    setFormError('');
    setFormSuccess('');
    setViewMode('preparation');
  }, [activeVoucherKey, suppliers, employees]);

  // Open Show / Details Modal
  const handleShowDetails = (txn) => {
    const target = txn || selectedTransaction;
    if (!target) {
      alert('Please click on a voucher row in the table to select it, or click Show.');
      return;
    }
    setDetailTxn(target);
    setDetailOpen(true);
  };

  // Supplier Selection change in Form
  const handleSupplierChange = (supId) => {
    const sup = suppliers.find(s => s._id === supId);
    setForm(f => ({
      ...f,
      supplier: supId,
      tin: sup?.tin || '',
      supplierCode: sup ? (sup.code || `Sup-${sup._id.slice(-5)}-`) : '',
    }));
  };

  // Employee Selection change in Form (for PSAV / NSAV)
  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e._id === empId);
    setForm(f => ({
      ...f,
      employee: empId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : '',
      employeeCode: emp ? (emp.employeeId || `Emp-${emp._id.slice(-5)}-`) : '',
      employeePhone: emp ? (emp.phone || '') : '',
    }));
  };

  // Direct Article Selection in Left Editor Card with Automatic Stock & Reconciliation Projection
  const handleArticleSelect = (matId) => {
    if (!matId) {
      setDirectLine(emptyDirectLine());
      return;
    }
    const mat = materials.find(m => m._id === matId);
    if (!mat) return;

    const targetStore = (form?.storeLocation || mat.storeLocation || 'Main store').trim().toLowerCase();
    let curStock = Number(mat.currentStock ?? 0);
    if (mat.storeBalances?.length) {
      const match = mat.storeBalances.find(b => (b.store || '').trim().toLowerCase() === targetStore);
      if (match !== undefined && match.balance !== undefined && match.balance !== null) {
        curStock = Number(match.balance);
      } else if (mat.storeLocation && mat.storeLocation.trim().toLowerCase() !== targetStore) {
        curStock = 0;
      }
    }
    const isPosAdj = activeVoucherKey === 'pos_adjustment';
    const isNegAdj = activeVoucherKey === 'neg_adjustment';

    let defaultQty = '1';
    let defaultPhys = '';
    let proj = curStock + 1;
    let recNote = '';

    if (isPosAdj) {
      if (curStock < 0) {
        // Automatic Negative Balance Correction: suggest the exact quantity needed to bring it to zero!
        defaultQty = String(Math.abs(curStock));
        defaultPhys = '0';
        proj = 0;
        recNote = 'Negative balance zero-correction recommended';
      } else {
        defaultPhys = String(curStock + 1);
        proj = curStock + 1;
        recNote = 'Physical surplus adjustment';
      }
    } else if (isNegAdj) {
      if (curStock > 0) {
        defaultQty = '1';
        defaultPhys = String(curStock - 1);
        proj = curStock - 1;
        recNote = 'Physical shortage adjustment';
      } else {
        defaultQty = '0';
        defaultPhys = '0';
        proj = 0;
      }
    }

    setDirectLine(prev => ({
      ...prev,
      material: mat._id,
      code: mat.code || `IT-${mat._id.slice(-5)}-`,
      name: mat.name,
      description: mat.name,
      category: mat.category || 'Item',
      uom: mat.unit || 'Pcs',
      location: mat.storeLocation || form?.storeLocation || 'Main store',
      unitCost: mat.unitCost ? Number(mat.unitCost).toFixed(3) : '0.000',
      systemStock: curStock,
      physicalCount: defaultPhys,
      quantity: defaultQty,
      projectedBalance: proj,
      reconciliationNote: recNote,
    }));
  };

  // Handle Physical Count Input Change (Smart Auto-Calculation of Quantity & Projected Stock)
  const handlePhysicalCountChange = (val) => {
    const isPosAdj = activeVoucherKey === 'pos_adjustment';
    const isNegAdj = activeVoucherKey === 'neg_adjustment';
    const curStock = Number(directLine.systemStock) || 0;
    const phys = parseFloat(val);

    if (isNaN(phys)) {
      setDirectLine(d => ({ ...d, physicalCount: val }));
      return;
    }

    if (isPosAdj) {
      if (phys > curStock) {
        const delta = Math.round((phys - curStock) * 10000) / 10000;
        setDirectLine(d => ({
          ...d,
          physicalCount: val,
          quantity: String(delta),
          projectedBalance: phys,
          reconciliationNote: `Physical count (${phys}) > system stock (${curStock}). Positive adjustment: +${delta}.`,
        }));
      } else if (curStock < 0 && phys >= 0) {
        const delta = Math.round((phys - curStock) * 10000) / 10000;
        setDirectLine(d => ({
          ...d,
          physicalCount: val,
          quantity: String(delta),
          projectedBalance: phys,
          reconciliationNote: `Restoring negative stock (${curStock}) to physical count ${phys}. Adjustment: +${delta}.`,
        }));
      } else {
        setDirectLine(d => ({ ...d, physicalCount: val, projectedBalance: curStock + (Number(d.quantity) || 0) }));
      }
    } else if (isNegAdj) {
      if (curStock > phys && phys >= 0) {
        const delta = Math.round((curStock - phys) * 10000) / 10000;
        setDirectLine(d => ({
          ...d,
          physicalCount: val,
          quantity: String(delta),
          projectedBalance: phys,
          reconciliationNote: `System stock (${curStock}) > physical count (${phys}). Negative adjustment: -${delta}.`,
        }));
      } else {
        setDirectLine(d => ({ ...d, physicalCount: val, projectedBalance: curStock - (Number(d.quantity) || 0) }));
      }
    }
  };

  // Handle Quantity Change in Line Editor
  const handleQuantityChange = (val) => {
    const qty = parseFloat(val) || 0;
    const curStock = Number(directLine.systemStock) || 0;
    const isPosAdj = activeVoucherKey === 'pos_adjustment';
    const isNegAdj = activeVoucherKey === 'neg_adjustment';

    let proj = curStock;
    if (isPosAdj) proj = curStock + qty;
    else if (isNegAdj) proj = curStock - qty;

    setDirectLine(d => ({
      ...d,
      quantity: val,
      projectedBalance: proj,
    }));
  };

  // Add Direct Line to bottom Line Items Table
  const handleAddDirectLine = () => {
    setFormError('');
    if (!directLine.material && !directLine.name) {
      setFormError('Please select or specify an Article before adding.');
      return;
    }
    const qty = Number(directLine.quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }

    // Negative Adjustment Rule: Never reduce stock to zero unless physical count is verified 0
    if (activeVoucherKey === 'neg_adjustment') {
      const cur = Number(directLine.systemStock) || 0;
      if (cur - qty < 0) {
        if (!confirm(`Warning: Decreasing stock by ${qty} will drive inventory below zero (${cur - qty}). Proceed only if authorized.`)) {
          return;
        }
      } else if (cur - qty === 0 && directLine.physicalCount !== '0' && directLine.physicalCount !== 0) {
        if (!confirm('Warning: This adjustment reduces item stock to exactly zero. Ensure physical count is confirmed as zero.')) {
          return;
        }
      }
    }

    const price = Number(directLine.unitCost);
    const disc = directLine.hasDiscount ? (Number(directLine.discount) || 0) : 0;
    const addChg = directLine.hasAdditionalCharge ? (Number(directLine.additionalCharge) || 0) : 0;
    const baseTotal = qty * (isNaN(price) ? 0 : price);
    const lineTotal = Math.max(0, baseTotal - disc + addChg);

    const newLineItem = {
      material: directLine.material,
      code: directLine.code || 'IT-00000-',
      name: directLine.name || directLine.description || 'Item',
      description: directLine.description || directLine.name || '',
      category: directLine.category || 'Item',
      uom: directLine.uom || 'Pcs',
      location: directLine.location || form?.storeLocation || 'Main store',
      quantity: qty,
      unitCost: isNaN(price) ? 0 : price,
      discount: disc,
      additionalCharge: addChg,
      totalAmount: lineTotal,
      serialNumber: directLine.serialNumber || '',
      activity: directLine.activity || '',
      systemStock: directLine.systemStock,
      physicalCount: directLine.physicalCount !== '' ? Number(directLine.physicalCount) : null,
      projectedBalance: directLine.projectedBalance,
      reconciliationNote: directLine.reconciliationNote,
      taxRate: form?.taxRate || 15,
      taxAmount: 0,
      subTotal: lineTotal,
    };

    setForm(f => {
      let updatedItems = [];
      if (editingLineIdx !== null && editingLineIdx >= 0 && editingLineIdx < f.items.length) {
        updatedItems = [...f.items];
        updatedItems[editingLineIdx] = newLineItem;
      } else {
        updatedItems = [...f.items, newLineItem];
      }
      return { ...f, items: updatedItems };
    });

    // Reset direct line editor for next item
    setDirectLine(emptyDirectLine());
    setEditingLineIdx(null);
  };

  // Edit Line back into Direct Editor
  const handleEditLineItem = (index) => {
    const it = form.items[index];
    if (!it) return;

    setDirectLine({
      material: it.material,
      code: it.code || '',
      name: it.name || '',
      description: it.description || it.name || '',
      category: it.category || 'Item',
      uom: it.uom || 'Pcs',
      location: it.location || form?.storeLocation || 'Main store',
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
      serialNumber: it.serialNumber || '',
      activity: it.activity || '',
      hasAdditionalCharge: Number(it.additionalCharge) > 0,
      additionalCharge: Number(it.additionalCharge || 0).toFixed(2),
      hasDiscount: Number(it.discount) > 0,
      discount: Number(it.discount || 0).toFixed(2),
      systemStock: it.systemStock ?? 0,
      physicalCount: it.physicalCount !== null && it.physicalCount !== undefined ? String(it.physicalCount) : '',
      variance: (it.physicalCount !== null && it.physicalCount !== undefined) ? (it.physicalCount - (it.systemStock ?? 0)) : 0,
      projectedBalance: it.projectedBalance ?? 0,
      reconciliationNote: it.reconciliationNote || '',
    });
    setEditingLineIdx(index);
  };

  // Remove Line Item
  const handleRemoveLineItem = (index) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, idx) => idx !== index),
    }));
    if (editingLineIdx === index) {
      setDirectLine(emptyDirectLine());
      setEditingLineIdx(null);
    }
  };

  // Calculated Totals for Form
  const formCalculations = useMemo(() => {
    if (!form?.items) return { subTotal: 0, totalDiscount: 0, totalAdditionalCharges: 0, vatAmount: 0, grandTotal: 0 };

    let totalRawCost = 0;
    let totalDiscount = 0;
    let totalAdditionalCharges = 0;
    let grandTotal = 0;

    form.items.forEach(it => {
      const q = Number(it.quantity) || 0;
      const c = Number(it.unitCost) || 0;
      const d = Number(it.discount) || 0;
      const a = Number(it.additionalCharge) || 0;
      const raw = q * c;
      const net = Math.max(0, raw - d + a);

      totalRawCost += raw;
      totalDiscount += d;
      totalAdditionalCharges += a;
      grandTotal += net;
    });

    const rate = Number(form.taxRate) || 15;
    let subTotal = 0;
    let vatAmount = 0;

    if (form.isVatInclusive) {
      subTotal = rate > 0 ? Number((grandTotal / (1 + rate / 100)).toFixed(2)) : grandTotal;
      vatAmount = Number((grandTotal - subTotal).toFixed(2));
    } else {
      subTotal = grandTotal;
      vatAmount = rate > 0 ? Number((subTotal * (rate / 100)).toFixed(2)) : 0;
      grandTotal = Number((subTotal + vatAmount).toFixed(2));
    }

    return {
      totalRawCost: Number(totalRawCost.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalAdditionalCharges: Number(totalAdditionalCharges.toFixed(2)),
      subTotal: Number(subTotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [form]);

  // Handle Save / Submit Voucher (Matches "Save" in reference - Draft / Prepared)
  const handleFormSave = async () => {
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    if (currentVoucherConfig.needsSupplier && !form.supplier) {
      setFormError('Supplier is required for Goods Receiving Vouchers.');
      setSubmitting(false);
      return;
    }

    if (!form.items.length) {
      setFormError('Please add at least one line item using the "Add" or "Smart Reconcile" button.');
      setSubmitting(false);
      return;
    }

    const payload = {
      voucherType: form.voucherType,
      voucherNo: form.voucherNo || undefined,
      supplier: form.supplier || undefined,
      employee: form.employee || undefined,
      employeeName: form.employeeName || '',
      employeeCode: form.employeeCode || '',
      employeePhone: form.employeePhone || '',
      tin: form.tin || '',
      storeLocation: form.storeLocation || 'Main store',
      consigneeUnit: form.consigneeUnit || form.storeLocation || 'Main store',
      deviceName: form.deviceName || 'Web Client',
      reason: form.reason || '',
      reference: form.reference || '',
      notes: form.notes || '',
      remark: form.remark || '',
      activity: form.activity || '',
      creditTerms: form.creditTerms || 'Net 30',
      dueDate: form.dueDate || null,
      date: form.date,
      isVatInclusive: form.isVatInclusive,
      taxRate: form.taxRate,
      discount: formCalculations.totalDiscount,
      additionalCharge: formCalculations.totalAdditionalCharges,
      subTotal: formCalculations.subTotal,
      vatAmount: formCalculations.vatAmount,
      totalAmount: formCalculations.grandTotal,
      attachments: form.attachments || [],
      items: form.items.map(it => ({
        material: it.material,
        quantity: Number(it.quantity),
        uom: it.uom || 'Pcs',
        unitCost: Number(it.unitCost) || 0,
        discount: Number(it.discount) || 0,
        additionalCharge: Number(it.additionalCharge) || 0,
        serialNumber: it.serialNumber || '',
        category: it.category || 'Item',
        storeLocation: it.location || form.storeLocation,
        systemStock: Number(it.systemStock) || 0,
        physicalCount: (it.physicalCount !== null && it.physicalCount !== undefined) ? Number(it.physicalCount) : null,
        projectedBalance: Number(it.projectedBalance) || 0,
        reconciliationNote: it.reconciliationNote || '',
        taxRate: Number(form.taxRate) || 15,
        taxAmount: 0,
        subTotal: Number(it.totalAmount) || 0,
      })),
    };

    try {
      let savedDoc = null;
      if (editingTxn) {
        const res = await api.put(`/transactions/${editingTxn._id}`, payload);
        savedDoc = res.data;
        setFormSuccess(`Voucher ${savedDoc.voucherNo || 'Prepared'} updated successfully!`);
      } else {
        const res = await api.post('/transactions', payload);
        savedDoc = res.data;
        setFormSuccess(`Voucher ${savedDoc.voucherNo || 'Prepared'} saved successfully as Draft / Prepared.`);
      }
      loadTransactions();
      loadMasterData();
      setEditingTxn(savedDoc);
      setForm(f => ({ ...f, voucherNo: savedDoc.voucherNo }));
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save Voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  // Refresh Master Data & Form (Matches "Refresh" in reference)
  const handleFormRefresh = async () => {
    if (form?.items?.length > 0) {
      if (!confirm('Reload master data and reset current item editor? Unsaved voucher lines will remain intact.')) {
        return;
      }
    }
    await loadMasterData();
    setDirectLine(emptyDirectLine());
    setEditingLineIdx(null);
    setFormError('');
    setFormSuccess('Master data reloaded successfully.');
    setTimeout(() => setFormSuccess(''), 3000);
  };

  // ── Open Smart Reconciliation Assistant ──
  const handleOpenSmartReconcile = async () => {
    setReconcileLoading(true);
    setReconcileModalOpen(true);
    try {
      const res = await api.get('/transactions/reconciliation', {
        params: { storeLocation: form?.storeLocation || 'Main store' }
      });
      setReconcileList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load reconciliation items:', err);
      setReconcileList([]);
    } finally {
      setReconcileLoading(false);
    }
  };

  // Apply Reconciliation Item to Voucher Lines
  const handleApplyReconciledItem = (rec) => {
    const isPosAdj = activeVoucherKey === 'pos_adjustment';
    const isNegAdj = activeVoucherKey === 'neg_adjustment';

    const qty = rec.suggestedQty || (rec.variance !== 0 ? Math.abs(rec.variance) : 1);
    const unitPrice = rec.unitCost || 0;
    const lineTotal = qty * unitPrice;

    const newLine = {
      material: rec.materialId,
      code: rec.code || 'IT-00000-',
      name: rec.name,
      description: rec.name,
      category: rec.category || 'Item',
      uom: rec.unit || 'Pcs',
      location: rec.storeLocation || form?.storeLocation || 'Main store',
      quantity: qty,
      unitCost: unitPrice,
      discount: 0,
      additionalCharge: 0,
      totalAmount: lineTotal,
      serialNumber: '',
      activity: 'Stock Reconciliation',
      systemStock: rec.systemStock,
      physicalCount: rec.physicalCount,
      projectedBalance: rec.projectedBalance,
      reconciliationNote: rec.reason || 'Reconciled item',
      taxRate: form?.taxRate || 15,
      taxAmount: 0,
      subTotal: lineTotal,
    };

    setForm(f => ({
      ...f,
      items: [...f.items, newLine],
    }));
  };

  // Apply All Recommended Items to Voucher
  const handleApplyAllRecommended = (recItems) => {
    const isPosAdj = activeVoucherKey === 'pos_adjustment';
    const isNegAdj = activeVoucherKey === 'neg_adjustment';

    const targetItems = recItems.filter(r => {
      if (isPosAdj) return r.suggestedVoucherType === 'pos_adjustment' || r.recommendation === 'surplus' || r.recommendation === 'negative_stock';
      if (isNegAdj) return r.suggestedVoucherType === 'neg_adjustment' || r.recommendation === 'shortage';
      return false;
    });

    if (!targetItems.length) {
      alert(`No matching items found for ${currentVoucherConfig.fullLabel}.`);
      return;
    }

    const newLines = targetItems.map(rec => {
      const qty = rec.suggestedQty || (rec.variance !== 0 ? Math.abs(rec.variance) : 1);
      const unitPrice = rec.unitCost || 0;
      const lineTotal = qty * unitPrice;

      return {
        material: rec.materialId,
        code: rec.code || 'IT-00000-',
        name: rec.name,
        description: rec.name,
        category: rec.category || 'Item',
        uom: rec.unit || 'Pcs',
        location: rec.storeLocation || form?.storeLocation || 'Main store',
        quantity: qty,
        unitCost: unitPrice,
        discount: 0,
        additionalCharge: 0,
        totalAmount: lineTotal,
        serialNumber: '',
        activity: 'Smart Stock Reconciliation',
        systemStock: rec.systemStock,
        physicalCount: rec.physicalCount,
        projectedBalance: rec.projectedBalance,
        reconciliationNote: rec.reason || 'Reconciled item',
        taxRate: form?.taxRate || 15,
        taxAmount: 0,
        subTotal: lineTotal,
      };
    });

    setForm(f => ({
      ...f,
      items: [...f.items, ...newLines],
    }));

    setReconcileModalOpen(false);
  };

  // Quick Add Product inline handler
  const handleQuickProductSubmit = async (e) => {
    e.preventDefault();
    setQuickProductSubmitting(true);
    try {
      const res = await api.post('/materials', {
        ...quickProductForm,
        unitCost: Number(quickProductForm.unitCost) || 0,
        currentStock: 0,
      });
      const newProduct = res.data;
      setMaterials(prev => [...prev, newProduct]);
      handleArticleSelect(newProduct._id);
      setQuickProductOpen(false);
      setQuickProductForm(quickProductEmptyForm);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create product.');
    } finally {
      setQuickProductSubmitting(false);
    }
  };

  // Quick Add Supplier inline handler
  const handleQuickSupplierSubmit = async (e) => {
    e.preventDefault();
    setQuickSupplierSubmitting(true);
    try {
      const res = await api.post('/suppliers', quickSupplierForm);
      const newSupplier = res.data;
      setSuppliers(prev => [...prev, newSupplier]);
      handleSupplierChange(newSupplier._id);
      setQuickSupplierOpen(false);
      setQuickSupplierForm(quickSupplierEmptyForm);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create supplier.');
    } finally {
      setQuickSupplierSubmitting(false);
    }
  };

  // Quick Add Employee inline handler (for PSAV / NSAV)
  const handleQuickEmployeeSubmit = async (e) => {
    e.preventDefault();
    setQuickEmployeeSubmitting(true);
    try {
      const res = await api.post('/employees', quickEmployeeForm);
      const newEmp = res.data;
      setEmployees(prev => [...prev, newEmp]);
      handleEmployeeChange(newEmp._id);
      setQuickEmployeeOpen(false);
      setQuickEmployeeForm(quickEmployeeEmptyForm);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setQuickEmployeeSubmitting(false);
    }
  };

  // Import Item Lines from text/CSV
  const handleProcessImport = () => {
    setImportErrors([]);
    if (!importText.trim()) {
      setImportErrors(['Please paste line items data or choose a supported file.']);
      return;
    }

    const lines = importText.trim().split('\n');
    const parsedItems = [];
    const errors = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith('code') || trimmed.toLowerCase().startsWith('art')) {
        return; // skip headers
      }

      const parts = trimmed.split(/[\t,;]+/).map(p => p.trim());
      if (parts.length < 2) {
        errors.push(`Row ${idx + 1}: Insufficient columns. Minimum required: Item Code/Name, Quantity.`);
        return;
      }

      const itemIdentifier = parts[0];
      const qty = parseFloat(parts[1]);
      const price = parts[2] ? parseFloat(parts[2]) : null;
      const uom = parts[3] || 'Pcs';
      const disc = parts[4] ? parseFloat(parts[4]) : 0;
      const addChg = parts[5] ? parseFloat(parts[5]) : 0;

      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${idx + 1}: Invalid quantity "${parts[1]}". Must be greater than 0.`);
        return;
      }

      const matched = materials.find(m =>
        (m.code && m.code.toLowerCase() === itemIdentifier.toLowerCase()) ||
        (m.name && m.name.toLowerCase() === itemIdentifier.toLowerCase()) ||
        (m.code && m.code.toLowerCase().includes(itemIdentifier.toLowerCase()))
      );

      if (!matched) {
        errors.push(`Row ${idx + 1}: Product "${itemIdentifier}" not found in system.`);
        return;
      }

      const unitPrice = (price !== null && !isNaN(price)) ? price : (matched.unitCost || 0);
      const lineTotal = Math.max(0, (qty * unitPrice) - (disc || 0) + (addChg || 0));

      parsedItems.push({
        material: matched._id,
        code: matched.code || `IT-${matched._id.slice(-5)}-`,
        name: matched.name,
        description: matched.name,
        category: matched.category || 'Item',
        uom: uom || matched.unit || 'Pcs',
        location: matched.storeLocation || form?.storeLocation || 'Main store',
        quantity: qty,
        unitCost: unitPrice,
        discount: disc || 0,
        additionalCharge: addChg || 0,
        totalAmount: lineTotal,
        serialNumber: '',
        activity: 'Imported',
        systemStock: matched.currentStock || 0,
        physicalCount: null,
        projectedBalance: matched.currentStock || 0,
        reconciliationNote: 'Imported line',
        taxRate: form?.taxRate || 15,
        taxAmount: 0,
        subTotal: lineTotal,
      });
    });

    if (errors.length > 0) {
      setImportErrors(errors);
      return;
    }

    if (parsedItems.length === 0) {
      setImportErrors(['No valid items found in the provided data.']);
      return;
    }

    setForm(f => ({
      ...f,
      items: [...f.items, ...parsedItems],
    }));
    setImportText('');
    setImportModalOpen(false);
  };

  // Workflow Advance (Check, Approve, Post, Void)
  const openApproveModal = (txn, action) => {
    setApproveTxn(txn);
    setApproveAction(action);
    setApproveError(null);
    setApproveOpen(true);
  };

  const handleAdvanceConfirm = async (password, note) => {
    setApproveLoading(true);
    setApproveError(null);
    try {
      const res = await api.post(`/transactions/${approveTxn._id}/advance`, {
        action: approveAction,
        password,
        note,
      });
      setApproveOpen(false);
      if (detailTxn && detailTxn._id === approveTxn._id) {
        setDetailTxn(res.data.transaction);
      }
      if (editingTxn && editingTxn._id === approveTxn._id) {
        setEditingTxn(res.data.transaction);
      }
      loadTransactions();
      loadMasterData();
    } catch (err) {
      setApproveError(err.response?.data?.message || 'Workflow action failed.');
    } finally {
      setApproveLoading(false);
    }
  };

  // Delete Transaction
  const handleDeleteTxn = async (id) => {
    if (!confirm('Are you sure you want to move this voucher to the recycle bin? Stock will be reversed automatically.')) return;
    try {
      await api.delete(`/transactions/${id}`);
      loadTransactions();
      loadMasterData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectedBulk.size) return;
    if (!confirm(`Move ${selectedBulk.size} selected voucher(s) to recycle bin?`)) return;
    try {
      await api.delete('/transactions/bulk', { data: { ids: Array.from(selectedBulk) } });
      setSelectedBulk(new Set());
      loadTransactions();
      loadMasterData();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk delete failed');
    }
  };

  // Filter Presets
  const handlePresetFilter = (val) => {
    setPresetFilter(val);
    const today = new Date().toISOString().slice(0, 10);
    if (val === 'today') {
      setDateRange({ from: today, to: today });
      setFilterState('all');
    } else if (val === 'prepared') {
      setFilterState('prepared');
      setDateRange({ from: '', to: '' });
    } else if (val === 'posted') {
      setFilterState('posted');
      setDateRange({ from: '', to: '' });
    } else if (val === 'clear') {
      setFilterCode('');
      setFilterStore('all');
      setFilterState('all');
      setFilterDevice('all');
      setFilterUser('all');
      setDateRange({ from: '', to: '' });
    }
  };

  const formattedToday = new Date().toLocaleDateString('en-US');

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-800">

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW MODE 1: VOUCHER PREPARATION (Matches PSAV / Reference Layout) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'preparation' && form && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

          {/* 1A. Top Breadcrumb & List Toggle: Home >> parent category >> sublist >> then task */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-slate-500 flex items-center gap-1 font-medium hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>
                🏠 Home
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-600 font-bold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/transactions')}>
                {parentCategory}
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-600 font-semibold hover:text-blue-600 cursor-pointer" onClick={() => setViewMode('list')}>
                Documents
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-blue-900 font-bold flex items-center gap-1.5">
                {currentVoucherConfig.fullLabel}
                <span className="text-blue-600 font-bold text-xs ml-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Task: Preparation
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <Layers size={14} className="text-blue-600" />
                <span>Show Voucher List</span>
              </button>
            </div>
          </div>

          {/* 1B. Alert Feedback */}
          {formError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* 1C. Top Action Tiles (New, Save, Attach, Refresh) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* New Button */}
            <button
              type="button"
              onClick={handleOpenNew}
              className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-xs transition active:scale-95 group"
              title="Start a new Voucher"
            >
              <FileText size={20} className="text-slate-600 group-hover:text-blue-600 mb-0.5" />
              <span className="text-xs font-medium">New</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleFormSave}
              disabled={submitting}
              className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-xs transition active:scale-95 group"
              title="Save voucher as Draft / Prepared (no stock impact yet)"
            >
              <Save size={20} className="text-blue-700 group-hover:scale-110 mb-0.5" />
              <span className="text-xs font-medium">{submitting ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Attach Button */}
            <button
              type="button"
              onClick={() => setAttachModalOpen(true)}
              className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-xs transition active:scale-95 group relative"
              title="Attach documents, physical count sheets or approval memos"
            >
              <Paperclip size={20} className="text-slate-700 group-hover:text-blue-600 mb-0.5" />
              <span className="text-xs font-medium">Attach</span>
              {form.attachments?.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {form.attachments.length}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleFormRefresh}
              className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-xs transition active:scale-95 group"
              title="Reload master data and refresh editor"
            >
              <RefreshCw size={19} className="text-slate-600 group-hover:text-blue-600 mb-0.5" />
              <span className="text-xs font-medium">Refresh</span>
            </button>

            {/* Workflow actions when editing a saved voucher */}
            {editingTxn && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <WorkflowBadge status={editingTxn.status} />

                {editingTxn.status === 'pending' && can('checkReview') && (
                  <button
                    type="button"
                    onClick={() => openApproveModal(editingTxn, 'check')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <CheckCircle2 size={14} />
                    <span>Check</span>
                  </button>
                )}

                {['pending', 'checked'].includes(editingTxn.status) && canApprove && (
                  <button
                    type="button"
                    onClick={() => openApproveModal(editingTxn, 'approve')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <ShieldCheck size={14} />
                    <span>Approve</span>
                  </button>
                )}

                {['pending', 'checked', 'approved'].includes(editingTxn.status) && can('postLedger') && (
                  <button
                    type="button"
                    onClick={() => openApproveModal(editingTxn, 'post')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
                    title="Officially post voucher and apply inventory adjustment atomically"
                  >
                    <Package size={14} />
                    <span>Post to Stock</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleShowDetails(editingTxn)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition"
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
              </div>
            )}
          </div>

          {/* 1D. Top Master Row: Employee (for PSAV / NSAV) or Supplier (for GRV) */}
          {isAdjustmentVoucher ? (
            /* Employee Master Row (Matches Reference Screenshot for PSAV) */
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700 w-16">Employee</span>

              <div className="relative flex-1 min-w-[240px]">
                <select
                  value={form.employee}
                  onChange={e => handleEmployeeChange(e.target.value)}
                  className="w-full h-8 pl-3 pr-8 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
                {form.employee && (
                  <button
                    type="button"
                    onClick={() => handleEmployeeChange('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-red-500"
                    title="Clear Employee"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Employee Code & Phone Badge (Matches Screenshot) */}
              <div className="bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-2 min-w-[220px]">
                <span>Code: <strong>{form.employeeCode || (form.employee ? `Emp-${form.employee.slice(-5)}-` : 'Emp-00000-')}</strong>,</span>
                <span>PhoneNo: <strong>{form.employeePhone || '0910601252'}</strong></span>
              </div>

              {/* Quick Employee Add/Details button (...) */}
              <button
                type="button"
                onClick={() => setQuickEmployeeOpen(true)}
                className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold shadow-xs transition"
                title="Add or manage employee records"
              >
                ...
              </button>
            </div>
          ) : (
            /* Supplier Master Row (for GRV) */
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700 w-16">Supplier</span>

              <div className="relative flex-1 min-w-[240px]">
                <select
                  value={form.supplier}
                  onChange={e => handleSupplierChange(e.target.value)}
                  className="w-full h-8 pl-3 pr-8 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {form.supplier && (
                  <button
                    type="button"
                    onClick={() => handleSupplierChange('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-red-500"
                    title="Clear Supplier"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 min-w-[140px]">
                <span>Code:</span>
                <span className="font-bold">{form.supplierCode || (form.tin ? `TIN: ${form.tin}` : 'Sup-00000-')}</span>
              </div>

              <button
                type="button"
                onClick={() => setQuickSupplierOpen(true)}
                className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold shadow-xs transition"
                title="Add or view supplier details"
              >
                ...
              </button>
            </div>
          )}

          {/* 1E. Main 2-Column Section (Direct Article Editor Left, Voucher Parameters Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* LEFT COLUMN: Direct Item Entry Card */}
            <div className="lg:col-span-7 rounded-lg border border-sky-200 overflow-hidden shadow-xs">
              {/* Tab Header */}
              <div className="bg-sky-100/80 px-4 py-1.5 border-b border-sky-200 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 tracking-wide">Direct</span>
                <div className="flex items-center gap-2">
                  {directLine.material && currentAvailableBalance !== null && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-200/90 text-sky-950 border border-sky-300 flex items-center gap-1 shadow-2xs">
                      <span className="text-sky-800">Available:</span>
                      <strong className="font-bold">{Number(currentAvailableBalance).toLocaleString()}</strong>
                      <span>{directLine.uom || ''}</span>
                    </span>
                  )}
                  <span className="text-[11px] text-sky-700 font-medium">Article & Specifications</span>
                </div>
              </div>

              {/* Form body */}
              <div className="p-3.5 space-y-3 bg-white text-xs">

                {/* Article Select */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-3 font-medium text-slate-700">Article</span>
                  <div className="col-span-9 relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <select
                        value={directLine.material}
                        onChange={e => handleArticleSelect(e.target.value)}
                        className="w-full h-8 pl-3 pr-8 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500 font-medium"
                      >
                        <option value="">Select Article / Product...</option>
                        {materials.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.code ? `${m.code} - ` : ''}{m.name}{m.currentStock !== undefined && m.currentStock !== null ? ` (Avail: ${m.currentStock})` : ''}
                          </option>
                        ))}
                      </select>
                      {directLine.material && (
                        <button
                          type="button"
                          onClick={() => handleArticleSelect('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-red-500"
                          title="Clear Article"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setQuickProductOpen(true)}
                        className="h-8 px-2 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                        title="Create new product"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* UOM */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-3 font-medium text-slate-700">UOM</span>
                  <div className="col-span-9">
                    <select
                      value={directLine.uom}
                      onChange={e => setDirectLine(d => ({ ...d, uom: e.target.value }))}
                      className="w-full h-8 px-3 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="N/A">N/A</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Tab">Tab</option>
                      <option value="Cap">Cap</option>
                      <option value="Box">Box</option>
                      <option value="Kg">Kg</option>
                      <option value="Mtr">Mtr</option>
                      <option value="Roll">Roll</option>
                      <option value="Ltr">Ltr</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-3 font-medium text-slate-700">Description</span>
                  <div className="col-span-9">
                    <input
                      type="text"
                      value={directLine.description}
                      onChange={e => setDirectLine(d => ({ ...d, description: e.target.value }))}
                      placeholder="e.g. Paratamole 500mg tab 10*10"
                      className="w-full h-8 px-3 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Category & Location */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-3 font-medium text-slate-700">Category</span>
                  <div className="col-span-9 flex items-center gap-2">
                    <input
                      type="text"
                      value={directLine.category}
                      onChange={e => setDirectLine(d => ({ ...d, category: e.target.value }))}
                      placeholder="e.g. Tab"
                      className="flex-1 h-8 px-2 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      className="h-8 px-2.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold shrink-0"
                    >
                      Location
                    </button>

                    <select
                      value={directLine.location}
                      onChange={e => setDirectLine(d => ({ ...d, location: e.target.value }))}
                      className="flex-1 h-8 px-2 rounded border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {storeOptions.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stock Reconciliation Context Box (for PSAV / NSAV) */}
                {isAdjustmentVoucher && directLine.material && (
                  <div className="mt-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Ledger / System Stock:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        directLine.systemStock < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {directLine.systemStock} {directLine.uom}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-4 font-bold text-slate-700">Physical Count:</span>
                      <div className="col-span-8 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          value={directLine.physicalCount}
                          onChange={e => handlePhysicalCountChange(e.target.value)}
                          placeholder="Verified count..."
                          className="flex-1 h-7 px-2 rounded border border-blue-300 bg-white font-mono font-bold text-xs outline-none"
                        />
                        <span className="text-[11px] text-slate-500">{directLine.uom}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-blue-200/60 pt-1.5">
                      <span className="text-slate-600">Projected Resulting Balance:</span>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {directLine.projectedBalance} {directLine.uom}
                      </span>
                    </div>

                    {directLine.reconciliationNote && (
                      <p className="text-[11px] text-blue-800 italic">
                        💡 {directLine.reconciliationNote}
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN: Voucher Parameters & Line Amounts */}
            <div className="lg:col-span-5 rounded-lg border border-slate-200 p-3.5 space-y-2.5 bg-slate-50/50 text-xs shadow-xs">

              {/* Voucher No */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">Voucher No</span>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={form.voucherNo}
                    onChange={e => setForm(f => ({ ...f, voucherNo: e.target.value }))}
                    placeholder="e.g. PSAV-00044-"
                    className="w-full h-8 px-3 rounded border border-slate-300 bg-white font-mono text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">Date</span>
                <div className="col-span-8 relative">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full h-8 px-3 rounded border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Remark */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">Remark</span>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={form.remark}
                    onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                    placeholder="General voucher remark..."
                    className="w-full h-8 px-3 rounded border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Activity */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">Activity</span>
                <div className="col-span-8 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={directLine.activity}
                    onChange={e => setDirectLine(d => ({ ...d, activity: e.target.value }))}
                    placeholder="e.g. Physical inventory count..."
                    className="flex-1 h-8 px-3 rounded border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setDirectLine(d => ({ ...d, activity: isAdjustmentVoucher ? 'Physical Count Verification' : 'Received & Inspected' }))}
                    className="h-8 w-8 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">
                  {isAdjustmentVoucher ? 'Quantity (Adj)' : 'Quantity'}
                </span>
                <div className="col-span-8">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={directLine.quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">price</span>
                <div className="col-span-8 flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={directLine.unitCost}
                    onChange={e => setDirectLine(d => ({ ...d, unitCost: e.target.value }))}
                    className="flex-1 h-8 px-3 rounded border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="h-8 px-2 flex items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600">
                    ETB
                  </span>
                </div>
              </div>

              {/* Serial Number */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-medium text-slate-700">Serial Number</span>
                <div className="col-span-8 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={directLine.serialNumber}
                    onChange={e => setDirectLine(d => ({ ...d, serialNumber: e.target.value }))}
                    placeholder="Batch / Serial No."
                    className="flex-1 h-8 px-3 rounded border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setDirectLine(d => ({ ...d, serialNumber: `SN-${Date.now().toString().slice(-6)}` }))}
                    className="h-8 w-8 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Destination Store (* Required, matches "80 Main store" in screenshot) */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 font-bold text-red-600 flex items-center gap-0.5">
                  To Store *
                </span>
                <div className="col-span-8 flex items-center gap-1">
                  <span
                    className={`h-8 px-2.5 min-w-[42px] flex items-center justify-center rounded border text-xs font-mono font-bold transition-all shadow-xs ${
                      !directLine.material
                        ? 'border-slate-300 bg-slate-100 text-slate-500'
                        : Number(currentAvailableBalance || 0) > 0
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : Number(currentAvailableBalance || 0) < 0
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-300 bg-slate-100 text-slate-700'
                    }`}
                    title={
                      directLine.material
                        ? `Current Available Balance in Stock: ${Number(currentAvailableBalance || 0).toLocaleString()} ${directLine.uom || ''}`
                        : 'Current Available Balance (select an Article to view)'
                    }
                  >
                    {directLine.material ? Number(currentAvailableBalance || 0).toLocaleString() : '0'}
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={form.storeLocation}
                      onChange={e => setForm(f => ({ ...f, storeLocation: e.target.value, consigneeUnit: e.target.value }))}
                      className="w-full h-8 pl-2 pr-7 rounded border border-slate-300 bg-white text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    >
                      {storeOptions.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    {form.storeLocation && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, storeLocation: 'Main store', consigneeUnit: 'Main store' }))}
                        className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* GRV Credit specific fields */}
              {activeVoucherKey === 'credit_grv' && (
                <div className="p-2 rounded bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-4 font-bold text-amber-900">Credit Terms</span>
                    <div className="col-span-8">
                      <input
                        type="text"
                        value={form.creditTerms}
                        onChange={e => setForm(f => ({ ...f, creditTerms: e.target.value }))}
                        placeholder="e.g. Net 30, 15 Days"
                        className="w-full h-7 px-2 rounded border border-amber-300 bg-white text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-4 font-bold text-amber-900">Due Date</span>
                    <div className="col-span-8">
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full h-7 px-2 rounded border border-amber-300 bg-white text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Charge (Cyan Bar) */}
              <div className="flex items-center justify-between bg-sky-200/90 px-3 py-1.5 rounded border border-sky-300">
                <span className="font-bold text-sky-950 text-xs">Additional Charge</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={directLine.hasAdditionalCharge}
                    onChange={e => setDirectLine(d => ({ ...d, hasAdditionalCharge: e.target.checked }))}
                    className="rounded border-sky-400 text-blue-600 h-4 w-4"
                  />
                  <button
                    type="button"
                    onClick={() => setDirectLine(d => ({ ...d, hasAdditionalCharge: true, additionalCharge: '50.00' }))}
                    className="h-6 w-6 rounded bg-white/70 hover:bg-white text-slate-700 font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    disabled={!directLine.hasAdditionalCharge}
                    value={directLine.additionalCharge}
                    onChange={e => setDirectLine(d => ({ ...d, additionalCharge: e.target.value }))}
                    className="w-20 h-6 px-2 text-right rounded bg-white text-xs font-mono font-bold text-slate-800 outline-none disabled:bg-sky-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Discount (Cyan Bar) */}
              <div className="flex items-center justify-between bg-sky-200/90 px-3 py-1.5 rounded border border-sky-300">
                <span className="font-bold text-sky-950 text-xs">Discount</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={directLine.hasDiscount}
                    onChange={e => setDirectLine(d => ({ ...d, hasDiscount: e.target.checked }))}
                    className="rounded border-sky-400 text-blue-600 h-4 w-4"
                  />
                  <button
                    type="button"
                    onClick={() => setDirectLine(d => ({ ...d, hasDiscount: true, discount: '10.00' }))}
                    className="h-6 w-6 rounded bg-white/70 hover:bg-white text-slate-700 font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    disabled={!directLine.hasDiscount}
                    value={directLine.discount}
                    onChange={e => setDirectLine(d => ({ ...d, discount: e.target.value }))}
                    className="w-20 h-6 px-2 text-right rounded bg-white text-xs font-mono font-bold text-slate-800 outline-none disabled:bg-sky-100 disabled:text-slate-400"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 1F. Mid Action Buttons (Add, Import, Smart Reconcile) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddDirectLine}
              className="px-6 py-2 rounded border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>{editingLineIdx !== null ? 'Update Line' : 'Add'}</span>
            </button>

            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-6 py-2 rounded border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>Import</span>
            </button>

            {/* Smart Reconciliation Assistant Trigger */}
            {isAdjustmentVoucher && (
              <button
                type="button"
                onClick={handleOpenSmartReconcile}
                className="px-4 py-2 rounded border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-800 font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
                title="Open Smart Reconciliation Assistant to compare physical count with ledger"
              >
                <Scale size={14} className="text-violet-600" />
                <span>Smart Reconcile</span>
              </button>
            )}

            {editingLineIdx !== null && (
              <button
                type="button"
                onClick={() => { setDirectLine(emptyDirectLine()); setEditingLineIdx(null); }}
                className="px-3 py-2 rounded border border-slate-300 bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                Cancel Edit
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVatInclusive}
                  onChange={e => setForm(f => ({ ...f, isVatInclusive: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>VAT Inclusive (15%)</span>
              </label>
            </div>
          </div>

          {/* 1G. Bottom Line-Items Table (Sky-Blue Header matching screenshot) */}
          <div className="border border-sky-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sky-200/90 text-sky-950 font-bold border-b border-sky-300">
                  <th className="py-2.5 px-3">Art. Code</th>
                  <th className="py-2.5 px-3">Art. Name</th>
                  {isAdjustmentVoucher && (
                    <>
                      <th className="py-2.5 px-3 text-right">Ledger Stock</th>
                      <th className="py-2.5 px-3 text-right">Physical Count</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  {!isAdjustmentVoucher && (
                    <>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Additional Charge</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  {isAdjustmentVoucher && (
                    <th className="py-2.5 px-3 text-right">Projected Stock</th>
                  )}
                  <th className="py-2.5 px-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan={isAdjustmentVoucher ? 9 : 8} className="py-8 text-center text-slate-400">
                      <Package size={28} className="mx-auto mb-1 text-slate-300" />
                      <span>No data. Fill Article details above and click <strong>Add</strong>, <strong>Import</strong>, or <strong>Smart Reconcile</strong>.</span>
                    </td>
                  </tr>
                ) : (
                  form.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-sky-50/50 transition">
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">{it.code || '—'}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {it.name}
                        {it.uom && <span className="ml-1 text-[11px] text-slate-400 font-normal">({it.uom})</span>}
                      </td>
                      {isAdjustmentVoucher && (
                        <>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                            {Number(it.systemStock ?? 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {it.physicalCount !== null && it.physicalCount !== undefined ? Number(it.physicalCount).toLocaleString() : '—'}
                          </td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{Number(it.quantity).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{Number(it.unitCost).toFixed(2)}</td>
                      {!isAdjustmentVoucher && (
                        <>
                          <td className="py-2 px-3 text-right font-mono text-amber-700">{Number(it.discount || 0) > 0 ? `-${Number(it.discount).toFixed(2)}` : '0.00'}</td>
                          <td className="py-2 px-3 text-right font-mono text-blue-700">{Number(it.additionalCharge || 0) > 0 ? `+${Number(it.additionalCharge).toFixed(2)}` : '0.00'}</td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{Number(it.totalAmount).toFixed(2)}</td>
                      {isAdjustmentVoucher && (
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {Number(it.projectedBalance ?? 0).toLocaleString()}
                        </td>
                      )}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditLineItem(idx)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="Edit this line"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100"
                            title="Remove this line"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 1H. Bottom Totals & Calculation Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="text-slate-600">
                <span>Items Count: </span>
                <strong className="text-slate-800">{form.items.length}</strong>
              </div>
              <div className="text-slate-600">
                <span>Store: </span>
                <strong className="text-slate-800">{form.storeLocation}</strong>
              </div>
              <div className="text-slate-600">
                <span>Status: </span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {editingTxn?.stateLabel || 'Prepared (Draft)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div>
                <span className="text-slate-500">Sub Total: </span>
                <span className="font-mono font-bold text-slate-800">{formCalculations.subTotal.toFixed(2)} ETB</span>
              </div>

              {formCalculations.totalDiscount > 0 && (
                <div>
                  <span className="text-amber-600">Discount: </span>
                  <span className="font-mono font-bold text-amber-700">-{formCalculations.totalDiscount.toFixed(2)} ETB</span>
                </div>
              )}

              {formCalculations.totalAdditionalCharges > 0 && (
                <div>
                  <span className="text-blue-600">Add. Charges: </span>
                  <span className="font-mono font-bold text-blue-700">+{formCalculations.totalAdditionalCharges.toFixed(2)} ETB</span>
                </div>
              )}

              <div>
                <span className="text-slate-500">VAT (15%): </span>
                <span className="font-mono font-bold text-slate-800">{formCalculations.vatAmount.toFixed(2)} ETB</span>
              </div>

              <div className="text-sm font-bold bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200">
                <span>Grand Total: </span>
                <span className="font-mono text-base ml-1">{formCalculations.grandTotal.toFixed(2)} ETB</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW MODE 2: VOUCHER LIST (CNET Structure from Reference) ───────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="space-y-4">

          {/* 2A. Breadcrumb Bar: Home >> parent category >> sublist >> then task */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium hover:text-blue-600 cursor-pointer flex items-center gap-1" onClick={() => navigate('/')}>
                🏠 Home
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-600 font-bold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/transactions')}>
                {parentCategory}
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-600 font-semibold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/transactions')}>
                Documents
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-blue-900 font-bold bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-1.5">
                <span className="text-blue-600 text-[10px] font-black uppercase tracking-wider bg-blue-100 px-1.5 py-0.2 rounded">Task</span>
                {currentVoucherConfig.fullLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide">
                <Calendar size={13} />
                <span>DATE: {dateRange.from || formattedToday} - {dateRange.to || formattedToday}</span>
              </div>
            </div>
          </div>

          {/* 2B. Top Control Panel: Left Action Tiles + Right Filter Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

            {/* Left Action Tiles Box (New, Show, Option, Exports) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-around gap-2">

              {/* "+ New" Action Button -> Switches to Preparation View */}
              <button
                type="button"
                onClick={handleOpenNew}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-600 hover:text-white text-blue-700 transition-all duration-150 group shadow-xs active:scale-95"
                title={`Create a new ${currentVoucherConfig.label}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:bg-white group-hover:text-blue-600 transition shadow-xs">
                  <Plus size={18} strokeWidth={2.5} />
                </span>
                <span className="text-xs font-bold tracking-tight">New</span>
              </button>

              {/* "Show" Action Button */}
              <button
                type="button"
                onClick={() => handleShowDetails(selectedTransaction)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150 shadow-xs active:scale-95 ${
                  selectedRowId
                    ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300'
                    : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                }`}
                title={selectedRowId ? `View details for voucher ${selectedTransaction?.voucherNo}` : 'Select a row to view voucher details'}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition shadow-xs">
                  <Eye size={18} strokeWidth={2.5} />
                </span>
                <span className="text-xs font-bold tracking-tight">Show</span>
              </button>

              {/* "Option" Action Button */}
              <button
                type="button"
                onClick={() => setOptionsOpen(true)}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-150 shadow-xs active:scale-95"
                title="Voucher list options and settings"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/80 text-slate-700 transition shadow-xs">
                  <SlidersHorizontal size={17} strokeWidth={2.5} />
                </span>
                <span className="text-xs font-bold tracking-tight">Option</span>
              </button>

              {/* "Exports" Action Button with Dropdown */}
              <div className="flex-1">
                <ExportDropdown
                  data={exportData}
                  fileName={activeVoucherKey ? `documents_${activeVoucherKey}` : 'vouchers'}
                  pdfTitle={`${companyInfo?.companyName || 'Sharp Plus'} - ${currentVoucherConfig.fullLabel}`}
                  pdfColumns={pdfColumns}
                  customTrigger={
                    <button
                      type="button"
                      className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-150 shadow-xs active:scale-95"
                      title="Export to Excel, PDF, CSV, or Print"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/80 text-slate-700 transition shadow-xs">
                        <FileText size={17} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs font-bold tracking-tight">Exports</span>
                    </button>
                  }
                />
              </div>

            </div>

            {/* Right Filter Form Box */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">

                {/* Voucher Code input */}
                <div>
                  <input
                    type="text"
                    value={filterCode}
                    onChange={e => setFilterCode(e.target.value)}
                    placeholder="Voucher Code"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-blue-500 font-mono bg-white placeholder-slate-400"
                  />
                </div>

                {/* ConsigneeUnit Dropdown */}
                <div>
                  <select
                    value={filterStore}
                    onChange={e => setFilterStore(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs outline-none focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="all">ConsigneeUnit: All</option>
                    {storeOptions.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Select Filter Presets */}
                <div>
                  <select
                    value={presetFilter}
                    onChange={e => handlePresetFilter(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">Select Filter</option>
                    <option value="today">Today's Vouchers</option>
                    <option value="prepared">Prepared (Pending Review)</option>
                    <option value="posted">Posted to Stock</option>
                    <option value="clear">✕ Reset All Filters</option>
                  </select>
                </div>

                {/* ObjectState (Status) */}
                <div>
                  <select
                    value={filterState}
                    onChange={e => setFilterState(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">ObjectState: All States</option>
                    <option value="prepared">Prepared</option>
                    <option value="checked">Checked</option>
                    <option value="approved">Approved</option>
                    <option value="posted">Posted</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>

                {/* DeviceName */}
                <div>
                  <select
                    value={filterDevice}
                    onChange={e => setFilterDevice(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">Device: All Devices</option>
                    <option value="Web Client">Web Client</option>
                  </select>
                </div>

                {/* User Dropdown */}
                <div>
                  <select
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs outline-none focus:border-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="all">User: All Users</option>
                    {usersList.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

          </div>

          {/* 2C. Secondary Toolbar: Type Switcher & Bulk Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            {/* Voucher Type Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {VOUCHERS.map(v => {
                const Icon = v.icon;
                const active = v.key === activeVoucherKey;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      setSearchParams({ voucherType: v.key });
                      setSelectedRowId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition duration-150 whitespace-nowrap shadow-xs ${
                      active
                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Bulk Actions */}
            {canDelete && selectedBulk.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">{selectedBulk.size} selected</span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-bold transition flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Void Selected</span>
                </button>
              </div>
            )}
          </div>

          {/* 2D. Vouchers Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBulk.size > 0 && selectedBulk.size === paginatedTransactions.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedBulk(new Set(paginatedTransactions.map(t => t._id)));
                          else setSelectedBulk(new Set());
                        }}
                        className="rounded border-slate-300 text-blue-600"
                      />
                    </th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Party / Employee / Supplier</th>
                    <th className="py-2.5 px-3">TIN / Code</th>
                    <th className="py-2.5 px-3">Issued Date</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3">User Name</th>
                    <th className="py-2.5 px-3">Device Name</th>
                    <th className="py-2.5 px-3 text-center">Last State</th>
                    <th className="py-2.5 px-3">ConsigneeUnit</th>
                    <th className="py-2.5 px-3 text-right">Sub Total</th>
                    <th className="py-2.5 px-3 text-right">VAT</th>
                    <th className="py-2.5 px-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                        <span>Loading vouchers...</span>
                      </td>
                    </tr>
                  ) : paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        <Package size={28} className="mx-auto mb-2 text-slate-300" />
                        <span>No vouchers found matching criteria. Click <strong>New</strong> to prepare one.</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map(t => {
                      const isSelected = selectedRowId === t._id;
                      const isChecked = selectedBulk.has(t._id);
                      const partyName = t.employee?.name || (t.employeeName ? `${t.employeeName} (${t.employeePhone || ''})` : null) || t.supplier?.name || t.customerName || '—';
                      const partyCode = t.employeeCode || t.tin || t.supplier?.tin || '—';

                      return (
                        <tr
                          key={t._id}
                          onClick={() => setSelectedRowId(t._id)}
                          onDoubleClick={() => handleOpenEdit(t)}
                          className={`cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-blue-50/90 font-medium text-blue-950'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const next = new Set(selectedBulk);
                                if (e.target.checked) next.add(t._id);
                                else next.delete(t._id);
                                setSelectedBulk(next);
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">{t.voucherNo || '—'}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{partyName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{partyCode}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                            {t.date ? new Date(t.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{Number(t.totalAmount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-600">{t.performedBy?.name || '—'}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">{t.deviceName || 'Web Client'}</td>
                          <td className="py-2 px-3 text-center">
                            <WorkflowBadge status={t.status} />
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">{t.consigneeUnit || t.storeLocation || 'Main Store'}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">{Number(t.vatAmount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleShowDetails(t)}
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                                title="Show details"
                              >
                                <Eye size={14} />
                              </button>
                              {t.status === 'pending' && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(t)}
                                  className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100"
                                  title="Edit preparation"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTxn(t._id)}
                                  className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100"
                                  title="Void voucher"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-200">
              <Pagination
                page={page}
                totalPages={Math.max(1, Math.ceil(transactions.length / pageSize))}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                totalItems={transactions.length}
              />
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS (Smart Reconcile, Attach, Import, Quick Forms, Show) ─────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── 1. Smart Stock Reconciliation Assistant Modal ── */}
      <Modal
        open={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        title={`Intelligent Stock Reconciliation — ${form?.storeLocation || 'Main store'}`}
        width="max-w-4xl"
      >
        <div className="space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet-900">
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-violet-700 shrink-0" />
              <div>
                <strong>Intelligent Stock Reconciliation Engine</strong>
                <p className="text-[11px] text-violet-700">
                  Compares current ledger balances against verified physical counts. Identifies shortages, surplus, and negative balances automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApplyAllRecommended(reconcileList)}
                disabled={reconcileLoading || reconcileList.length === 0}
              >
                Apply All Recommended ({reconcileList.filter(r => r.suggestedVoucherType === activeVoucherKey || (activeVoucherKey === 'pos_adjustment' && r.recommendation === 'negative_stock')).length})
              </Button>
            </div>
          </div>

          {/* Filter options */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReconcileFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${reconcileFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                All Items ({reconcileList.length})
              </button>
              <button
                type="button"
                onClick={() => setReconcileFilter('surplus')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${reconcileFilter === 'surplus' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Surplus (PSAV)
              </button>
              <button
                type="button"
                onClick={() => setReconcileFilter('shortage')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${reconcileFilter === 'shortage' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Shortage (NSAV)
              </button>
              <button
                type="button"
                onClick={() => setReconcileFilter('negative')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${reconcileFilter === 'negative' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Negative Stock ({reconcileList.filter(r => r.systemStock < 0).length})
              </button>
            </div>
          </div>

          {/* Reconciliation Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Item / Code</th>
                  <th className="py-2 px-3 text-right">Ledger Stock</th>
                  <th className="py-2 px-3 text-right">Physical Count</th>
                  <th className="py-2 px-3 text-right">Variance</th>
                  <th className="py-2 px-3 text-center">Recommendation</th>
                  <th className="py-2 px-3 text-right">Suggested Qty</th>
                  <th className="py-2 px-3 text-right">Projected Balance</th>
                  <th className="py-2 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconcileLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-violet-600" />
                      <span>Analyzing ledger movements and physical count records...</span>
                    </td>
                  </tr>
                ) : reconcileList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <span>No items found for store location "{form?.storeLocation}".</span>
                    </td>
                  </tr>
                ) : (
                  reconcileList
                    .filter(r => {
                      if (reconcileFilter === 'surplus') return r.recommendation === 'surplus';
                      if (reconcileFilter === 'shortage') return r.recommendation === 'shortage';
                      if (reconcileFilter === 'negative') return r.systemStock < 0;
                      return true;
                    })
                    .map(rec => {
                      const isSurplus = rec.variance > 0 || rec.recommendation === 'surplus';
                      const isShortage = rec.variance < 0 || rec.recommendation === 'shortage';
                      const isNegative = rec.systemStock < 0;

                      return (
                        <tr key={rec.materialId} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3">
                            <strong className="block text-slate-900">{rec.name}</strong>
                            <span className="font-mono text-[11px] text-slate-500">{rec.code || '—'} ({rec.unit})</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            <span className={isNegative ? 'text-red-700 bg-red-50 px-1.5 py-0.5 rounded' : 'text-slate-800'}>
                              {rec.systemStock}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {rec.physicalCount !== null ? rec.physicalCount : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {isSurplus && <span className="text-emerald-700">+{rec.variance}</span>}
                            {isShortage && <span className="text-red-700">{rec.variance}</span>}
                            {!isSurplus && !isShortage && <span className="text-slate-400">0</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isNegative && (
                              <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                Negative Correction
                              </span>
                            )}
                            {!isNegative && isSurplus && (
                              <span className="bg-violet-100 text-violet-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                PSAV (+ve)
                              </span>
                            )}
                            {!isNegative && isShortage && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                NSAV (−ve)
                              </span>
                            )}
                            {!isNegative && !isSurplus && !isShortage && (
                              <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded text-[10px]">
                                Balanced
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {rec.suggestedQty > 0 ? rec.suggestedQty : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                            {rec.projectedBalance}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => { handleApplyReconciledItem(rec); setReconcileModalOpen(false); }}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-[11px] shadow-xs transition"
                            >
                              Add Line
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setReconcileModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 2. Attachments Modal ── */}
      <Modal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        title="Supporting Attachments & Count Documentation"
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload copies of physical stock count sheets, reconciliation sheets, damage reports, or authorization memos for voucher <strong>{form?.voucherNo || 'Prepared'}</strong>.
          </p>

          <AttachmentUploader
            attachments={form?.attachments || []}
            onChange={atts => setForm(f => ({ ...f, attachments: atts }))}
          />

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" onClick={() => setAttachModalOpen(false)}>
              Done ({form?.attachments?.length || 0} Attached)
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 3. Import Item Lines Modal ── */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Line Items"
        width="max-w-2xl"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
            <strong>Format:</strong> Paste tab-separated or comma-separated rows:
            <code className="block mt-1 font-mono text-[11px] bg-white p-1.5 rounded border border-blue-200">
              ItemCode/Name, Quantity, UnitPrice, UOM, Discount, AdditionalCharge
            </code>
            <span className="block mt-1 text-[11px] text-blue-700">
              Example: <code>pcm5/001, 10, 0.000, Tab, 0, 0</code>
            </span>
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 space-y-1">
              <strong className="block text-xs">Import Validation Errors:</strong>
              <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px]">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            rows={7}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Paste your copied rows here..."
            className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs outline-none focus:border-blue-500 bg-white"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProcessImport}>
              Validate & Import Lines
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 4. Quick Add Product Modal ── */}
      <Modal
        open={quickProductOpen}
        onClose={() => setQuickProductOpen(false)}
        title="Quick Add Product / Article"
        width="max-w-lg"
      >
        <form onSubmit={handleQuickProductSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-bold text-slate-700">Product Name *</label>
            <input
              type="text"
              required
              value={quickProductForm.name}
              onChange={e => setQuickProductForm(q => ({ ...q, name: e.target.value }))}
              placeholder="e.g. Paratamole 500mg tab"
              className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Article Code</label>
              <input
                type="text"
                value={quickProductForm.code}
                onChange={e => setQuickProductForm(q => ({ ...q, code: e.target.value }))}
                placeholder="e.g. pcm5/001"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Category</label>
              <input
                type="text"
                value={quickProductForm.category}
                onChange={e => setQuickProductForm(q => ({ ...q, category: e.target.value }))}
                placeholder="e.g. Tab"
                className="w-full h-8 px-2 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">UOM</label>
              <input
                type="text"
                value={quickProductForm.unit}
                onChange={e => setQuickProductForm(q => ({ ...q, unit: e.target.value }))}
                placeholder="Tab"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Standard Cost (ETB)</label>
              <input
                type="number"
                step="any"
                value={quickProductForm.unitCost}
                onChange={e => setQuickProductForm(q => ({ ...q, unitCost: e.target.value }))}
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setQuickProductOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={quickProductSubmitting}>
              {quickProductSubmitting ? 'Creating...' : 'Create & Select Article'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── 5. Quick Add Supplier Modal ── */}
      <Modal
        open={quickSupplierOpen}
        onClose={() => setQuickSupplierOpen(false)}
        title="Quick Supplier Management"
        width="max-w-md"
      >
        <form onSubmit={handleQuickSupplierSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-bold text-slate-700">Supplier Name *</label>
            <input
              type="text"
              required
              value={quickSupplierForm.name}
              onChange={e => setQuickSupplierForm(s => ({ ...s, name: e.target.value }))}
              placeholder="e.g. TestSup Co."
              className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Supplier TIN Number</label>
            <input
              type="text"
              value={quickSupplierForm.tin}
              onChange={e => setQuickSupplierForm(s => ({ ...s, tin: e.target.value }))}
              placeholder="e.g. 0001138385"
              className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Contact Person</label>
              <input
                type="text"
                value={quickSupplierForm.contactPerson}
                onChange={e => setQuickSupplierForm(s => ({ ...s, contactPerson: e.target.value }))}
                placeholder="Manager / Sales"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Phone</label>
              <input
                type="text"
                value={quickSupplierForm.phone}
                onChange={e => setQuickSupplierForm(s => ({ ...s, phone: e.target.value }))}
                placeholder="+251 ..."
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setQuickSupplierOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={quickSupplierSubmitting}>
              {quickSupplierSubmitting ? 'Saving...' : 'Save & Select Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── 6. Quick Add Employee Modal (for PSAV / NSAV) ── */}
      <Modal
        open={quickEmployeeOpen}
        onClose={() => setQuickEmployeeOpen(false)}
        title="Quick Employee Registration"
        width="max-w-md"
      >
        <form onSubmit={handleQuickEmployeeSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={quickEmployeeForm.firstName}
                onChange={e => setQuickEmployeeForm(em => ({ ...em, firstName: e.target.value }))}
                placeholder="e.g. Nebsu"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={quickEmployeeForm.lastName}
                onChange={e => setQuickEmployeeForm(em => ({ ...em, lastName: e.target.value }))}
                placeholder="e.g. Ahmed"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Employee Code</label>
              <input
                type="text"
                value={quickEmployeeForm.employeeId}
                onChange={e => setQuickEmployeeForm(em => ({ ...em, employeeId: e.target.value }))}
                placeholder="e.g. Emp-00000-"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Phone No *</label>
              <input
                type="text"
                required
                value={quickEmployeeForm.phone}
                onChange={e => setQuickEmployeeForm(em => ({ ...em, phone: e.target.value }))}
                placeholder="0910601252"
                className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Department</label>
            <input
              type="text"
              value={quickEmployeeForm.department}
              onChange={e => setQuickEmployeeForm(em => ({ ...em, department: e.target.value }))}
              placeholder="e.g. Store & Inventory"
              className="w-full h-8 px-3 rounded border border-slate-300 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setQuickEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={quickEmployeeSubmitting}>
              {quickEmployeeSubmitting ? 'Saving...' : 'Save & Select Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── 7. Voucher Details Modal ("Show") ── */}
      {detailTxn && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={`Voucher Document: ${detailTxn.voucherNo || 'TXN'}`}
          width="max-w-3xl"
        >
          <div ref={printAreaRef} className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">{companyInfo?.companyName || 'Sharp Plus Trading'}</h2>
                <p className="text-slate-500">{detailTxn.voucherLabel || currentVoucherConfig.fullLabel}</p>
              </div>
              <div className="text-right">
                <WorkflowBadge status={detailTxn.status} />
                <p className="font-mono text-slate-500 mt-1">{detailTxn.date ? new Date(detailTxn.date).toLocaleDateString() : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-slate-500">{detailTxn.employee ? 'Responsible Employee:' : 'Supplier / Party:'}</p>
                <p className="font-bold text-slate-800">
                  {detailTxn.employee?.name || detailTxn.employeeName || detailTxn.supplier?.name || detailTxn.customerName || '—'}
                </p>
                {(detailTxn.employeeCode || detailTxn.tin) && (
                  <p className="font-mono text-slate-600">
                    {detailTxn.employeeCode ? `Code: ${detailTxn.employeeCode}` : `TIN: ${detailTxn.tin}`}
                    {detailTxn.employeePhone ? ` | Phone: ${detailTxn.employeePhone}` : ''}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-500">Destination Store:</p>
                <p className="font-bold text-slate-800">{detailTxn.consigneeUnit || detailTxn.storeLocation || 'Main store'}</p>
                <p className="text-slate-600">Prepared By: {detailTxn.performedBy?.name || '—'}</p>
              </div>
            </div>

            <table className="w-full text-left border border-slate-200 rounded overflow-hidden">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="py-2 px-3">Item / Article</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Discount</th>
                  <th className="py-2 px-3 text-right">Add. Charge</th>
                  <th className="py-2 px-3 text-right">Total (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailTxn.items?.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-medium">
                      {it.material?.name || 'Item'}
                      {it.uom && <span className="text-slate-400 ml-1">({it.uom})</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">{it.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(it.unitCost || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(it.discount || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(it.additionalCharge || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{Number(it.subTotal || it.totalCost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="text-right space-y-1">
                <p className="text-slate-500">Sub Total: <strong className="font-mono text-slate-800">{Number(detailTxn.subTotal || 0).toFixed(2)} ETB</strong></p>
                <p className="text-slate-500">VAT Amount: <strong className="font-mono text-slate-800">{Number(detailTxn.vatAmount || 0).toFixed(2)} ETB</strong></p>
                <p className="text-sm font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">
                  Grand Total: {Number(detailTxn.totalAmount || 0).toFixed(2)} ETB
                </p>
              </div>
            </div>

            {/* Audit Trail Timeline */}
            {detailTxn.trail?.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 mb-2">Audit & Workflow History</h4>
                <TrailTimeline trail={detailTxn.trail} />
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={14} className="mr-1.5" />
                Print Voucher
              </Button>
              <div className="flex gap-2">
                {detailTxn.status === 'pending' && canEdit && (
                  <Button variant="primary" onClick={() => { setDetailOpen(false); handleOpenEdit(detailTxn); }}>
                    Edit in Preparation
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 8. Workflow Advance Modal ── */}
      {approveOpen && approveTxn && (
        <ApproveModal
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          transaction={approveTxn}
          action={approveAction}
          onConfirm={handleAdvanceConfirm}
          loading={approveLoading}
          error={approveError}
        />
      )}

      {/* ── 9. Options Modal ── */}
      <Modal
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Voucher Options & Settings"
        width="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 mb-1">Voucher Module View</h4>
            <p className="text-slate-500 mb-2">Switch between the Voucher Listing and Preparation interface:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setViewMode('list'); setOptionsOpen(false); }}
                className={`flex-1 py-2 rounded-lg font-bold border transition ${
                  viewMode === 'list' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Voucher List Table
              </button>
              <button
                type="button"
                onClick={() => { handleOpenNew(); setOptionsOpen(false); }}
                className={`flex-1 py-2 rounded-lg font-bold border transition ${
                  viewMode === 'preparation' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Voucher Preparation
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-700 mb-1">Master Data Cache</h4>
            <Button variant="secondary" onClick={async () => { await loadMasterData(); alert('Master data reloaded.'); }}>
              <RefreshCw size={14} className="mr-1.5" />
              Force Reload Suppliers, Employees & Products
            </Button>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" onClick={() => setOptionsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
