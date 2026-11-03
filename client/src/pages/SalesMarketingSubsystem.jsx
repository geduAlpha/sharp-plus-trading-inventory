import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import WorkflowBadge from '../components/ui/WorkflowBadge';
import ThermalBillModal from '../components/sales/ThermalBillModal';
import ApproveModal from '../components/ui/ApproveModal';
import SalesForm from '../components/sales/SalesForm';
import {
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Shield,
  Lock,
  MapPin,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Printer,
  Download,
  Eye,
  SlidersHorizontal,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Building,
  Monitor,
  Hash,
  ChevronDown,
  DollarSign,
  TrendingUp,
  Percent,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  Check,
  CheckCheck,
  Ban,
  HelpCircle,
  Truck,
  Compass,
} from 'lucide-react';

const formatETB = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalesMarketingSubsystem() {
  const { user, isDeveloper, isAdmin, canApprove } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active menu tab from URL route or default to cash-sales
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('credit-sales') || path.includes('/sales/credit')) return 'credit-sales';
    if (path.includes('zeroing-voucher')) return 'zeroing-voucher';
    if (path.includes('security-report')) return 'security-report';
    if (path.includes('sales-closing')) return 'sales-closing';
    if (path.includes('sales-route-mapping')) return 'sales-route-mapping';
    return 'cash-sales';
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    navigate(`/sub-system/sales-marketing/${tabKey}`);
  };

  // Data states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter Bar States (matching ERP header shown in screenshot)
  const [filterVoucherCode, setFilterVoucherCode] = useState('');
  const [filterObjectState, setFilterObjectState] = useState('all');
  const [filterConsigneeUnit, setFilterConsigneeUnit] = useState('all');
  const [filterDevice, setFilterDevice] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  // Modals & Actions
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState(null);
  const [newVoucherModalOpen, setNewVoucherModalOpen] = useState(false);

  // Workflow Approval Modal State
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTxn, setApproveTxn] = useState(null);
  const [approveAction, setApproveAction] = useState('approve');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState(null);

  // Credit Collection Modal State
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectTargetVoucher, setCollectTargetVoucher] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('Cash');
  const [collectRef, setCollectRef] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Zeroing Voucher Creation Modal State
  const [zeroingModalOpen, setZeroingModalOpen] = useState(false);
  const [zeroingTargetId, setZeroingTargetId] = useState('');
  const [zeroingReason, setZeroingReason] = useState('Error in customer billing / item line correction');
  const [zeroingNotes, setZeroingNotes] = useState('');
  const [zeroingLoading, setZeroingLoading] = useState(false);
  const [zeroingError, setZeroingError] = useState('');

  // Sales Closing States
  const [closings, setClosings] = useState([]);
  const [unclosedStats, setUnclosedStats] = useState(null);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [closingOpeningCash, setClosingOpeningCash] = useState(0);
  const [closingCountedCash, setClosingCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);

  // Sales Routes States
  const [salesRoutes, setSalesRoutes] = useState([]);
  const [routeWiseReport, setRouteWiseReport] = useState([]);
  const [newRouteModalOpen, setNewRouteModalOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ code: '', name: '', zone: 'Central', assignedRep: '', repPhone: '', vehicleNo: '' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [targetRouteName, setTargetRouteName] = useState('');

  // Security Audit Report States
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securitySummary, setSecuritySummary] = useState(null);

  // Customer Credit Ledger State
  const [creditLedger, setCreditLedger] = useState([]);

  // Initialize date range defaults (today)
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setDateFrom(startOfMonth);
    setDateTo(today);
  }, []);

  // Fetch Sales Transactions based on active module context
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/transactions', {
        params: {
          voucherType: 'sales', // Backend handles cash_sale, credit_sale, zeroing, sales_import
        },
      });
      const raw = Array.isArray(res.data) ? res.data : [];

      // Avoid duplicates
      const seen = new Set();
      const deduplicated = [];
      for (const t of raw) {
        if (!t) continue;
        const key = t._id ? String(t._id) : t.voucherNo;
        if (seen.has(key)) continue;
        seen.add(key);
        deduplicated.push(t);
      }

      setTransactions(deduplicated);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err.response?.data?.message || 'Could not load sales transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Auxiliary Subsystem Data based on active tab
  const fetchAuxiliaryData = useCallback(async () => {
    if (activeTab === 'sales-closing') {
      try {
        const [resClosings, resStats] = await Promise.all([
          api.get('/sales-closing'),
          api.get('/sales-closing/unclosed-stats'),
        ]);
        setClosings(Array.isArray(resClosings.data) ? resClosings.data : []);
        setUnclosedStats(resStats.data || null);
      } catch (e) {
        console.warn('Failed to load sales closing data:', e);
      }
    } else if (activeTab === 'sales-route-mapping') {
      try {
        const [resRoutes, resReport, resCust] = await Promise.all([
          api.get('/sales-routes'),
          api.get('/sales-routes/report'),
          api.get('/customers'),
        ]);
        setSalesRoutes(Array.isArray(resRoutes.data) ? resRoutes.data : []);
        setRouteWiseReport(Array.isArray(resReport.data) ? resReport.data : []);
        setAvailableCustomers(Array.isArray(resCust.data) ? resCust.data : []);
      } catch (e) {
        console.warn('Failed to load routes data:', e);
      }
    } else if (activeTab === 'security-report') {
      try {
        const resSec = await api.get('/sales-security/report');
        setSecurityLogs(Array.isArray(resSec.data?.logs) ? resSec.data.logs : []);
        setSecuritySummary(resSec.data?.summary || null);
      } catch (e) {
        console.warn('Failed to load security report:', e);
      }
    } else if (activeTab === 'credit-sales') {
      try {
        const resLedger = await api.get('/sales-security/credit-ledger');
        setCreditLedger(Array.isArray(resLedger.data) ? resLedger.data : []);
      } catch (e) {
        console.warn('Failed to load credit ledger:', e);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTransactions();
    fetchAuxiliaryData();
  }, [fetchTransactions, fetchAuxiliaryData]);

  // Distinct filter options extracted dynamically from live records
  const dynamicOptions = useMemo(() => {
    const units = new Set();
    const devices = new Set();
    const users = new Set();

    transactions.forEach((t) => {
      const u = t.consigneeUnit || t.storeLocation;
      if (u && u.trim()) units.add(u.trim());

      const d = t.deviceName || t.device;
      if (d && d.trim()) devices.add(d.trim());

      const usr = t.performedBy?.name || t.employeeName || t.createdByName;
      if (usr && usr.trim()) users.add(usr.trim());
    });

    return {
      units: Array.from(units).sort(),
      devices: Array.from(devices).sort(),
      users: Array.from(users).sort(),
    };
  }, [transactions]);

  // Filter transactions based on active menu and top filter controls
  const filteredList = useMemo(() => {
    let list = [...transactions];

    // Filter by Active Tab Type
    if (activeTab === 'cash-sales') {
      list = list.filter((t) => t.voucherType === 'cash_sale' || t.voucherType === 'cash_sales');
    } else if (activeTab === 'credit-sales') {
      list = list.filter((t) => t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales');
    } else if (activeTab === 'zeroing-voucher') {
      list = list.filter((t) => t.voucherType === 'zeroing' || t.isZeroed);
    }

    // Filter by Voucher Code
    if (filterVoucherCode.trim()) {
      const q = filterVoucherCode.toLowerCase().trim();
      list = list.filter((t) => (t.voucherNo || '').toLowerCase().includes(q));
    }

    // Filter by ObjectState / Status
    if (filterObjectState !== 'all') {
      list = list.filter((t) => {
        const st = (t.status || 'pending').toLowerCase();
        if (filterObjectState === 'prepared') return st === 'pending';
        return st === filterObjectState.toLowerCase();
      });
    }

    // Filter by ConsigneeUnit
    if (filterConsigneeUnit !== 'all') {
      list = list.filter((t) => {
        const u = t.consigneeUnit || t.storeLocation || '';
        return u.trim() === filterConsigneeUnit.trim();
      });
    }

    // Filter by Device
    if (filterDevice !== 'all') {
      list = list.filter((t) => {
        const d = t.deviceName || t.device || '';
        return d.trim() === filterDevice.trim();
      });
    }

    // Filter by User
    if (filterUser !== 'all') {
      list = list.filter((t) => {
        const u = t.performedBy?.name || t.employeeName || t.createdByName || '';
        return u.trim() === filterUser.trim();
      });
    }

    // Filter by Date Range
    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() <= toTime);
    }

    return list;
  }, [
    transactions,
    activeTab,
    filterVoucherCode,
    filterObjectState,
    filterConsigneeUnit,
    filterDevice,
    filterUser,
    dateFrom,
    dateTo,
  ]);

  // Tab Breadcrumb & Title definitions
  const tabTitles = {
    'cash-sales': 'Documents - Cash Sales Voucher',
    'credit-sales': 'Documents - Credit Sales Voucher',
    'zeroing-voucher': 'Documents - Zeroing Voucher',
    'security-report': 'Security Report & User Activity Monitoring',
    'sales-closing': 'Sales Closing & Physical Reconciliation',
    'sales-route-mapping': 'Sales Route Mapping & Customer Assignment',
  };

  // Workflow Advance (Review, Approve, Post)
  const openApprove = (sale, action) => {
    setApproveTxn(sale);
    setApproveAction(action);
    setApproveError(null);
    setApproveOpen(true);
  };

  const handleAdvanceConfirm = async (password, note) => {
    if (!approveTxn) return;
    setApproveLoading(true);
    setApproveError(null);
    try {
      await api.post(`/transactions/${approveTxn._id}/advance`, {
        action: approveAction,
        password,
        note,
      });
      setApproveOpen(false);
      setApproveTxn(null);
      fetchTransactions();
    } catch (err) {
      console.error('Advance error:', err);
      setApproveError(err.response?.data?.message || 'Workflow advancement failed.');
    } finally {
      setApproveLoading(false);
    }
  };

  // Submit Credit Collection
  const handleSubmitCollection = async (e) => {
    e.preventDefault();
    if (!collectTargetVoucher || !collectAmount) return;
    setCollectLoading(true);
    setCollectError('');
    try {
      await api.post('/sales-security/collect-credit', {
        voucherId: collectTargetVoucher._id,
        amount: Number(collectAmount),
        paymentMethod: collectMethod,
        reference: collectRef,
        note: collectNote,
      });
      setCollectModalOpen(false);
      setCollectTargetVoucher(null);
      setCollectAmount('');
      setCollectRef('');
      setCollectNote('');
      fetchTransactions();
      fetchAuxiliaryData();
    } catch (err) {
      setCollectError(err.response?.data?.message || 'Failed to record credit collection.');
    } finally {
      setCollectLoading(false);
    }
  };

  // Submit Zeroing Voucher
  const handleSubmitZeroing = async (e) => {
    e.preventDefault();
    if (!zeroingTargetId) return;
    setZeroingLoading(true);
    setZeroingError('');
    try {
      await api.post('/sales-security/zeroing', {
        targetVoucherId: zeroingTargetId,
        reason: zeroingReason,
        notes: zeroingNotes,
      });
      setZeroingModalOpen(false);
      setZeroingTargetId('');
      setZeroingNotes('');
      fetchTransactions();
      fetchAuxiliaryData();
    } catch (err) {
      setZeroingError(err.response?.data?.message || 'Failed to execute zeroing voucher.');
    } finally {
      setZeroingLoading(false);
    }
  };

  // Submit Sales Closing
  const handleSubmitClosing = async (e) => {
    e.preventDefault();
    setClosingLoading(true);
    try {
      await api.post('/sales-closing', {
        openingCash: Number(closingOpeningCash || 0),
        actualCashCounted: Number(closingCountedCash || 0),
        storeLocation: filterConsigneeUnit !== 'all' ? filterConsigneeUnit : 'Main Store',
        notes: closingNotes,
      });
      setClosingModalOpen(false);
      setClosingCountedCash('');
      setClosingNotes('');
      fetchAuxiliaryData();
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to perform sales closing.');
    } finally {
      setClosingLoading(false);
    }
  };

  // Submit New Route
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!routeForm.code || !routeForm.name) return;
    try {
      await api.post('/sales-routes', routeForm);
      setNewRouteModalOpen(false);
      setRouteForm({ code: '', name: '', zone: 'Central', assignedRep: '', repPhone: '', vehicleNo: '' });
      fetchAuxiliaryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create sales route.');
    }
  };

  // Submit Assign Customers to Route
  const handleAssignCustomers = async () => {
    if (selectedCustomerIds.length === 0 || !targetRouteName) return;
    try {
      await api.post('/sales-routes/assign-customers', {
        customerIds: selectedCustomerIds,
        routeName: targetRouteName,
      });
      setAssignModalOpen(false);
      setSelectedCustomerIds([]);
      setTargetRouteName('');
      fetchAuxiliaryData();
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign customers to route.');
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('No sales vouchers available to export.');
      return;
    }

    const headers = [
      'Code',
      'Issued Date',
      'Grand Total (ETB)',
      'User Name',
      'Device Name',
      'Last State',
      'Sub Total (ETB)',
      'Fs Number',
      'VAT (ETB)',
      'MRC',
      'Customers',
      'TIN',
      'Items',
      'Route',
    ];

    const rows = filteredList.map((t) => {
      const itemsList = Array.isArray(t.items) && t.items.length > 0
        ? t.items.map((i) => `${i.material?.name || 'Item'} (${i.quantity})`).join('; ')
        : `${t.material?.name || 'Item'} (${t.quantity || 1})`;
      const fs = t.fsNo || (t.fsNumber ? `FS-${String(t.fsNumber).padStart(6, '0')}` : '00000115');

      return [
        `"${t.voucherNo || ''}"`,
        `"${t.date ? new Date(t.date).toISOString() : ''}"`,
        Number(t.totalRevenue || t.totalAmount || 0).toFixed(2),
        `"${t.performedBy?.name || t.employeeName || 'System'}"`,
        `"${t.deviceName || 'DESKTOP-FH4JJQV'}"`,
        `"${t.status || 'Prepared'}"`,
        Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0).toFixed(2),
        `"${fs}"`,
        Number(t.vatAmount || 0).toFixed(2),
        `"${t.mrc || 'FGK0014220'}"`,
        `"${t.customerName || t.customer?.name || 'Walk-in Customer'}"`,
        `"${t.tin || t.customerTin || '0010588655'}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
        `"${t.assignedRoute || 'Default Route'}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* ── 1. Top Breadcrumb & Header Bar (Matching Screenshot) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium overflow-x-auto">
          <Link to="/" className="text-slate-700 hover:text-blue-600 font-semibold flex items-center gap-1">
            <span># Home</span>
          </Link>
          <span className="text-slate-300">&gt;</span>
          <span className="text-slate-700 font-semibold">Subsystems</span>
          <span className="text-slate-300">&gt;</span>
          <span className="text-blue-700 font-bold">{tabTitles[activeTab]}</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-mono font-bold tracking-tight">
            DATE: {dateFrom ? dateFrom.replace(/-/g, '/') : '01/11/2026'} - {dateTo ? dateTo.replace(/-/g, '/') : '03/11/2026'}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Print Document"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* ── 2. Six Functional Menu Tabs Navigation ── */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto select-none">
        {[
          { key: 'cash-sales', label: 'Cash Sales Voucher', icon: ShoppingBag, color: 'emerald' },
          { key: 'credit-sales', label: 'Credit Sales Voucher', icon: CreditCard, color: 'blue' },
          { key: 'zeroing-voucher', label: 'Zeroing Voucher', icon: RotateCcw, color: 'purple' },
          { key: 'security-report', label: 'Security Report', icon: Shield, color: 'rose' },
          { key: 'sales-closing', label: 'Sales Closing', icon: Lock, color: 'amber' },
          { key: 'sales-route-mapping', label: 'Sales Route Mapping', icon: MapPin, color: 'indigo' },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. ERP Filter & Search Header Bar (Matches Screenshot) ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Action Buttons Column (Matches '+ New', 'Show', 'Option', 'Exports' buttons in screenshot) */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'zeroing-voucher') setZeroingModalOpen(true);
                else if (activeTab === 'sales-closing') setClosingModalOpen(true);
                else if (activeTab === 'sales-route-mapping') setNewRouteModalOpen(true);
                else setNewVoucherModalOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-xs font-bold transition active:scale-95 shadow-xs"
            >
              <Plus size={15} />
              <span>+ New</span>
            </button>

            <button
              type="button"
              onClick={fetchTransactions}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 shadow-xs"
            >
              <Eye size={15} />
              <span>Show</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2.5 rounded-xl border transition ${
                showOptions ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title="Filter Options"
            >
              <SlidersHorizontal size={15} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Export Document"
            >
              <Download size={15} />
            </button>
          </div>

          {/* Form Inputs Grid (Matching Screenshot) */}
          <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {/* Voucher Code */}
            <div>
              <input
                type="text"
                value={filterVoucherCode}
                onChange={(e) => setFilterVoucherCode(e.target.value)}
                placeholder="Voucher Code"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* ConsigneeUnit / Store */}
            <div>
              <select
                value={filterConsigneeUnit}
                onChange={(e) => setFilterConsigneeUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="all">ConsigneeUnit</option>
                {dynamicOptions.units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* ObjectState / Status */}
            <div>
              <select
                value={filterObjectState}
                onChange={(e) => setFilterObjectState(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="all">ObjectState</option>
                <option value="prepared">Prepared</option>
                <option value="checked">Checked</option>
                <option value="approved">Approved</option>
                <option value="posted">Posted</option>
                <option value="voided">Voided</option>
              </select>
            </div>

            {/* Device */}
            <div>
              <select
                value={filterDevice}
                onChange={(e) => setFilterDevice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="all">Device</option>
                {dynamicOptions.devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* User */}
            <div>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="all">User</option>
                {dynamicOptions.users.map((usr) => (
                  <option key={usr} value={usr}>
                    {usr}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Quick Selector */}
            <div className="flex items-center gap-1 bg-slate-50/60 border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"># DATE</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-mono"
              />
              <span className="text-slate-300">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Options Row when toggled */}
        {showOptions && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <span className="text-slate-400 text-[11px]">Select Filter / Choose secondary category for custom fields</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterVoucherCode('');
                  setFilterObjectState('all');
                  setFilterConsigneeUnit('all');
                  setFilterDevice('all');
                  setFilterUser('all');
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Main Document Workspace View ── */}

      {/* TAB 1, 2, 3: Voucher Data Grid (Cash Sales, Credit Sales, Zeroing) */}
      {['cash-sales', 'credit-sales', 'zeroing-voucher'].includes(activeTab) && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3 w-10 text-center">...</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Issued Date</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Grand Total</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">User Name</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Device Name</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Last State</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Sub Total</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Fs Number</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">VAT</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">MRC</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Customers</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">TIN</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Items</th>
                  {activeTab === 'credit-sales' && <th className="py-2.5 px-3 text-center whitespace-nowrap">Collections</th>}
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-slate-400 font-sans">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                      <span>Loading documents...</span>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-slate-400 font-sans">
                      <FileText size={30} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No {tabTitles[activeTab]} found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or creating a new voucher.</p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row) => {
                    const firstItem = Array.isArray(row.items) && row.items[0]?.material
                      ? row.items[0].material.name
                      : (row.material?.name || 'Item');
                    const itemsCount = Array.isArray(row.items) ? row.items.length : 1;
                    const fs = row.fsNo || (row.fsNumber ? `00000${row.fsNumber}` : '00000115');
                    const mrc = row.mrc || 'FGK0014220';
                    const tin = row.tin || row.customerTin || '0010588655';
                    const dev = row.deviceName || 'DESKTOP-FH4JJQV';
                    const customer = row.customerName || row.customer?.name || 'Walk-in Customer';
                    const subtotal = Number(row.subTotal || row.taxableAmount || (row.totalAmount - (row.vatAmount || 0)) || 0);
                    const grand = Number(row.totalRevenue || row.totalAmount || 0);
                    const vat = Number(row.vatAmount || 0);

                    return (
                      <tr
                        key={row._id}
                        className="hover:bg-blue-50/40 transition cursor-pointer"
                        onClick={() => {
                          setSelectedVoucher(row);
                          setDetailModalOpen(true);
                        }}
                      >
                        {/* Action Menu Column (Orange button like in screenshot) */}
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoucher(row);
                              setDetailModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-xs"
                          >
                            ...
                          </button>
                        </td>

                        {/* Code */}
                        <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900">
                          {row.voucherNo || '—'}
                        </td>

                        {/* Issued Date */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600 text-[10.5px]">
                          {row.date ? new Date(row.date).toISOString().slice(0, 19).replace('T', ' ') : '—'}
                        </td>

                        {/* Grand Total */}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {grand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* User Name */}
                        <td className="py-2 px-3 whitespace-nowrap font-sans text-slate-800">
                          {row.performedBy?.name || row.employeeName || 'Nebsu'}
                        </td>

                        {/* Device Name */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600 text-[10px]">
                          {dev}
                        </td>

                        {/* Last State */}
                        <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            row.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                            row.status === 'voided' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {row.isVoided || row.deletedAt ? 'Voided' : (row.status === 'pending' ? 'Prepared' : (row.status || 'Prepared'))}
                          </span>
                        </td>

                        {/* Sub Total */}
                        <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                          {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Fs Number */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {fs}
                        </td>

                        {/* VAT */}
                        <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                          {vat.toFixed(2)}
                        </td>

                        {/* MRC */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {mrc}
                        </td>

                        {/* Customers */}
                        <td className="py-2 px-3 max-w-[150px] truncate font-sans font-semibold text-slate-900" title={customer}>
                          {customer}
                        </td>

                        {/* TIN */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {tin}
                        </td>

                        {/* Items */}
                        <td className="py-2 px-3 max-w-[160px] truncate font-sans text-slate-700" title={firstItem}>
                          {firstItem}
                          {itemsCount > 1 && <span className="ml-1 text-[10px] text-blue-600 font-bold">+{itemsCount - 1}</span>}
                        </td>

                        {/* Credit Collection Action */}
                        {activeTab === 'credit-sales' && (
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setCollectTargetVoucher(row);
                                setCollectAmount(String(Math.max(0, grand - (row.amountPaid || 0))));
                                setCollectModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold hover:bg-blue-100"
                            >
                              Collect ({row.paymentStatus || 'unpaid'})
                            </button>
                          </td>
                        )}

                        {/* Action Buttons */}
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForPrint(row);
                                setThermalModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-emerald-600"
                              title="Print Thermal Bill"
                            >
                              <Printer size={13} />
                            </button>
                            {canApprove && row.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => openApprove(row, 'approve')}
                                className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
                              >
                                Approve
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
        </div>
      )}

      {/* TAB 4: Security Report & User Activity Monitoring */}
      {activeTab === 'security-report' && (
        <div className="space-y-4">
          {/* Security KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</span>
              <p className="text-2xl font-mono font-black text-slate-900 mt-1">{securitySummary?.totalAuditEvents || securityLogs.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Zeroing Adjustments</span>
              <p className="text-2xl font-mono font-black text-purple-700 mt-1">{securitySummary?.zeroingCount || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Void / Soft Delete Events</span>
              <p className="text-2xl font-mono font-black text-rose-700 mt-1">{securitySummary?.voidEventsCount || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Authorization Operations</span>
              <p className="text-2xl font-mono font-black text-emerald-700 mt-1">{securitySummary?.authEventsCount || 0}</p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Security Audit Logs &amp; Authorization Activity</span>
              <button
                type="button"
                onClick={fetchAuxiliaryData}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Refresh Logs
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Actor / User</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Details / Reason</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No security audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.action === 'ZEROING' ? 'bg-purple-100 text-purple-800' :
                            log.action === 'VOID' || log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                            log.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-900 font-medium">
                          {log.userName} ({log.userRole})
                        </td>
                        <td className="py-2 px-3 text-blue-700 font-bold">
                          {log.resourceName || log.resourceId || '—'}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                          {log.details?.reason || log.details?.originalVoucherNo || JSON.stringify(log.details)}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {log.ip || 'Local / Internal'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Sales Closing & Physical Reconciliation */}
      {activeTab === 'sales-closing' && (
        <div className="space-y-4">
          {/* Unclosed Session Live Reconciler Card */}
          {unclosedStats && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Live Active Session Status</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {unclosedStats.voucherCount} Open Sales Vouchers Awaiting Daily Closing
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Expected Cash to Reconcile: <strong className="font-mono text-emerald-700">{formatETB(unclosedStats.expectedCash)}</strong> · Credit Billed: <strong className="font-mono text-blue-700">{formatETB(unclosedStats.creditSalesTotal)}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setClosingModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
              >
                Perform Sales Closing Session
              </button>
            </div>
          )}

          {/* Historical Closing Sessions Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Closed Sales Periods Register</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] font-sans">
                    <th className="py-2.5 px-3">Closing Code</th>
                    <th className="py-2.5 px-3">Closing Date</th>
                    <th className="py-2.5 px-3">Store Location</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3 text-right">Cash Billed</th>
                    <th className="py-2.5 px-3 text-right">Credit Billed</th>
                    <th className="py-2.5 px-3 text-right">Expected Cash</th>
                    <th className="py-2.5 px-3 text-right">Counted Cash</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                        No historical sales closing sessions yet.
                      </td>
                    </tr>
                  ) : (
                    closings.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-blue-700">{c.closingCode}</td>
                        <td className="py-2 px-3 text-slate-600">{new Date(c.date).toLocaleString()}</td>
                        <td className="py-2 px-3 font-sans">{c.storeLocation}</td>
                        <td className="py-2 px-3 font-sans">{c.cashierName}</td>
                        <td className="py-2 px-3 text-right">{formatETB(c.cashSalesTotal)}</td>
                        <td className="py-2 px-3 text-right text-blue-700">{formatETB(c.creditSalesTotal)}</td>
                        <td className="py-2 px-3 text-right font-bold">{formatETB(c.expectedCash)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatETB(c.actualCashCounted)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${c.cashVariance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatETB(c.cashVariance)}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Sales Route Mapping & Customer Assignment */}
      {activeTab === 'sales-route-mapping' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Territory Delivery Routes &amp; Assignments</h3>
              <p className="text-[11px] text-slate-500">Assign customers to delivery zones and inspect route-wise revenue contribution.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-50"
              >
                Assign Customers
              </button>
              <button
                type="button"
                onClick={() => setNewRouteModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                + Add Route
              </button>
            </div>
          </div>

          {/* Route-wise Sales Performance Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">Route-wise Sales Reporting Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Route Code</th>
                    <th className="py-2.5 px-3">Route Name</th>
                    <th className="py-2.5 px-3">Zone</th>
                    <th className="py-2.5 px-3">Sales Rep</th>
                    <th className="py-2.5 px-3 text-center">Customers</th>
                    <th className="py-2.5 px-3 text-center">Vouchers</th>
                    <th className="py-2.5 px-3 text-right">Cash Sales</th>
                    <th className="py-2.5 px-3 text-right">Credit Sales</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {routeWiseReport.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        No route performance data available.
                      </td>
                    </tr>
                  ) : (
                    routeWiseReport.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-sans">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{r.routeCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.routeName}</td>
                        <td className="py-2 px-3 text-slate-600">{r.zone}</td>
                        <td className="py-2 px-3 text-slate-700">{r.assignedRep}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{r.uniqueCustomersCount || 0}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{r.voucherCount}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatETB(r.cashRevenue)}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-700">{formatETB(r.creditRevenue)}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-950">{formatETB(r.totalRevenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Action Modals ── */}

      {/* Modal: New Cash or Credit Sales Voucher */}
      {newVoucherModalOpen && (
        <Modal
          open={newVoucherModalOpen}
          onClose={() => setNewVoucherModalOpen(false)}
          title={`Create ${activeTab === 'credit-sales' ? 'Credit Sales Voucher' : 'Cash Sales Voucher'}`}
          width="max-w-4xl"
        >
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            <SalesForm
              voucherType={activeTab === 'credit-sales' ? 'credit_sale' : 'cash_sale'}
              onSuccess={() => {
                setNewVoucherModalOpen(false);
                fetchTransactions();
              }}
            />
          </div>
        </Modal>
      )}

      {/* Modal: Credit Collection */}
      {collectModalOpen && collectTargetVoucher && (
        <Modal
          open={collectModalOpen}
          onClose={() => setCollectModalOpen(false)}
          title={`Record Credit Collection — ${collectTargetVoucher.voucherNo}`}
          width="max-w-md"
        >
          <form onSubmit={handleSubmitCollection} className="space-y-3 text-xs">
            {collectError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {collectError}
              </div>
            )}
            <div>
              <label className="block text-slate-500 font-bold mb-1">Customer</label>
              <p className="font-bold text-slate-800 text-sm">{collectTargetVoucher.customerName || 'Customer'}</p>
              <p className="text-slate-400 font-mono mt-0.5">
                Outstanding Balance: {formatETB(Math.max(0, (collectTargetVoucher.totalRevenue || collectTargetVoucher.totalAmount) - (collectTargetVoucher.amountPaid || 0)))}
              </p>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Collection Amount (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Payment Method</label>
              <select
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              >
                <option value="Cash">Cash Counter</option>
                <option value="Telebirr">Telebirr Transfer</option>
                <option value="CBE Birr">CBE Birr</option>
                <option value="Bank Transfer">Bank Wire Transfer</option>
                <option value="Check">Cheque Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Receipt / Reference #</label>
              <input
                type="text"
                value={collectRef}
                onChange={(e) => setCollectRef(e.target.value)}
                placeholder="Optional Bank Ref / Receipt #"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Note</label>
              <textarea
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                rows={2}
                placeholder="Payment memo..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={collectLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {collectLoading ? 'Saving...' : 'Record Collection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Zeroing Voucher */}
      {zeroingModalOpen && (
        <Modal
          open={zeroingModalOpen}
          onClose={() => setZeroingModalOpen(false)}
          title="Create Zeroing Voucher & Transaction Adjustment"
          width="max-w-lg"
        >
          <form onSubmit={handleSubmitZeroing} className="space-y-3 text-xs">
            {zeroingError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {zeroingError}
              </div>
            )}
            <div>
              <label className="block text-slate-500 font-bold mb-1">Select Target Sales Voucher to Zero *</label>
              <select
                required
                value={zeroingTargetId}
                onChange={(e) => setZeroingTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              >
                <option value="">-- Choose active sales voucher --</option>
                {transactions
                  .filter((t) => !t.isZeroed && t.voucherType !== 'zeroing' && t.status !== 'voided')
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.voucherNo} — {t.customerName || 'Walk-in'} — {formatETB(t.totalRevenue || t.totalAmount)}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Zeroing Reason *</label>
              <input
                type="text"
                required
                value={zeroingReason}
                onChange={(e) => setZeroingReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Supervisor Authorization Note</label>
              <textarea
                value={zeroingNotes}
                onChange={(e) => setZeroingNotes(e.target.value)}
                rows={2}
                placeholder="Reason for adjustment and audit trail notes..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              ⚠️ Warning: Executing zeroing reverses the sales revenue and restores any deducted raw material inventory. This action is permanently logged in the Security Audit Report.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setZeroingModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={zeroingLoading}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {zeroingLoading ? 'Zeroing...' : 'Execute Zeroing'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Sales Closing Execution */}
      {closingModalOpen && unclosedStats && (
        <Modal
          open={closingModalOpen}
          onClose={() => setClosingModalOpen(false)}
          title="Daily Sales Closing & Physical Cash Reconciliation"
          width="max-w-md"
        >
          <form onSubmit={handleSubmitClosing} className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Open Vouchers Count:</span>
                <span className="font-bold">{unclosedStats.voucherCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Cash Billed:</span>
                <span className="font-bold">{formatETB(unclosedStats.cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Credit Collections:</span>
                <span className="font-bold text-blue-700">{formatETB(unclosedStats.collectionsTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-700 font-sans font-bold">Expected Cash:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatETB(Number(closingOpeningCash || 0) + unclosedStats.cashSalesTotal + unclosedStats.collectionsTotal)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Opening Cash Float (ETB)</label>
              <input
                type="number"
                step="0.01"
                value={closingOpeningCash}
                onChange={(e) => setClosingOpeningCash(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Actual Physical Cash Counted (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={closingCountedCash}
                onChange={(e) => setClosingCountedCash(e.target.value)}
                placeholder="Count drawer cash..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Closing Notes / Discrepancy Memo</label>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={2}
                placeholder="Verification remarks..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClosingModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={closingLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {closingLoading ? 'Closing...' : 'Lock & Finalize Closing'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Sales Route */}
      {newRouteModalOpen && (
        <Modal
          open={newRouteModalOpen}
          onClose={() => setNewRouteModalOpen(false)}
          title="Create New Sales Route"
          width="max-w-md"
        >
          <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Route Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. RT-NORTH"
                value={routeForm.code}
                onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Route Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. North Addis District"
                value={routeForm.name}
                onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Zone / Sector</label>
              <input
                type="text"
                placeholder="e.g. Commercial Center"
                value={routeForm.zone}
                onChange={(e) => setRouteForm({ ...routeForm, zone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Assigned Sales Rep</label>
              <input
                type="text"
                placeholder="Sales agent name"
                value={routeForm.assignedRep}
                onChange={(e) => setRouteForm({ ...routeForm, assignedRep: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNewRouteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Route
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Customer Route Assignment */}
      {assignModalOpen && (
        <Modal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Customers to Delivery Route"
          width="max-w-lg"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Select Delivery Route *</label>
              <select
                value={targetRouteName}
                onChange={(e) => setTargetRouteName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
              >
                <option value="">-- Choose target route --</option>
                {salesRoutes.map((r) => (
                  <option key={r._id} value={r.name}>
                    {r.code} — {r.name} ({r.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 font-bold">Select Customers to Assign ({selectedCustomerIds.length} selected)</label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomerIds.length === availableCustomers.length) setSelectedCustomerIds([]);
                    else setSelectedCustomerIds(availableCustomers.map((c) => c._id));
                  }}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  Select All
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                {availableCustomers.map((c) => {
                  const isChecked = selectedCustomerIds.includes(c._id);
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCustomerIds([...selectedCustomerIds, c._id]);
                          else setSelectedCustomerIds(selectedCustomerIds.filter((id) => id !== c._id));
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({c.assignedRoute || 'Unassigned'})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignCustomers}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Apply Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: View Voucher Breakdown & Audit Details */}
      {detailModalOpen && selectedVoucher && (
        <Modal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Document Details — ${selectedVoucher.voucherNo || ''}`}
          width="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voucher Type &amp; Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-sm text-slate-900">{selectedVoucher.voucherNo}</span>
                  <WorkflowBadge status={selectedVoucher.isVoided || selectedVoucher.deletedAt ? 'voided' : (selectedVoucher.status || 'pending')} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Issued Date</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {selectedVoucher.date ? new Date(selectedVoucher.date).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grand Total</p>
                <p className="font-mono font-black text-emerald-700 text-base mt-0.5">
                  {formatETB(selectedVoucher.totalRevenue || selectedVoucher.totalAmount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-white">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Customer Profile</h4>
                <p className="font-bold text-slate-900">{selectedVoucher.customerName || selectedVoucher.customer?.name || 'Walk-in Customer'}</p>
                <p className="text-slate-500 font-mono mt-0.5">TIN: {selectedVoucher.tin || '0010588655'}</p>
                <p className="text-slate-500 font-sans mt-0.5">Route: {selectedVoucher.assignedRoute || 'Default Route'}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Fiscal Device &amp; Station</h4>
                <p className="text-slate-700 font-mono">FS: {selectedVoucher.fsNo || (selectedVoucher.fsNumber ? `00000${selectedVoucher.fsNumber}` : '00000115')}</p>
                <p className="text-slate-700 font-mono">MRC: {selectedVoucher.mrc || 'FGK0014220'}</p>
                <p className="text-slate-700 font-mono text-[10px]">Device: {selectedVoucher.deviceName || 'DESKTOP-FH4JJQV'}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Settlement &amp; Terms</h4>
                <p className="text-slate-700">Type: <span className="font-bold capitalize">{selectedVoucher.paymentType || 'Cash'}</span></p>
                <p className="text-slate-700">Status: <span className="font-bold capitalize text-slate-900">{selectedVoucher.paymentStatus || 'Paid'}</span></p>
                <p className="text-slate-700 font-mono">Paid: {formatETB(selectedVoucher.amountPaid || (selectedVoucher.paymentStatus === 'paid' ? (selectedVoucher.totalRevenue || selectedVoucher.totalAmount) : 0))}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item / Description</th>
                    <th className="py-2 px-3 text-center">UOM</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Array.isArray(selectedVoucher.items) && selectedVoucher.items.length > 0 ? (
                    selectedVoucher.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{it.material?.name || `Item #${idx + 1}`}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{it.uom || it.material?.unit || 'Pcs'}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{it.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{formatETB(it.sellingPrice || it.unitCost || 0)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-950">{formatETB(Number(it.quantity) * Number(it.sellingPrice || it.unitCost || 0))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">{selectedVoucher.material?.name || 'Stock Item'}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{selectedVoucher.material?.unit || 'Pcs'}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{selectedVoucher.quantity || 1}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{formatETB(selectedVoucher.unitCost || 0)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-950">{formatETB(selectedVoucher.totalRevenue || selectedVoucher.totalAmount || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedForPrint(selectedVoucher);
                  setThermalModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Print Fiscal Bill</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Thermal Fiscal Slip Print */}
      {thermalModalOpen && selectedForPrint && (
        <ThermalBillModal
          open={thermalModalOpen}
          onClose={() => setThermalModalOpen(false)}
          sale={selectedForPrint}
        />
      )}

      {/* Modal: Advance Approval Workflow */}
      {approveOpen && approveTxn && (
        <ApproveModal
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          onConfirm={handleAdvanceConfirm}
          action={approveAction}
          loading={approveLoading}
          error={approveError}
          voucherNo={approveTxn.voucherNo}
          amount={approveTxn.totalRevenue || approveTxn.totalAmount}
          currentStatus={approveTxn.status}
        />
      )}
    </div>
  );
}
