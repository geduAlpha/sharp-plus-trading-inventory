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
  RotateCcw,
  Monitor,
  Hash,
  Percent,
  SlidersHorizontal,
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

  // ── 10 Required Report Filters ──
  const [filterVoucherCode, setFilterVoucherCode] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSalesType, setFilterSalesType] = useState('all'); // 'all' | 'cash_sale' | 'credit_sale' | 'zeroing' | 'sales_import'
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterTin, setFilterTin] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterDevice, setFilterDevice] = useState('all');
  const [filterUserName, setFilterUserName] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'checked' | 'approved' | 'posted' | 'voided'
  const [filterFsNo, setFilterFsNo] = useState('');

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
          voucherType: 'sales', // Backend handles ['cash_sale', 'credit_sale', 'cash_sales', 'credit_sales', 'zeroing', 'sales_import']
        },
      });
      const raw = Array.isArray(res.data) ? res.data : [];

      // Avoid duplicate transactions when combining different sales voucher types
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
    setFilterVoucherCode('');
    setFilterSalesType('all');
    setFilterCustomer('all');
    setFilterTin('');
    setFilterBranch('all');
    setFilterDevice('all');
    setFilterUserName('all');
    setFilterStatus('all');
    setFilterFsNo('');
    handlePresetChange('this_month');
    setPage(1);
  };

  // Distinct options extracted dynamically from live records
  const dynamicFilterOptions = useMemo(() => {
    const customers = new Set();
    const branches = new Set();
    const devices = new Set();
    const userNames = new Set();

    transactions.forEach((t) => {
      const cust = t.customerName || t.customer?.name;
      if (cust && cust.trim()) customers.add(cust.trim());

      const br = t.storeLocation || t.consigneeUnit;
      if (br && br.trim()) branches.add(br.trim());

      const dev = t.deviceName || t.device;
      if (dev && dev.trim()) devices.add(dev.trim());

      const un = t.performedBy?.name || t.employeeName || t.createdByName;
      if (un && un.trim()) userNames.add(un.trim());
    });

    return {
      customers: Array.from(customers).sort(),
      branches: Array.from(branches).sort(),
      devices: Array.from(devices).sort(),
      userNames: Array.from(userNames).sort(),
    };
  }, [transactions]);

  // Helper to extract clean voucher type details
  const getVoucherTypeMeta = (vType) => {
    switch (vType) {
      case 'credit_sale':
      case 'credit_sales':
        return { label: 'Credit Sales Voucher', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'zeroing':
        return { label: 'Zeroing Voucher', badge: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'sales_import':
        return { label: 'Sales Import / POS', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' };
      case 'cash_sale':
      case 'cash_sales':
      default:
        return { label: 'Cash Sales Voucher', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // 1. Voucher Code filter
    if (filterVoucherCode.trim()) {
      const q = filterVoucherCode.toLowerCase().trim();
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

    // 3. Sales Type filter
    if (filterSalesType !== 'all') {
      list = list.filter((t) => {
        if (filterSalesType === 'cash_sale') {
          return t.voucherType === 'cash_sale' || t.voucherType === 'cash_sales';
        }
        if (filterSalesType === 'credit_sale') {
          return t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales';
        }
        if (filterSalesType === 'zeroing') {
          return t.voucherType === 'zeroing';
        }
        if (filterSalesType === 'sales_import') {
          return t.voucherType === 'sales_import';
        }
        return t.voucherType === filterSalesType;
      });
    }

    // 4. Customer filter
    if (filterCustomer !== 'all') {
      list = list.filter((t) => {
        const cName = t.customerName || t.customer?.name || '';
        return cName.trim() === filterCustomer.trim();
      });
    }

    // 5. TIN filter
    if (filterTin.trim()) {
      const tinQuery = filterTin.toLowerCase().trim();
      list = list.filter((t) => {
        const tTin = (t.tin || t.customerTin || t.customer?.tinNumber || t.customer?.tin || '').toLowerCase();
        return tTin.includes(tinQuery);
      });
    }

    // 6. Branch filter
    if (filterBranch !== 'all') {
      list = list.filter((t) => {
        const br = t.storeLocation || t.consigneeUnit || '';
        return br.trim() === filterBranch.trim();
      });
    }

    // 7. Device filter
    if (filterDevice !== 'all') {
      list = list.filter((t) => {
        const dev = t.deviceName || t.device || '';
        return dev.trim() === filterDevice.trim();
      });
    }

    // 8. User Name filter
    if (filterUserName !== 'all') {
      list = list.filter((t) => {
        const un = t.performedBy?.name || t.employeeName || t.createdByName || '';
        return un.trim() === filterUserName.trim();
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

    // 10. FS Number filter
    if (filterFsNo.trim()) {
      const fsQuery = filterFsNo.toLowerCase().trim();
      list = list.filter((t) => {
        const fsStr = `${t.fsNo || ''} ${t.fsNumber || ''}`.toLowerCase();
        return fsStr.includes(fsQuery);
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
  }, [
    transactions,
    filterVoucherCode,
    dateFrom,
    dateTo,
    filterSalesType,
    filterCustomer,
    filterTin,
    filterBranch,
    filterDevice,
    filterUserName,
    filterStatus,
    filterFsNo,
    sortField,
    sortAsc,
  ]);

  // Aggregate Metrics based on selected filters
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let totalItemsSold = 0;
    let cashCount = 0;
    let cashRevenue = 0;
    let creditCount = 0;
    let creditRevenue = 0;
    let zeroingCount = 0;
    let zeroingRevenue = 0;

    filteredTransactions.forEach((t) => {
      const rev = Number(t.totalRevenue || t.totalAmount || 0);
      const sub = Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0);
      const disc = Number(t.discountAmount || t.discount || 0);
      const vat = Number(t.vatAmount || 0);

      totalRevenue += rev;
      totalSubtotal += sub;
      totalDiscount += disc;
      totalVat += vat;

      const qty = Array.isArray(t.items) && t.items.length > 0
        ? t.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
        : Number(t.quantity || 0);
      totalItemsSold += qty;

      if (t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales') {
        creditCount += 1;
        creditRevenue += rev;
      } else if (t.voucherType === 'zeroing') {
        zeroingCount += 1;
        zeroingRevenue += rev;
      } else {
        cashCount += 1;
        cashRevenue += rev;
      }
    });

    return {
      totalVouchers: filteredTransactions.length,
      totalRevenue,
      totalSubtotal,
      totalDiscount,
      totalVat,
      totalItemsSold,
      cashCount,
      cashRevenue,
      creditCount,
      creditRevenue,
      zeroingCount,
      zeroingRevenue,
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

  // Helper row extractor for Table and Exports
  const getRowData = (t) => {
    const vMeta = getVoucherTypeMeta(t.voucherType);
    const customer = t.customerName || t.customer?.name || 'Walk-in Customer';
    const tin = t.tin || t.customerTin || t.customer?.tinNumber || t.customer?.tin || '—';
    const itemsCount = Array.isArray(t.items) ? t.items.length : 1;
    const itemsList = Array.isArray(t.items) && t.items.length > 0
      ? t.items.map((i) => `${i.material?.name || 'Item'} (${i.quantity} ${i.uom || 'Pcs'})`).join(', ')
      : `${t.material?.name || 'Item'} (${t.quantity || 1})`;
    const firstItem = Array.isArray(t.items) && t.items[0]?.material
      ? t.items[0].material.name
      : (t.material?.name || 'Item');
    const totalQty = Array.isArray(t.items) && t.items.length > 0
      ? t.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
      : Number(t.quantity || 1);
    const subtotal = Number(t.subTotal || t.taxableAmount || (t.totalAmount - (t.vatAmount || 0)) || 0);
    const discount = Number(t.discountAmount || t.discount || 0);
    const vat = Number(t.vatAmount || 0);
    const grandTotal = Number(t.totalRevenue || t.totalAmount || 0);
    const isCredit = t.voucherType === 'credit_sale' || t.voucherType === 'credit_sales';
    const paymentType = isCredit ? 'Credit' : 'Cash';
    const settlementStatus = t.paymentStatus || (isCredit ? 'Unpaid' : 'Paid');
    const fsNumber = t.fsNo || (t.fsNumber ? `FS-${String(t.fsNumber).padStart(6, '0')}` : '—');
    const mrc = t.mrc || 'SPM00000189';
    const userName = t.performedBy?.name || t.employeeName || t.createdByName || 'System';
    const deviceName = t.deviceName || t.device || 'POS Terminal 01';
    const lastState = t.isVoided || t.deletedAt ? 'voided' : (t.status || 'pending');

    return {
      voucherCode: t.voucherNo || '—',
      date: t.date ? new Date(t.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—',
      rawDate: t.date || t.createdAt,
      voucherType: vMeta.label,
      voucherTypeBadge: vMeta.badge,
      customer,
      tin,
      itemsSummary: firstItem,
      itemsFull: itemsList,
      itemsCount,
      quantity: totalQty,
      subtotal,
      discount,
      vat,
      grandTotal,
      paymentType,
      settlementStatus,
      fsNumber,
      mrc,
      userName,
      deviceName,
      lastState,
      branch: t.storeLocation || t.consigneeUnit || 'Main Store',
    };
  };

  // ── Action: Export Excel / CSV ──
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('No sales vouchers available to export under active filters.');
      return;
    }

    const headers = [
      'Voucher Code',
      'Issued Date',
      'Voucher Type',
      'Customer',
      'TIN',
      'Items Summary',
      'Quantity',
      'Subtotal (ETB)',
      'Discount (ETB)',
      'VAT 15% (ETB)',
      'Grand Total (ETB)',
      'Payment Type',
      'Settlement Status',
      'FS Number',
      'MRC',
      'User Name',
      'Device Name',
      'Last State',
      'Branch',
    ];

    const rows = filteredTransactions.map((t) => {
      const d = getRowData(t);
      return [
        `"${d.voucherCode}"`,
        `"${d.date}"`,
        `"${d.voucherType}"`,
        `"${d.customer.replace(/"/g, '""')}"`,
        `"${d.tin}"`,
        `"${d.itemsFull.replace(/"/g, '""')}"`,
        d.quantity,
        d.subtotal.toFixed(2),
        d.discount.toFixed(2),
        d.vat.toFixed(2),
        d.grandTotal.toFixed(2),
        `"${d.paymentType}"`,
        `"${d.settlementStatus}"`,
        `"${d.fsNumber}"`,
        `"${d.mrc}"`,
        `"${d.userName.replace(/"/g, '""')}"`,
        `"${d.deviceName}"`,
        `"${d.lastState.toUpperCase()}"`,
        `"${d.branch}"`,
      ].join(',');
    });

    // Summary Totals Row
    const totalsRow = [
      '"TOTALS / SUMMARY"',
      '""',
      `"${summaryMetrics.totalVouchers} Vouchers"`,
      '""',
      '""',
      '""',
      summaryMetrics.totalItemsSold,
      summaryMetrics.totalSubtotal.toFixed(2),
      summaryMetrics.totalDiscount.toFixed(2),
      summaryMetrics.totalVat.toFixed(2),
      summaryMetrics.totalRevenue.toFixed(2),
      '""',
      '""',
      '""',
      '""',
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
    link.setAttribute('download', `Sales_Marketing_Voucher_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Action: Export PDF & Print Report ──
  const handlePrintOrPdf = (isPdf = false) => {
    if (filteredTransactions.length === 0) {
      alert('No sales voucher records to print or export.');
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
          <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${d.voucherCode}</td>
          <td style="white-space: nowrap;">${d.date}</td>
          <td>${d.voucherType}</td>
          <td><strong>${d.customer}</strong></td>
          <td style="font-family: monospace;">${d.tin}</td>
          <td>${d.itemsFull}</td>
          <td style="text-align: center; font-weight: bold;">${d.quantity}</td>
          <td style="text-align: right; font-family: monospace;">${d.subtotal.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace;">${d.discount.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace;">${d.vat.toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">${d.grandTotal.toFixed(2)}</td>
          <td style="text-align: center;">${d.paymentType} (${d.settlementStatus})</td>
          <td style="font-family: monospace;">${d.fsNumber}</td>
          <td style="font-family: monospace;">${d.mrc}</td>
          <td>${d.userName}</td>
          <td>${d.deviceName}</td>
          <td style="text-align: center; font-weight: bold; text-transform: uppercase;">${d.lastState}</td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isPdf ? 'Sales_Marketing_Voucher_Report.pdf' : 'Sales & Marketing Voucher Report'}</title>
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
              <div class="report-title">Sales &amp; Marketing Voucher Report (Sub System Audit)</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Comprehensive sales register across Cash, Credit &amp; Zeroing Transactions</div>
            </div>
            <div class="meta-box">
              <div><strong>Generated Date:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Generated By:</strong> ${user?.name || 'Administrator'} (${user?.role || 'Staff'})</div>
              <div><strong>Vouchers Count:</strong> ${filteredTransactions.length} records</div>
            </div>
          </div>

          <div class="filter-banner">
            <div><strong>Date Range:</strong> ${dateFrom || 'Start'} to ${dateTo || 'Present'}</div>
            <div><strong>Sales Type:</strong> ${filterSalesType.toUpperCase()}</div>
            <div><strong>Status:</strong> ${filterStatus.toUpperCase()}</div>
            <div><strong>Customer:</strong> ${filterCustomer}</div>
            <div><strong>Branch:</strong> ${filterBranch}</div>
          </div>

          <div class="kpi-cards">
            <div class="kpi">
              <div class="kpi-label">Total Grand Revenue</div>
              <div class="kpi-value">${formatETB(summaryMetrics.totalRevenue)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Total Subtotal</div>
              <div class="kpi-value">${formatETB(summaryMetrics.totalSubtotal)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">15% VAT Collected</div>
              <div class="kpi-value">${formatETB(summaryMetrics.totalVat)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Total Units Sold</div>
              <div class="kpi-value">${summaryMetrics.totalItemsSold.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Issued Date</th>
                <th>Voucher Type</th>
                <th>Customer</th>
                <th>TIN</th>
                <th>Line Items</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Subtotal</th>
                <th style="text-align: right;">Discount</th>
                <th style="text-align: right;">15% VAT</th>
                <th style="text-align: right;">Grand Total</th>
                <th style="text-align: center;">Payment</th>
                <th>FS #</th>
                <th>MRC</th>
                <th>User</th>
                <th>Device</th>
                <th style="text-align: center;">State</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="text-align: right;">SUMMARY TOTALS (${summaryMetrics.totalVouchers} Vouchers):</td>
                <td style="text-align: center;">${summaryMetrics.totalItemsSold}</td>
                <td style="text-align: right; font-family: monospace;">${summaryMetrics.totalSubtotal.toFixed(2)}</td>
                <td style="text-align: right; font-family: monospace;">${summaryMetrics.totalDiscount.toFixed(2)}</td>
                <td style="text-align: right; font-family: monospace;">${summaryMetrics.totalVat.toFixed(2)}</td>
                <td style="text-align: right; font-family: monospace;">${summaryMetrics.totalRevenue.toFixed(2)}</td>
                <td colspan="6"></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-sig">
            <div class="sig-line">Prepared By (Sales Officer)</div>
            <div class="sig-line">Verified By (Auditor / Accountant)</div>
            <div class="sig-line">Authorized Signature &amp; Stamp</div>
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
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                <Layers size={12} className="text-blue-400" />
                Sub System → Sales and Marketing Management System
              </span>
              <span className="text-xs text-slate-400">· Official Audit &amp; Transaction Register</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Receipt className="text-emerald-400" size={26} />
              <span>Sales &amp; Marketing Voucher Report</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Comprehensive operational report displaying all sales transactions performed across Cash Sales, Credit Sales, and Zeroing vouchers. Includes voucher numbers, issued dates, customer profiles, TINs, quantities, subtotals, VAT, grand totals, payment methods, and workflow states.
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
        {/* Total Grand Revenue */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filtered Grand Total
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
            Across <span className="font-bold text-slate-700">{summaryMetrics.totalVouchers}</span> vouchers (Subtotal: {formatETB(summaryMetrics.totalSubtotal)})
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
            15% VAT Collected: <span className="font-bold text-slate-700 font-mono">{formatETB(summaryMetrics.totalVat)}</span>
          </p>
        </div>

        {/* Cash Sales Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cash Sales Invoices
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
            <span className="font-bold text-emerald-800">{summaryMetrics.cashCount}</span> settled cash vouchers
          </p>
        </div>

        {/* Credit Sales Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Credit Sales Receivables
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
            <span className="font-bold text-amber-800">{summaryMetrics.creditCount}</span> credit sales orders recorded
          </p>
        </div>
      </div>

      {/* ── 3. Filters & Search Control Bar (10 Filters) ── */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Report Filters &amp; Query Controls
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-xs"
            >
              <Search size={12} />
              <span>Show / Search</span>
            </button>
          </div>
        </div>

        {/* Row 1: Code Search, Date Presets & Custom Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* 1. Voucher Code */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              1. Voucher Code
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={filterVoucherCode}
                onChange={(e) => {
                  setFilterVoucherCode(e.target.value);
                  setPage(1);
                }}
                placeholder="Search voucher code (e.g. CS-2026-001)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
              {filterVoucherCode && (
                <button
                  type="button"
                  onClick={() => setFilterVoucherCode('')}
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
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
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
              <div className="relative">
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
        </div>

        {/* Row 2: Sales Type, Customer, TIN, Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* 3. Sales Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              3. Sales Type
            </label>
            <select
              value={filterSalesType}
              onChange={(e) => {
                setFilterSalesType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Sales Types</option>
              <option value="cash_sale">Cash Sales Voucher</option>
              <option value="credit_sale">Credit Sales Voucher</option>
              <option value="zeroing">Zeroing Voucher</option>
              <option value="sales_import">Sales Import / POS</option>
            </select>
          </div>

          {/* 4. Customer */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              4. Customer
            </label>
            <select
              value={filterCustomer}
              onChange={(e) => {
                setFilterCustomer(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Customers</option>
              {dynamicFilterOptions.customers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 5. TIN */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              5. Customer TIN
            </label>
            <input
              type="text"
              value={filterTin}
              onChange={(e) => {
                setFilterTin(e.target.value);
                setPage(1);
              }}
              placeholder="Search by TIN (e.g. 0012345678)..."
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* 6. Branch */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              6. Branch / Store
            </label>
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Branches</option>
              {dynamicFilterOptions.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Device, User Name, Voucher Status, FS Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* 7. Device */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              7. Device / Terminal
            </label>
            <select
              value={filterDevice}
              onChange={(e) => {
                setFilterDevice(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Devices</option>
              {dynamicFilterOptions.devices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 8. User Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              8. User Name / Cashier
            </label>
            <select
              value={filterUserName}
              onChange={(e) => {
                setFilterUserName(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Users</option>
              {dynamicFilterOptions.userNames.map((u) => (
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
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending (Awaiting Review)</option>
              <option value="checked">Checked (Reviewed)</option>
              <option value="approved">Approved (Stock Deducted)</option>
              <option value="posted">Posted (Ledger Finalized)</option>
              <option value="voided">Voided / Deleted</option>
            </select>
          </div>

          {/* 10. FS Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              10. FS Number
            </label>
            <input
              type="text"
              value={filterFsNo}
              onChange={(e) => {
                setFilterFsNo(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by FS Number..."
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Main Report Data Grid (17 Columns + Actions) ── */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider select-none">
                {/* 1. Voucher Code */}
                <th
                  onClick={() => handleSort('voucherNo')}
                  className="py-3 px-2.5 cursor-pointer hover:text-blue-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Voucher Code</span>
                    <ArrowUpDown size={11} className={sortField === 'voucherNo' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 2. Issued Date */}
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-2.5 cursor-pointer hover:text-blue-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Issued Date</span>
                    <ArrowUpDown size={11} className={sortField === 'date' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 3. Voucher Type */}
                <th className="py-3 px-2.5 whitespace-nowrap">Voucher Type</th>

                {/* 4. Customer */}
                <th
                  onClick={() => handleSort('customer')}
                  className="py-3 px-2.5 cursor-pointer hover:text-blue-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown size={11} className={sortField === 'customer' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 5. TIN */}
                <th className="py-3 px-2.5 whitespace-nowrap">TIN</th>

                {/* 6. Items */}
                <th className="py-3 px-2.5 whitespace-nowrap">Items</th>

                {/* 7. Quantity */}
                <th
                  onClick={() => handleSort('quantity')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-blue-700 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Quantity</span>
                    <ArrowUpDown size={11} className={sortField === 'quantity' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 8. Subtotal */}
                <th className="py-3 px-2.5 text-right whitespace-nowrap">Subtotal</th>

                {/* 9. Discount */}
                <th className="py-3 px-2.5 text-right whitespace-nowrap">Discount</th>

                {/* 10. VAT */}
                <th className="py-3 px-2.5 text-right whitespace-nowrap">15% VAT</th>

                {/* 11. Grand Total */}
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-2.5 text-right cursor-pointer hover:text-blue-700 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Grand Total</span>
                    <ArrowUpDown size={11} className={sortField === 'amount' ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                </th>

                {/* 12. Payment Type */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Payment Type</th>

                {/* 13. FS Number */}
                <th className="py-3 px-2.5 whitespace-nowrap">FS Number</th>

                {/* 14. MRC */}
                <th className="py-3 px-2.5 whitespace-nowrap">MRC</th>

                {/* 15. User Name */}
                <th className="py-3 px-2.5 whitespace-nowrap">User Name</th>

                {/* 16. Device Name */}
                <th className="py-3 px-2.5 whitespace-nowrap">Device Name</th>

                {/* 17. Last State */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Last State</th>

                {/* Functional Actions */}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading sales vouchers and transactions...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No sales vouchers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No transactions match the selected filters. Try broadening the criteria or resetting filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((sale) => {
                  const row = getRowData(sale);

                  return (
                    <tr
                      key={sale._id}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedVoucher(sale);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* 1. Voucher Code */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-blue-700 hover:underline">
                          {row.voucherCode}
                        </span>
                      </td>

                      {/* 2. Issued Date */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {row.date}
                      </td>

                      {/* 3. Voucher Type */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.voucherTypeBadge}`}>
                          {row.voucherType}
                        </span>
                      </td>

                      {/* 4. Customer */}
                      <td className="py-2.5 px-2.5 max-w-[140px]">
                        <p className="font-semibold text-slate-900 truncate" title={row.customer}>
                          {row.customer}
                        </p>
                      </td>

                      {/* 5. TIN */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                        {row.tin}
                      </td>

                      {/* 6. Items */}
                      <td className="py-2.5 px-2.5 max-w-[160px]">
                        <p className="truncate font-medium text-slate-800" title={row.itemsFull}>
                          {row.itemsSummary}
                          {row.itemsCount > 1 && (
                            <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                              +{row.itemsCount - 1}
                            </span>
                          )}
                        </p>
                      </td>

                      {/* 7. Quantity */}
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900">
                        {row.quantity}
                      </td>

                      {/* 8. Subtotal */}
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {row.subtotal.toFixed(2)}
                      </td>

                      {/* 9. Discount */}
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                        {row.discount > 0 ? `-${row.discount.toFixed(2)}` : '0.00'}
                      </td>

                      {/* 10. VAT */}
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {row.vat.toFixed(2)}
                      </td>

                      {/* 11. Grand Total */}
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                        {formatETB(row.grandTotal)}
                      </td>

                      {/* 12. Payment Type */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[11px] font-bold text-slate-800">
                            {row.paymentType}
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            row.settlementStatus.toLowerCase() === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.settlementStatus}
                          </span>
                        </div>
                      </td>

                      {/* 13. FS Number */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-slate-700 text-[11px]">
                        {row.fsNumber}
                      </td>

                      {/* 14. MRC */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                        {row.mrc}
                      </td>

                      {/* 15. User Name */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-700">
                        {row.userName}
                      </td>

                      {/* 16. Device Name */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {row.deviceName}
                      </td>

                      {/* 17. Last State */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <WorkflowBadge status={row.lastState} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                            title="Print thermal fiscal slip"
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
          title={`Voucher Audit Breakdown — ${selectedVoucher.voucherNo || ''}`}
          width="max-w-4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status & Top Metadata */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voucher Type &amp; Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-sm text-slate-900">
                    {getVoucherTypeMeta(selectedVoucher.voucherType).label}
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grand Total</p>
                <p className="font-mono font-black text-emerald-700 text-base mt-0.5">
                  {formatETB(selectedVoucher.totalRevenue || selectedVoucher.totalAmount)}
                </p>
              </div>
            </div>

            {/* Customer, Fiscal & Machine Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-white">
              {/* Customer Profile */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <User size={13} className="text-blue-600" />
                  <span>Customer Profile</span>
                </h4>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedVoucher.customerName || selectedVoucher.customer?.name || 'Walk-in Customer'}
                </p>
                <p className="text-slate-600 mt-0.5">
                  <span className="font-semibold">TIN: </span>
                  <span className="font-mono">{selectedVoucher.tin || selectedVoucher.customerTin || selectedVoucher.customer?.tinNumber || '—'}</span>
                </p>
                {selectedVoucher.customerPhone && (
                  <p className="text-slate-500">Phone: {selectedVoucher.customerPhone}</p>
                )}
                {selectedVoucher.customerAddress && (
                  <p className="text-slate-500">Address: {selectedVoucher.customerAddress}</p>
                )}
              </div>

              {/* Fiscal & Hardware Info */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <Monitor size={13} className="text-purple-600" />
                  <span>Fiscal &amp; Device Details</span>
                </h4>
                <p className="text-slate-700">
                  <span className="font-semibold">FS Number: </span>
                  <span className="font-mono font-bold">{selectedVoucher.fsNo || (selectedVoucher.fsNumber ? `FS-${String(selectedVoucher.fsNumber).padStart(6, '0')}` : '—')}</span>
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">MRC: </span>
                  <span className="font-mono">{selectedVoucher.mrc || 'SPM00000189'}</span>
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Device: </span>
                  <span className="font-mono">{selectedVoucher.deviceName || selectedVoucher.device || 'POS Terminal 01'}</span>
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Store / Branch: </span>
                  <span>{selectedVoucher.storeLocation || selectedVoucher.consigneeUnit || 'Main Store'}</span>
                </p>
              </div>

              {/* Settlement Terms */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1 text-xs">
                  <CreditCard size={13} className="text-amber-600" />
                  <span>Payment &amp; Terms</span>
                </h4>
                <p className="text-slate-700">
                  <span className="font-semibold">Payment Type: </span>
                  <span className="font-bold capitalize">{selectedVoucher.voucherType === 'credit_sale' || selectedVoucher.voucherType === 'credit_sales' ? 'Credit Sale' : 'Cash Sale'}</span>
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Settlement: </span>
                  <span className="font-bold capitalize text-slate-900">{selectedVoucher.paymentStatus || 'Paid'}</span>
                </p>
                {selectedVoucher.dueDate && (
                  <p className="text-slate-700">
                    <span className="font-semibold">Due Date: </span>
                    <span className="font-mono">{new Date(selectedVoucher.dueDate).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Receipt size={14} className="text-blue-600" />
                <span>Line Items Specification</span>
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
                    {Number(selectedVoucher.discountAmount || selectedVoucher.discount || 0) > 0 && (
                      <tr>
                        <td colSpan={4} className="py-1 px-3 text-right text-slate-600">
                          Discount:
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-rose-600">
                          -{formatETB(selectedVoucher.discountAmount || selectedVoucher.discount)}
                        </td>
                      </tr>
                    )}
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

            {/* Audit Chain History */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Operational Sign-off &amp; Audit Trail:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-slate-400">Created / Billed By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.performedBy?.name || selectedVoucher.employeeName || 'System'}</p>
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
