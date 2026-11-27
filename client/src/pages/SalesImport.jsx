import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  UploadCloud, CheckCircle, AlertTriangle, ArrowRight, XCircle,
  TrendingUp, Search, Download, FileSpreadsheet, Scale, X,
  ChevronDown, ChevronUp, Zap, PenLine, Plus, Trash2, Camera, ScanLine,
  Store, Boxes, RefreshCw, CheckCircle2, ShieldAlert
} from 'lucide-react';

/* ── empty manual sale row ── */
const emptyRow = () => ({ code: '', name: '', qty: 1, avgAmt: 0, totalAmt: 0, _id: Date.now() + Math.random() });

/* ─────────────────────────────────────────────────────────────────────
   CNET / NOBIR POS Excel format detector + parser
   Columns: Article Code | Article Name | Quantity | Avg Amount | Total Amount
   The sheet has category & sub-category header rows mixed in — we skip those.
───────────────────────────────────────────────────────────────────────── */
function parseCnetPosSheet(rawRows) {
  // Find the header row: must contain both "Article Code" and "Article Name"
  let headerIdx = -1;
  let colMap    = {};

  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row  = rawRows[i];
    const keys = Object.keys(row).map(k => String(k).trim());
    const vals = Object.values(row).map(v => String(v || '').trim().toLowerCase());
    // Look for the header in values (sheet_to_json with header:1 style) or keys
    const allText = [...keys, ...vals];
    if (
      allText.some(t => /article.?code/i.test(t)) &&
      allText.some(t => /article.?name/i.test(t))
    ) {
      headerIdx = i;
      // Map column keys → our field names
      for (const k of Object.keys(row)) {
        const v = String(row[k] || '').trim().toLowerCase();
        if (/article.?code/i.test(v) || /article.?code/i.test(k))  colMap.code     = k;
        if (/article.?name/i.test(v) || /article.?name/i.test(k))  colMap.name     = k;
        if (/^quantity$/i.test(v)    || /^quantity$/i.test(k))      colMap.qty      = k;
        if (/avg.?amount/i.test(v)   || /avg.?amount/i.test(k))    colMap.avgAmt   = k;
        if (/total.?amount/i.test(v) || /total.?amount/i.test(k))  colMap.totalAmt = k;
      }
      break;
    }
  }
  // If we didn't find the header row inside the data rows, it might BE the column keys
  // (sheet_to_json uses first row as keys by default)
  if (headerIdx === -1 && rawRows.length > 0) {
    const keys = Object.keys(rawRows[0]);
    if (
      keys.some(k => /article.?code/i.test(k)) &&
      keys.some(k => /article.?name/i.test(k))
    ) {
      headerIdx = -1; // data starts from row 0, colMap built from keys
      for (const k of keys) {
        if (/article.?code/i.test(k))  colMap.code     = k;
        if (/article.?name/i.test(k))  colMap.name     = k;
        if (/quantity/i.test(k))        colMap.qty      = k;
        if (/avg.?amount/i.test(k))    colMap.avgAmt   = k;
        if (/total.?amount/i.test(k))  colMap.totalAmt = k;
      }
    }
  }

  if (!colMap.name && !colMap.code) return null; // Not CNET format

  // Parse data rows — skip header row itself and any category/summary rows
  const dataRows = headerIdx >= 0 ? rawRows.slice(headerIdx + 1) : rawRows;

  const parsed = [];
  for (const row of dataRows) {
    const rawCode  = String(row[colMap.code]  || '').trim();
    const name     = String(row[colMap.name]  || '').trim();
    const qty      = parseFloat(row[colMap.qty]      || 0) || 0;
    const avgAmt   = parseFloat(row[colMap.avgAmt]   || 0) || 0;
    const totalAmt = parseFloat(row[colMap.totalAmt] || 0) || 0;

    // ── STRICT PRODUCT CODE REQUIRED ───────────────────────────────
    // Category subtotal rows (BEVERAGES, SOFT DRINKS, LUNCH & DINNER, etc.)
    // always have an empty or dash Article Code.  Real product lines always
    // have a code like P-0080.  Reject anything without a proper code.
    const isRealCode = rawCode && !/^[-–—]+$/.test(rawCode); // not empty, not just dashes
    if (!isRealCode) continue;

    const code = rawCode.replace(/-+$/, ''); // strip trailing dashes (e.g. "p-00107-" → "p-00107")

    // Skip summary / footer rows regardless
    if (/^(sub[\s-]?total|grand[\s-]?total|total[\s-]?tax|add[\s-]?charge|discount|erp\s|page\s|count:)/i.test(name)) continue;

    // Must have qty > 0 to be a real sold line
    if (qty <= 0) continue;

    parsed.push({ code, name, qty, avgAmt, totalAmt });
  }

  return { rows: parsed, colMap };
}

export default function SalesImport() {
  const [fileData,   setFileData]   = useState(null); // raw XLSX rows
  const [parsed,     setParsed]     = useState(null); // { rows, colMap } for CNET format
  const [isCnetFmt,  setIsCnetFmt]  = useState(false);

  // Manual mapping (fallback for non-CNET files)
  const [columns,        setColumns]        = useState([]);
  const [productCol,     setProductCol]     = useState('');
  const [productCodeCol, setProductCodeCol] = useState('');
  const [qtyCol,         setQtyCol]         = useState('');
  const [revenueCol,     setRevenueCol]     = useState('');
  const [dateCol,        setDateCol]        = useState('');

  // Store & Real Stock Interlink State
  const [selectedStore,    setSelectedStore]    = useState('Main Store');
  const [configuredStores, setConfiguredStores] = useState(['Main Store']);
  const [stockCheckData,   setStockCheckData]   = useState(null);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  // Image OCR state
  const [imageOcrOpen,    setImageOcrOpen]    = useState(false);
  const [ocrLoading,      setOcrLoading]      = useState(false);
  const [ocrError,        setOcrError]        = useState('');
  const [ocrRows,         setOcrRows]         = useState([]);
  const [ocrRawText,      setOcrRawText]      = useState('');
  const [ocrImagePreview, setOcrImagePreview] = useState(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Manual entry modal
  const [manualOpen,  setManualOpen]  = useState(false);
  const [manualRows,  setManualRows]  = useState([emptyRow()]);
  const [manualDate,  setManualDate]  = useState(new Date().toISOString().slice(0, 10));
  const [manualRef,   setManualRef]   = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError,   setManualError]   = useState('');
  const [products,      setProducts]      = useState([]);

  // Result filters
  const [soldSearch,    setSoldSearch]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [expandedRow,   setExpandedRow]   = useState(null);

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Load products & stores on mount
  useEffect(() => {
    api.get('/products')
      .then(r => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProducts([]));

    api.get('/inventory-count/stores')
      .then(r => {
        const list = r.data?.stores || [];
        const merged = Array.from(new Set(['Main Store', ...list])).filter(Boolean);
        setConfiguredStores(merged);
      })
      .catch(() => setConfiguredStores(['Main Store']));
  }, []);

  /* ── Interlink: check stock balances automatically against store ── */
  const runStockCheck = async (salesRows, storeName) => {
    if (!salesRows || !salesRows.length) {
      setStockCheckData(null);
      return;
    }
    const store = storeName || selectedStore || 'Main Store';
    setStockCheckLoading(true);
    try {
      const res = await api.post('/transactions/check-sales-stock', {
        sales: salesRows.map(r => ({
          productCode: r.productCode || r.code || '',
          productName: r.productName || r.name || '',
          quantity: Number(r.quantity || r.qty) || 1,
          revenue: Number(r.revenue || r.totalAmt || r.total) || 0,
          unitPrice: Number(r.unitPrice || r.avgAmt || r.price) || 0,
        })),
        storeLocation: store,
      });
      setStockCheckData(res.data);
    } catch (err) {
      console.error('Stock balance check failed:', err);
      setStockCheckData(null);
    } finally {
      setStockCheckLoading(false);
    }
  };

  const handleStoreChange = (newStore) => {
    setSelectedStore(newStore);
    if (isCnetFmt && parsed?.rows?.length) {
      runStockCheck(parsed.rows, newStore);
    } else if (fileData && (productCol || productCodeCol)) {
      const mapped = fileData.map(r => ({
        productName: productCol ? String(r[productCol] || '').trim() : '',
        productCode: productCodeCol ? String(r[productCodeCol] || '').trim() : '',
        quantity: qtyCol ? (Number(r[qtyCol]) || 1) : 1,
        revenue: revenueCol ? (Number(r[revenueCol]) || 0) : 0,
        unitPrice: revenueCol ? (Number(r[revenueCol]) || 0) : 0,
      })).filter(s => s.productName || s.productCode);
      runStockCheck(mapped, newStore);
    }
  };

  /* ── manual row helpers ── */
  const updateManualRow = (id, field, value) => {
    setManualRows(rows => rows.map(r => {
      if (r._id !== id) return r;
      const updated = { ...r, [field]: value };

      // When name is typed/selected from datalist, try to find matching product
      if (field === 'name') {
        const prod = products.find(p =>
          p.name.toLowerCase() === value.toLowerCase() ||
          (p.code && p.code.toLowerCase() === value.toLowerCase())
        );
        if (prod) {
          updated.code    = prod.code || updated.code;
          updated.avgAmt  = prod.sellingPrice || 0;
          updated.totalAmt = (prod.sellingPrice || 0) * (parseFloat(updated.qty) || 1);
        }
      }

      // Auto-calc totalAmt when qty or avgAmt changes
      if (field === 'qty' || field === 'avgAmt') {
        updated.totalAmt = parseFloat(updated.avgAmt || 0) * parseFloat(updated.qty || 0);
      }
      // totalAmt can be manually overridden — no side effects
      return updated;
    }));
  };

  // Lookup product by code on blur of the code field — fills name + price
  const handleCodeBlur = (id, codeValue) => {
    if (!codeValue) return;
    const norm = codeValue.trim().replace(/-+$/, '').toLowerCase();
    const prod = products.find(p => {
      const pc = (p.code || '').replace(/-+$/, '').toLowerCase();
      return pc === norm;
    });
    if (prod) {
      setManualRows(rows => rows.map(r => {
        if (r._id !== id) return r;
        const qty = parseFloat(r.qty) || 1;
        return {
          ...r,
          code:     prod.code || codeValue,
          name:     r.name || prod.name,
          avgAmt:   prod.sellingPrice || 0,
          totalAmt: (prod.sellingPrice || 0) * qty,
        };
      }));
    }
  };

  const addManualRow    = () => setManualRows(rows => [...rows, emptyRow()]);
  const removeManualRow = (id) => setManualRows(rows => rows.length > 1 ? rows.filter(r => r._id !== id) : rows);

  const openManual = () => {
    setManualRows([emptyRow()]);
    setManualDate(new Date().toISOString().slice(0, 10));
    setManualRef('');
    setManualError('');
    setManualOpen(true);
  };

  /* ── manual submit ── */
  const handleManualEntrySubmit = async () => {
    const salesData = manualRows
      .filter(r => (r.code || r.name) && r.qty > 0)
      .map(r => ({
        productCode: r.code.trim(),
        productName: r.name.trim(),
        quantity:    parseFloat(r.qty)      || 1,
        revenue:     parseFloat(r.totalAmt) || 0,
        unitPrice:   parseFloat(r.avgAmt)   || 0,
      }));

    if (!salesData.length) {
      setManualError('Please add at least one product with a valid quantity.');
      return;
    }

    setManualLoading(true); setManualError('');
    try {
      const res = await api.post('/transactions/import-sales', {
        sales:         salesData,
        storeLocation: selectedStore,
        notes:         `Manual Sales Entry${manualRef ? ' — ' + manualRef : ''}`,
        reference:     manualRef || `Manual Entry — ${new Date().toLocaleDateString()}`,
        saleDate:      manualDate,
      });
      setManualOpen(false);
      setResult({ success: true, data: res.data });
    } catch (err) {
      setManualError(err.response?.data?.message || 'Failed to submit sales.');
    } finally { setManualLoading(false); }
  };

  /* ── File upload handler ── */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb      = XLSX.read(evt.target.result, { type: 'binary' });
      const ws      = wb.Sheets[wb.SheetNames[0]];
      // Read with defval '' so empty cells don't disappear
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Try CNET POS format first
      const cnetResult = parseCnetPosSheet(rawRows);
      if (cnetResult && cnetResult.rows.length > 0) {
        setIsCnetFmt(true);
        setParsed(cnetResult);
        setFileData(rawRows);
        runStockCheck(cnetResult.rows, selectedStore);
        return;
      }

      // Fallback: generic column mapping
      setIsCnetFmt(false);
      setParsed(null);
      setFileData(rawRows);
      if (rawRows.length > 0) {
        const cols = Object.keys(rawRows[0]);
        setColumns(cols);
        const pCol = cols.find(c => /^(name|product.*name|item.*name)$/i.test(c.trim())) ||
                     cols.find(c => /product|item|name/i.test(c)) || '';
        const cCol = cols.find(c => /^(code|item.*code|product.*code|sku)$/i.test(c.trim())) ||
                     cols.find(c => /code|sku/i.test(c)) || '';
        const qCol = cols.find(c => /^(qty|quantity|count|sold)$/i.test(c.trim())) ||
                     cols.find(c => /qty|quantity|sold/i.test(c)) || '';
        const rCol = cols.find(c => /^(total.*amount|total|revenue|amount)$/i.test(c.trim())) ||
                     cols.find(c => /total|revenue|amount/i.test(c)) || '';
        const dCol = cols.find(c => /date|time/i.test(c)) || '';
        setProductCol(pCol); setProductCodeCol(cCol);
        setQtyCol(qCol); setRevenueCol(rCol); setDateCol(dCol);

        if (pCol || cCol) {
          const genericRows = rawRows.slice(0, 100).map(r => ({
            productName: pCol ? String(r[pCol] || '').trim() : '',
            productCode: cCol ? String(r[cCol] || '').trim() : '',
            quantity: qCol ? (Number(r[qCol]) || 1) : 1,
            revenue: rCol ? (Number(r[rCol]) || 0) : 0,
            unitPrice: rCol ? (Number(r[rCol]) || 0) : 0,
          })).filter(s => s.productName || s.productCode);
          runStockCheck(genericRows, selectedStore);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  /* ── Submit CNET format ── */
  const handleCnetSubmit = async () => {
    if (!parsed?.rows?.length) return;

    const salesData = parsed.rows.map(r => ({
      productCode: r.code,
      productName: r.name,
      quantity:    r.qty,
      revenue:     r.totalAmt,   // Total Amount = total revenue for this line
      unitPrice:   r.avgAmt,     // Avg Amount   = avg selling price per unit (incl. tax)
    })).filter(s => s.productCode || s.productName);

    setLoading(true); setResult(null);
    try {
      const res = await api.post('/transactions/import-sales', {
        sales:              salesData,
        storeLocation:      selectedStore,
        allowNegativeStock: true,
        notes:              `Imported via POS Sales Report (CNET format) — ${selectedStore} (Negative Stock Approved)`,
        reference:          `POS Import — ${new Date().toLocaleDateString()}`,
      });
      setResult({ success: true, data: res.data });
      setFileData(null); setParsed(null); setStockCheckData(null);
    } catch (err) {
      setResult({
        success:   false,
        message:   err.response?.data?.message || 'Failed to import sales.',
        unmatched: err.response?.data?.unmatchedProducts || [],
      });
    } finally { setLoading(false); }
  };

  /* ── Submit manual (generic) format ── */
  const handleManualSubmit = async () => {
    if (!productCol && !productCodeCol) {
      return alert('Please select at least the Product Name or Product Code column.');
    }
    const salesData = fileData.map(row => ({
      productName: productCol     ? String(row[productCol]     || '').trim() : '',
      productCode: productCodeCol ? String(row[productCodeCol] || '').trim() : '',
      quantity:    qtyCol     ? (Number(row[qtyCol])     || 1) : 1,
      revenue:     revenueCol ? (Number(row[revenueCol]) || 0) : 0,
      unitPrice:   revenueCol ? (Number(row[revenueCol]) || 0) : 0,
      saleDate:    dateCol ? row[dateCol] : null,
    })).filter(s => s.productName || s.productCode);

    setLoading(true); setResult(null);
    try {
      const res = await api.post('/transactions/import-sales', {
        sales:              salesData,
        storeLocation:      selectedStore,
        allowNegativeStock: true,
        notes:              `Imported via POS/Excel Report — ${selectedStore} (Negative Stock Approved)`,
        reference:          `POS Import — ${new Date().toLocaleDateString()}`,
      });
      setResult({ success: true, data: res.data });
      setFileData(null); setStockCheckData(null);
    } catch (err) {
      setResult({
        success:   false,
        message:   err.response?.data?.message || 'Failed to import sales.',
        unmatched: err.response?.data?.unmatchedProducts || [],
      });
    } finally { setLoading(false); }
  };

  /* ── Export result to Excel ── */
  const handleExportSoldExcel = () => {
    if (!result?.data?.items) return;
    const exportRows = result.data.items.map((item, idx) => ({
      '#':                   idx + 1,
      'Product Code':        item.productCode || '—',
      'Product Name':        item.productName,
      'Category':            item.category || 'General',
      'Quantity Sold':       item.quantitySold,
      'Unit Price (ETB)':    item.sellingPrice.toFixed(2),
      'Total Revenue (ETB)': item.revenue.toFixed(2),
      'COGS (ETB)':          item.cogs.toFixed(2),
      'Gross Profit (ETB)':  item.grossProfit.toFixed(2),
      'Match Status':        item.matchStatus === 'recipe_deducted' ? 'Recipe Deducted' :
                             item.matchStatus === 'direct_material' ? 'Direct Stock Deducted' :
                             item.matchStatus === 'no_recipe'       ? 'Sold (No Recipe)' : 'Unmatched',
      'Ingredients Deducted': item.ingredientsUsed?.length
        ? item.ingredientsUsed.map(i => `${i.materialName} (${i.quantityUsed} ${i.unit})`).join(', ')
        : 'None',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sold POS Products');
    XLSX.writeFile(wb, `sold_pos_products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── Filtered result rows ── */
  const displayedSoldProducts = useMemo(() => {
    if (!result?.data?.items) return [];
    return result.data.items.filter(item => {
      const matchesSearch = !soldSearch ||
        item.productName?.toLowerCase().includes(soldSearch.toLowerCase()) ||
        item.productCode?.toLowerCase().includes(soldSearch.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.matchStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [result, soldSearch, statusFilter]);

  const resetAll = () => {
    setFileData(null); setParsed(null); setResult(null);
    setIsCnetFmt(false); setColumns([]);
    setImageOcrOpen(false); setOcrRows([]); setOcrRawText('');
    setOcrImagePreview(null); setOcrError('');
    setStockCheckData(null);
  };

  /* ── Image OCR handler ── */
  const handleImageOcr = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrError(''); setOcrRows([]); setOcrRawText('');

    // Preview
    const previewReader = new FileReader();
    previewReader.onload = (ev) => setOcrImagePreview(ev.target.result);
    previewReader.readAsDataURL(file);

    // Read as base64 for API
    const b64Reader = new FileReader();
    b64Reader.onload = async (ev) => {
      const dataUrl = ev.target.result; // data:image/jpeg;base64,....
      const base64  = dataUrl.split(',')[1];
      const mime    = file.type || 'image/jpeg';

      setOcrLoading(true); setImageOcrOpen(true);
      try {
        const res = await api.post('/transactions/parse-image-sales', {
          imageBase64: base64,
          mimeType:    mime,
        });
        const rows = res.data.rows || [];
        setOcrRows(rows);
        setOcrRawText(res.data.rawText || '');
        if (!rows.length) {
          setOcrError(res.data.message || 'No product lines detected.');
        } else {
          runStockCheck(rows, selectedStore);
        }
      } catch (err) {
        setOcrError(err.response?.data?.message || 'OCR failed. Please try a clearer image.');
      } finally {
        setOcrLoading(false);
        if (imageInputRef.current)  imageInputRef.current.value  = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    };
    b64Reader.readAsDataURL(file);
  };

  /* ── Update OCR row ── */
  const updateOcrRow = (idx, field, value) => {
    setOcrRows(rows => rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      if (field === 'qty' || field === 'avgAmt') {
        updated.totalAmt = parseFloat(updated.avgAmt || 0) * parseFloat(updated.qty || 0);
      }
      return updated;
    }));
  };
  const removeOcrRow = (idx) => setOcrRows(rows => rows.filter((_, i) => i !== idx));

  /* ── Submit OCR rows (same pipeline as CNET) ── */
  const handleOcrSubmit = async () => {
    const salesData = ocrRows
      .filter(r => (r.code || r.name) && r.qty > 0)
      .map(r => ({
        productCode: r.code,
        productName: r.name,
        quantity:    parseFloat(r.qty)      || 1,
        revenue:     parseFloat(r.totalAmt) || 0,
        unitPrice:   parseFloat(r.avgAmt)   || 0,
      }));

    if (!salesData.length) { setOcrError('No valid rows to import.'); return; }

    setLoading(true); setResult(null); setOcrError('');
    try {
      const res = await api.post('/transactions/import-sales', {
        sales:         salesData,
        storeLocation: selectedStore,
        notes:         `Imported via POS Photo / Image OCR — ${selectedStore}`,
        reference:     `POS Image Import — ${new Date().toLocaleDateString()}`,
      });
      setResult({ success: true, data: res.data });
      setImageOcrOpen(false);
      setStockCheckData(null);
    } catch (err) {
      setOcrError(err.response?.data?.message || 'Import failed.');
    } finally { setLoading(false); }
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 flex items-center gap-2.5">
            <UploadCloud className="h-7 w-7 text-blue-600" />
            POS Sales Import
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Matched items automatically deduct stock via recipes and record revenue &amp; Gross Profit.
          </p>
        </div>
      </div>

      <Card>

        {/* ── 1. Upload Zone (no file yet) ── */}
        {!fileData && !result?.success && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="group cursor-pointer relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-8 flex flex-col items-center text-center">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud size={28} />
              </div>
              <p className="text-base font-extrabold text-ink-900 mb-1">Upload POS File</p>
              <p className="text-xs text-ink-500 mb-3 leading-relaxed">
                Drop your <span className="font-semibold text-ink-700">.xlsx / .xls / .csv</span> POS export here.<br />
                NOBIR / CNET format auto-detected.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-5 py-2 text-xs font-bold shadow group-hover:bg-blue-700 transition">
                <UploadCloud size={13} /> Select POS File
              </span>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-semibold px-2.5 py-0.5">
                <Zap size={10} /> No column mapping needed
              </span>
            </label>

            {/* Card B — Manual Entry */}
            <button
              type="button"
              onClick={openManual}
              className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-lg transition-all duration-200 p-8 flex flex-col items-center text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform">
                <PenLine size={26} />
              </div>
              <p className="text-base font-extrabold text-ink-900 mb-1">Enter Sales Manually</p>
              <p className="text-xs text-ink-500 mb-3 leading-relaxed">
                Type in article codes, names, quantities<br />
                and amounts — same POS format.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-5 py-2 text-xs font-bold shadow group-hover:bg-emerald-700 transition">
                <PenLine size={13} /> Open Entry Form
              </span>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2.5 py-0.5">
                ✦ Great for testing or corrections
              </span>
            </button>

            {/* Card C — Scan / Photo Image */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 hover:border-violet-400 hover:shadow-lg transition-all duration-200 p-8 flex flex-col items-center text-center col-span-1 sm:col-span-2">
              <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform">
                <ScanLine size={26} />
              </div>
              <p className="text-base font-extrabold text-ink-900 mb-1">Scan POS Report (Photo / Image)</p>
              <p className="text-xs text-ink-500 mb-3 leading-relaxed">
                Take a photo or upload an image of your POS report.<br />
                AI reads article codes, quantities and amounts automatically.
              </p>
              <div className="flex items-center gap-2">
                {/* Upload image file */}
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-4 py-2 text-xs font-bold shadow hover:bg-violet-700 transition">
                  <UploadCloud size={13} /> Upload Image
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageOcr} />
                </label>
                {/* Camera capture */}
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-violet-700 text-white px-4 py-2 text-xs font-bold shadow hover:bg-violet-800 transition">
                  <Camera size={13} /> Take Photo
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageOcr} />
                </label>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-semibold px-2.5 py-0.5">
                ✦ Powered by OCR — auto-detects product lines
              </span>
            </div>

          </div>
        )}

        {/* ── 2a. CNET Auto-detected Preview ── */}
        {fileData && parsed && isCnetFmt && !result?.success && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-ink-100 pb-4 gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <Zap size={12} /> CNET POS Format Auto-Detected
                </span>
                <span className="text-sm font-semibold text-ink-700">
                  {parsed.rows.length} product lines ready to import
                </span>
              </div>
              <button onClick={resetAll} className="text-xs text-red-600 font-semibold hover:underline">
                Cancel / Upload Different File
              </button>
            </div>

            {/* Store & Real Stock Interlink Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-slate-900">Deduct Stock From Store:</span>
                <select
                  value={selectedStore}
                  onChange={e => handleStoreChange(e.target.value)}
                  className="text-xs font-bold px-3 py-1 rounded-lg border border-blue-300 bg-white text-blue-950 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {configuredStores.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                {stockCheckLoading && (
                  <span className="text-[11px] text-blue-600 font-medium animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking opening balance…
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300 text-[11px]">
                  Formula: Stock Balance = Opening Balance − Items Sold Out
                </span>
                {stockCheckData && (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> {stockCheckData.inStockCount} In Stock
                    </span>
                    {(stockCheckData.negativeCount > 0 || stockCheckData.insufficientCount > 0) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {stockCheckData.negativeCount || stockCheckData.insufficientCount} Negative Balance Approved
                      </span>
                    )}
                    {stockCheckData.unmatchedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                        {stockCheckData.unmatchedCount} Unmatched
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar: Cost, Revenue & Profit Calculation */}
            {stockCheckData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70">
                  <span className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Total Revenue</span>
                  <span className="text-base font-bold font-mono text-blue-950 block mt-0.5">
                    ETB {Number(stockCheckData.totalRevenue || parsed.rows.reduce((s, r) => s + (r.totalAmt || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-blue-600">Sales amount in report</span>
                </div>

                <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70">
                  <span className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Total Cost (COGS)</span>
                  <span className="text-base font-bold font-mono text-amber-950 block mt-0.5">
                    ETB {Number(stockCheckData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-amber-700">Calculated from item unit cost</span>
                </div>

                <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                  <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Gross Profit</span>
                  <span className="text-base font-bold font-mono text-emerald-950 block mt-0.5">
                    ETB {Number(stockCheckData.totalGrossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-700">Margin: {stockCheckData.overallMargin || 0}%</span>
                </div>

                <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70">
                  <span className="block text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Negative Stock</span>
                  <span className="text-base font-bold font-mono text-indigo-950 block mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    {stockCheckData.negativeCount || stockCheckData.insufficientCount || 0} Approved
                  </span>
                  <span className="text-[10px] text-indigo-600">Deductions allowed on negative balance</span>
                </div>
              </div>
            )}

            {/* Parsed preview table with real stock balance columns & cost calculation */}
            <div className="overflow-x-auto rounded-xl border border-ink-200 shadow-xs max-h-80">
              <table className="min-w-full text-xs divide-y divide-ink-100">
                <thead className="bg-ink-100/90 sticky top-0 z-10 font-bold text-ink-700">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Article Code</th>
                    <th className="px-3 py-2 text-left">Article Name</th>
                    <th className="px-3 py-2 text-left">Matched Item in Stock</th>
                    <th className="px-3 py-2 text-right">Opening Balance</th>
                    <th className="px-3 py-2 text-right">Items Sold Out</th>
                    <th className="px-3 py-2 text-right">Stock Balance</th>
                    <th className="px-3 py-2 text-center">Stock Status</th>
                    <th className="px-3 py-2 text-right">Unit Cost (ETB)</th>
                    <th className="px-3 py-2 text-right">COGS / Cost (ETB)</th>
                    <th className="px-3 py-2 text-right">Avg Price (ETB)</th>
                    <th className="px-3 py-2 text-right">Total Revenue (ETB)</th>
                    <th className="px-3 py-2 text-right">Gross Profit (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 text-ink-700 bg-white">
                  {parsed.rows.map((row, i) => {
                    const stock = stockCheckData?.lines?.[i]?.stock;
                    const openBal = stock?.openingBalance ?? stock?.availableStock;
                    const stockBal = stock?.stockBalance ?? stock?.remainingStock;
                    const unitCost = stock?.unitCost || 0;
                    const lineCost = stock?.totalCost ?? (unitCost ? (row.qty || 0) * unitCost : 0);
                    const lineRev = row.totalAmt || (row.qty * row.avgAmt) || 0;
                    const lineProfit = lineRev - lineCost;
                    const margin = lineRev > 0 ? ((lineProfit / lineRev) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={i} className="hover:bg-blue-50/20">
                        <td className="px-3 py-1.5 text-ink-400 font-mono text-[11px]">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-blue-700 font-bold">{row.code || '—'}</td>
                        <td className="px-3 py-1.5 font-semibold text-ink-900">{row.name}</td>
                        <td className="px-3 py-1.5 text-ink-700">
                          {stock?.isMatched ? (
                            <div>
                              <span className="font-semibold text-slate-900">{stock.matchedItemName}</span>
                              {stock.matchedItemCode && (
                                <span className="ml-1 text-[10px] font-mono text-slate-500">[{stock.matchedItemCode}]</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No catalog match</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-medium">
                          {stock?.isMatched ? (
                            stock.matchType === 'recipe_product' ? (
                              <span className="text-indigo-700 font-sans text-[11px]">Recipe ({stock.ingredients?.length || 0} ing.)</span>
                            ) : (
                              <span className={openBal > 0 ? 'text-slate-900 font-bold' : 'text-rose-600 font-bold'}>
                                {fmt(openBal)} {stock.unit}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular font-bold text-rose-600">
                          −{row.qty} {stock?.unit || ''}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold">
                          {stock?.isMatched && stock.matchType === 'direct_material' ? (
                            <div>
                              <span className={stockBal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {fmt(stockBal)} {stock.unit}
                              </span>
                              {openBal !== null && openBal !== undefined && (
                                <span className="block text-[9.5px] font-normal text-slate-400">
                                  ({fmt(openBal)} − {row.qty})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center whitespace-nowrap">
                          {stock?.status === 'in_stock' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ In Stock
                            </span>
                          )}
                          {stock?.status === 'low_stock' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠ Low Stock
                            </span>
                          )}
                          {(stock?.status === 'negative_approved' || stock?.status === 'insufficient' || (stockBal !== null && stockBal < 0)) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs" title="Negative stock balance is approved and calculated">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              ✓ Approved (Negative)
                            </span>
                          )}
                          {(!stock || stock?.status === 'unmatched') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Unmatched
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular text-slate-700 font-mono">
                          {unitCost > 0 ? unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular font-mono text-amber-900 font-medium">
                          {lineCost > 0 ? lineCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular text-ink-600">{row.avgAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-1.5 text-right tabular font-bold text-blue-700">{row.totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-1.5 text-right tabular font-mono font-bold">
                          {unitCost > 0 ? (
                            <span className={lineProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {lineProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="block text-[9.5px] font-normal text-slate-400">
                                {lineProfit >= 0 ? `+${margin}%` : `${margin}%`}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-ink-50 font-bold text-xs border-t border-ink-200">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-ink-700 font-bold">Total ({parsed.rows.length} items)</td>
                    <td className="px-3 py-2 text-right text-slate-400">—</td>
                    <td className="px-3 py-2 text-right tabular text-rose-700 font-bold">
                      −{parsed.rows.reduce((s, r) => s + r.qty, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} />
                    <td className="px-3 py-2 text-right text-ink-400">—</td>
                    <td className="px-3 py-2 text-right tabular text-amber-900 font-bold">
                      ETB {parsed.rows.reduce((s, r, idx) => {
                        const stock = stockCheckData?.lines?.[idx]?.stock;
                        const c = stock?.totalCost ?? (stock?.unitCost ? r.qty * stock.unitCost : 0);
                        return s + c;
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right text-ink-400">—</td>
                    <td className="px-3 py-2 text-right tabular text-blue-900 font-bold">
                      ETB {parsed.rows.reduce((s, r) => s + (r.totalAmt || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right tabular text-emerald-800 font-bold">
                      {(() => {
                        const totRev = parsed.rows.reduce((s, r) => s + (r.totalAmt || 0), 0);
                        const totCost = parsed.rows.reduce((s, r, idx) => {
                          const stock = stockCheckData?.lines?.[idx]?.stock;
                          const c = stock?.totalCost ?? (stock?.unitCost ? r.qty * stock.unitCost : 0);
                          return s + c;
                        }, 0);
                        const totProf = totRev - totCost;
                        const margin = totRev > 0 ? ((totProf / totRev) * 100).toFixed(1) : '0.0';
                        return `ETB ${totProf.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${margin}%)`;
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">How stock balance calculation &amp; negative balance approval work</p>
                <ul className="mt-1 space-y-0.5 text-blue-800 list-disc pl-4">
                  <li><strong>Article Code Detection</strong>: Automatically links the Excel article code directly to your stock inventory.</li>
                  <li><strong>Real-Time Stock Calculation</strong>: <code>Stock Balance = Opening Balance − Items Sold Out</code>.</li>
                  <li><strong>Negative Balance Approved</strong>: If sold quantity exceeds store opening balance (e.g. <code>10 pcs − 49 pcs = −39 pcs</code>), the transaction is <strong>approved</strong> and balance is recorded accurately.</li>
                  <li><strong>Cost &amp; Profit Calculations</strong>: Unit cost, COGS, revenue, and gross profit are automatically calculated for each line.</li>
                  <li>On confirm, the sold out quantities are atomically deducted from store <strong>{selectedStore}</strong> and posted to the Stock Ledger.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <Button
                onClick={handleCnetSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 shadow-md flex items-center gap-2"
              >
                {loading ? 'Processing…' : `Confirm & Deduct Stock (${parsed.rows.length} Items • Negative Balance Approved)`}
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── 2b. Generic Manual Column Mapping (fallback) ── */}
        {fileData && !isCnetFmt && !result?.success && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <h3 className="font-bold text-ink-900 text-base">Map File Columns</h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  <span className="font-bold text-emerald-700">{fileData.length} rows</span> detected. Select which columns to use.
                </p>
              </div>
              <button onClick={resetAll} className="text-xs text-red-600 font-semibold hover:underline">
                Cancel / Upload Different File
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Product Name Column', required: true,  val: productCol,     set: setProductCol },
                { label: 'Product Code Column', required: false, val: productCodeCol, set: setProductCodeCol },
                { label: 'Quantity Sold',        required: false, val: qtyCol,         set: setQtyCol },
                { label: 'Revenue / Amount',     required: false, val: revenueCol,     set: setRevenueCol },
                { label: 'Sale Date',            required: false, val: dateCol,        set: setDateCol },
              ].map(({ label, required, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-ink-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <select value={val} onChange={e => set(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 py-2 px-3 text-xs outline-none focus:border-blue-500 bg-white">
                    <option value="">-- Select --</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">
                  Deduct from Store Location
                </label>
                <select
                  value={selectedStore}
                  onChange={e => setSelectedStore(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 py-2 px-3 text-xs outline-none focus:border-blue-500 bg-white font-medium"
                >
                  {configuredStores.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="overflow-x-auto rounded-xl border border-ink-200 max-h-52">
              <table className="min-w-full text-xs divide-y divide-ink-100">
                <thead className="bg-ink-100/80 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-ink-700">#</th>
                    {columns.map(c => <th key={c} className="px-3 py-2 text-left text-ink-700 whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {fileData.slice(0, 6).map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/20">
                      <td className="px-3 py-1.5 text-ink-400 font-mono">{i + 1}</td>
                      {columns.map(c => <td key={c} className="px-3 py-1.5 whitespace-nowrap">{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <Button
                onClick={handleManualSubmit}
                disabled={loading || (!productCol && !productCodeCol)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 shadow-md flex items-center gap-2"
              >
                {loading ? 'Processing…' : 'Confirm & Import POS Sales'} <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── 3. Success Results ── */}
        {result?.success && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-emerald-950">POS Sales Imported Successfully</h2>
                    {result.data?.voucherNo && (
                      <span className="font-mono text-xs bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                        Voucher: {result.data.voucherNo}
                      </span>
                    )}
                    <span className="text-xs bg-white text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-300">
                      Store: {result.data?.storeLocation || selectedStore}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {result.data?.summary?.totalSoldProducts || result.data?.items?.length || 0} items processed · Stock deducted in real balance and P&amp;L updated.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportSoldExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 px-3.5 py-2 text-xs font-bold hover:bg-emerald-100 transition shadow-xs">
                  <Download size={14} /> Export to Excel
                </button>
                <Button onClick={resetAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2">
                  Import Another
                </Button>
              </div>
            </div>

            {/* KPI cards */}
            {result.data.summary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total POS Revenue',      val: `ETB ${fmt(result.data.summary.totalRevenue)}`,  sub: `${result.data.summary.totalSoldProducts || result.data.items?.length || 0} items sold`, cls: 'text-blue-700' },
                  { label: 'Total COGS',              val: `ETB ${fmt(result.data.summary.totalCOGS)}`,    sub: 'Deducted from stock',       cls: 'text-orange-700' },
                  { label: 'Gross Profit',            val: `ETB ${fmt(result.data.summary.grossProfit)}`,  sub: 'Revenue − COGS',            cls: result.data.summary.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700' },
                  { label: 'Gross Profit Margin',     val: result.data.summary.profitMargin,               sub: 'Efficiency percentage',     cls: 'text-violet-700' },
                ].map(({ label, val, sub, cls }) => (
                  <div key={label} className="rounded-xl border border-ink-100 bg-white p-4 shadow-xs">
                    <p className="text-xs font-medium text-ink-500">{label}</p>
                    <p className={`tabular text-xl font-bold mt-1 ${cls}`}>{val}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Real Stock Balance Deductions Applied to Ledger */}
            {result.data?.deductedStockDetails?.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-600" />
                      Real Stock Balance Deductions Applied to Ledger ({result.data.deductedStockDetails.length} items)
                    </h3>
                    <p className="text-xs text-indigo-700">
                      Real balances in <strong>{result.data?.storeLocation || selectedStore}</strong> were automatically updated and recorded in voucher {result.data?.voucherNo || 'Stock Out'}.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full self-start sm:self-auto">
                    ✓ Real Balance Deducted
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-white">
                  <table className="min-w-full text-xs divide-y divide-indigo-100">
                    <thead className="bg-indigo-100/70 font-bold text-indigo-900">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Stock Item Name</th>
                        <th className="px-3 py-2 text-left">Article Code</th>
                        <th className="px-3 py-2 text-left">Store Location</th>
                        <th className="px-3 py-2 text-right">Opening Balance</th>
                        <th className="px-3 py-2 text-right">Items Sold Out</th>
                        <th className="px-3 py-2 text-right">Stock Balance</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50 text-slate-800">
                      {result.data.deductedStockDetails.map((det, dIdx) => (
                        <tr key={dIdx} className="hover:bg-indigo-50/30">
                          <td className="px-3 py-1.5 text-slate-400 font-mono text-[11px]">{dIdx + 1}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{det.materialName}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-600">{det.materialCode || '—'}</td>
                          <td className="px-3 py-1.5 text-indigo-800 font-semibold">{det.storeLocation}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-medium text-slate-700">
                            {fmt(det.openingBalance ?? det.initialStock)} {det.unit}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-600">
                            −{fmt(det.itemsSoldOut ?? det.quantityDeducted)} {det.unit}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">
                            <span className={(det.stockBalance ?? det.finalStock) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {fmt(det.stockBalance ?? det.finalStock)} {det.unit}
                            </span>
                            <span className="block text-[9.5px] font-normal text-slate-400">
                              ({fmt(det.openingBalance ?? det.initialStock)} − {fmt(det.itemsSoldOut ?? det.quantityDeducted)})
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Deducted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sold products table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    All Sold POS Products ({displayedSoldProducts.length} items)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-400" />
                    <input type="text" placeholder="Search product…"
                      value={soldSearch} onChange={e => setSoldSearch(e.target.value)}
                      className="rounded-lg border border-ink-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 w-44 sm:w-56" />
                    {soldSearch && (
                      <button onClick={() => setSoldSearch('')} className="absolute right-2 top-2 text-ink-400 hover:text-ink-600">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
                    <option value="all">All Statuses</option>
                    <option value="recipe_deducted">Recipe Deducted</option>
                    <option value="direct_material">Direct Material</option>
                    <option value="no_recipe">No Recipe</option>
                    <option value="unmatched">Unmatched</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-soft">
                <table className="min-w-full text-xs divide-y divide-ink-200">
                  <thead className="bg-ink-100/80 font-bold text-ink-700">
                    <tr>
                      <th className="px-3 py-2.5 text-left">#</th>
                      <th className="px-3 py-2.5 text-left">Code</th>
                      <th className="px-3 py-2.5 text-left">Product Name</th>
                      <th className="px-3 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-right">Available Stock</th>
                      <th className="px-3 py-2.5 text-right">Qty Sold</th>
                      <th className="px-3 py-2.5 text-right">Last Balance</th>
                      <th className="px-3 py-2.5 text-right">Selling Price</th>
                      <th className="px-3 py-2.5 text-right">Total Revenue</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-left">Ingredients Deducted</th>
                      <th className="px-3 py-2.5 text-right">COGS (ETB)</th>
                      <th className="px-3 py-2.5 text-right">Gross Profit (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {displayedSoldProducts.length === 0 && (
                      <tr><td colSpan={13} className="px-4 py-8 text-center text-ink-400">No items match the filter.</td></tr>
                    )}
                    {displayedSoldProducts.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-3 py-2 text-ink-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-ink-600 whitespace-nowrap">{item.productCode || item.articleCode || '—'}</td>
                          <td className="px-3 py-2 font-semibold text-ink-900 whitespace-nowrap">{item.productName || item.articleName}</td>
                          <td className="px-3 py-2 text-ink-500 whitespace-nowrap">
                            <span className="text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded">{item.category || 'General'}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular font-mono text-slate-700">
                            {item.availableStock !== null && item.availableStock !== undefined
                              ? `${fmt(item.availableStock)} ${item.uom || ''}`
                              : (item.openingBalance !== null && item.openingBalance !== undefined
                                  ? `${fmt(item.openingBalance)} ${item.uom || ''}`
                                  : '—')}
                          </td>
                          <td className="px-3 py-2 text-right tabular font-bold text-rose-700 font-mono">
                            −{item.quantitySold} {item.uom || ''}
                          </td>
                          <td className="px-3 py-2 text-right tabular font-bold font-mono">
                            {(item.remainingStock !== null && item.remainingStock !== undefined) || (item.stockBalance !== null && item.stockBalance !== undefined) ? (
                              <span className={(item.remainingStock ?? item.stockBalance) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {fmt(item.remainingStock ?? item.stockBalance)} {item.uom || ''}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular text-ink-600">ETB {fmt(item.sellingPrice)}</td>
                          <td className="px-3 py-2 text-right tabular font-bold text-blue-700">ETB {fmt(item.revenue)}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {item.matchStatus === 'recipe_deducted' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle size={11} /> Recipe Deducted
                              </span>
                            )}
                            {item.matchStatus === 'direct_material' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 border border-indigo-200">
                                <CheckCircle size={11} /> Direct Stock
                              </span>
                            )}
                            {item.matchStatus === 'no_recipe' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                                Sold (No Recipe)
                              </span>
                            )}
                            {item.matchStatus === 'unmatched' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                                <AlertTriangle size={11} /> Unmatched
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-ink-600 text-[11px] max-w-[220px]">
                            {item.ingredientsUsed?.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">
                                  {item.ingredientsUsed.map(i => `${i.materialName} × ${i.quantityUsed} ${i.unit}`).join(', ')}
                                </span>
                                {item.ingredientsUsed.length > 1 && (
                                  <button type="button"
                                    onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                                    className="text-blue-600 hover:text-blue-800">
                                    {expandedRow === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-400 italic">No ingredients</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular text-orange-700">ETB {fmt(item.cogs)}</td>
                          <td className="px-3 py-2 text-right tabular font-bold text-emerald-700">ETB {fmt(item.grossProfit)}</td>
                        </tr>
                        {expandedRow === idx && item.ingredientsUsed?.length > 0 && (
                          <tr className="bg-emerald-50/40">
                            <td colSpan={11} className="px-6 py-2">
                              <p className="font-bold text-ink-700 mb-1 text-[11px]">Deducted Ingredients:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.ingredientsUsed.map((ing, iIdx) => (
                                  <span key={iIdx} className="bg-white border border-emerald-200 rounded-md px-2 py-0.5 text-[10.5px] text-ink-800 shadow-xs">
                                    <span className="font-semibold text-emerald-800">{ing.materialName}:</span> {ing.quantityUsed} {ing.unit} · ETB {fmt(ing.totalCost)}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-ink-100 font-bold border-t-2 border-ink-300 text-[11.5px]">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-ink-900 font-extrabold uppercase">
                        Total ({displayedSoldProducts.length} items)
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-400 font-mono">—</td>
                      <td className="px-3 py-2.5 text-right tabular text-ink-900 font-bold">
                        −{displayedSoldProducts.reduce((s, i) => s + (i.quantitySold || 0), 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-400 font-mono">—</td>
                      <td className="px-3 py-2.5 text-right text-ink-400">—</td>
                      <td className="px-3 py-2.5 text-right tabular text-blue-900 font-extrabold">
                        ETB {fmt(displayedSoldProducts.reduce((s, i) => s + (i.revenue || 0), 0))}
                      </td>
                      <td colSpan={2} className="px-3 py-2.5 text-center text-ink-500">Stock Deductions Applied</td>
                      <td className="px-3 py-2.5 text-right tabular text-orange-900 font-extrabold">
                        ETB {fmt(displayedSoldProducts.reduce((s, i) => s + (i.cogs || 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-emerald-950 font-black">
                        ETB {fmt(displayedSoldProducts.reduce((s, i) => s + (i.grossProfit || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button onClick={resetAll} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Import Another POS File
              </Button>
              <a href="/reports/stock-balance"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition">
                <Scale size={15} /> View Stock Balance Sheet
              </a>
              <a href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition">
                <TrendingUp size={15} /> View P&amp;L Analytics
              </a>
            </div>
          </div>
        )}

        {/* ── 4. Error State ── */}
        {result && !result.success && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl mt-2">
            <div className="flex items-center gap-2 text-red-700 font-bold mb-2 text-base">
              <XCircle size={20} /> Import Failed
            </div>
            <p className="text-sm text-red-700 mb-3">{result.message}</p>
            {result.unmatched?.length > 0 && (
              <div className="bg-white/80 p-3 rounded-xl border border-red-200">
                <p className="text-xs font-bold text-red-800 mb-1">Unmatched Products:</p>
                <ul className="list-disc pl-5 text-xs text-red-600 max-h-32 overflow-y-auto">
                  {result.unmatched.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              </div>
            )}
            <button onClick={() => setResult(null)}
              className="mt-4 text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1">
              Try Again
            </button>
          </div>
        )}

      </Card>

      {/* ══ OCR Image Review Modal ══ */}
      {imageOcrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                  <ScanLine size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink-900">OCR Image Scan Results</h2>
                  <p className="text-xs text-ink-500">Review and correct detected rows before importing</p>
                </div>
              </div>
              <button onClick={() => setImageOcrOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Loading state */}
              {ocrLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
                  <p className="text-sm font-semibold text-ink-700">Scanning image with OCR…</p>
                  <p className="text-xs text-ink-400">This may take 5–10 seconds</p>
                </div>
              )}

              {/* Error */}
              {!ocrLoading && ocrError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <XCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-semibold">OCR Error</p>
                    <p className="text-xs mt-0.5">{ocrError}</p>
                  </div>
                </div>
              )}

              {/* Image preview + results side by side */}
              {!ocrLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Image preview */}
                  {ocrImagePreview && (
                    <div className="rounded-xl border border-ink-200 overflow-hidden">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 px-3 py-1.5 bg-ink-50 border-b border-ink-100">Uploaded Image</p>
                      <img src={ocrImagePreview} alt="POS scan" className="w-full object-contain max-h-64" />
                    </div>
                  )}

                  {/* Detected rows */}
                  {ocrRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-ink-700">
                          Detected {ocrRows.length} product line{ocrRows.length !== 1 ? 's' : ''}
                          <span className="ml-1 text-violet-600">(editable)</span>
                        </p>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">
                          ✓ Ready to import
                        </span>
                      </div>
                      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                        {ocrRows.map((row, idx) => (
                          <div key={idx} className="grid gap-1 items-center text-xs"
                            style={{ gridTemplateColumns: '80px 1fr 50px 80px 24px' }}>
                            <input value={row.code} onChange={e => updateOcrRow(idx, 'code', e.target.value)}
                              className="rounded border border-ink-200 px-1.5 py-1 font-mono outline-none focus:border-violet-400 text-[11px]" placeholder="Code" />
                            <input value={row.name} onChange={e => updateOcrRow(idx, 'name', e.target.value)}
                              className="rounded border border-ink-200 px-1.5 py-1 outline-none focus:border-violet-400 text-[11px]" placeholder="Name" />
                            <input type="number" value={row.qty} onChange={e => updateOcrRow(idx, 'qty', e.target.value)}
                              className="rounded border border-ink-200 px-1.5 py-1 text-right outline-none focus:border-violet-400 text-[11px]" />
                            <input type="number" value={row.totalAmt} onChange={e => updateOcrRow(idx, 'totalAmt', e.target.value)}
                              className="rounded border border-violet-200 bg-violet-50 px-1.5 py-1 text-right outline-none focus:border-violet-500 text-[11px] font-semibold text-violet-700" />
                            <button type="button" onClick={() => removeOcrRow(idx)}
                              className="rounded p-0.5 text-ink-300 hover:text-red-500 hover:bg-red-50">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-ink-400">Columns: Code · Name · Qty · Total Amount</p>
                    </div>
                  )}
                </div>
              )}

              {/* Target Store Location */}
              {!ocrLoading && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50/60 border border-violet-200">
                  <div className="text-xs">
                    <span className="font-bold text-violet-950">Deduct Stock From Store:</span>
                    <span className="ml-1 text-violet-700">Real balance will be checked and deducted from this store</span>
                  </div>
                  <select
                    value={selectedStore}
                    onChange={e => setSelectedStore(e.target.value)}
                    className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 outline-none focus:border-violet-500 shadow-xs"
                  >
                    {configuredStores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info */}
              {!ocrLoading && ocrRows.length > 0 && (
                <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-2.5 text-xs text-violet-800 flex items-start gap-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-violet-500" />
                  <span>Review the detected rows carefully. OCR may misread unclear text. Correct any errors before importing. Real inventory balances in <strong>{selectedStore}</strong> will be deducted on import.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-ink-50/50 rounded-b-2xl">
              <button onClick={() => setImageOcrOpen(false)}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition">
                Cancel
              </button>
              <button onClick={handleOcrSubmit}
                disabled={loading || ocrLoading || ocrRows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-5 py-2 text-sm font-bold text-white transition">
                {loading ? 'Importing…' : `Import ${ocrRows.filter(r => r.code || r.name).length} Items`}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Manual Sales Entry Modal ══ */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <PenLine size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink-900">Manual Sales Entry</h2>
                  <p className="text-xs text-ink-500">Add products sold — same as POS format. Stock deducted automatically.</p>
                </div>
              </div>
              <button onClick={() => setManualOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Date + Reference + Store */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Sale Date *</label>
                  <input type="date" value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Reference / Shift (optional)</label>
                  <input type="text" value={manualRef} placeholder="e.g. Morning Shift, Table 5…"
                    onChange={e => setManualRef(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Deduct From Store *</label>
                  <select
                    value={selectedStore}
                    onChange={e => setSelectedStore(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white font-medium"
                  >
                    {configuredStores.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-ink-700">
                    Products Sold <span className="text-red-500">*</span>
                    <span className="ml-2 text-ink-400 font-normal">({manualRows.filter(r => r.code || r.name).length} items)</span>
                  </label>
                  <button type="button" onClick={addManualRow}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid gap-2 mb-1 px-1 text-[10px] font-bold text-ink-400 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '2fr 3fr 80px 110px 110px 32px' }}>
                  <span>Article Code</span>
                  <span>Article Name / Product</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Avg Amount</span>
                  <span className="text-right">Total Amount</span>
                  <span />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {manualRows.map((row) => (
                    <div key={row._id} className="grid gap-2 items-center"
                      style={{ gridTemplateColumns: '2fr 3fr 80px 110px 110px 32px' }}>

                      {/* Code */}
                      <input value={row.code}
                        onChange={e => updateManualRow(row._id, 'code', e.target.value)}
                        onBlur={e => handleCodeBlur(row._id, e.target.value)}
                        placeholder="P-0022"
                        className="rounded-lg border border-ink-200 px-2 py-2 text-xs outline-none focus:border-blue-500 font-mono" />

                      {/* Name — free text OR pick from product dropdown */}
                      <div className="relative">
                        <input value={row.name}
                          onChange={e => updateManualRow(row._id, 'name', e.target.value)}
                          list={`prod-list-${row._id}`}
                          placeholder="Select or type product name…"
                          className="w-full rounded-lg border border-ink-200 px-2 py-2 text-xs outline-none focus:border-blue-500" />
                        <datalist id={`prod-list-${row._id}`}>
                          {products.map(p => (
                            <option key={p._id} value={p.name}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                          ))}
                        </datalist>
                      </div>

                      {/* Qty */}
                      <input type="number" step="0.5" min="0.5" value={row.qty}
                        onChange={e => updateManualRow(row._id, 'qty', e.target.value)}
                        className="rounded-lg border border-ink-200 px-2 py-2 text-xs text-right outline-none focus:border-blue-500 tabular" />

                      {/* Avg Amount */}
                      <input type="number" step="0.01" min="0" value={row.avgAmt}
                        onChange={e => updateManualRow(row._id, 'avgAmt', e.target.value)}
                        placeholder="0.00"
                        className="rounded-lg border border-ink-200 px-2 py-2 text-xs text-right outline-none focus:border-blue-500 tabular" />

                      {/* Total Amount */}
                      <input type="number" step="0.01" min="0" value={row.totalAmt}
                        onChange={e => updateManualRow(row._id, 'totalAmt', e.target.value)}
                        placeholder="0.00"
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs text-right outline-none focus:border-blue-500 tabular font-semibold text-blue-700" />

                      {/* Remove */}
                      <button type="button" onClick={() => removeManualRow(row._id)}
                        disabled={manualRows.length === 1}
                        className="rounded-md p-1 text-ink-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals row */}
                <div className="mt-3 rounded-xl bg-ink-50 border border-ink-200 px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-ink-500 text-xs font-semibold">
                    {manualRows.filter(r => r.code || r.name).length} items ·{' '}
                    Total Qty: <strong className="text-ink-800">{manualRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)}</strong>
                  </span>
                  <span className="font-bold text-blue-700 text-base tabular">
                    Total: ETB {fmt(manualRows.reduce((s, r) => s + (parseFloat(r.totalAmt) || 0), 0))}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Products are matched by <strong>Article Code</strong> first, then by name.
                  Matched products deduct their recipe ingredients from stock automatically.
                  <strong> Avg Amount</strong> = unit selling price &nbsp;|&nbsp; <strong>Total Amount</strong> = line revenue.
                </span>
              </div>

              {manualError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
                  <XCircle size={13} className="shrink-0" /> {manualError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ink-100 bg-ink-50/50 rounded-b-2xl">
              <button onClick={() => setManualOpen(false)}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition">
                Cancel
              </button>
              <button onClick={handleManualEntrySubmit} disabled={manualLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 text-sm font-bold text-white transition">
                {manualLoading
                  ? 'Submitting…'
                  : `Submit ${manualRows.filter(r => r.code || r.name).length} Sale${manualRows.filter(r => r.code || r.name).length !== 1 ? 's' : ''}`}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
