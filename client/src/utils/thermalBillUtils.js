import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

/**
 * Standard Export Formats with file extensions and metadata
 */
export const EXPORT_FORMATS = [
  {
    id: 'pdf',
    ext: '.PDF',
    name: 'PDF Document',
    desc: 'Official printable vector invoice document',
    mime: 'application/pdf',
    badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
  },
  {
    id: 'xlsx',
    ext: '.XLSX',
    name: 'Excel Spreadsheet',
    desc: 'Structured accounting worksheet with formulas',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
  {
    id: 'doc',
    ext: '.DOC',
    name: 'Word Document',
    desc: 'Editable Microsoft Word corporate document',
    mime: 'application/msword',
    badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  },
  {
    id: 'csv',
    ext: '.CSV',
    name: 'CSV Tabular Data',
    desc: 'Comma-separated values for database import',
    mime: 'text/csv',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  },
  {
    id: 'txt',
    ext: '.TXT',
    name: 'Plain Text Slip',
    desc: 'Thermal 80mm plain-text receipt layout',
    mime: 'text/plain',
    badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  {
    id: 'json',
    ext: '.JSON',
    name: 'Structured JSON',
    desc: 'Standardized ERP interchange data schema',
    mime: 'application/json',
    badgeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  },
];

/**
 * Format a number to standard 2 decimal currency string: 1,739.16
 */
export const formatNumber = (num, decimals = 2) => {
  const n = Number(num || 0);
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format string cleanly without carets
 */
export const toCaretSpaced = (str = '') => {
  if (!str) return '';
  return String(str).trim().replace(/\^/g, '');
};

/**
 * Format amount with asterisk prefix: 1739.16 -> "*1,739.16"
 */
export const toAsteriskAmount = (num, decimals = 2) => {
  return `*${formatNumber(num, decimals)}`;
};

/**
 * Format total amount without carets
 */
export const toCaretTotal = (num) => {
  return toAsteriskAmount(num, 2);
};

/**
 * Format date for fiscal receipt: "29/09/2026 15:15"
 */
export const formatFiscalDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB');

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${mins}`;
};

/**
 * Generate formatted plain-text fiscal thermal bill (approx 42-45 chars width)
 */
export const generateThermalReceiptText = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const tin = config.tinNumber || sale?.customer?.tinNumber || '0089234125';
  const companyLines = config.companyLines || [
    'SHARP PLUS',
    'TRADING PLC',
  ];
  const addressLine1 = config.addressLine1 || 'ADDIS ABABA, BOLE MEDHANIALEM';
  const addressLine2 = config.addressLine2 || 'COMMERCIAL CENTER 4TH FLOOR';
  const phone = config.phone || 'TEL-+251 91 100 0111';
  const fsNo =
    config.fsNo ||
    sale?.fsNo ||
    (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') ||
    `FS No.${String(sale?.voucherNo || '00000001').replace(/\D/g, '').padStart(8, '0').slice(-8)}`;
  const dateStr = formatFiscalDate(sale?.date);

  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Walk-in Customer';
  const invoiceNo =
    sale?.voucherNo ||
    (isCredit ? 'CRSALE-00001' : 'CSALE-00001');
  const operator =
    config.operator ||
    sale?.performedBy?.name ||
    'Sharp Plus Admin';

  const taxRate = typeof config.taxRate === 'number'
    ? config.taxRate
    : (sale?.taxRate !== undefined ? Number(sale.taxRate) : 15); // Default 15% Standard VAT

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0 ? rawItems : [
    {
      description: 'Queen Exculuder',
      name: 'Queen Exculuder',
      quantity: 4,
      sellingPrice: 434.79,
      total: 1739.16,
    },
  ];

  let totalRevenue = 0;
  const processedItems = items.map((it) => {
    const desc = it.description || it.material?.name || it.material || it.name || 'Item';
    const qty = Number(it.quantity || 1);
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = it.totalRevenue || it.total || qty * price;
    totalRevenue += amount;
    return { desc, qty, price, amount };
  });

  if (sale?.totalRevenue && Number(sale.totalRevenue) > 0) {
    totalRevenue = Number(sale.totalRevenue);
  }

  // Tax calculation in parallel with sales
  let taxable = totalRevenue;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = totalRevenue / (1 + taxRate / 100);
      taxAmount = totalRevenue - taxable;
    }
  }

  const invoiceHeader = isCredit
    ? '============= CREDIT INVOICE ============='
    : '============== CASH INVOICE =============';

  const divider = '-----------------------------------------';
  const doubleDivider = '=========================================';

  let txt = '';
  txt += `TIN: ${tin}\n`;
  txt += `${divider}\n`;

  companyLines.map((l) => String(l || "").replace(/\^/g, "")).forEach((l) => {
    txt += `${l}\n`;
  });

  txt += `${addressLine1}\n`;
  if (addressLine2) txt += `${addressLine2}\n`;
  txt += `${phone}\n`;
  txt += `${fsNo}    DATE: ${dateStr}\n\n`;

  txt += `${invoiceHeader}\n`;
  txt += `Customer: ${customerName}\n`;
  txt += `Invoice: ${invoiceNo}\n`;
  txt += `Operator: ${operator}\n`;
  txt += `${divider}\n`;
  txt += `Description          Qty       Price        AMOUNT\n`;
  txt += `${divider}\n`;

  processedItems.forEach((it) => {
    const qtyStr = String(it.qty).padStart(4, ' ');
    const priceStr = formatNumber(it.price, 2).padStart(12, ' ');
    const amtStr = toAsteriskAmount(it.amount, 2).padStart(14, ' ');

    if (it.desc.length <= 18) {
      txt += `${it.desc.padEnd(18, ' ')}${qtyStr}${priceStr}${amtStr}\n`;
    } else {
      txt += `${it.desc}\n${''.padEnd(18, ' ')}${qtyStr}${priceStr}${amtStr}\n`;
    }
  });

  txt += `${divider}\n`;
  txt += `TXBL1                       ${toAsteriskAmount(taxable, 2).padStart(18, ' ')}\n`;
  txt += `TAX1 ${taxRate}%                     ${toAsteriskAmount(taxAmount, 2).padStart(18, ' ')}\n`;
  txt += `${divider}\n`;
  txt += `TOTAL                       ${toAsteriskAmount(totalRevenue, 2).padStart(18, ' ')}\n`;
  txt += `${divider}\n`;

  if (isCredit) {
    const paid = Number(sale?.amountPaid || 0);
    const balance = Math.max(0, totalRevenue - paid);
    txt += `CREDIT                      ${toAsteriskAmount(totalRevenue, 2).padStart(18, ' ')}\n`;
    txt += `PAID                        ${toAsteriskAmount(paid, 2).padStart(18, ' ')}\n`;
    txt += `BALANCE DUE                 ${toAsteriskAmount(balance, 2).padStart(18, ' ')}\n`;
    if (sale?.dueDate) {
      txt += `DUE DATE:                   ${new Date(sale.dueDate).toLocaleDateString('en-GB')}\n`;
    }
  } else {
    txt += `CASH                        ${toAsteriskAmount(totalRevenue, 2).padStart(18, ' ')}\n`;
  }

  txt += `ITEM#                               ${String(processedItems.length).padStart(4, ' ')}\n`;
  txt += `${divider}\n`;
  txt += `${fsNo}\n`;
  txt += `MACHINE: ${config.machineNo || 'SPM00000189'}\n`;
  txt += `Powered By ${config.poweredBy || 'Sharp Plus System'}\n`;

  return txt;
};

/**
 * Export bill as official PDF Document (.pdf) using jsPDF
 */
export const exportBillToPDF = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const invoiceNo = sale?.voucherNo || (isCredit ? 'CRSALE-00001' : 'CSALE-00001');
  const companyName = (config.companyLines || [])[0] || 'SHARP PLUS TRADING PLC';
  const tin = config.tinNumber || '0089234125';
  const address = `${config.addressLine1 || 'Addis Ababa, Bole Medhanialem'}, ${config.addressLine2 || 'Commercial Center 4th Floor'}`;
  const phone = config.phone || 'Tel: +251 91 100 0111';
  const customerName = sale?.customerName || (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) || 'Walk-in Customer';
  const customerTin = sale?.tin || sale?.customerTin || 'N/A';
  const dateStr = formatFiscalDate(sale?.date);
  const operator = config.operator || sale?.performedBy?.name || 'System Operator';
  const fsNo = config.fsNo || sale?.fsNo || (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') || `FS No.${String(sale?.voucherNo || '00000001').replace(/\D/g, '').padStart(8, '0').slice(-8)}`;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(companyName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${address} | ${phone}`, 14, 19);
  doc.text(`TIN: ${tin} | Machine: ${config.machineNo || 'SPM00000189'} | ${fsNo}`, 14, 25);

  // Document Title
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(isCredit ? 'CREDIT SALES INVOICE (ACCOUNTS RECEIVABLE)' : 'OFFICIAL FISCAL CASH SALES INVOICE', 14, 40);

  // Metadata Grid
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, 182, 22, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice #:', 18, 51);
  doc.text('Fiscal Slip #:', 18, 57);
  doc.text('Date & Time:', 18, 63);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(invoiceNo, 40, 51);
  doc.text(fsNo, 40, 57);
  doc.text(dateStr, 40, 63);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Customer:', 105, 51);
  doc.text('Customer TIN:', 105, 57);
  doc.text('Operator / Cashier:', 105, 63);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(customerName.slice(0, 36), 136, 51);
  doc.text(customerTin || 'N/A', 136, 57);
  doc.text(operator, 136, 63);

  // Line Items Table Header
  let y = 73;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 8, 196, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('#', 17, y + 5.5);
  doc.text('Item Description / Material', 28, y + 5.5);
  doc.text('Qty', 118, y + 5.5, { align: 'right' });
  doc.text('Unit Price (ETB)', 152, y + 5.5, { align: 'right' });
  doc.text('Amount (ETB)', 192, y + 5.5, { align: 'right' });

  // Line Items Table Rows
  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0
    ? rawItems
    : [{ description: 'Sales Item', quantity: 1, sellingPrice: Number(sale?.totalRevenue || 0) }];

  let subtotal = 0;
  items.forEach((it, idx) => {
    const desc = it.description || it.material?.name || it.material || it.name || `Item ${idx + 1}`;
    const qty = Number(it.quantity || 1);
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = Number(it.totalRevenue || it.total || it.totalCost || qty * price);
    subtotal += amount;

    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.text(String(idx + 1), 17, y);
    doc.text(desc.slice(0, 48), 28, y);
    doc.text(formatNumber(qty, 2), 118, y, { align: 'right' });
    doc.text(formatNumber(price, 2), 152, y, { align: 'right' });
    doc.text(formatNumber(amount, 2), 192, y, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 2, 196, y + 2);
    y += 7.5;
  });

  // Summary Card
  const taxRate = typeof config.taxRate === 'number'
    ? config.taxRate
    : (sale?.taxRate !== undefined ? Number(sale.taxRate) : 15);

  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = subtotal / (1 + taxRate / 100);
      taxAmount = subtotal - taxable;
    }
  }

  y += 5;
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  const summaryHeight = isCredit ? 44 : 32;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, y, 86, summaryHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(110, y, 86, summaryHeight, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Taxable Base (TXBL1):', 114, y + 7);
  doc.text(`ETB ${formatNumber(taxable, 2)}`, 192, y + 7, { align: 'right' });

  doc.text(`Fiscal VAT (${taxRate}%):`, 114, y + 14);
  doc.text(`ETB ${formatNumber(taxAmount, 2)}`, 192, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 114, y + 23);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`ETB ${formatNumber(subtotal, 2)}`, 192, y + 23, { align: 'right' });

  if (isCredit) {
    const paid = Number(sale?.amountPaid || 0);
    const balance = Math.max(0, subtotal - paid);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Advance Paid:', 114, y + 30);
    doc.text(`ETB ${formatNumber(paid, 2)}`, 192, y + 30, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('Credit Balance Due:', 114, y + 37);
    doc.text(`ETB ${formatNumber(balance, 2)}`, 192, y + 37, { align: 'right' });
  }

  // Footer & Machine Stamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Fiscal Document · Generated by Sharp Plus ERP · Machine: ${config.machineNo || 'SPM00000189'}`, 14, 287);

  doc.save(`${invoiceNo}.pdf`);
};

/**
 * Export bill as editable Microsoft Word Document (.doc)
 */
export const exportBillToWord = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const invoiceNo = sale?.voucherNo || (isCredit ? 'CRSALE-00001' : 'CSALE-00001');
  const companyName = (config.companyLines || [])[0] || 'SHARP PLUS TRADING PLC';
  const address = `${config.addressLine1 || 'Addis Ababa, Bole Medhanialem'}, ${config.addressLine2 || 'Commercial Center'}`;
  const phone = config.phone || '+251 91 100 0111';
  const customerName = sale?.customerName || 'Walk-in Customer';
  const dateStr = formatFiscalDate(sale?.date);
  const fsNo = config.fsNo || sale?.fsNo || (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') || 'FS No.00000001';

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0
    ? rawItems
    : [{ description: 'Sales Item', quantity: 1, sellingPrice: Number(sale?.totalRevenue || 0), total: Number(sale?.totalRevenue || 0) }];

  let subtotal = 0;
  const itemsRows = items.map((it, idx) => {
    const desc = it.description || it.material?.name || it.material || it.name || `Item ${idx + 1}`;
    const qty = Number(it.quantity || 1);
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = Number(it.totalRevenue || it.total || it.totalCost || qty * price);
    subtotal += amount;
    return `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px;">${desc}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: right;">${formatNumber(qty, 2)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: right;">${formatNumber(price, 2)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px; text-align: right; font-weight: bold;">${formatNumber(amount, 2)}</td>
      </tr>
    `;
  }).join('');

  const taxRate = typeof config.taxRate === 'number' ? config.taxRate : 15;
  const taxable = subtotal / (1 + taxRate / 100);
  const vat = subtotal - taxable;

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${invoiceNo}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 30px; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { color: #1e3a8a; font-size: 20pt; margin: 0 0 4px 0; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
        .meta-table td { padding: 4px; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
        table.items th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 9px; text-align: left; }
        .summary-box { float: right; width: 300px; margin-top: 20px; border: 1px solid #cbd5e1; padding: 14px; background-color: #f8fafc; font-size: 10pt; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName}</h1>
        <p style="margin: 0; color: #64748b; font-size: 9.5pt;">${address} | ${phone} | TIN: ${config.tinNumber || '0089234125'}</p>
      </div>

      <h2 style="font-size: 14pt; color: #1e293b; margin-top: 0;">${isCredit ? 'CREDIT SALES INVOICE' : 'CASH SALES INVOICE'}</h2>

      <table class="meta-table">
        <tr>
          <td style="width: 50%;"><strong>Invoice No:</strong> ${invoiceNo}<br><strong>Fiscal Slip:</strong> ${fsNo}<br><strong>Date:</strong> ${dateStr}</td>
          <td style="width: 50%;"><strong>Customer:</strong> ${customerName}<br><strong>Operator:</strong> ${config.operator || 'Operator'}<br><strong>Payment:</strong> ${isCredit ? 'Credit Settlement' : 'Cash Counter'}</td>
        </tr>
      </table>

      <table class="items">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Item Description</th>
            <th style="width: 70px; text-align: right;">Qty</th>
            <th style="width: 110px; text-align: right;">Unit Price (ETB)</th>
            <th style="width: 120px; text-align: right;">Total (ETB)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="summary-box">
        <p style="margin: 3px 0;">Taxable Base: <span style="float: right;">ETB ${formatNumber(taxable, 2)}</span></p>
        <p style="margin: 3px 0;">Fiscal VAT (${taxRate}%): <span style="float: right;">ETB ${formatNumber(vat, 2)}</span></p>
        <p style="margin: 8px 0 0 0; font-size: 12pt; color: #1d4ed8; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 6px;">Grand Total: <span style="float: right;">ETB ${formatNumber(subtotal, 2)}</span></p>
        ${isCredit ? `<p style="margin: 4px 0 0 0; color: #dc2626;">Balance Due: <span style="float: right;">ETB ${formatNumber(Math.max(0, subtotal - (sale?.amountPaid || 0)), 2)}</span></p>` : ''}
      </div>

      <div style="clear: both; margin-top: 50px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 8.5pt; color: #94a3b8; text-align: center;">
        ${fsNo} · Machine: ${config.machineNo || 'SPM00000189'} · Generated via Sharp Plus ERP System
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNo}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Universal export dispatcher by format id or extension
 */
export const exportBillByFormat = (formatId, sale, config = {}) => {
  const fmt = String(formatId || '').toLowerCase().replace(/^\./, '');
  switch (fmt) {
    case 'pdf':
      return exportBillToPDF(sale, config);
    case 'xlsx':
    case 'excel':
      return exportBillToExcel(sale, config);
    case 'doc':
    case 'docx':
    case 'word':
      return exportBillToWord(sale, config);
    case 'csv':
      return exportBillToCSV(sale, config);
    case 'txt':
    case 'text':
      return exportBillToTXT(sale, config);
    case 'json':
      return exportBillToJSON(sale, config);
    default:
      return exportBillToPDF(sale, config);
  }
};

/**
 * Export bill as plain-text file (.txt)
 */
export const exportBillToTXT = (sale, config = {}) => {
  const text = generateThermalReceiptText(sale, config);
  const invoiceNo = sale?.voucherNo || 'invoice';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNo}_receipt.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export bill as CSV (.csv)
 */
export const exportBillToCSV = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const invoiceNo = sale?.voucherNo || (isCredit ? 'CR-SALE' : 'CS-SALE');
  const dateStr = formatFiscalDate(sale?.date);
  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Walk-in Customer';

  const rows = [];
  rows.push(['TIN', config.tinNumber || '0000000001']);
  rows.push(['Company', (config.companyLines || []).join(' ') || 'Dire Multipurpose Farmers Cooperative Union']);
  rows.push(['Invoice No', invoiceNo]);
  rows.push(['Invoice Type', isCredit ? 'Credit Invoice' : 'Cash Invoice']);
  rows.push(['Date', dateStr]);
  rows.push(['Customer', customerName]);
  rows.push(['Operator', config.operator || sale?.performedBy?.name || 'Operator']);
  rows.push([]);
  rows.push(['#', 'Description', 'Quantity', 'Unit Price', 'Amount (ETB)']);

  const items = (sale?.items && sale.items.length > 0)
    ? sale.items
    : [
        {
          description: 'Item',
          quantity: 1,
          sellingPrice: sale?.totalRevenue || 0,
          total: sale?.totalRevenue || 0,
        },
      ];

  let subtotal = 0;
  items.forEach((it, idx) => {
    const desc = it.description || it.material?.name || it.name || `Item ${idx + 1}`;
    const qty = Number(it.quantity || 1);
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = Number(it.totalRevenue || it.total || qty * price);
    subtotal += amount;
    rows.push([idx + 1, desc, qty, price, amount]);
  });

  const taxRate = typeof config.taxRate === 'number'
    ? config.taxRate
    : (sale?.taxRate !== undefined ? Number(sale.taxRate) : 15);
  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = subtotal / (1 + taxRate / 100);
      taxAmount = subtotal - taxable;
    }
  }

  rows.push([]);
  rows.push(['', '', '', 'Taxable Amount (TXBL1)', taxable]);
  rows.push(['', '', '', `VAT (TAX1 ${taxRate}%)`, taxAmount]);
  rows.push(['', '', '', 'Total Amount (ETB)', subtotal]);

  if (isCredit) {
    const paid = Number(sale?.amountPaid || 0);
    const balance = Math.max(0, subtotal - paid);
    rows.push(['', '', '', 'Amount Paid', paid]);
    rows.push(['', '', '', 'Balance Due', balance]);
    if (sale?.dueDate) {
      rows.push(['', '', '', 'Due Date', new Date(sale.dueDate).toLocaleDateString('en-GB')]);
    }
  }

  const csvContent = rows
    .map((row) =>
      row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export bill as Excel (.xlsx) file
 */
export const exportBillToExcel = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const invoiceNo = sale?.voucherNo || (isCredit ? 'CR-SALE' : 'CS-SALE');
  const dateStr = formatFiscalDate(sale?.date);
  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Customer';

  const rows = [
    { A: 'TIN', B: config.tinNumber || '0000000001' },
    { A: 'Organization', B: (config.companyLines || []).join(' ') || 'Dire Multipurpose Farmers Cooperative Union' },
    { A: 'Address', B: `${config.addressLine1 || 'DIRE DAWA, K-03'}, ${config.addressLine2 || 'KAZIRA'}` },
    { A: 'Telephone', B: config.phone || 'TEL-0251 11 11 76' },
    { A: 'FS Number', B: config.fsNo || sale?.voucherNo || 'FS No.00000272' },
    { A: 'Invoice Type', B: isCredit ? 'CASH/CREDIT INVOICE (CREDIT)' : 'CASH INVOICE' },
    { A: 'Invoice No', B: invoiceNo },
    { A: 'Date & Time', B: dateStr },
    { A: 'Customer Name', B: customerName },
    { A: 'Cashier / Operator', B: config.operator || sale?.performedBy?.name || 'Operator' },
    {},
    { A: '#', B: 'Item Description', C: 'Quantity', D: 'Unit Price (ETB)', E: 'Amount (ETB)' },
  ];

  const items = (sale?.items && sale.items.length > 0)
    ? sale.items
    : [
        {
          description: 'Item',
          quantity: 1,
          sellingPrice: sale?.totalRevenue || 0,
          total: sale?.totalRevenue || 0,
        },
      ];

  let subtotal = 0;
  items.forEach((it, idx) => {
    const desc = it.description || it.material?.name || it.name || `Item ${idx + 1}`;
    const qty = Number(it.quantity || 1);
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = Number(it.totalRevenue || it.total || qty * price);
    subtotal += amount;

    rows.push({
      A: idx + 1,
      B: desc,
      C: qty,
      D: price,
      E: amount,
    });
  });

  const taxRate = typeof config.taxRate === 'number'
    ? config.taxRate
    : (sale?.taxRate !== undefined ? Number(sale.taxRate) : 15);
  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = subtotal / (1 + taxRate / 100);
      taxAmount = subtotal - taxable;
    }
  }

  rows.push({});
  rows.push({ C: 'Taxable Base Amount (TXBL1)', E: taxable });
  rows.push({ C: `VAT Rate (TAX1 ${taxRate}%)`, E: taxAmount });
  rows.push({ C: 'TOTAL AMOUNT (ETB)', E: subtotal });

  if (isCredit) {
    const paid = Number(sale?.amountPaid || 0);
    const balance = Math.max(0, subtotal - paid);
    rows.push({ C: 'Amount Paid', E: paid });
    rows.push({ C: 'Balance Due', E: balance });
    if (sale?.dueDate) {
      rows.push({ C: 'Due Date', E: new Date(sale.dueDate).toLocaleDateString('en-GB') });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
  ws['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Receipt');
  XLSX.writeFile(wb, `${invoiceNo}.xlsx`);
};

/**
 * Export bill as JSON (.json)
 */
export const exportBillToJSON = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const taxRate = typeof config.taxRate === 'number'
    ? config.taxRate
    : (sale?.taxRate !== undefined ? Number(sale.taxRate) : 15);
  const totalRev = Number(sale?.totalRevenue || 0);
  let taxable = totalRev;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = totalRev / (1 + taxRate / 100);
      taxAmount = totalRev - taxable;
    }
  }

  const invoiceData = {
    fiscalData: {
      tin: config.tinNumber || '0089234125',
      organization: (config.companyLines || []).join(' ') || 'Sharp Plus Trading PLC',
      address: `${config.addressLine1 || 'ADDIS ABABA, BOLE MEDHANIALEM'}, ${config.addressLine2 || 'COMMERCIAL CENTER 4TH FLOOR'}`,
      telephone: config.phone || 'TEL-+251 91 100 0111',
      fsNo: config.fsNo || sale?.fsNo || (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') || 'FS No.00000001',
      date: formatFiscalDate(sale?.date),
      machineNo: config.machineNo || 'SPM00000189',
    },
    invoice: {
      invoiceNo: sale?.voucherNo || (isCredit ? 'CRSALE-00001' : 'CSALE-00001'),
      type: isCredit ? 'credit_invoice' : 'cash_invoice',
      customer: sale?.customerName || 'Walk-in Customer',
      operator: config.operator || sale?.performedBy?.name || 'Sharp Plus Admin',
      items: (sale?.items || []).map((it) => ({
        description: it.description || it.material?.name || it.name,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.sellingPrice || it.unitCost || 0),
        amount: Number(it.totalRevenue || it.total || 0),
      })),
      taxable: taxable,
      taxRate: taxRate,
      taxAmount: taxAmount,
      vatAmount: taxAmount,
      totalAmount: totalRev,
      paymentMethod: isCredit ? 'CREDIT' : 'CASH',
      amountPaid: isCredit ? Number(sale?.amountPaid || 0) : totalRev,
      balanceDue: isCredit ? Math.max(0, totalRev - (sale?.amountPaid || 0)) : 0,
      dueDate: sale?.dueDate || null,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      system: 'Sharp Plus System / Fiscal POS',
    },
  };

  const jsonStr = JSON.stringify(invoiceData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sale?.voucherNo || 'invoice'}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Open high-resolution thermal receipt print dialog
 */
export const openThermalPrintWindow = (sale, config = {}) => {
  const receiptText = generateThermalReceiptText(sale, config);
  const printWindow = window.open('', '_blank', 'width=420,height=680');
  if (!printWindow) {
    alert('Please allow popups to print the thermal bill.');
    return;
  }

  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${sale?.voucherNo || 'Bill'} - Thermal Receipt</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 12px;
            font-family: 'Courier New', Courier, monospace;
            background: #ffffff;
            color: #000000;
            font-size: 13px;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt {
            max-width: 360px;
            margin: 0 auto;
            white-space: pre;
            overflow-x: visible;
          }
          @media print {
            body { padding: 4px; }
            .no-print { display: none !important; }
          }
          .print-btn {
            display: block;
            margin: 10px auto;
            padding: 8px 16px;
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            font-family: sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 12px;">
          <button class="print-btn" onclick="window.print()">🖨️ Click to Print Receipt</button>
        </div>
        <div class="receipt">${receiptText}</div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Open high-resolution A4 standard invoice print dialog
 */
export const openA4PrintWindow = (sale, config = {}) => {
  const isCredit =
    sale?.paymentType === 'credit' ||
    sale?.voucherType === 'credit_sale';

  const invoiceNo = sale?.voucherNo || (isCredit ? 'CRSALE-00001' : 'CSALE-00001');
  const fsNo = config.fsNo || sale?.fsNo || (sale?.fsNumber ? `FS No.${String(sale.fsNumber).padStart(8, '0')}` : '') || 'FS No.00000001';
  const dateStr = formatFiscalDate(sale?.date);
  const tin = config.tinNumber || '0089234125';
  const orgName = (config.companyLines || []).join(' ') || 'Sharp Plus Trading PLC';
  const address = `${config.addressLine1 || 'Addis Ababa, Bole'}, ${config.addressLine2 || 'Commercial Center'}`;
  const phone = config.phone || '+251 91 100 0111';
  const customerName = sale?.customerName || (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) || 'Walk-in Customer';
  const customerTin = sale?.tin || sale?.customerTin || '';
  const customerPhone = sale?.customerPhone || '';
  const operator = config.operator || sale?.performedBy?.name || 'Authorized Cashier';

  const rawItems = sale?.items || [];
  const items = rawItems.length > 0 ? rawItems : [
    { description: 'Item', quantity: 1, sellingPrice: sale?.totalRevenue || 0, totalRevenue: sale?.totalRevenue || 0 },
  ];

  let subtotal = 0;
  const processed = items.map((it, idx) => {
    const desc = it.description || it.material?.name || it.name || `Item ${idx + 1}`;
    const qty = Number(it.quantity || 1);
    const uom = it.uom || it.material?.unit || 'Pcs';
    const price = Number(it.sellingPrice || it.unitCost || 0);
    const amount = Number(it.totalRevenue || it.total || qty * price);
    subtotal += amount;
    return { desc, qty, uom, price, amount };
  });

  const taxRate = typeof config.taxRate === 'number' ? config.taxRate : 15;
  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    if (sale?.taxableAmount && sale?.vatAmount && Number(sale.taxRate) === taxRate) {
      taxable = Number(sale.taxableAmount);
      taxAmount = Number(sale.vatAmount);
    } else {
      taxable = subtotal / (1 + taxRate / 100);
      taxAmount = subtotal - taxable;
    }
  }

  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Please allow popups to print the A4 invoice.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${invoiceNo} - Standard Tax Invoice</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 14mm 16mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.45;
          }
          .invoice-box {
            max-width: 800px;
            margin: 0 auto;
          }
          .header-table { width: 100%; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .company-title { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.02em; }
          .invoice-badge { display: inline-block; padding: 4px 10px; background: ${isCredit ? '#eff6ff' : '#ecfdf5'}; color: ${isCredit ? '#1d4ed8' : '#047857'}; border: 1px solid ${isCredit ? '#bfdbfe' : '#a7f3d0'}; border-radius: 6px; font-weight: 800; font-size: 12px; text-transform: uppercase; }
          .meta-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
          .meta-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; }
          .meta-title { font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
          .data-table th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; }
          .data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary-box { width: 320px; margin-left: auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-top: 12px; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .summary-total { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 14px; font-weight: 800; background: #f8fafc; color: #0f172a; border-top: 2px solid #2563eb; }
          .sign-grid { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 12px; font-size: 12px; }
          .sign-col { width: 28%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; color: #475569; }
          .footer-note { text-align: center; font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
          .print-bar { text-align: center; margin-bottom: 20px; }
          .print-btn { padding: 8px 18px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="no-print print-bar">
          <button class="print-btn" onclick="window.print()">🖨️ Print A4 Invoice</button>
        </div>
        <div class="invoice-box">
          <table class="header-table">
            <tr>
              <td>
                <div class="company-title">${orgName}</div>
                <div style="color: #475569; font-size: 12px; margin-top: 2px;">${address} | Tel: ${phone}</div>
                <div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-top: 3px;">TIN: ${tin}</div>
              </td>
              <td class="text-right" style="vertical-align: top;">
                <span class="invoice-badge">${isCredit ? 'Credit Sales Invoice' : 'Cash Sales Invoice'}</span>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px;">${invoiceNo}</div>
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">${fsNo}</div>
              </td>
            </tr>
          </table>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-title">Billed To (Customer)</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${customerName}</div>
              ${customerTin ? `<div>TIN: <b>${customerTin}</b></div>` : ''}
              ${customerPhone ? `<div>Tel: ${customerPhone}</div>` : ''}
              ${sale?.customerAddress ? `<div>Address: ${sale.customerAddress}</div>` : ''}
            </div>

            <div class="meta-card">
              <div class="meta-title">Invoice Information</div>
              <div>Date: <b>${dateStr}</b></div>
              <div>Sales Slip: <b>${fsNo}</b></div>
              <div>Cashier / Operator: <b>${operator}</b></div>
              <div>Payment Mode: <b>${isCredit ? 'CREDIT SALE' : 'CASH SALE'}</b></div>
              ${isCredit && sale?.dueDate ? `<div>Due Date: <b>${new Date(sale.dueDate).toLocaleDateString('en-GB')}</b></div>` : ''}
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 35px;" class="text-center">#</th>
                <th>Item Description</th>
                <th style="width: 55px;" class="text-center">UOM</th>
                <th style="width: 65px;" class="text-center">Qty</th>
                <th style="width: 110px;" class="text-right">Unit Price (ETB)</th>
                <th style="width: 120px;" class="text-right">Amount (ETB)</th>
              </tr>
            </thead>
            <tbody>
              ${processed.map((it, idx) => `
                <tr>
                  <td class="text-center" style="color: #64748b;">${idx + 1}</td>
                  <td style="font-weight: 600;">${it.desc}</td>
                  <td class="text-center">${it.uom}</td>
                  <td class="text-center" style="font-weight: 700;">${it.qty}</td>
                  <td class="text-right">${formatNumber(it.price, 2)}</td>
                  <td class="text-right" style="font-weight: 700;">${formatNumber(it.amount, 2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span style="color: #64748b;">Subtotal (TXBL1):</span>
              <span style="font-weight: 600;">ETB ${formatNumber(taxable, 2)}</span>
            </div>
            <div class="summary-row">
              <span style="color: #64748b;">VAT (${taxRate}%):</span>
              <span style="font-weight: 600;">ETB ${formatNumber(taxAmount, 2)}</span>
            </div>
            <div class="summary-total">
              <span>Grand Total:</span>
              <span>ETB ${formatNumber(subtotal, 2)}</span>
            </div>
            ${isCredit ? `
              <div class="summary-row" style="background: #f8fafc;">
                <span style="color: #64748b;">Advanced Paid:</span>
                <span style="font-weight: 600; color: #047857;">ETB ${formatNumber(sale?.amountPaid || 0, 2)}</span>
              </div>
              <div class="summary-row" style="background: #f8fafc; font-weight: 700;">
                <span style="color: #b91c1c;">Balance Due:</span>
                <span style="color: #b91c1c;">ETB ${formatNumber(Math.max(0, subtotal - (Number(sale?.amountPaid) || 0)), 2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="sign-grid">
            <div class="sign-col">Prepared By / Cashier</div>
            <div class="sign-col">Checked &amp; Approved</div>
            <div class="sign-col">Customer Acceptance</div>
          </div>

          <div class="footer-note">
            Thank you for your business! | Machine ID: ${config.machineNo || 'SPM00000189'} | Powered by Sharp Plus System
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
