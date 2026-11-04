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
} from 'lucide-react';
import {
  generateThermalReceiptText,
  exportBillToTXT,
  exportBillToCSV,
  exportBillToExcel,
  exportBillToJSON,
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
    machineNo: 'SPM00000189',
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

  if (!open || !sale) return null;

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

  const fsNumber =
    config.fsNo ||
    sale?.fsNo ||
    (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') ||
    `FS No.${String(sale?.voucherNo || '00000001').replace(/\D/g, '').padStart(8, '0').slice(-8)}`;

  const dateStr = formatFiscalDate(sale?.date);

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0 ? rawItems : [
    {
      description: 'Sales Item',
      name: 'Sales Item',
      quantity: 1,
      sellingPrice: Number(sale?.totalRevenue || sale?.totalAmount || 0),
      totalRevenue: Number(sale?.totalRevenue || sale?.totalAmount || 0),
    },
  ];

  // Processed Items and Financial Calculations
  const { totalRevenue, taxable, taxAmount, processedItems } = useMemo(() => {
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

  const receiptText = generateThermalReceiptText(sale, {
    ...config,
    fsNo: fsNumber,
  });

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

  const handleExportPDF = () => {
    handlePrint();
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
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
                    Export Formats
                  </div>

                  {/* PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportPDF();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    <FileText size={16} className="text-red-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export PDF</div>
                      <div className="text-[10px] text-slate-400">Printable invoice document</div>
                    </div>
                  </button>

                  {/* Excel (.xlsx) */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportBillToExcel(sale, config);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export Excel (.XLSX)</div>
                      <div className="text-[10px] text-slate-400">Structured spreadsheet data</div>
                    </div>
                  </button>

                  {/* CSV (.csv) */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportBillToCSV(sale, config);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    <Download size={16} className="text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export CSV (.CSV)</div>
                      <div className="text-[10px] text-slate-400">Tabular transaction data</div>
                    </div>
                  </button>

                  {/* Text (.txt) */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportBillToTXT(sale, config);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    <FileCode size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export Text (.TXT)</div>
                      <div className="text-[10px] text-slate-400">Plain-text receipt slip</div>
                    </div>
                  </button>

                  {/* JSON (.json) */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportBillToJSON(sale, config);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                  >
                    <FileText size={16} className="text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Export JSON (.JSON)</div>
                      <div className="text-[10px] text-slate-400">Structured transaction data</div>
                    </div>
                  </button>

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
                        machineNo: 'SPM00000189',
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
                      <label className="text-[10px] text-slate-400 block mb-0.5">Machine No</label>
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

              {/* FS No & Date */}
              <div className="flex justify-between items-center text-[11px] font-bold mt-2 pb-1 text-slate-900">
                <span>{fsNumber}</span>
                <span>DATE: {dateStr}</span>
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
              <div className="flex justify-between text-[11px] pt-1 text-slate-800">
                <span>ITEM#</span>
                <span className="font-mono">{processedItems.length}</span>
              </div>

              {/* Fiscal Machine Mark */}
              <div className="text-center mt-3 space-y-0.5 text-[11px] font-bold text-slate-900">
                <div>{fsNumber}</div>
                <div>MACHINE: {config.machineNo || 'SPM00000189'}</div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2.5 text-[10px] tracking-wide text-slate-500">
                Powered By {config.poweredBy || 'Sharp Plus System'}
              </div>
            </div>
          )}

          {/* ────── MODE B: A4 Standard Invoice Document ────── */}
          {viewMode === 'a4' && (
            <div
              className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 border border-slate-200 select-text my-2"
              style={{ minHeight: '800px' }}
            >
              {/* Corporate Invoice Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between pb-6 border-b-2 border-blue-600 gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {(config.companyLines || []).join(' ') || 'Sharp Plus Trading PLC'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {config.addressLine1}{config.addressLine2 ? ` • ${config.addressLine2}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {config.phone}
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    TIN: <span className="font-mono">{config.tinNumber || '0089234125'}</span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      isZeroing
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : isCredit
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isZeroing ? 'Zeroing Voucher' : (isCredit ? 'Credit Sales Invoice' : 'Cash Sales Invoice')}
                  </span>
                  <div className="text-lg font-black font-mono text-slate-900 mt-2">
                    {invoiceNo}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-500">
                    {fsNumber}
                  </div>
                </div>
              </div>

              {/* Invoice & Customer Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 pb-1 border-b border-slate-200">
                    Billed To (Customer)
                  </div>
                  <div className="text-sm font-bold text-slate-900">{customerName}</div>
                  {customerTin && (
                    <div className="text-slate-600">
                      TIN: <span className="font-mono font-semibold text-slate-800">{customerTin}</span>
                    </div>
                  )}
                  {customerPhone && (
                    <div className="text-slate-600">Tel: {customerPhone}</div>
                  )}
                  {customerAddress && (
                    <div className="text-slate-600">Address: {customerAddress}</div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 pb-1 border-b border-slate-200">
                    Invoice Details
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issue Date:</span>
                    <span className="font-medium text-slate-900">{dateStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Term:</span>
                    <span className="font-bold text-slate-900">{isCredit ? 'Credit Sale' : 'Cash'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sales Operator:</span>
                    <span className="font-medium text-slate-900">{config.operator || 'System Operator'}</span>
                  </div>
                  {isCredit && sale?.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-bold text-amber-700">{new Date(sale.dueDate).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 w-16 text-center">UOM</th>
                      <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Unit Price (ETB)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Amount (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{it.desc}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.uom}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">{it.qty}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">{formatNumber(it.price, 2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(it.amount, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Card */}
              <div className="flex justify-end my-6">
                <div className="w-full sm:w-80 rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base (TXBL1):</span>
                    <span className="font-mono font-medium">ETB {formatNumber(taxable, 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (TAX1 {config.taxRate}%):</span>
                    <span className="font-mono font-medium">ETB {formatNumber(taxAmount, 2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-blue-700">ETB {formatNumber(totalRevenue, 2)}</span>
                  </div>
                  {isCredit && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Advanced Paid:</span>
                        <span className="font-mono">ETB {formatNumber(sale?.amountPaid || 0, 2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>Balance Due:</span>
                        <span className="font-mono">ETB {formatNumber(Math.max(0, totalRevenue - (Number(sale?.amountPaid) || 0)), 2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures & Fiscal Mark */}
              <div className="grid grid-cols-3 gap-6 pt-10 mt-8 border-t border-slate-200 text-center text-xs text-slate-500">
                <div>
                  <div className="h-10 border-b border-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-700">Prepared By</span>
                </div>
                <div>
                  <div className="h-10 border-b border-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-700">Checked &amp; Approved</span>
                </div>
                <div>
                  <div className="h-10 border-b border-slate-300 mb-1.5" />
                  <span className="font-semibold text-slate-700">Customer Received</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-400 mt-10 pt-4 border-t border-dashed border-slate-200">
                {fsNumber} • MACHINE: {config.machineNo || 'SPM00000189'} • Powered by Sharp Plus System
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
