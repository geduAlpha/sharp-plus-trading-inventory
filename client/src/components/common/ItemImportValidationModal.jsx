import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Check, X, Search, ArrowRight, RefreshCw, UploadCloud, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ItemImportValidationModal
 * Authenticates Excel items before import, displaying duplicate/existing item codes,
 * detailing all detected field changes, and providing one-click options to
 * override changes onto existing codes while adding non-duplicate items as new.
 */
export default function ItemImportValidationModal({
  open,
  onClose,
  validationData,
  onConfirmPushNewOnly,
  onConfirmPushAll,
  loading = false,
  title = 'Item Code Authentication & Override Validation',
}) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  if (!validationData) return null;

  const {
    total = 0,
    newCount = 0,
    existingCount = 0,
    existingItems = [],
  } = validationData;

  const filteredItems = useMemo(() => {
    if (!search.trim()) return existingItems;
    const term = search.toLowerCase();
    return existingItems.filter(
      (it) =>
        String(it.code || '').toLowerCase().includes(term) ||
        String(it.name || '').toLowerCase().includes(term) ||
        String(it.existingName || '').toLowerCase().includes(term) ||
        String(it.category || '').toLowerCase().includes(term)
    );
  }, [existingItems, search]);

  const handleCopyCodes = async () => {
    try {
      const codes = existingItems.map((it) => it.code || it.existingCode).filter(Boolean);
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Warning / Instructions Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/90 text-blue-950 shadow-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-blue-950 mb-0.5">
              Duplicate Item Codes Detected in Upload File
            </h4>
            <p className="text-blue-800 leading-relaxed">
              We authenticated your file against the database. Found{' '}
              <span className="font-bold underline text-blue-950">{existingCount} item(s)</span> whose Item Code
              already exists in the system.
            </p>
            <p className="text-blue-800 leading-relaxed mt-1">
              Choose <span className="font-semibold text-indigo-900">"Override Changes &amp; Add New Items"</span> to
              update existing records with their changed values (prices, names, categories, etc.) and add{' '}
              <span className="font-bold text-emerald-800">+{newCount} non-duplicate items</span> as new items without replacing anything.
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total In Excel
            </span>
            <span className="text-lg font-bold font-mono text-slate-900">{total}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="block text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              New Items To Add
            </span>
            <span className="text-lg font-bold font-mono text-emerald-700">+{newCount}</span>
            <span className="block text-[10px] text-emerald-600">Non-duplicate codes</span>
          </div>
          <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50">
            <span className="block text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Existing Codes (Override)
            </span>
            <span className="text-lg font-bold font-mono text-indigo-700">{existingCount}</span>
            <span className="block text-[10px] text-indigo-600">Will update changes</span>
          </div>
        </div>

        {/* Existing Item Codes Area Header & Search */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                Duplicate Item Codes &amp; Detected Changes ({filteredItems.length})
              </span>
              <button
                type="button"
                onClick={handleCopyCodes}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
                title="Copy all duplicate codes to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Codes!' : 'Copy Codes'}</span>
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter duplicate codes..."
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

          {/* List Area */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Item Code</th>
                    <th className="py-2 px-3">Excel Item Details</th>
                    <th className="py-2 px-3">Existing System Data</th>
                    <th className="py-2 px-3">Changes To Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No duplicate codes match "{search}"
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap align-top">
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[11px]">
                            {item.code || item.existingCode || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 align-top">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {item.category || 'General'} • {item.unit || 'pcs'}
                            {item.unitCost ? ` • ETB ${item.unitCost}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 align-top">
                          {item.existingName ? (
                            <div>
                              <span className="font-semibold text-slate-800">{item.existingName}</span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Stock: {item.existingStock ?? 0}
                                {item.existingCost !== undefined ? ` • ETB ${item.existingCost}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Repeated in Excel file</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          {Array.isArray(item.fieldChanges) && item.fieldChanges.length > 0 ? (
                            <div className="space-y-1">
                              {item.fieldChanges.map((ch, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mr-1 mb-0.5 text-[10px] rounded bg-blue-50 text-blue-900 border border-blue-200"
                                >
                                  <span className="font-semibold">{ch.field}:</span>
                                  <span className="line-through text-slate-400">{String(ch.old)}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-blue-600 inline" />
                                  <span className="font-bold text-blue-800">{String(ch.new)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full border border-slate-200">
                              No changes detected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Decision Prompt & Action Buttons */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-600 font-medium">
            Please choose how you would like to proceed with the import:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs order-3 sm:order-1"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onConfirmPushNewOnly}
              disabled={loading || newCount === 0}
              className="text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold order-2"
              title="Pushes only items that do not exist yet, skipping duplicates"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              Add {newCount} New Items Only (Skip Duplicates)
            </Button>

            <Button
              type="button"
              onClick={onConfirmPushAll}
              disabled={loading}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm order-1 sm:order-3"
              title="Overrides existing item records with new changes from Excel, and inserts all new non-duplicate items"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Override Changes &amp; Add New Items ({total})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
