import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  X,
  Settings as SettingsIcon,
  Sun,
  Moon,
  ChevronDown,
  Building,
  RotateCcw,
} from 'lucide-react';
import {
  generateThermalReceiptText,
  exportBillToTXT,
  exportBillToCSV,
  exportBillToExcel,
  exportBillToJSON,
  openThermalPrintWindow,
  formatFiscalDate,
  formatNumber,
  toAsteriskAmount,
  toCaretTotal,
} from '../../utils/thermalBillUtils';
import { useAuth } from '../../context/AuthContext';

const PRESETS = {
  sharpplus: {
    name: 'Sharp Plus Trading PLC',
    tinNumber: '0089234125',
    companyLines: [
      '^S^H^A^R^P^ ^P^L^U^S^',
      '^T^R^A^D^I^N^G^ ^P^L^C^',
    ],
    addressLine1: 'ADDIS ABABA, BOLE MEDHANIALEM',
    addressLine2: 'COMMERCIAL CENTER 4TH FLOOR',
    phone: 'TEL-+251 91 100 0111',
    machineNo: 'SPM00000189',
    poweredBy: 'Sharp Plus System',
  },
  dire: {
    name: 'Dire Multipurpose Farmers Coop',
    tinNumber: '0000000001',
    companyLines: [
      '^D^I^R^E^',
      '^M^U^L^T^I^P^U^R^P^O^S^E^',
      '^F^A^R^M^E^R^S^',
      '^C^O^O^P^E^R^A^T^I^V^E^',
      '^S^O^.^U^N^I^O^N^',
    ],
    addressLine1: 'DIRE DAWA,K-03,H.NO-NEW',
    addressLine2: 'KAZIRA TECKET OFFICE AREA',
    phone: 'TEL-0251 11 11 76',
    machineNo: 'MGM00000001',
    poweredBy: 'Mega Cloud',
  },
};

export default function ThermalBillModal({ open, onClose, sale }) {
  const { user } = useAuth();
  const [activePreset, setActivePreset] = useState('sharpplus');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('pos_blue'); // 'pos_blue' (like image) or 'paper_white'
  const [showConfig, setShowConfig] = useState(false);

  // Custom configuration fields - default to Sharp Plus Trading PLC
  const [config, setConfig] = useState({
    tinNumber: PRESETS.sharpplus.tinNumber,
    companyLines: PRESETS.sharpplus.companyLines,
    addressLine1: PRESETS.sharpplus.addressLine1,
    addressLine2: PRESETS.sharpplus.addressLine2,
    phone: PRESETS.sharpplus.phone,
    machineNo: PRESETS.sharpplus.machineNo,
    poweredBy: PRESETS.sharpplus.poweredBy,
    operator: user?.name || 'Sharp Plus Admin',
    taxRate: sale?.taxRate !== undefined ? Number(sale.taxRate) : 15,
    fsNo: '',
  });

  // Sync with sale tax rate and fsNo when sale changes
  React.useEffect(() => {
    if (sale) {
      const defaultTax = sale.taxRate !== undefined ? Number(sale.taxRate) : 15;
      setConfig((prev) => ({
        ...prev,
        taxRate: defaultTax,
        operator: user?.name || prev.operator || 'Sharp Plus Admin',
        fsNo: sale.fsNo || prev.fsNo || '',
      }));
    }
  }, [sale, user]);

  const handleApplyPreset = (key) => {
    setActivePreset(key);
    const p = PRESETS[key] || PRESETS.sharpplus;
    setConfig((prev) => ({
      ...prev,
      tinNumber: p.tinNumber,
      companyLines: p.companyLines,
      addressLine1: p.addressLine1,
      addressLine2: p.addressLine2,
      phone: p.phone,
      machineNo: p.machineNo,
      poweredBy: p.poweredBy,
    }));
  };

  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Walk-in Customer';

  const invoiceNo =
    sale?.voucherNo ||
    (isCredit ? 'CRSALE-00001' : 'CSALE-00001');

  const fsNumber =
    config.fsNo ||
    sale?.fsNo ||
    (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') ||
    `FS No.${String(sale?.voucherNo || '00000001').replace(/\D/g, '').padStart(8, '0').slice(-8)}`;

  const dateStr = formatFiscalDate(sale?.date);

  const rawItems = sale?.items || [];
  const items = useMemo(() => {
    if (rawItems.length > 0) return rawItems;
    return [
      {
        description: 'Queen Exculuder',
        name: 'Queen Exculuder',
        quantity: 4,
        sellingPrice: 434.79,
        total: 1739.16,
      },
    ];
  }, [rawItems]);

  // Calculations in parallel with sales
  const { totalRevenue, taxable, taxAmount, processedItems } = useMemo(() => {
    let rev = 0;
    const list = items.map((it) => {
      const desc = it.description || it.material?.name || it.material || it.name || 'Item';
      const qty = Number(it.quantity || 1);
      const price = Number(it.sellingPrice || it.unitCost || 0);
      const amount = Number(it.totalRevenue || it.total || qty * price);
      rev += amount;
      return { desc, qty, price, amount };
    });

    if (sale?.totalRevenue && Number(sale.totalRevenue) > 0) {
      rev = Number(sale.totalRevenue);
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

  if (!open || !sale) return null;

  const receiptText = generateThermalReceiptText(sale, {
    ...config,
    fsNo: fsNumber,
  });

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isBlue = theme === 'pos_blue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── Modal Header Bar ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Printer size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                <span>Fiscal Bill / Cash Register Invoice</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    isCredit
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isCredit ? 'Credit Sale' : 'Cash Sale'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                80mm POS thermal slip preview, high-resolution printing, and multi-format exports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <button
              onClick={() => setTheme(isBlue ? 'paper_white' : 'pos_blue')}
              title={isBlue ? 'Switch to Classic Thermal White' : 'Switch to Photo POS Blue'}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1.5 transition"
            >
              {isBlue ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-blue-400" />}
              <span className="hidden sm:inline">{isBlue ? 'Paper White' : 'POS Blue'}</span>
            </button>

            {/* Config Toggle */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                showConfig
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Customize bill header, TIN, and machine details"
            >
              <SettingsIcon size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Main Workspace Body ── */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left / Center: Thermal Receipt Slip Render */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-start bg-slate-950/40 overflow-y-auto">
            {/* Visual Receipt Paper Container */}
            <div
              id="fiscal-thermal-slip"
              className={`w-full max-w-[340px] rounded-xl shadow-2xl p-5 select-text font-mono text-xs leading-relaxed transition-all duration-200 border ${
                isBlue
                  ? 'bg-[#1e3a5f] text-slate-100 border-[#2f558a] shadow-blue-950/50'
                  : 'bg-white text-slate-900 border-slate-300 shadow-slate-950/30'
              }`}
              style={{
                fontFamily:
                  "'Consolas', 'Courier New', 'Lucida Console', Monaco, monospace",
              }}
            >
              {/* TIN Header */}
              <div className="font-bold tracking-wider">
                TIN: {config.tinNumber || '0000000001'}
              </div>

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* Caret Organization Lines */}
              <div className="text-center font-bold tracking-widest text-[13px] leading-tight my-1">
                {config.companyLines.map((line, idx) => (
                  <div key={idx} className="whitespace-nowrap">
                    {line}
                  </div>
                ))}
              </div>

              {/* Address & Tel */}
              <div className="text-center text-[11px] font-medium mt-1 leading-snug">
                <div>{config.addressLine1}</div>
                {config.addressLine2 && <div>{config.addressLine2}</div>}
                <div>{config.phone}</div>
              </div>

              {/* FS No & Date */}
              <div className="flex justify-between items-center text-[11px] font-bold mt-2 pb-1">
                <span>{fsNumber}</span>
                <span>DATE: {dateStr}</span>
              </div>

              {/* Invoice Type Divider */}
              <div className="text-center font-bold tracking-tight text-[12px] my-2">
                {isCredit
                  ? '============== CREDIT INVOICE =============='
                  : '============== CASH INVOICE =============='}
              </div>

              {/* Metadata */}
              <div className="text-[11px] space-y-0.5 mb-1.5">
                <div>Customer: {customerName}</div>
                <div>Invoice: {invoiceNo}</div>
                <div>Operator: {config.operator || 'Samire'}</div>
              </div>

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* Items Column Header - Parallel with values */}
              <div className="flex items-center font-bold text-[11px] tracking-wider py-0.5">
                <span className="flex-1 text-left">Description</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-24 text-right">Price</span>
                <span className="w-28 text-right">AMOUNT</span>
              </div>

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* Line Items - strictly parallel with headers */}
              <div className="space-y-1.5 my-1 text-[11px]">
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

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* Taxable & Tax breakdown */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>TXBL1</span>
                  <span>{toAsteriskAmount(taxable, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX1 {config.taxRate}%</span>
                  <span>{toAsteriskAmount(taxAmount, 2)}</span>
                </div>
              </div>

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* TOTAL */}
              <div className="flex justify-between font-bold text-[13px] py-0.5">
                <span>^T^O^T^A^L</span>
                <span>{toCaretTotal(totalRevenue)}</span>
              </div>

              <div
                className={`my-1 border-b ${
                  isBlue ? 'border-dashed border-slate-400/50' : 'border-dashed border-slate-400'
                }`}
              />

              {/* Payment Mode */}
              <div className="space-y-1 text-[11px]">
                {isCredit ? (
                  <>
                    <div className="flex justify-between font-bold">
                      <span>^C^R^E^D^I^T</span>
                      <span>{toCaretTotal(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PAID</span>
                      <span>{toAsteriskAmount(sale?.amountPaid || 0, 2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-300">
                      <span>BALANCE DUE</span>
                      <span>
                        {toAsteriskAmount(
                          Math.max(0, totalRevenue - (Number(sale?.amountPaid) || 0)),
                          2
                        )}
                      </span>
                    </div>
                    {sale?.dueDate && (
                      <div className="flex justify-between text-[10px]">
                        <span>DUE DATE</span>
                        <span>{new Date(sale.dueDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span>^C^A^S^H</span>
                    <span>{toCaretTotal(totalRevenue)}</span>
                  </div>
                )}
              </div>

              {/* Items count */}
              <div className="flex justify-between text-[11px] pt-1">
                <span>ITEM#</span>
                <span>{processedItems.length}</span>
              </div>

              {/* Fiscal Machine Mark */}
              <div className="text-center mt-3 space-y-0.5 text-[11px] font-bold">
                <div>{fsNumber}</div>
                <div>MACHINE: {config.machineNo || 'SPM00000189'}</div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2.5 text-[10px] tracking-wide text-slate-400/80">
                Powered By {config.poweredBy || 'Sharp Plus System'}
              </div>
            </div>
          </div>

          {/* Right Panel: Export Options & Live Settings */}
          <div className="lg:col-span-5 p-5 bg-slate-900/90 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Presets Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Header &amp; Organization Preset:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('sharpplus')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                      activePreset === 'sharpplus'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Sharp Plus Trading</div>
                    <div className="text-[10px] text-slate-400 truncate">PLC Stock Control</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('dire')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                      activePreset === 'dire'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Dire Multipurpose</div>
                    <div className="text-[10px] text-slate-400 truncate">Farmers Coop Union</div>
                  </button>
                </div>
              </div>

              {/* Configuration Fields Drawer */}
              {showConfig && (
                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-slate-200 font-bold text-[11px]">
                    <span>Custom Bill Properties</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(activePreset)}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">TIN Number</label>
                      <input
                        type="text"
                        value={config.tinNumber}
                        onChange={(e) => setConfig({ ...config, tinNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">FS Number</label>
                      <input
                        type="text"
                        value={config.fsNo}
                        placeholder={fsNumber}
                        onChange={(e) => setConfig({ ...config, fsNo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Operator Name</label>
                      <input
                        type="text"
                        value={config.operator}
                        onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Machine ID</label>
                      <input
                        type="text"
                        value={config.machineNo}
                        onChange={(e) => setConfig({ ...config, machineNo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tax Rate (%)</label>
                      <select
                        value={config.taxRate}
                        onChange={(e) => setConfig({ ...config, taxRate: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value={15}>15% Standard VAT (Default)</option>
                        <option value={0}>0% Tax Exempt</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Powered By Footer</label>
                      <input
                        type="text"
                        value={config.poweredBy}
                        onChange={(e) => setConfig({ ...config, poweredBy: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Main Printing Action Button ── */}
              <div>
                <button
                  type="button"
                  onClick={() => openThermalPrintWindow(sale, config)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition transform active:scale-[0.99]"
                >
                  <Printer size={18} />
                  Print Thermal Bill (80mm / PDF)
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Opens high-resolution thermal receipt dialog ready for POS receipt printer or Print-to-PDF.
                </p>
              </div>

              {/* ── Export Formats Section ── */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Export in Different File Formats:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* Export TXT */}
                  <button
                    type="button"
                    onClick={() => exportBillToTXT(sale, config)}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 transition hover:border-slate-500"
                  >
                    <FileText size={16} className="text-amber-400 flex-shrink-0" />
                    <div className="text-left">
                      <div>Export .TXT</div>
                      <div className="text-[10px] text-slate-400">Plain text POS slip</div>
                    </div>
                  </button>

                  {/* Export Excel (.xlsx) */}
                  <button
                    type="button"
                    onClick={() => exportBillToExcel(sale, config)}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 transition hover:border-slate-500"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-400 flex-shrink-0" />
                    <div className="text-left">
                      <div>Export .XLSX</div>
                      <div className="text-[10px] text-slate-400">Excel spreadsheet</div>
                    </div>
                  </button>

                  {/* Export CSV (.csv) */}
                  <button
                    type="button"
                    onClick={() => exportBillToCSV(sale, config)}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 transition hover:border-slate-500"
                  >
                    <Download size={16} className="text-cyan-400 flex-shrink-0" />
                    <div className="text-left">
                      <div>Export .CSV</div>
                      <div className="text-[10px] text-slate-400">Comma-separated</div>
                    </div>
                  </button>

                  {/* Export JSON (.json) */}
                  <button
                    type="button"
                    onClick={() => exportBillToJSON(sale, config)}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-2 transition hover:border-slate-500"
                  >
                    <FileText size={16} className="text-purple-400 flex-shrink-0" />
                    <div className="text-left">
                      <div>Export .JSON</div>
                      <div className="text-[10px] text-slate-400">Structured invoice data</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Copy plain text to clipboard */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full py-2 px-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-xs text-slate-300 hover:text-white font-medium flex items-center justify-center gap-2 transition"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">
                      Receipt Text Copied to Clipboard!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-slate-400" />
                    Copy Bill Text (for Telegram / WhatsApp)
                  </>
                )}
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Close Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
