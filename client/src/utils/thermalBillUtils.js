import * as XLSX from 'xlsx';

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
 * Format string with carets between every letter: "DIRE" -> "^D^I^R^E^"
 */
export const toCaretSpaced = (str = '') => {
  if (!str) return '';
  return str
    .trim()
    .split('')
    .map((char) => (char === ' ' ? ' ' : `^${char.toUpperCase()}`))
    .join('') + '^';
};

/**
 * Format amount with asterisk prefix: 1739.16 -> "*1,739.16"
 */
export const toAsteriskAmount = (num, decimals = 2) => {
  return `*${formatNumber(num, decimals)}`;
};

/**
 * Format total with caret characters like in thermal POS:
 * 1739.16 -> "^*1^,^7^3^9^.^1^6"
 */
export const toCaretTotal = (num) => {
  const str = `*${formatNumber(num, 2)}`;
  return str
    .split('')
    .map((c) => `^${c}`)
    .join('');
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

  const tin = config.tinNumber || sale?.customer?.tinNumber || '0000000001';
  const companyLines = config.companyLines || [
    '^D^I^R^E^',
    '^M^U^L^T^I^P^U^R^P^O^S^E^',
    '^F^A^R^M^E^R^S^',
    '^C^O^O^P^E^R^A^T^I^V^E^',
    '^S^O^.^U^N^I^O^N^',
  ];
  const addressLine1 = config.addressLine1 || 'DIRE DAWA,K-03,H.NO-NEW';
  const addressLine2 = config.addressLine2 || 'KAZIRA TECKET OFFICE AREA';
  const phone = config.phone || 'TEL-0251 11 11 76';
  const fsNo =
    config.fsNo ||
    sale?.fsNo ||
    `FS No.${String(sale?.voucherNo || '00000272').replace(/\D/g, '').padStart(8, '0').slice(-8)}`;
  const dateStr = formatFiscalDate(sale?.date);

  const customerName =
    sale?.customerName ||
    (typeof sale?.customer === 'object' ? sale?.customer?.name : sale?.customer) ||
    'Mahamed Yusuf';
  const invoiceNo =
    sale?.voucherNo ||
    (isCredit ? 'CR-09854-26' : 'CS-09854-26');
  const operator =
    config.operator ||
    sale?.performedBy?.name ||
    'Samire';

  const taxRate = typeof config.taxRate === 'number' ? config.taxRate : 0; // 0% or 15%

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

  // Tax calculation
  let taxable = totalRevenue;
  let taxAmount = 0;
  if (taxRate > 0) {
    taxable = totalRevenue / (1 + taxRate / 100);
    taxAmount = totalRevenue - taxable;
  }

  const invoiceHeader = isCredit
    ? '============= CREDIT INVOICE ============='
    : '============== CASH INVOICE =============';

  const divider = '-----------------------------------------';
  const doubleDivider = '=========================================';

  let txt = '';
  txt += `TIN: ${tin}\n`;
  txt += `${divider}\n`;

  companyLines.forEach((l) => {
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
  txt += `Description    Qty Price   AMOUNT\n`;
  txt += `${divider}\n`;

  processedItems.forEach((it) => {
    // Line 1: Description Qty Price
    const line1 = `${it.desc}    ${it.qty} ${formatNumber(it.price, 3)}`;
    const line2 = `${toAsteriskAmount(it.amount, 2)}`.padStart(30, ' ');
    txt += `${line1}\n${line2}\n`;
  });

  txt += `${divider}\n`;
  txt += `TXBL1             ${toAsteriskAmount(taxable, 2).padStart(15, ' ')}\n`;
  txt += `TAX1 ${taxRate}%           ${toAsteriskAmount(taxAmount, 2).padStart(15, ' ')}\n`;
  txt += `${divider}\n`;
  txt += `^T^O^T^A^L        ${toCaretTotal(totalRevenue).padStart(18, ' ')}\n`;
  txt += `${divider}\n`;

  if (isCredit) {
    const paid = Number(sale?.amountPaid || 0);
    const balance = Math.max(0, totalRevenue - paid);
    txt += `^C^R^E^D^I^T      ${toCaretTotal(totalRevenue).padStart(18, ' ')}\n`;
    txt += `PAID              ${toAsteriskAmount(paid, 2).padStart(18, ' ')}\n`;
    txt += `BALANCE DUE       ${toAsteriskAmount(balance, 2).padStart(18, ' ')}\n`;
    if (sale?.dueDate) {
      txt += `DUE DATE:         ${new Date(sale.dueDate).toLocaleDateString('en-GB')}\n`;
    }
  } else {
    txt += `^C^A^S^H          ${toCaretTotal(totalRevenue).padStart(18, ' ')}\n`;
  }

  txt += `ITEM#                     ${processedItems.length}\n`;
  txt += `          {logo}\n`;
  txt += `   {logo} ${config.machineNo || 'MGM00000001'}\n\n`;
  txt += `   Powered By ${config.poweredBy || 'Mega Cloud'}\n`;

  return txt;
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

  const taxRate = typeof config.taxRate === 'number' ? config.taxRate : 0;
  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    taxable = subtotal / (1 + taxRate / 100);
    taxAmount = subtotal - taxable;
  }

  rows.push([]);
  rows.push(['', '', '', 'Taxable Amount', taxable]);
  rows.push(['', '', '', `Tax (${taxRate}%)`, taxAmount]);
  rows.push(['', '', '', 'Total Amount', subtotal]);

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

  const taxRate = typeof config.taxRate === 'number' ? config.taxRate : 0;
  let taxable = subtotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    taxable = subtotal / (1 + taxRate / 100);
    taxAmount = subtotal - taxable;
  }

  rows.push({});
  rows.push({ C: 'Taxable Amount (TXBL1)', E: taxable });
  rows.push({ C: `Tax Rate (${taxRate}%)`, E: taxAmount });
  rows.push({ C: 'TOTAL (ETB)', E: subtotal });

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

  const invoiceData = {
    fiscalData: {
      tin: config.tinNumber || '0000000001',
      organization: (config.companyLines || []).join(' ') || 'Dire Multipurpose Farmers Cooperative Union',
      address: `${config.addressLine1 || 'DIRE DAWA, K-03'}, ${config.addressLine2 || 'KAZIRA'}`,
      telephone: config.phone || '0251 11 11 76',
      fsNo: config.fsNo || sale?.voucherNo || 'FS No.00000272',
      date: formatFiscalDate(sale?.date),
      machineNo: config.machineNo || 'MGM00000001',
    },
    invoice: {
      invoiceNo: sale?.voucherNo || 'CS-09854-26',
      type: isCredit ? 'credit_invoice' : 'cash_invoice',
      customer: sale?.customerName || 'Mahamed Yusuf',
      operator: config.operator || sale?.performedBy?.name || 'Samire',
      items: (sale?.items || []).map((it) => ({
        description: it.description || it.material?.name || it.name,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.sellingPrice || it.unitCost || 0),
        amount: Number(it.totalRevenue || it.total || 0),
      })),
      taxable: sale?.totalRevenue || 0,
      taxRate: config.taxRate || 0,
      totalAmount: sale?.totalRevenue || 0,
      paymentMethod: isCredit ? 'CREDIT' : 'CASH',
      amountPaid: isCredit ? Number(sale?.amountPaid || 0) : Number(sale?.totalRevenue || 0),
      balanceDue: isCredit ? Math.max(0, (sale?.totalRevenue || 0) - (sale?.amountPaid || 0)) : 0,
      dueDate: sale?.dueDate || null,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      system: 'Mega Cloud / Sharp Plus Trading Inventory',
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
            max-width: 300px;
            margin: 0 auto;
            white-space: pre-wrap;
            word-wrap: break-word;
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
