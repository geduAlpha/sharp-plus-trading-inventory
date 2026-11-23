import React, { useState, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  X,
  Search,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  Info,
  FileSpreadsheet,
  Layers,
  PlusCircle,
  FileEdit,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ItemImportValidationModal / ItemImportPreviewModal
 * Comprehensive preview and verification modal for Excel item imports:
 * - Shows full preview of all incoming Excel rows (New Items + Existing Codes with diffs)
 * - Tabs to filter All, New Only, Existing Only, or Changed Only
 * - Allows re-uploading/resubmitting a corrected file directly from within the modal
 * - User reviews and submits either with "Override Changes & Add All" or "New Items Only"
 */
export default function ItemImportValidationModal({
  open,
  onClose,
  validationData,
  onConfirmPushNewOnly,
  onConfirmPushAll,
  onResubmitFile,
  loading = false,
  title = 'Import Items Preview & Submission',
}) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'existing' | 'changes'
  const [viewMode, setViewMode] = useState('parallel'); // 'parallel' | 'standard'
  const fileInputRef = useRef(null);

  if (!validationData) return null;

  const {
    total = 0,
    newCount = 0,
    existingCount = 0,
    existingItems = [],
    newItems = [],
    fileName = 'Excel File',
  } = validationData;

  // Build unified items list for preview
  const allPreviewItems = useMemo(() => {
    const list = [];
    (existingItems || []).forEach((it) => {
      list.push({
        ...it,
        statusType: 'existing',
      });
    });
    (newItems || []).forEach((it) => {
      list.push({
        ...it,
        statusType: 'new',
      });
    });
    return list.sort((a, b) => (Number(a.rowNumber) || 0) - (Number(b.rowNumber) || 0));
  }, [existingItems, newItems]);

  const withChangesCount = useMemo(() => {
    return (existingItems || []).filter((it) => it.hasChanges).length;
  }, [existingItems]);

  const totalValuation = useMemo(() => {
    return allPreviewItems.reduce((acc, it) => {
      const stock = Number(it.currentStock) || 0;
      const cost = Number(it.unitCost) || 0;
      return acc + stock * cost;
    }, 0);
  }, [allPreviewItems]);

  const filteredItems = useMemo(() => {
    let items = allPreviewItems;
    if (activeTab === 'new') {
      items = items.filter((it) => it.statusType === 'new');
    } else if (activeTab === 'existing') {
      items = items.filter((it) => it.statusType === 'existing');
    } else if (activeTab === 'changes') {
      items = items.filter((it) => it.statusType === 'existing' && it.hasChanges);
    }

    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (it) =>
        String(it.code || '').toLowerCase().includes(term) ||
        String(it.name || '').toLowerCase().includes(term) ||
        String(it.existingName || '').toLowerCase().includes(term) ||
        String(it.category || '').toLowerCase().includes(term) ||
        String(it.storeLocation || '').toLowerCase().includes(term)
    );
  }, [allPreviewItems, activeTab, search]);

  const handleCopyCodes = async () => {
    try {
      const codes = allPreviewItems.map((it) => it.code || it.existingCode).filter(Boolean);
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onResubmitFile) {
      onResubmitFile(file);
    }
    e.target.value = '';
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Hidden File Input for Resubmitting / Changing file */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".xlsx,.xls"
          className="hidden"
        />

        {/* Top File Summary & Resubmit Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-blue-950 truncate max-w-xs sm:max-w-md">
                  {fileName}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-semibold">
                  {total} rows loaded
                </span>
              </div>
              <p className="text-xs text-blue-800">
                Review item details and detected changes below before final submission into the system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-2xs"
              title="Select another Excel file to preview and replace this one"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Resubmit / Change File
            </Button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total In Excel
            </span>
            <span className="text-lg font-bold font-mono text-slate-900">{total}</span>
            <span className="block text-[10px] text-slate-500">Items ready to preview</span>
          </div>

          <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="block text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              New Items
            </span>
            <span className="text-lg font-bold font-mono text-emerald-700">+{newCount}</span>
            <span className="block text-[10px] text-emerald-600">Created as new items</span>
          </div>

          <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50">
            <span className="block text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Existing Codes
            </span>
            <span className="text-lg font-bold font-mono text-indigo-700">{existingCount}</span>
            <span className="block text-[10px] text-indigo-600">
              {withChangesCount} with field changes
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50">
            <span className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Batch Valuation
            </span>
            <span className="text-sm font-bold font-mono text-amber-900 truncate block mt-0.5">
              ETB {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[10px] text-amber-700">Stock × Unit Cost</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Items ({total})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                  activeTab === 'new'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                New Items ({newCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('existing')}
                className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                  activeTab === 'existing'
                    ? 'bg-white text-indigo-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                Existing Codes ({existingCount})
              </button>
              {withChangesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('changes')}
                  className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                    activeTab === 'changes'
                      ? 'bg-white text-blue-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  With Changes ({withChangesCount})
                </button>
              )}
            </div>

            {/* Search, View Mode & Copy */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 border border-slate-300 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('parallel')}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    viewMode === 'parallel'
                      ? 'bg-white text-indigo-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View columns side-by-side with parallel overrides highlighted"
                >
                  Parallel Columns View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('standard')}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    viewMode === 'standard'
                      ? 'bg-white text-indigo-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="View compact list with diff tags"
                >
                  Compact View
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyCodes}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition shrink-0"
                title="Copy all item codes to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Codes!' : 'Copy Codes'}</span>
              </button>

              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter preview..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-7 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Preview Area */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
              {viewMode === 'parallel' ? (
                /* ── Parallel Columns Diff View ── */
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-slate-400">#</th>
                      <th className="py-2 px-2.5">Item Code</th>
                      <th className="py-2 px-2.5">Item Name</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5">Unit</th>
                      <th className="py-2 px-2.5 text-right">Unit Cost</th>
                      <th className="py-2 px-2.5 text-center">Stock</th>
                      <th className="py-2 px-2.5">Store</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No items match the current tab or search filter "{search}"
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isNew = item.statusType === 'new';
                        const po = item.parallelOverrides || {};
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition ${
                              !isNew && item.hasChanges ? 'bg-blue-50/15' : !isNew ? 'bg-slate-50/30' : ''
                            }`}
                          >
                            <td className="py-2 px-2.5 font-mono text-[10px] text-slate-400">
                              {item.rowNumber || idx + 1}
                            </td>

                            {/* Perspective Item Code */}
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[11px] ${
                                  isNew
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                }`}
                              >
                                {item.code || item.existingCode || '—'}
                              </span>
                            </td>

                            {/* Parallel Column: Name */}
                            <td className="py-2 px-2.5">
                              {po.name ? (
                                <div className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-950">
                                  <span className="line-through text-slate-400 text-[10px] block truncate max-w-xs">{po.name.old}</span>
                                  <span className="font-bold text-blue-900 block truncate max-w-xs">{po.name.new}</span>
                                </div>
                              ) : (
                                <span className="font-medium text-slate-900 block truncate max-w-xs">{item.name}</span>
                              )}
                            </td>

                            {/* Parallel Column: Category */}
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              {po.category ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[10px]">
                                  <span className="line-through text-slate-400 mr-1">{po.category.old}</span>
                                  <span className="font-bold text-blue-900">{po.category.new}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">{item.category || 'General'}</span>
                              )}
                            </td>

                            {/* Parallel Column: Unit */}
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              {po.unit ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[10px]">
                                  <span className="line-through text-slate-400 mr-1">{po.unit.old}</span>
                                  <span className="font-bold text-blue-900">{po.unit.new}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">{item.unit || 'pcs'}</span>
                              )}
                            </td>

                            {/* Parallel Column: Unit Cost */}
                            <td className="py-2 px-2.5 text-right whitespace-nowrap font-mono">
                              {po.unitCost ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[10px]">
                                  <span className="line-through text-slate-400 block">ETB {Number(po.unitCost.old).toFixed(2)}</span>
                                  <span className="font-bold text-blue-900 block">ETB {Number(po.unitCost.new).toFixed(2)}</span>
                                </div>
                              ) : (
                                <span>ETB {Number(item.unitCost || 0).toFixed(2)}</span>
                              )}
                            </td>

                            {/* Parallel Column: Stock */}
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              {po.currentStock ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[10px]">
                                  <span className="line-through text-slate-400 mr-1">{po.currentStock.old}</span>
                                  <span className="font-bold text-blue-900">{po.currentStock.new}</span>
                                </div>
                              ) : (
                                <span className="font-semibold text-slate-800">{item.currentStock ?? 0}</span>
                              )}
                            </td>

                            {/* Parallel Column: Store */}
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              {po.storeLocation ? (
                                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-[10px]">
                                  <span className="line-through text-slate-400 mr-1">{po.storeLocation.old}</span>
                                  <span className="font-bold text-blue-900">{po.storeLocation.new}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">{item.storeLocation || 'Main Store'}</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              {isNew ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <PlusCircle className="w-2.5 h-2.5" />
                                  New Item
                                </span>
                              ) : item.hasChanges ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Overrides
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                  Same
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                /* ── Standard View ── */
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12 text-slate-400">#</th>
                      <th className="py-2 px-3">Item Code</th>
                      <th className="py-2 px-3">Item Name &amp; Category</th>
                      <th className="py-2 px-3">Stock &amp; Store</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3">Import Action / Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No items match the current tab or search filter "{search}"
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isNew = item.statusType === 'new';
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition ${
                              !isNew ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                              {item.rowNumber || idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[11px] ${
                                  isNew
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                }`}
                              >
                                {item.code || item.existingCode || '—'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <div>{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {item.category || 'General'} • {item.itemType || 'Raw Material'}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                              <span className="font-semibold">{item.currentStock ?? 0}</span>{' '}
                              <span className="text-slate-500 text-[11px]">{item.unit || 'pcs'}</span>
                              <span className="block text-[10px] text-slate-400">
                                {item.storeLocation || 'Main Store'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                              ETB {Number(item.unitCost || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3">
                              {isNew ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <PlusCircle className="w-2.5 h-2.5" />
                                  + Create New Item
                                </span>
                              ) : item.fieldChanges && item.fieldChanges.length > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                                    <FileEdit className="w-2.5 h-2.5" />
                                    Parallel Overrides:
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {item.fieldChanges.map((ch, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] rounded bg-blue-50 text-blue-900 border border-blue-200 font-mono"
                                      >
                                        <span className="font-semibold">{ch.field}:</span>
                                        <span className="line-through text-slate-400">{String(ch.old)}</span>
                                        <ArrowRight className="w-2 h-2 text-blue-600 inline" />
                                        <span className="font-bold text-blue-800">{String(ch.new)}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  Existing (No Changes)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Decision Prompt & Action Buttons */}
        <div className="pt-2 border-t border-slate-200 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <span className="font-medium">
              Choose your submission mode to commit items to inventory:
            </span>
            <span className="text-[11px] text-slate-400">
              Non-duplicate items are always inserted as brand new records.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs order-4 sm:order-1"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 order-3 sm:order-2"
              title="Resubmit or pick another Excel file"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Resubmit File
            </Button>

            {existingCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={onConfirmPushNewOnly}
                disabled={loading || newCount === 0}
                className="text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold order-2 sm:order-3"
                title="Pushes only items that do not exist yet, skipping duplicates"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Submit {newCount} New Items Only
              </Button>
            )}

            <Button
              type="button"
              onClick={onConfirmPushAll}
              disabled={loading || total === 0}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm order-1 sm:order-4"
              title="Overrides existing item records with new changes from Excel, and inserts all new non-duplicate items"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Confirm &amp; Submit Import ({total} Items)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
