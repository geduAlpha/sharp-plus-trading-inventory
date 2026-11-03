import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import WorkflowBadge from '../components/ui/WorkflowBadge';
import ThermalBillModal from '../components/sales/ThermalBillModal';
import {
  Receipt,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ShoppingBag,
  CreditCard,
  ChevronDown,
  RefreshCw,
  Eye,
  ArrowUpDown,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Building2,
  User,
  Layers,
  ArrowRight,
} from 'lucide-react';

const formatETB = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalesMarketingVoucherReport() {
  const { user, isDeveloper, isAdmin, companyInfo } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'cash_sale' | 'credit_sale'
  const [statusFilter, setStatusFilter] = useState('all');   // 'all' | 'pending' | 'checked' | 'approved' | 'posted'
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState(null);

  // Set default dates on initial mount
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setDateFrom(startOfMonth);
    setDateTo(today);
  }, []);

  // Fetch Sales Transactions (Reuses StockTransaction collection with voucherType: sales)
  const fetchSalesTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/transactions', {
        params: {
          voucherType: 'sales', // Backend filters for { $in: ['cash_sale', 'credit_sale'] }
        },
      });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sales vouchers:', err);
      setError(err.response?.data?.message || 'Could not load sales vouchers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesTransactions();
  }, [fetchSalesTransactions]);

  // Handle Preset Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff)).toISOString().slice(0, 10);
      setDateFrom(monday);
      setDateTo(today);
    } else if (preset === 'this_month') {
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setDateFrom(startOfMonth);
      setDateTo(today);
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((t) => {
        const vNo = (t.voucherNo || '').toLowerCase();
        const cName = (t.customerName || t.customer?.name || '').toLowerCase();
        const ref = (t.reference || '').toLowerCase();
        const pBy = (t.performedBy?.name || '').toLowerCase();
        const matchItem = Array.isArray(t.items) && t.items.some((it) => {
          const matName = (it.material?.name || '').toLowerCase();
          const matCode = (it.material?.code || '').toLowerCase();
          return matName.includes(q) || matCode.includes(q);
        });
        return vNo.includes(q) || cName.includes(q) || ref.includes(q) || pBy.includes(q) || matchItem;
      });
    }

    // Payment Type filter
    if (paymentFilter !== 'all') {
      list = list.filter((t) => {
        if (paymentFilter === 'cash_sale') {
          return t.voucherType === 'cash_sale' || t.voucherType === 'cash_sales';
        }
        if (paymentFilter === 'credit_sale') {
          return t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales';
        }
        return true;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((t) => (t.status || 'pending').toLowerCase() === statusFilter.toLowerCase());
    }

    // Date range filter
    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() <= toTime);
    }

    // Sorting
    list.sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = new Date(a.date || a.createdAt).getTime();
        valB = new Date(b.date || b.createdAt).getTime();
      } else if (sortField === 'voucherNo') {
        valA = (a.voucherNo || '').toLowerCase();
        valB = (b.voucherNo || '').toLowerCase();
      } else if (sortField === 'customer') {
        valA = (a.customerName || a.customer?.name || '').toLowerCase();
        valB = (b.customerName || b.customer?.name || '').toLowerCase();
      } else if (sortField === 'amount') {
        valA = Number(a.totalRevenue || a.totalAmount || 0);
        valB = Number(b.totalRevenue || b.totalAmount || 0);
      } else if (sortField === 'quantity') {
        valA = Array.isArray(a.items) ? a.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : Number(a.quantity || 0);
        valB = Array.isArray(b.items) ? b.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : Number(b.quantity || 0);
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [transactions, search, paymentFilter, statusFilter, dateFrom, dateTo, sortField, sortAsc]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalItemsSold = 0;
    let cashCount = 0;
    let cashRevenue = 0;
    let creditCount = 0;
    let creditRevenue = 0;
    let pendingCount = 0;
    let approvedOrPostedCount = 0;

    filteredTransactions.forEach((t) => {
      const rev = Number(t.totalRevenue || t.totalAmount || 0);
      totalRevenue += rev;

      const qty = Array.isArray(t.items) && t.items.length > 0
        ? t.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
        : Number(t.quantity || 0);
      totalItemsSold += qty;

      const isCash = t.voucherType === 'cash_sale' || t.voucherType === 'cash_sales';
      if (isCash) {
        cashCount += 1;
        cashRevenue += rev;
      } else {
        creditCount += 1;
        creditRevenue += rev;
      }

      const st = (t.status || 'pending').toLowerCase();
      if (st === 'pending') {
        pendingCount += 1;
      } else if (['approved', 'posted'].includes(st)) {
        approvedOrPostedCount += 1;
      }
    });

    return {
      totalVouchers: filteredTransactions.length,
      totalRevenue,
      totalItemsSold,
      cashCount,
      cashRevenue,
      creditCount,
      creditRevenue,
      pendingCount,
      approvedOrPostedCount,
    };
  }, [filteredTransactions]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Sort toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No sales transactions available to export.');
      return;
    }

    const headers = [
      'Voucher No',
      'Date',
      'Customer Name',
      'Payment Type',
      'Settlement Status',
      'Transaction Status',
      'Items Count',
      'Items Summary',
      'Total Quantity',
      'Subtotal (ETB)',
      'VAT Amount (ETB)',
      'Total Amount (ETB)',
      'Billed By',
      'Store Location',
    ];

    const rows = filteredTransactions.map((t) => {
      const isCredit = t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales';
      const itemsList = Array.isArray(t.items)
        ? t.items.map((i) => `${i.material?.name || 'Item'} (${i.quantity} ${i.uom || 'Pcs'})`).join('; ')
        : `${t.material?.name || 'Item'} (${t.quantity})`;
      const totalQty = Array.isArray(t.items)
        ? t.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
        : Number(t.quantity || 0);

      return [
        `"${t.voucherNo || ''}"`,
        `"${t.date ? new Date(t.date).toLocaleString() : ''}"`,
        `"${t.customerName || t.customer?.name || 'Walk-in Customer'}"`,
        `"${isCredit ? 'Credit Sale' : 'Cash Sale'}"`,
        `"${t.paymentStatus || (isCredit ? 'unpaid' : 'paid')}"`,
        `"${t.status || 'pending'}"`,
        Array.isArray(t.items) ? t.items.length : 1,
        `"${itemsList.replace(/"/g, '""')}"`,
        totalQty,
        Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0).toFixed(2),
        Number(t.vatAmount || 0).toFixed(2),
        Number(t.totalRevenue || t.totalAmount || 0).toFixed(2),
        `"${t.performedBy?.name || 'System'}"`,
        `"${t.storeLocation || t.consigneeUnit || 'Main Store'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Sales_Marketing_Voucher_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* ── 1. Top Header Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                <Layers size={12} className="text-blue-400" />
                Sub System
              </span>
              <span className="text-xs text-slate-400">· Official Audit &amp; Transaction Report</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Receipt className="text-emerald-400" size={26} />
              <span>Sales &amp; Marketing Voucher Report</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Comprehensive operational report displaying all sales vouchers performed across Cash Sales and Credit Sales orders, including line items, quantities, fiscal amounts, customer settlements, and verification workflow statuses.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={fetchSalesTransactions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm"
              title="Refresh sales voucher data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : 'text-slate-400'} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition active:scale-95"
              title="Export report to CSV / Excel spreadsheet"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition active:scale-95"
              title="Print standard report view"
            >
              <Printer size={14} />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Metric / Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Sales Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatETB(summaryMetrics.totalRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Across <span className="font-bold text-slate-700">{summaryMetrics.totalVouchers}</span> sales vouchers
          </p>
        </div>

        {/* Total Units / Items Sold */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Units Sold
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {summaryMetrics.totalItemsSold.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Combined quantity of finished goods billed
          </p>
        </div>

        {/* Cash Sales Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Counter Cash Sales
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatETB(summaryMetrics.cashRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-bold text-emerald-800">{summaryMetrics.cashCount}</span> cash invoices settled
          </p>
        </div>

        {/* Credit Sales Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Credit Sales Orders
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-amber-700 tracking-tight">
              {formatETB(summaryMetrics.creditRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-bold text-amber-800">{summaryMetrics.creditCount}</span> credit invoices recorded
          </p>
        </div>
      </div>

      {/* ── 3. Filters & Search Control Bar ── */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Voucher #, Customer Name, Item, or Reference..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          {/* Payment Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Payment Type
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Payment Types</option>
              <option value="cash_sale">Cash Sales (Counter Settlement)</option>
              <option value="credit_sale">Credit Sales (Receivable Invoice)</option>
            </select>
          </div>

          {/* Transaction Status */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Workflow Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending (Awaiting Approval)</option>
              <option value="checked">Checked (Reviewed)</option>
              <option value="approved">Approved (Stock Deducted)</option>
              <option value="posted">Posted (Finalized)</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Main Vouchers Data Table ── */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('voucherNo')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Voucher #</span>
                    <ArrowUpDown size={12} className={sortField === 'voucherNo' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Date &amp; Time</span>
                    <ArrowUpDown size={12} className={sortField === 'date' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customer')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown size={12} className={sortField === 'customer' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="py-3 px-3">Line Items Summary</th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total Qty</span>
                    <ArrowUpDown size={12} className={sortField === 'quantity' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Sub Total</th>
                <th className="py-3 px-3 text-right">15% VAT</th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Grand Total</span>
                    <ArrowUpDown size={12} className={sortField === 'amount' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Payment Type</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading Sales &amp; Marketing vouchers...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No sales vouchers found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting the date range, status, or search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((sale) => {
                  const isCredit = sale.voucherType === 'credit_sale' || sale.voucherType === 'credit_sales';
                  const itemsCount = Array.isArray(sale.items) ? sale.items.length : 1;
                  const totalQty = Array.isArray(sale.items)
                    ? sale.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
                    : Number(sale.quantity || 0);

                  const firstItem = Array.isArray(sale.items) && sale.items[0]?.material
                    ? sale.items[0].material.name
                    : (sale.material?.name || 'Item');

                  return (
                    <tr
                      key={sale._id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => {
                        setSelectedVoucher(sale);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* Voucher No */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700">
                          <span>{sale.voucherNo || '—'}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {sale.date
                          ? new Date(sale.date).toLocaleString([], {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : '—'}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3">
                        <div className="min-w-[140px]">
                          <p className="font-semibold text-slate-900 truncate">
                            {sale.customerName || sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          {sale.customerPhone && (
                            <p className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</p>
                          )}
                        </div>
                      </td>

                      {/* Line Items Summary */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <p className="truncate font-medium text-slate-800">
                          {firstItem}
                          {itemsCount > 1 && (
                            <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200/60">
                              +{itemsCount - 1} more
                            </span>
                          )}
                        </p>
                      </td>

                      {/* Total Qty */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {totalQty}
                      </td>

                      {/* Sub Total */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {Number(sale.subTotal || sale.taxableAmount || (sale.totalAmount - (sale.vatAmount || 0)) || 0).toFixed(2)}
                      </td>

                      {/* VAT Amount */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {Number(sale.vatAmount || 0).toFixed(2)}
                      </td>

                      {/* Grand Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                        {formatETB(sale.totalRevenue || sale.totalAmount)}
                      </td>

                      {/* Payment Type & Settlement */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCredit
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {isCredit ? <CreditCard size={10} /> : <ShoppingBag size={10} />}
                            {isCredit ? 'Credit Sale' : 'Cash Sale'}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {sale.paymentStatus || (isCredit ? 'unpaid' : 'paid')}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <WorkflowBadge status={sale.status || 'pending'} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoucher(sale);
                              setDetailModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                            title="View full voucher details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForPrint(sale);
                              setThermalModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                            title="Print fiscal thermal slip"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredTransactions.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(page * pageSize, filteredTransactions.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{filteredTransactions.length}</span> vouchers
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              <span className="px-2 font-mono font-bold text-slate-800">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Modal: Voucher Breakdown & Audit Details ── */}
      {detailModalOpen && selectedVoucher && (
        <Modal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Sales Voucher Details — ${selectedVoucher.voucherNo || ''}`}
          width="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status & Metadata */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voucher Type</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-sm text-slate-900">
                    {selectedVoucher.voucherType === 'credit_sale' ? 'Credit Sales Order' : 'Cash Sales Invoice'}
                  </span>
                  <WorkflowBadge status={selectedVoucher.status || 'pending'} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Issued Date &amp; Time</p>
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

            {/* Customer & Settlement Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200">
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <User size={13} className="text-blue-600" />
                  <span>Customer Profile</span>
                </h4>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedVoucher.customerName || selectedVoucher.customer?.name || 'Walk-in Customer'}
                </p>
                {selectedVoucher.customerPhone && (
                  <p className="text-slate-500 mt-0.5">Phone: {selectedVoucher.customerPhone}</p>
                )}
                {selectedVoucher.customerAddress && (
                  <p className="text-slate-500">Address: {selectedVoucher.customerAddress}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <CreditCard size={13} className="text-amber-600" />
                  <span>Settlement Terms</span>
                </h4>
                <p className="text-slate-700">
                  <span className="font-semibold">Payment Status: </span>
                  <span className="font-bold capitalize text-slate-900">{selectedVoucher.paymentStatus || 'Paid'}</span>
                </p>
                {selectedVoucher.dueDate && (
                  <p className="text-slate-700">
                    <span className="font-semibold">Due Date: </span>
                    <span className="font-mono">{new Date(selectedVoucher.dueDate).toLocaleDateString()}</span>
                  </p>
                )}
                {selectedVoucher.storeLocation && (
                  <p className="text-slate-700">
                    <span className="font-semibold">Store Dispatch: </span>
                    <span>{selectedVoucher.storeLocation}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Receipt size={14} className="text-blue-600" />
                <span>Billed Finished Goods &amp; Merchandise</span>
              </h4>
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
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(selectedVoucher.items) && selectedVoucher.items.length > 0 ? (
                      selectedVoucher.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <p className="font-semibold text-slate-900">{it.material?.name || `Item #${idx + 1}`}</p>
                            {it.material?.code && (
                              <p className="text-[10px] font-mono text-slate-400">{it.material.code}</p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                            {it.uom || it.material?.unit || 'Pcs'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {it.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatETB(it.sellingPrice || it.unitCost || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                            {formatETB(Number(it.quantity) * Number(it.sellingPrice || it.unitCost || 0))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-900">{selectedVoucher.material?.name || 'Item'}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">{selectedVoucher.material?.unit || 'Pcs'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{selectedVoucher.quantity || 1}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{formatETB(selectedVoucher.unitCost || 0)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">{formatETB(selectedVoucher.totalRevenue || selectedVoucher.totalAmount || 0)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right text-slate-600">
                        Subtotal (Tax Exclusive):
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900">
                        {formatETB(selectedVoucher.subTotal || (selectedVoucher.totalAmount - (selectedVoucher.vatAmount || 0)))}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-1.5 px-3 text-right text-slate-600">
                        15% Value Added Tax (VAT):
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-900">
                        {formatETB(selectedVoucher.vatAmount || 0)}
                      </td>
                    </tr>
                    <tr className="text-sm">
                      <td colSpan={4} className="py-2 px-3 text-right text-slate-950">
                        Official Grand Total:
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                        {formatETB(selectedVoucher.totalRevenue || selectedVoucher.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Audit Sign-off History */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Operational Sign-off Chain:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-slate-400">Created By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.performedBy?.name || 'System'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Checked By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.checkedBy?.name || 'Pending'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Approved By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.approvedBy?.name || 'Pending'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Posted By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.postedBy?.name || 'Pending'}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition"
              >
                <Printer size={14} />
                <span>Print Fiscal Slip &amp; Export</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 6. Modal: Thermal Bill & Fiscal Multi-Export ── */}
      {thermalModalOpen && selectedForPrint && (
        <ThermalBillModal
          open={thermalModalOpen}
          onClose={() => setThermalModalOpen(false)}
          sale={selectedForPrint}
        />
      )}
    </div>
  );
}

