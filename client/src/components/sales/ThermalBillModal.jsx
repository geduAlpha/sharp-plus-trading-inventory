import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  X,
  Settings as SettingsIcon,
  ChevronDown,
  RotateCcw,
  FileCode,
  Receipt,
  FileCheck,
  Building,
  User,
  Calendar,
  CreditCard,
  Banknote,
  Eye,
} from 'lucide-react';
import {
  generateThermalReceiptText,
  exportBillToTXT,
  exportBillToCSV,
  exportBillToExcel,
  exportBillToJSON,
  exportBillToPDF,
  exportBillToWord,
  exportBillByFormat,
  EXPORT_FORMATS,
  openThermalPrintWindow,
  openA4PrintWindow,
  formatFiscalDate,
  formatNumber,
  toAsteriskAmount,
  toCaretTotal,
} from '../../utils/thermalBillUtils';
import { useAuth } from '../../context/AuthContext';

export default function ThermalBillModal({ open, onClose, sale }) {
  const { user, companyInfo } = useAuth();
  const [viewMode, setViewMode] = useState('80mm'); // '80mm' | 'a4'
  const [copied, setCopied] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState('');
  const exportMenuRef = useRef(null);
  const settingsPopoverRef = useRef(null);

  // Configuration fields synced with registered company profile and active sale
  const [config, setConfig] = useState(() => ({
    tinNumber: companyInfo?.tinNumber || '0089234125',
    companyLines: companyInfo?.companyName
      ? [companyInfo.companyName, companyInfo.tradeName || ''].filter(Boolean)
      : ['SHARP PLUS', 'TRADING PLC'],
    addressLine1: companyInfo?.address || 'ADDIS ABABA, BOLE MEDHANIALEM',
    addressLine2: companyInfo?.city ? `${companyInfo.city}, ${companyInfo.country || 'Ethiopia'}` : 'COMMERCIAL CENTER 4TH FLOOR',
    phone: companyInfo?.phone || 'TEL-+251 91 100 0111',
    machineNo: companyInfo?.machineNo || companyInfo?.mrc || 'FG10044280',
    poweredBy: `${companyInfo?.companyName || 'Sharp Plus'} System`,
    operator: user?.name || (companyInfo?.ownerName ? `${companyInfo.ownerName} (Admin)` : 'System Operator'),
    taxRate: sale?.taxRate !== undefined ? Number(sale.taxRate) : (companyInfo?.taxRate || 15),
    fsNo: '',
  }));

  // Sync when sale or user changes
  useEffect(() => {
    if (sale) {
      const defaultTax = sale.taxRate !== undefined ? Number(sale.taxRate) : (companyInfo?.taxRate || 15);
      setConfig((prev) => ({
        ...prev,
        taxRate: defaultTax,
        operator: user?.name || prev.operator || 'System Operator',
        fsNo: sale.fsNo || prev.fsNo || '',
      }));
    }
  }, [sale, user, companyInfo]);

  // Click-outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target)) {
        setShowSettingsPopover(false);
      }
    };
    if (exportMenuOpen || showSettingsPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen, showSettingsPopover]);

  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale' ||
    sale?.voucherType === 'credit_sales';

  const isZeroing =
    sale?.voucherType === 'zeroing' ||
    sale?.voucherType === 'zeroing_voucher';

  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Walk-in Customer';

  const customerTin = sale?.tin || sale?.customerTin || '';
  const customerPhone = sale?.customerPhone || '';
  const customerAddress = sale?.customerAddress || '';

  const invoiceNo =
    sale?.voucherNo ||
    (isZeroing ? 'ZRO-00001' : (isCredit ? 'CRSALE-00001' : 'CSALE-00001'));

  const rawFs =
    config.fsNo ||
    sale?.fsNo ||
    (sale?.fsNumber ? String(sale.fsNumber).padStart(8, '0') : '') ||
    String(sale?.voucherNo || '00000001').replace(/\D/g, '').padStart(8, '0').slice(-8);

  const cleanFsDigits = String(rawFs).replace(/^FS\s*No\.?:?\s*/i, '').trim() || '00000001';
  const fsNumber = `FS No: ${cleanFsDigits}`;

  const dateStr = formatFiscalDate(sale?.date);

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0 ? rawItems : (sale ? [
    {
      description: 'Sales Item',
      name: 'Sales Item',
      quantity: 1,
      sellingPrice: Number(sale?.totalRevenue || sale?.totalAmount || 0),
      totalRevenue: Number(sale?.totalRevenue || sale?.totalAmount || 0),
    },
  ] : []);

  // Processed Items and Financial Calculations (Unconditionally called before any return)
  const { totalRevenue, taxable, taxAmount, processedItems } = useMemo(() => {
    if (!sale) {
      return { totalRevenue: 0, taxable: 0, taxAmount: 0, processedItems: [] };
    }
    let rev = 0;
    const list = items.map((it) => {
      const desc = it.description || it.material?.name || it.material || it.name || 'Sales Item';
      const qty = Number(it.quantity || 1);
      const uom = it.uom || it.material?.unit || 'Pcs';
      const price = Number(it.sellingPrice || it.unitCost || 0);
      const amount = Number(it.totalRevenue || it.total || it.totalCost || qty * price);
      rev += amount;
      return { desc, qty, uom, price, amount };
    });

    if (sale?.totalRevenue && Number(sale.totalRevenue) > 0) {
      rev = Number(sale.totalRevenue);
    } else if (sale?.totalAmount && Number(sale.totalAmount) > 0) {
      rev = Number(sale.totalAmount);
    }

    const tRate = Number(config.taxRate !== undefined ? config.taxRate : 15);
    let taxb = rev;
    let taxVal = 0;
    if (tRate > 0) {
      if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === tRate) {
        taxb = Number(sale.taxableAmount);
        taxVal = Number(sale.vatAmount);
      } else {
        taxb = rev / (1 + tRate / 100);
        taxVal = rev - taxb;
      }
    }

    return {
      totalRevenue: rev,
      taxable: taxb,
      taxAmount: taxVal,
      processedItems: list,
    };
  }, [items, sale, config.taxRate]);

  // Workflow Participant Details
  const preparedByName =
    sale?.performedBy?.name ||
    sale?.createdByName ||
    sale?.employeeName ||
    config.operator ||
    user?.name ||
    'System Operator';

  const preparedDate = sale?.createdAt
    ? new Date(sale.createdAt).toLocaleDateString('en-GB')
    : dateStr;

  const approvedByName =
    sale?.approvedBy?.name ||
    sale?.postedBy?.name ||
    (typeof sale?.approvedBy === 'string' ? sale.approvedBy : null) ||
    '—';

  const approvedDate = sale?.approvedAt
    ? new Date(sale.approvedAt).toLocaleDateString('en-GB')
    : (sale?.postedAt ? new Date(sale.postedAt).toLocaleDateString('en-GB') : '');

  const receiptText = sale
    ? generateThermalReceiptText(sale, {
        ...config,
        fsNo: fsNumber,
      })
    : '';

  // Safe early exit AFTER all hooks are registered
  if (!open || !sale) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    if (viewMode === 'a4') {
      openA4PrintWindow(sale, config);
    } else {
      openThermalPrintWindow(sale, config);
    }
  };

  const triggerExport = (fmtId, ext) => {
    setExportMenuOpen(false);
    try {
      exportBillByFormat(fmtId, sale, config);
      setDownloadToast(`Downloaded ${sale?.voucherNo || 'invoice'}${ext}`);
      setTimeout(() => setDownloadToast(''), 4500);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed for ${ext}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ── 1. Clean Top Toolbar ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/90 text-white select-none">
          {/* Left: Document Title & Transaction Badges */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              {viewMode === '80mm' ? <Receipt size={17} /> : <FileCheck size={17} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white tracking-tight">
                  Sales Invoice / Fiscal Bill
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    isZeroing
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : isCredit
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isZeroing ? 'Zeroing Voucher' : (isCredit ? 'Credit Sale' : 'Cash Sale')}
                </span>
                {(sale?.status === 'draft_preview' || sale?.isPreviewDraft) && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Preview Draft
                  </span>
                )}
                <span className="text-xs font-mono font-semibold text-slate-400 hidden md:inline">
                  {invoiceNo}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Format Switcher (80mm Thermal vs A4 Standard) */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('80mm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === '80mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View 80mm Thermal POS Receipt Layout"
            >
              <Receipt size={13} />
              <span>80mm POS Slip</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'a4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View A4 Standard Corporate Invoice Layout"
            >
              <FileText size={13} />
              <span>A4 Standard Invoice</span>
            </button>
          </div>

          {/* Right: Actions (Print, Export, Settings, Close) */}
          <div className="flex items-center gap-2">
            {/* Dedicated Print Action Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-sm hover:scale-102 active:scale-98"
              title={`Print ${viewMode === '80mm' ? '80mm Thermal POS Receipt' : 'A4 Invoice'}`}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            {/* Separate Export Action Button with Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 flex items-center gap-1.5 transition shadow-sm"
                title="Export invoice in multiple file formats"
              >
                <Download size={14} className="text-blue-400 shrink-0" />
                <span>Export</span>
                <ChevronDown size={13} className={`transition-transform duration-200 text-slate-400 ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Export File Extension</span>
                    <span className="text-[9px] text-blue-400 font-normal">Instant Download</span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {EXPORT_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => triggerExport(fmt.id, fmt.ext)}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Download size={14} className="text-slate-400 group-hover:text-blue-400 shrink-0 transition" />
                          <div className="min-w-0">
                            <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{fmt.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${fmt.badgeClass}`}>
                                {fmt.ext}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{fmt.desc}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                          Save
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="my-1 border-t border-slate-800" />

                  {/* Copy Text */}
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-emerald-400 shrink-0" />
                        <div className="font-semibold text-emerald-400">Copied to Clipboard!</div>
                      </>
                    ) : (
                      <>
                        <Copy size={16} className="text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-white">Copy Receipt Text</div>
                          <div className="text-[10px] text-slate-400">Quick share via Telegram / Chat</div>
                        </div>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Custom Settings Popover Trigger */}
            <div className="relative" ref={settingsPopoverRef}>
              <button
                type="button"
                onClick={() => setShowSettingsPopover((v) => !v)}
                className={`p-1.5 rounded-xl border transition ${
                  showSettingsPopover
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title="Bill & Fiscal Settings"
              >
                <SettingsIcon size={16} />
              </button>

              {showSettingsPopover && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-4 z-50 text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-bold text-white">Bill &amp; Fiscal Details</span>
                    <button
                      type="button"
                      onClick={() => setConfig({
                        tinNumber: companyInfo?.tinNumber || '0089234125',
                        companyLines: companyInfo?.companyName ? [companyInfo.companyName] : ['SHARP PLUS TRADING PLC'],
                        addressLine1: companyInfo?.address || 'ADDIS ABABA, BOLE',
                        addressLine2: companyInfo?.city || 'COMMERCIAL CENTER',
                        phone: companyInfo?.phone || '+251 91 100 0111',
                        machineNo: 'FG10044280',
                        poweredBy: 'Sharp Plus System',
                        operator: user?.name || 'Operator',
                        taxRate: sale?.taxRate !== undefined ? Number(sale.taxRate) : 15,
                        fsNo: '',
                      })}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">TIN Number</label>
                      <input
                        type="text"
                        value={config.tinNumber}
                        onChange={(e) => setConfig({ ...config, tinNumber: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">FS Number</label>
                      <input
                        type="text"
                        value={config.fsNo}
                        placeholder={fsNumber}
                        onChange={(e) => setConfig({ ...config, fsNo: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Operator Name</label>
                      <input
                        type="text"
                        value={config.operator}
                        onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">ERCA Machine / MRC No</label>
                      <input
                        type="text"
                        value={config.machineNo}
                        onChange={(e) => setConfig({ ...config, machineNo: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Bill"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mobile View Toggle Bar */}
        <div className="sm:hidden flex items-center justify-center gap-2 p-2 bg-slate-950 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('80mm')}
            className={`px-3 py-1 rounded-lg text-xs font-bold ${
              viewMode === '80mm' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900'
            }`}
          >
            80mm POS Slip
          </button>
          <button
            type="button"
            onClick={() => setViewMode('a4')}
            className={`px-3 py-1 rounded-lg text-xs font-bold ${
              viewMode === 'a4' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900'
            }`}
          >
            A4 Invoice
          </button>
        </div>

        {/* Verification Preview Notice */}
        {(sale?.status === 'draft_preview' || sale?.isPreviewDraft) && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-amber-400 shrink-0" />
              <span>
                <strong>Verification Draft Preview:</strong> Reviewing items &amp; taxes before committing. This transaction has NOT been saved to the database.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0"
            >
              Return to Form
            </button>
          </div>
        )}

        {/* Download Feedback Notification */}
        {downloadToast && (
          <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check size={15} className="text-emerald-400 shrink-0" />
              <span><strong>File Ready:</strong> {downloadToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadToast('')}
              className="text-emerald-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── 2. Standalone Bill Preview Body (No Side Panels) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center bg-slate-950/60">
          
          {/* ────── MODE A: 80mm POS Thermal Receipt ────── */}
          {viewMode === '80mm' && (
            <div
              id="fiscal-thermal-slip"
              className="w-full max-w-[340px] rounded-xl shadow-2xl p-5 select-text font-mono text-xs leading-relaxed border bg-white text-slate-950 border-slate-200 shadow-slate-950/50 my-2"
              style={{
                fontFamily:
                  "'Consolas', 'Courier New', 'Lucida Console', Monaco, monospace",
              }}
            >
              {/* TIN Header */}
              <div className="font-bold tracking-wider text-slate-950 text-left">
                TIN: {config.tinNumber || '0089234125'}
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* Organization Lines */}
              <div className="text-center font-bold tracking-widest text-[13px] leading-tight my-1 text-slate-950">
                {(config.companyLines || []).map((line, idx) => (
                  <div key={idx} className="whitespace-nowrap">
                    {String(line || "").replace(/\^/g, "")}
                  </div>
                ))}
              </div>

              {/* Address & Tel */}
              <div className="text-center text-[11px] font-medium mt-1 leading-snug text-slate-800">
                <div>{config.addressLine1}</div>
                {config.addressLine2 && <div>{config.addressLine2}</div>}
                <div>{config.phone}</div>
              </div>

              {/* Date Header */}
              <div className="text-right text-[11px] font-bold mt-2 pb-1 text-slate-900">
                DATE: {dateStr}
              </div>

              {/* Invoice Type Divider */}
              <div className="text-center font-bold tracking-tight text-[12px] my-2 text-slate-950">
                {isZeroing
                  ? '============== ZEROING VOUCHER =============='
                  : isCredit
                  ? '============== CREDIT INVOICE =============='
                  : '============== CASH INVOICE =============='}
              </div>

              {/* Metadata */}
              <div className="text-[11px] space-y-0.5 mb-1.5 text-slate-800">
                <div>Customer: {customerName}</div>
                <div>{fsNumber}</div>
                <div>Invoice: {invoiceNo}</div>
                <div>Operator: {config.operator || 'System Operator'}</div>
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* Items Column Header */}
              <div className="flex items-center font-bold text-[11px] tracking-wider py-0.5 text-slate-950">
                <span className="flex-1 text-left">Description</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-24 text-right">Price</span>
                <span className="w-28 text-right">AMOUNT</span>
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* Line Items */}
              <div className="space-y-1 my-1 text-[11px] text-slate-950">
                {processedItems.map((it, idx) => (
                  <div key={idx} className="flex items-center py-0.5">
                    <span className="flex-1 font-semibold break-words text-left pr-1" title={it.desc}>
                      {it.desc}
                    </span>
                    <span className="w-10 text-center font-mono font-medium">
                      {it.qty}
                    </span>
                    <span className="w-24 text-right font-mono">
                      {formatNumber(it.price, 2)}
                    </span>
                    <span className="w-28 text-right font-mono font-bold tracking-wide">
                      {toAsteriskAmount(it.amount, 2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* Taxable & Tax breakdown */}
              <div className="space-y-0.5 text-[11px] text-slate-900">
                <div className="flex justify-between">
                  <span>TXBL1</span>
                  <span className="font-mono">{toAsteriskAmount(taxable, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX1 {config.taxRate}%</span>
                  <span className="font-mono">{toAsteriskAmount(taxAmount, 2)}</span>
                </div>
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* TOTAL */}
              <div className="flex justify-between font-bold text-[13px] py-0.5 text-slate-950">
                <span>TOTAL</span>
                <span className="font-mono">{toCaretTotal(totalRevenue)}</span>
              </div>

              <div className="my-1.5 border-b border-dashed border-slate-400" />

              {/* Payment Mode */}
              <div className="space-y-1 text-[11px] text-slate-900">
                {isCredit ? (
                  <>
                    <div className="flex justify-between font-bold text-slate-950">
                      <span>CREDIT</span>
                      <span className="font-mono">{toCaretTotal(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ADVANCED PAYMENT</span>
                      <span className="font-mono">{toAsteriskAmount(sale?.amountPaid || 0, 2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-950">
                      <span>BALANCE DUE</span>
                      <span className="font-mono">{toAsteriskAmount(
                        Math.max(0, totalRevenue - (Number(sale?.amountPaid) || 0)),
                        2
                      )}</span>
                    </div>
                    {sale?.dueDate && (
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>DUE DATE</span>
                        <span>{new Date(sale.dueDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between font-bold text-slate-950">
                    <span>CASH</span>
                    <span className="font-mono">{toCaretTotal(totalRevenue)}</span>
                  </div>
                )}
              </div>

              {/* Items count */}
              <div className="flex justify-between text-[11px] pt-1 text-slate-800 font-mono">
                <span>ITEM#</span>
                <span>{processedItems.length}</span>
              </div>

              <div className="my-2 border-b border-dashed border-slate-400" />

              {/* Official ERCA Ethiopian Fiscal Machine Stamp (Bold with Machine No Underneath) */}
              <div className="my-2.5 flex flex-col items-center justify-center select-none text-slate-950">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {/* Bold Stylized Ethiopian ERCA ET Fiscal Mark */}
                  <svg
                    viewBox="0 0 38 18"
                    className="w-10 h-5 text-black shrink-0"
                    fill="none"
                    stroke="currentColor"
                  >
                    <polygon points="6,2 36,2 30,16 0,16" strokeWidth="3.2" strokeLinejoin="round" />
                    <line x1="3" y1="9" x2="20" y2="9" strokeWidth="3.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[13px] font-black tracking-widest leading-none font-mono">
                    ERCA
                  </span>
                </div>
                <div className="text-[12px] font-bold font-mono tracking-wider text-slate-950 leading-none">
                  {sale?.mrc || config.machineNo || 'FG10044280'}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2 pt-1 border-t border-dashed border-slate-300 text-[10px] tracking-wide text-slate-500 font-mono">
                Powered By {config.poweredBy || 'Sharp Plus System'}
              </div>
            </div>
          )}

          {/* ────── MODE B: A4 Standard Invoice Document ────── */}
          {viewMode === 'a4' && (
            <div
              className="relative w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-2xl p-5 sm:p-7 border border-slate-300 select-text my-2 overflow-hidden"
              style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}
            >
              {/* Semi-transparent Diagonal Watermark: "Attachment" */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
              >
                <span
                  style={{
                    transform: 'rotate(-38deg)',
                    fontSize: '105px',
                    fontWeight: '900',
                    color: 'rgba(148, 163, 184, 0.22)',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Attachment
                </span>
              </div>

              {/* Document Content Layer */}
              <div className="relative z-10 flex flex-col justify-between">
                <div>
                  {/* Top Header Grid */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-2">
                    {/* Top Left: Company Name & Line */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-2xl font-black text-slate-950 tracking-wide uppercase">
                        {(config.companyLines || []).join(' ') || companyInfo?.companyName || 'Sharp Plus Trading PLC'}
                      </div>
                      <div className="w-full max-w-sm mt-3 border-b-2 border-slate-900" />
                    </div>

                    {/* Top Right: Company Credentials Box */}
                    <div className="w-full sm:w-72 shrink-0">
                      <div className="border border-slate-800 rounded p-2 text-[11px] leading-tight space-y-0.5 bg-white">
                        <div className="font-bold text-slate-950 uppercase">
                          {(config.companyLines || []).join(' ') || companyInfo?.companyName || 'Sharp Plus Trading PLC'}
                        </div>
                        <div className="text-slate-800">
                          <span className="font-semibold">Tel:</span>{' '}
                          <span className="font-mono">{config.phone || companyInfo?.phone || '091-1227125'}</span>
                        </div>
                        <div className="text-slate-800">
                          <span className="font-semibold">Fax:</span>{' '}
                          <span className="font-mono">{companyInfo?.fax || '—'}</span>
                        </div>
                        <div className="text-slate-800">
                          <span className="font-semibold">Web:</span>{' '}
                          <span>{companyInfo?.website || '—'}</span>
                        </div>
                        <div className="text-slate-800">
                          <span className="font-semibold">Email:</span>{' '}
                          <span>{companyInfo?.email || '—'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-950 pt-0.5">
                          <span>TIN:</span>
                          <span className="font-mono">{config.tinNumber || companyInfo?.tinNumber || '0002032519'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-950">
                          <span>VAT:</span>
                          <span className="font-mono">{companyInfo?.vatNumber || companyInfo?.vat || config.tinNumber || '1023580012'}</span>
                        </div>
                      </div>

                      {/* Right-aligned Voucher Title */}
                      <div className="text-right mt-1.5 font-bold text-sm text-slate-950 tracking-tight">
                        {isCredit ? 'Credit Sales Voucher' : 'Cash Sales Voucher'}
                      </div>
                    </div>
                  </div>

                  {/* Two Metadata Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 my-3">
                    {/* Left Box: Customer Info */}
                    <div className="sm:col-span-7 border border-slate-800 rounded p-2.5 text-xs space-y-1 bg-white">
                      <div>
                        <span className="text-slate-600 font-semibold inline-block w-20">Customer:</span>
                        <span className="font-bold text-slate-950">{customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold inline-block w-20">Tin No.</span>
                        <span className="font-mono font-semibold text-slate-900">{customerTin || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold inline-block w-20">Address:</span>
                        <span className="text-slate-800">{customerAddress || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold inline-block w-20">FS / MRC:</span>
                        <span className="font-mono text-slate-900">
                          {fsNumber}, MRC No. {sale?.mrc || config.machineNo || 'FG10044280'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-semibold inline-block w-20">Remark:</span>
                        <span className="text-slate-800">{sale?.reference || sale?.notes || sale?.remark || '—'}</span>
                      </div>
                    </div>

                    {/* Right Box: Voucher Details */}
                    <div className="sm:col-span-5 border border-slate-800 rounded p-2.5 text-xs space-y-1 bg-white">
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-semibold">Voucher No:</span>
                        <span className="font-mono font-bold text-slate-950">{invoiceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-semibold">Date:</span>
                        <span className="font-mono text-slate-900">{dateStr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-semibold">Store:</span>
                        <span className="text-slate-900 font-medium">{sale?.storeLocation || sale?.store || 'Main Store'}</span>
                      </div>
                      {isCredit && (
                        <div className="flex justify-between text-amber-800 font-semibold pt-0.5 border-t border-slate-200">
                          <span>Term:</span>
                          <span>Credit Sale</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-slate-800 rounded overflow-hidden my-3">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-950 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5 w-10 text-center border-r border-slate-300">SN</th>
                          <th className="py-1.5 px-2.5 w-28 border-r border-slate-300">Item Id</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-300">Description</th>
                          <th className="py-1.5 px-2.5 w-16 text-center border-r border-slate-300">Qty</th>
                          <th className="py-1.5 px-2.5 w-24 text-right border-r border-slate-300">Price</th>
                          <th className="py-1.5 px-2.5 w-28 text-right">Amount (ETB)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900">
                        {processedItems.map((it, idx) => {
                          const rawItem = (sale?.items && sale.items[idx]) || {};
                          const itemId = rawItem.code || rawItem.material?.code || it.code || `IT-${String(idx + 1).padStart(5, '0')}`;
                          return (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-700 border-r border-slate-200">{itemId}</td>
                              <td className="py-1.5 px-2.5 font-semibold border-r border-slate-200">
                                {it.desc} {it.uom ? `[${it.uom}]` : ''}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono font-bold border-r border-slate-200">{it.qty}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-200">{formatNumber(it.price, 2)}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-bold">{formatNumber(it.amount, 2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex justify-end my-2">
                    <div className="w-72 border border-slate-800 rounded p-2 text-xs space-y-1 bg-white">
                      <div className="flex justify-between text-slate-700">
                        <span>Taxable Amount (TXBL1):</span>
                        <span className="font-mono font-medium">ETB {formatNumber(taxable, 2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>VAT (TAX1 {config.taxRate}%):</span>
                        <span className="font-mono font-medium">ETB {formatNumber(taxAmount, 2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 text-sm pt-1 border-t border-slate-300">
                        <span>Total (ETB):</span>
                        <span className="font-mono">ETB {formatNumber(totalRevenue, 2)}</span>
                      </div>
                      {isCredit && (
                        <div className="pt-1 border-t border-slate-200 space-y-0.5 text-[11px]">
                          <div className="flex justify-between text-emerald-800 font-semibold">
                            <span>Amount Paid:</span>
                            <span className="font-mono">ETB {formatNumber(sale?.amountPaid || 0, 2)}</span>
                          </div>
                          <div className="flex justify-between text-rose-800 font-bold">
                            <span>Balance Due:</span>
                            <span className="font-mono">ETB {formatNumber(Math.max(0, totalRevenue - (Number(sale?.amountPaid) || 0)), 2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Workflow Operators, Notice, and Footer (Compact & Space-Optimized) */}
                <div className="mt-4 pt-2">
                  {/* Voucher Operators Section */}
                  <div className="font-bold text-slate-950 text-xs mb-1.5 tracking-tight">
                    Voucher Operators
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs py-2 px-3 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Prepared by:</span>
                      <span className="font-bold text-slate-950">{preparedByName}</span>
                      <span className="text-slate-500 font-mono text-[10px]">on {preparedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Approved by:</span>
                      <span className="font-bold text-slate-950">
                        {approvedByName !== '—' ? approvedByName : 'System / Manager'}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {approvedDate ? `on ${approvedDate}` : (sale?.status === 'approved' || sale?.approvedBy ? 'Approved' : 'Pending')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Received by:</span>
                      <span className="font-bold text-slate-950">{customerName}</span>
                      <span className="text-slate-500 text-[10px] font-medium">(Customer Acceptance)</span>
                    </div>
                  </div>

                  {/* Centered Notice */}
                  <div className="text-center font-bold text-slate-900 text-xs tracking-wide py-1.5 uppercase">
                    INVALID WITHOUT FISCAL OR Refund ATTACHED
                  </div>

                  {/* Bottom Divider Line */}
                  <div className="border-b border-slate-900 my-0.5" />

                  {/* Bottom Footer Bar */}
                  <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono pt-0.5">
                    <span>
                      ERP System Made By {companyInfo?.companyName || 'Sharp Plus Trading PLC'} System
                    </span>
                    <span>1/1</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
