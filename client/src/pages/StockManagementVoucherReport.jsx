import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import WorkflowBadge from '../components/ui/WorkflowBadge';
import {
  Boxes,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Truck,
  RotateCcw,
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
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Package,
  SlidersHorizontal,
  ClipboardList,
} from 'lucide-react';

const formatETB = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function StockManagementVoucherReport() {
  const { user, isDeveloper, isAdmin, companyInfo } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── 10 Required Report Filters ──
  const [filterVoucherNo, setFilterVoucherNo] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterVoucherType, setFilterVoucherType] = useState('all'); // 'all' | 'cash_grv' | 'credit_grv' | 'pos_adjustment' | 'neg_adjustment' | 'inventory_count' | 'inventory_closing' | 'disposal'
  const [filterStore, setFilterStore] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterItemQuery, setFilterItemQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPreparedBy, setFilterPreparedBy] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'checked' | 'approved' | 'posted' | 'voided'
  const [filterBranch, setFilterBranch] = useState('all');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Set default date range on initial mount
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setDateFrom(startOfMonth);
    setDateTo(today);
  }, []);

  // Fetch Stock Transactions (CGRV, CRGV, PSAV, NSAV, Inventory Count, Inventory Closing)
  const fetchStockTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/transactions', {
        params: {
          voucherType: 'stock',
        },
      });
      const raw = Array.isArray(res.data) ? res.data : [];

      // Deduplicate transactions by _id and voucherNo to prevent duplicates
      const seenIds = new Set();
      const seenVoucherNos = new Set();
      const deduplicated = [];

      for (const t of raw) {
        if (!t) continue;
        const idKey = t._id ? String(t._id) : null;
        const vKey = t.voucherNo ? String(t.voucherNo).trim().toLowerCase() : null;

        if (idKey && seenIds.has(idKey)) continue;
        if (vKey && seenVoucherNos.has(vKey)) continue;

        if (idKey) seenIds.add(idKey);
        if (vKey) seenVoucherNos.add(vKey);
        deduplicated.push(t);
      }

      setTransactions(deduplicated);
    } catch (err) {
      console.error('Failed to fetch stock transactions:', err);
      setError(err.response?.data?.message || 'Could not load stock vouchers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockTransactions();
  }, [fetchStockTransactions]);

  // Handle Preset Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yDate = yest.toISOString().slice(0, 10);
      setDateFrom(yDate);
      setDateTo(yDate);
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
    setPage(1);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setFilterVoucherNo('');
    setFilterVoucherType('all');
    setFilterStore('all');
    setFilterSupplier('all');
    setFilterItemQuery('');
    setFilterCategory('all');
    setFilterPreparedBy('all');
    setFilterStatus('all');
    setFilterBranch('all');
    handlePresetChange('this_month');
    setPage(1);
  };

  // Dynamic filter options extracted from live records
  const dynamicOptions = useMemo(() => {
    const stores = new Set();
    const suppliers = new Set();
    const categories = new Set();
    const users = new Set();
    const branches = new Set();

    transactions.forEach((t) => {
      const store = t.storeLocation || t.consigneeUnit;
      if (store && store.trim()) {
        stores.add(store.trim());
        branches.add(store.trim());
      }

      const supp = t.supplier?.name || t.supplierName;
      if (supp && supp.trim()) suppliers.add(supp.trim());

      const u = t.performedBy?.name || t.employeeName || t.createdByName;
      if (u && u.trim()) users.add(u.trim());

      if (Array.isArray(t.items)) {
        t.items.forEach((it) => {
          const cat = it.category || it.material?.category;
          if (cat && cat.trim()) categories.add(cat.trim());
          if (it.storeLocation && it.storeLocation.trim()) {
            stores.add(it.storeLocation.trim());
          }
        });
      } else if (t.material?.category) {
        categories.add(t.material.category.trim());
      }
    });

    return {
      stores: Array.from(stores).sort(),
      suppliers: Array.from(suppliers).sort(),
      categories: Array.from(categories).sort(),
      users: Array.from(users).sort(),
      branches: Array.from(branches).sort(),
    };
  }, [transactions]);

  // Voucher Type Metadata & Badges
  const getVoucherTypeMeta = (vType, docType) => {
    switch (vType) {
      case 'cash_grv':
        return { label: 'Cash GRV (CGRV)', short: 'CGRV', direction: 'in', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'credit_grv':
        return { label: 'Credit GRV (CRGV)', short: 'CRGV', direction: 'in', badge: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'pos_adjustment':
      case 'psav':
        return { label: 'Positive Adjustment (PSAV)', short: 'PSAV', direction: 'in', badge: 'bg-teal-100 text-teal-900 border-teal-300' };
      case 'neg_adjustment':
      case 'nsav':
        return { label: 'Negative Adjustment (NSAV)', short: 'NSAV', direction: 'out', badge: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'inventory_count':
        return { label: 'Inventory Count', short: 'COUNT', direction: docType || 'in', badge: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'inventory_closing':
        return { label: 'Inventory Closing', short: 'CLOSING', direction: docType || 'in', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'disposal':
        return { label: 'Goods Disposal (GDV)', short: 'GDV', direction: 'out', badge: 'bg-orange-100 text-orange-900 border-orange-300' };
      case 'fresh_bazaar':
        return { label: 'Fresh Bazaar Receiving', short: 'FBRV', direction: 'in', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      default:
        return { label: vType?.toUpperCase() || 'Stock Voucher', short: 'STK', direction: docType || 'in', badge: 'bg-slate-100 text-slate-900 border-slate-300' };
    }
  };

  // Helper: Extract clean row data for display and exports
  const getRowData = (t) => {
    const vMeta = getVoucherTypeMeta(t.voucherType, t.type);
    const voucherNumber = t.voucherNo || '—';
    const issuedDate = t.date ? new Date(t.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
    const store = t.storeLocation || t.consigneeUnit || 'Main Store';
    const supplier = t.supplier?.name || t.supplierName || (vMeta.direction === 'in' && ['cash_grv', 'credit_grv'].includes(t.voucherType) ? 'Supplier' : 'Internal');

    // Items details
    const items = Array.isArray(t.items) && t.items.length > 0 ? t.items : (t.material ? [{ material: t.material, quantity: t.quantity, uom: t.uom, unitCost: t.unitCost }] : []);
    const itemsCount = items.length;
    const firstItem = items[0]?.material || {};
    const itemCode = firstItem.code || t.material?.code || (itemsCount > 1 ? `Multi (${itemsCount})` : '—');
    const itemName = firstItem.name || t.material?.name || 'Stock Item';
    const uom = items[0]?.uom || firstItem.unit || t.uom || t.material?.unit || 'Pcs';

    // Quantities calculation according to voucher direction
    const rawQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || Number(t.quantity || 0);
    const isOutward = vMeta.direction === 'out' || t.type === 'out';
    const qtyIn = isOutward ? 0 : rawQty;
    const qtyOut = isOutward ? rawQty : 0;

    // Financial valuation
    const unitPrice = Number(items[0]?.unitCost || firstItem.unitCost || t.unitCost || 0);
    const totalAmount = Number(t.totalAmount || t.totalRevenue || (rawQty * unitPrice) || 0);

    const preparedBy = t.performedBy?.name || t.employeeName || t.createdByName || 'System';
    const approvedBy = t.approvedBy?.name || (t.status === 'approved' || t.status === 'posted' ? 'Approved' : 'Pending');
    const lastState = t.isVoided || t.deletedAt ? 'voided' : (t.status || 'pending');

    return {
      voucherNumber,
      issuedDate,
      voucherType: vMeta.label,
      voucherTypeShort: vMeta.short,
      voucherTypeBadge: vMeta.badge,
      direction: isOutward ? 'out' : 'in',
      store,
      supplier,
      itemCode,
      itemName,
      itemsCount,
      itemsFull: items.map((i) => `${i.material?.name || 'Item'} (${i.quantity} ${i.uom || 'Pcs'})`).join(', '),
      uom,
      qtyIn,
      qtyOut,
      unitPrice,
      totalAmount,
      preparedBy,
      approvedBy,
      lastState,
      branch: store,
    };
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // 1. Voucher Number filter
    if (filterVoucherNo.trim()) {
      const q = filterVoucherNo.toLowerCase().trim();
      list = list.filter((t) => (t.voucherNo || '').toLowerCase().includes(q));
    }

    // 2. Date Range filter
    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
      list = list.filter((t) => new Date(t.date || t.createdAt).getTime() <= toTime);
    }

    // 3. Voucher Type filter
    if (filterVoucherType !== 'all') {
      list = list.filter((t) => {
        if (filterVoucherType === 'cash_grv') return t.voucherType === 'cash_grv';
        if (filterVoucherType === 'credit_grv') return t.voucherType === 'credit_grv';
        if (filterVoucherType === 'pos_adjustment') return t.voucherType === 'pos_adjustment' || t.voucherType === 'psav';
        if (filterVoucherType === 'neg_adjustment') return t.voucherType === 'neg_adjustment' || t.voucherType === 'nsav';
        if (filterVoucherType === 'inventory_count') return t.voucherType === 'inventory_count';
        if (filterVoucherType === 'inventory_closing') return t.voucherType === 'inventory_closing';
        if (filterVoucherType === 'disposal') return t.voucherType === 'disposal';
        return t.voucherType === filterVoucherType;
      });
    }

    // 4. Store / Warehouse filter
    if (filterStore !== 'all') {
      list = list.filter((t) => {
        const store = t.storeLocation || t.consigneeUnit || '';
        const matchItemStore = Array.isArray(t.items) && t.items.some((i) => (i.storeLocation || '').trim() === filterStore.trim());
        return store.trim() === filterStore.trim() || matchItemStore;
      });
    }

    // 5. Supplier filter
    if (filterSupplier !== 'all') {
      list = list.filter((t) => {
        const supp = t.supplier?.name || t.supplierName || '';
        return supp.trim() === filterSupplier.trim();
      });
    }

    // 6. Item Code / Item Name filter
    if (filterItemQuery.trim()) {
      const iq = filterItemQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const directName = (t.material?.name || '').toLowerCase();
        const directCode = (t.material?.code || '').toLowerCase();
        const matchLines = Array.isArray(t.items) && t.items.some((i) => {
          const mName = (i.material?.name || '').toLowerCase();
          const mCode = (i.material?.code || '').toLowerCase();
          return mName.includes(iq) || mCode.includes(iq);
        });
        return directName.includes(iq) || directCode.includes(iq) || matchLines;
      });
    }

    // 7. Category filter
    if (filterCategory !== 'all') {
      list = list.filter((t) => {
        const directCat = (t.material?.category || '').trim();
        const matchLineCat = Array.isArray(t.items) && t.items.some((i) => (i.category || i.material?.category || '').trim() === filterCategory.trim());
        return directCat === filterCategory.trim() || matchLineCat;
      });
    }

    // 8. Prepared By filter
    if (filterPreparedBy !== 'all') {
      list = list.filter((t) => {
        const un = t.performedBy?.name || t.employeeName || t.createdByName || '';
        return un.trim() === filterPreparedBy.trim();
      });
    }

    // 9. Voucher Status filter
    if (filterStatus !== 'all') {
      list = list.filter((t) => {
        if (filterStatus === 'voided') {
          return Boolean(t.isVoided || t.deletedAt || (t.status || '').toLowerCase() === 'voided');
        }
        return (t.status || 'pending').toLowerCase() === filterStatus.toLowerCase();
      });
    }

    // 10. Branch filter
    if (filterBranch !== 'all') {
      list = list.filter((t) => {
        const br = t.storeLocation || t.consigneeUnit || '';
        return br.trim() === filterBranch.trim();
      });
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
      } else if (sortField === 'store') {
        valA = (a.storeLocation || a.consigneeUnit || '').toLowerCase();
        valB = (b.storeLocation || b.consigneeUnit || '').toLowerCase();
      } else if (sortField === 'amount') {
        valA = Number(a.totalAmount || a.totalRevenue || 0);
        valB = Number(b.totalAmount || b.totalRevenue || 0);
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
  }, [
    transactions,
    filterVoucherNo,
    dateFrom,
    dateTo,
    filterVoucherType,
    filterStore,
    filterSupplier,
    filterItemQuery,
    filterCategory,
    filterPreparedBy,
    filterStatus,
    filterBranch,
    sortField,
    sortAsc,
  ]);

  // Aggregate Metrics based on active filtered transactions
  const summaryMetrics = useMemo(() => {
    let totalQtyIn = 0;
    let totalQtyOut = 0;
    let totalValuation = 0;
    let inCount = 0;
    let outCount = 0;

    filteredTransactions.forEach((t) => {
      const row = getRowData(t);
      totalQtyIn += row.qtyIn;
      totalQtyOut += row.qtyOut;
      totalValuation += row.totalAmount;
      if (row.direction === 'in') inCount++;
      else outCount++;
    });

    return {
      totalVouchers: filteredTransactions.length,
      totalQtyIn,
      totalQtyOut,
      totalValuation,
      inCount,
      outCount,
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

  // ── Action: Export Excel / CSV ──
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('No stock vouchers available to export under active filters.');
      return;
    }

    const headers = [
      'Voucher Number',
      'Issued Date',
      'Voucher Type',
      'Store / Warehouse',
      'Supplier',
      'Item Code',
      'Item Name',
      'Line Items Details',
      'UOM',
      'Quantity In',
      'Quantity Out',
      'Unit Price (ETB)',
      'Total Amount (ETB)',
      'Prepared By',
      'Approved By',
      'Last State',
      'Branch',
    ];

    const rows = filteredTransactions.map((t) => {
      const d = getRowData(t);
      return [
        `"${d.voucherNumber}"`,
        `"${d.issuedDate}"`,
        `"${d.voucherType}"`,
        `"${d.store}"`,
        `"${d.supplier.replace(/"/g, '""')}"`,
        `"${d.itemCode}"`,
        `"${d.itemName.replace(/"/g, '""')}"`,
        `"${d.itemsFull.replace(/"/g, '""')}"`,
        `"${d.uom}"`,
        d.qtyIn,
        d.qtyOut,
        d.unitPrice.toFixed(2),
        d.totalAmount.toFixed(2),
        `"${d.preparedBy.replace(/"/g, '""')}"`,
        `"${d.approvedBy.replace(/"/g, '""')}"`,
        `"${d.lastState.toUpperCase()}"`,
        `"${d.branch}"`,
      ].join(',');
    });

    const totalsRow = [
      '"TOTALS / SUMMARY"',
      '""',
      `"${summaryMetrics.totalVouchers} Vouchers"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      summaryMetrics.totalQtyIn,
      summaryMetrics.totalQtyOut,
      '""',
      summaryMetrics.totalValuation.toFixed(2),
      '""',
      '""',
      '""',
      '""',
    ].join(',');

    const csvContent = '\uFEFF' + [headers.join(','), ...rows, '', totalsRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Management_Voucher_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Action: Export PDF & Print Report ──
  const handlePrintOrPdf = (isPdf = false) => {
    if (filteredTransactions.length === 0) {
      alert('No stock voucher records to print or export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up window blocked. Please allow popups to view the printable report.');
      return;
    }

    const rowsHtml = filteredTransactions
      .map((t) => {
        const d = getRowData(t);
        return `
        <tr>
          <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${d.voucherNumber}</td>
          <td style="white-space: nowrap;">${d.issuedDate}</td>
          <td><strong>${d.voucherType}</strong></td>
          <td>${d.store}</td>
          <td>${d.supplier}</td>
          <td style="font-family: monospace;">${d.itemCode}</td>
          <td>${d.itemName}</td>
          <td style="text-align: center;">${d.uom}</td>
          <td style="text-align: center; font-weight: bold; color: #047857;">${d.qtyIn > 0 ? d.qtyIn : '—'}</td>
          <td style="text-align: center; font-weight: bold; color: #be123c;">${d.qtyOut > 0 ? d.qtyOut : '—'}</td>
          <td style="text-align: right; font-family: monospace;">${d.unitPrice.toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">${d.totalAmount.toFixed(2)}</td>
          <td>${d.preparedBy}</td>
          <td>${d.approvedBy}</td>
          <td style="text-align: center; font-weight: bold; text-transform: uppercase;">${d.lastState}</td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isPdf ? 'Stock_Management_Voucher_Report.pdf' : 'Stock Management Voucher Report'}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #1f2937; margin: 0; padding: 15px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company-title { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
            .report-title { font-size: 14px; font-weight: bold; color: #1e40af; margin-top: 4px; }
            .meta-box { font-size: 9px; color: #4b5563; text-align: right; }
            .filter-banner { background: #f1f5f9; padding: 6px 10px; border-radius: 4px; margin-bottom: 10px; font-size: 9px; display: flex; flex-wrap: wrap; gap: 12px; }
            .kpi-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
            .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: #fafafa; }
            .kpi-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 13px; font-weight: bold; color: #0f172a; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
            th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 5px 4px; text-align: left; font-weight: bold; color: #334155; }
            td { border: 1px solid #e2e8f0; padding: 4px 4px; }
            tr:nth-child(even) { background: #f8fafc; }
            tfoot td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 9px; }
            .sig-line { width: 180px; border-top: 1px dashed #64748b; text-align: center; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="company-title">${companyInfo?.companyName || 'Sharp Plus Trading'}</h1>
              <div class="report-title">Stock Management Voucher Report (Sub System Audit)</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Complete register across CGRV, CRGV, PSAV, NSAV, Inventory Counts &amp; Closings</div>
            </div>
            <div class="meta-box">
              <div><strong>Generated Date:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Generated By:</strong> ${user?.name || 'Administrator'} (${user?.role || 'Staff'})</div>
              <div><strong>Vouchers Count:</strong> ${filteredTransactions.length} records</div>
            </div>
          </div>

          <div class="filter-banner">
            <div><strong>Date Range:</strong> ${dateFrom || 'Start'} to ${dateTo || 'Present'}</div>
            <div><strong>Voucher Type:</strong> ${filterVoucherType.toUpperCase()}</div>
            <div><strong>Store / Warehouse:</strong> ${filterStore}</div>
            <div><strong>Status:</strong> ${filterStatus.toUpperCase()}</div>
            <div><strong>Branch:</strong> ${filterBranch}</div>
          </div>

          <div class="kpi-cards">
            <div class="kpi">
              <div class="kpi-label">Total Inward Quantity</div>
              <div class="kpi-value" style="color: #047857;">+${summaryMetrics.totalQtyIn.toLocaleString()}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Total Outward Quantity</div>
              <div class="kpi-value" style="color: #be123c;">-${summaryMetrics.totalQtyOut.toLocaleString()}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Total Stock Valuation</div>
              <div class="kpi-value">${formatETB(summaryMetrics.totalValuation)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Total Vouchers Processed</div>
              <div class="kpi-value">${summaryMetrics.totalVouchers}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Issued Date</th>
                <th>Voucher Type</th>
                <th>Store</th>
                <th>Supplier</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th style="text-align: center;">UOM</th>
                <th style="text-align: center;">Qty In</th>
                <th style="text-align: center;">Qty Out</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total Amount</th>
                <th>Prepared By</th>
                <th>Approved By</th>
                <th style="text-align: center;">State</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="8" style="text-align: right;">SUMMARY TOTALS (${summaryMetrics.totalVouchers} Vouchers):</td>
                <td style="text-align: center; color: #047857;">+${summaryMetrics.totalQtyIn.toLocaleString()}</td>
                <td style="text-align: center; color: #be123c;">-${summaryMetrics.totalQtyOut.toLocaleString()}</td>
                <td></td>
                <td style="text-align: right; font-family: monospace;">${summaryMetrics.totalValuation.toFixed(2)}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-sig">
            <div class="sig-line">Prepared By (Storekeeper)</div>
            <div class="sig-line">Verified By (Warehouse Supervisor)</div>
            <div class="sig-line">Approved By (Operations / Finance Manager)</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ── 1. Top Header Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-blue-950 p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-400/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                <Layers size={12} className="text-teal-400" />
                Sub System → Stock Management System
              </span>
              <span className="text-xs text-slate-400">· Official Inventory Movement &amp; Voucher Register</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Boxes className="text-teal-400" size={26} />
              <span>Stock Management Voucher Report</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Comprehensive stock movement ledger displaying all inventory vouchers across Cash Goods Receiving (CGRV), Credit Goods Receiving (CRGV), Positive Stock Adjustment (PSAV), Negative Stock Adjustment (NSAV), Inventory Counts, and Inventory Closings.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={fetchStockTransactions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition active:scale-95 shadow-sm"
              title="Refresh stock voucher data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-teal-400' : 'text-slate-400'} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition active:scale-95"
              title="Export report to Excel / CSV"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintOrPdf(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md transition active:scale-95"
              title="Export formatted PDF"
            >
              <FileText size={14} />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintOrPdf(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-md transition active:scale-95"
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
        {/* Total Stock In Quantity */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Inward Stock
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              +{summaryMetrics.totalQtyIn.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Across <span className="font-bold text-emerald-800">{summaryMetrics.inCount}</span> inward vouchers (CGRV / CRGV / PSAV)
          </p>
        </div>

        {/* Total Stock Out Quantity */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Outward Stock
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-rose-700 tracking-tight">
              -{summaryMetrics.totalQtyOut.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Across <span className="font-bold text-rose-800">{summaryMetrics.outCount}</span> outward vouchers (NSAV / Disposal)
          </p>
        </div>

        {/* Total Valuation */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filtered Movement Valuation
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatETB(summaryMetrics.totalValuation)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Combined cost value of all filtered transactions
          </p>
        </div>

        {/* Total Vouchers Processed */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Stock Vouchers
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-teal-800 tracking-tight">
              {summaryMetrics.totalVouchers}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Audit-ready stock transactions on record
          </p>
        </div>
      </div>

      {/* ── 3. Filters & Search Control Bar (10 Filters) ── */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Stock Report Filters &amp; Query Controls
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {filteredTransactions.length} of {transactions.length} matched
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => setPage(1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white transition shadow-xs"
            >
              <Search size={12} />
              <span>Show / Search</span>
            </button>
          </div>
        </div>

        {/* Row 1: Voucher Number & Date Range */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* 1. Voucher Number */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              1. Voucher Number
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={filterVoucherNo}
                onChange={(e) => {
                  setFilterVoucherNo(e.target.value);
                  setPage(1);
                }}
                placeholder="Search voucher # (e.g. CGRV-0001, PSAV-001)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none transition"
              />
              {filterVoucherNo && (
                <button
                  type="button"
                  onClick={() => setFilterVoucherNo('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Date Range: Presets + From / To */}
          <div className="lg:col-span-8 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                2. Date Range
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'all', label: 'All Time' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      datePreset === p.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset('custom');
                  setPage(1);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset('custom');
                  setPage(1);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Voucher Type, Store, Supplier, Item Code / Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* 3. Voucher Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              3. Voucher Type
            </label>
            <select
              value={filterVoucherType}
              onChange={(e) => {
                setFilterVoucherType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Voucher Types</option>
              <option value="cash_grv">Cash Goods Receiving Voucher (CGRV)</option>
              <option value="credit_grv">Credit Goods Receiving Voucher (CRGV)</option>
              <option value="pos_adjustment">Positive Stock Adjustment Voucher (PSAV)</option>
              <option value="neg_adjustment">Negative Stock Adjustment Voucher (NSAV)</option>
              <option value="inventory_count">Inventory Count</option>
              <option value="inventory_closing">Inventory Closing</option>
              <option value="disposal">Goods Disposal Voucher (GDV)</option>
            </select>
          </div>

          {/* 4. Store / Warehouse */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              4. Store / Warehouse
            </label>
            <select
              value={filterStore}
              onChange={(e) => {
                setFilterStore(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Stores</option>
              {dynamicOptions.stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Supplier */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              5. Supplier
            </label>
            <select
              value={filterSupplier}
              onChange={(e) => {
                setFilterSupplier(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Suppliers</option>
              {dynamicOptions.suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Item Code / Item Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              6. Item Code / Item Name
            </label>
            <input
              type="text"
              value={filterItemQuery}
              onChange={(e) => {
                setFilterItemQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by code or name..."
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Row 3: Category, Prepared By, Voucher Status, Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* 7. Category */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              7. Item Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Categories</option>
              {dynamicOptions.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 8. Prepared By / User */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              8. Prepared By / User
            </label>
            <select
              value={filterPreparedBy}
              onChange={(e) => {
                setFilterPreparedBy(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Users</option>
              {dynamicOptions.users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* 9. Voucher Status */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              9. Voucher Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending (Awaiting Review)</option>
              <option value="checked">Checked (Reviewed)</option>
              <option value="approved">Approved (Stock Deducted / Added)</option>
              <option value="posted">Posted (Finalized)</option>
              <option value="voided">Voided / Deleted</option>
            </select>
          </div>

          {/* 10. Branch */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              10. Branch
            </label>
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="all">All Branches</option>
              {dynamicOptions.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Main Report Data Grid (15 Columns + Actions) ── */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider select-none">
                {/* 1. Voucher Number */}
                <th
                  onClick={() => handleSort('voucherNo')}
                  className="py-3 px-2.5 cursor-pointer hover:text-teal-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Voucher #</span>
                    <ArrowUpDown size={11} className={sortField === 'voucherNo' ? 'text-teal-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 2. Issued Date */}
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-2.5 cursor-pointer hover:text-teal-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Issued Date</span>
                    <ArrowUpDown size={11} className={sortField === 'date' ? 'text-teal-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 3. Voucher Type */}
                <th className="py-3 px-2.5 whitespace-nowrap">Voucher Type</th>

                {/* 4. Store */}
                <th
                  onClick={() => handleSort('store')}
                  className="py-3 px-2.5 cursor-pointer hover:text-teal-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Store</span>
                    <ArrowUpDown size={11} className={sortField === 'store' ? 'text-teal-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 5. Supplier */}
                <th className="py-3 px-2.5 whitespace-nowrap">Supplier</th>

                {/* 6. Item Code */}
                <th className="py-3 px-2.5 whitespace-nowrap">Item Code</th>

                {/* 7. Item Name */}
                <th className="py-3 px-2.5 whitespace-nowrap">Item Name</th>

                {/* 8. UOM */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">UOM</th>

                {/* 9. Quantity In */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap text-emerald-700">
                  <span>Quantity In</span>
                </th>

                {/* 10. Quantity Out */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap text-rose-700">
                  <span>Quantity Out</span>
                </th>

                {/* 11. Unit Price */}
                <th className="py-3 px-2.5 text-right whitespace-nowrap">Unit Price</th>

                {/* 12. Total Amount */}
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-teal-700 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Amount</span>
                    <ArrowUpDown size={11} className={sortField === 'amount' ? 'text-teal-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 13. Prepared By */}
                <th className="py-3 px-2.5 whitespace-nowrap">Prepared By</th>

                {/* 14. Approved By */}
                <th className="py-3 px-2.5 whitespace-nowrap">Approved By</th>

                {/* 15. Last State */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Last State</th>

                {/* Actions */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-500" />
                    <span>Loading stock vouchers and transactions...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    <Boxes size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No stock vouchers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No stock records match the selected filter parameters. Try adjusting the date range or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const row = getRowData(tx);

                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-teal-50/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedVoucher(tx);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* 1. Voucher Number */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-teal-800 hover:underline">
                          {row.voucherNumber}
                        </span>
                      </td>

                      {/* 2. Issued Date */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {row.issuedDate}
                      </td>

                      {/* 3. Voucher Type */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.voucherTypeBadge}`}>
                          {row.voucherTypeShort}
                        </span>
                      </td>

                      {/* 4. Store */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-medium text-slate-800">
                        {row.store}
                      </td>

                      {/* 5. Supplier */}
                      <td className="py-2.5 px-2.5 max-w-[130px] truncate text-slate-700" title={row.supplier}>
                        {row.supplier}
                      </td>

                      {/* 6. Item Code */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {row.itemCode}
                      </td>

                      {/* 7. Item Name */}
                      <td className="py-2.5 px-2.5 max-w-[170px]">
                        <p className="truncate font-medium text-slate-900" title={row.itemsFull}>
                          {row.itemName}
                          {row.itemsCount > 1 && (
                            <span className="ml-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                              +{row.itemsCount - 1}
                            </span>
                          )}
                        </p>
                      </td>

                      {/* 8. UOM */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-600 text-[11px]">
                        {row.uom}
                      </td>

                      {/* 9. Quantity In */}
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold whitespace-nowrap">
                        {row.qtyIn > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                            +{row.qtyIn.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 10. Quantity Out */}
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold whitespace-nowrap">
                        {row.qtyOut > 0 ? (
                          <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
                            -{row.qtyOut.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 11. Unit Price */}
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {row.unitPrice.toFixed(2)}
                      </td>

                      {/* 12. Total Amount */}
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                        {formatETB(row.totalAmount)}
                      </td>

                      {/* 13. Prepared By */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-700">
                        {row.preparedBy}
                      </td>

                      {/* 14. Approved By */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-700">
                        {row.approvedBy}
                      </td>

                      {/* 15. Last State */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <WorkflowBadge status={row.lastState} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoucher(tx);
                              setDetailModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition"
                            title="View full voucher audit breakdown"
                          >
                            <Eye size={14} />
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
          title={`Stock Voucher Audit Breakdown — ${selectedVoucher.voucherNo || ''}`}
          width="max-w-4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header Metadata */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voucher Type &amp; Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-sm text-slate-900">
                    {getVoucherTypeMeta(selectedVoucher.voucherType, selectedVoucher.type).label}
                  </span>
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Valuation</p>
                <p className="font-mono font-black text-teal-800 text-base mt-0.5">
                  {formatETB(selectedVoucher.totalAmount || selectedVoucher.totalRevenue)}
                </p>
              </div>
            </div>

            {/* Warehouse, Supplier & Destination Profile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-white">
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <Warehouse size={13} className="text-teal-600" />
                  <span>Store / Warehouse</span>
                </h4>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedVoucher.storeLocation || selectedVoucher.consigneeUnit || 'Main Store'}
                </p>
                {selectedVoucher.destinationLocation && (
                  <p className="text-slate-500 mt-0.5">Transfer To: {selectedVoucher.destinationLocation}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <Truck size={13} className="text-blue-600" />
                  <span>Supplier / Source</span>
                </h4>
                <p className="font-bold text-slate-900">
                  {selectedVoucher.supplier?.name || selectedVoucher.supplierName || 'Internal Warehouse / Stock Adjustment'}
                </p>
                {selectedVoucher.supplier?.tin && (
                  <p className="text-slate-500 font-mono">TIN: {selectedVoucher.supplier.tin}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <FileText size={13} className="text-purple-600" />
                  <span>Reference &amp; Reason</span>
                </h4>
                <p className="text-slate-700">
                  <span className="font-semibold">Reference: </span>
                  <span className="font-mono">{selectedVoucher.reference || '—'}</span>
                </p>
                {selectedVoucher.reason && (
                  <p className="text-slate-600 mt-0.5">Reason: {selectedVoucher.reason}</p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Boxes size={14} className="text-teal-600" />
                <span>Line Items &amp; Physical Balance Specification</span>
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item / Description</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-center">UOM</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Line Valuation</th>
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
                          <td className="py-2 px-3 text-slate-600">
                            {it.category || it.material?.category || 'General'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                            {it.uom || it.material?.unit || 'Pcs'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {it.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatETB(it.unitCost || it.material?.unitCost || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                            {formatETB(Number(it.quantity) * Number(it.unitCost || it.material?.unitCost || 0))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-900">{selectedVoucher.material?.name || 'Stock Item'}</td>
                        <td className="py-2 px-3 text-slate-600">{selectedVoucher.material?.category || 'General'}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">{selectedVoucher.uom || selectedVoucher.material?.unit || 'Pcs'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{selectedVoucher.quantity || 1}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{formatETB(selectedVoucher.unitCost || 0)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">{formatETB(selectedVoucher.totalAmount || 0)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <tr className="text-sm">
                      <td colSpan={5} className="py-2 px-3 text-right text-slate-950">
                        Total Transaction Valuation:
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-teal-800">
                        {formatETB(selectedVoucher.totalAmount || selectedVoucher.totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Operational Sign-off & Audit Trail */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Operational Sign-off &amp; Audit Trail:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-slate-400">Prepared By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.performedBy?.name || selectedVoucher.employeeName || selectedVoucher.createdByName || 'System'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Checked By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.checkedBy?.name || 'Pending'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Approved By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.approvedBy?.name || (selectedVoucher.status === 'approved' || selectedVoucher.status === 'posted' ? 'Approved' : 'Pending')}</p>
                </div>
                <div>
                  <span className="text-slate-400">Posted By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.postedBy?.name || (selectedVoucher.status === 'posted' ? 'Posted' : 'Pending')}</p>
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
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
