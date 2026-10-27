import React, { useEffect, useState, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Boxes,
  Truck,
  UtensilsCrossed,
  ArrowLeftRight,
  ShoppingBag,
  Users,
  UserCheck,
  ClipboardList,
  FileText,
  X,
  Trash,
  Lock,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/* ── Type Configurations ─────────────────────────────────────────── */
const TYPE_META = {
  material:     { label: 'Item / Material',   icon: Boxes,          color: 'bg-amber-50 text-amber-700 border-amber-200' },
  supplier:     { label: 'Supplier',          icon: Truck,          color: 'bg-sky-50 text-sky-700 border-sky-200' },
  product:      { label: 'Product',           icon: UtensilsCrossed,color: 'bg-violet-50 text-violet-700 border-violet-200' },
  transaction:  { label: 'Transaction',       icon: ArrowLeftRight, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  purchase:     { label: 'Purchase Order',    icon: ShoppingBag,    color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  consumption:  { label: 'Consumption',       icon: UtensilsCrossed,color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  stockRequest: { label: 'Stock Request',     icon: ClipboardList,  color: 'bg-orange-50 text-orange-700 border-orange-200' },
  employee:     { label: 'Employee',          icon: Users,          color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  customer:     { label: 'Customer',          icon: UserCheck,      color: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

const itemName = (item) =>
  item.name ||
  item.voucherNo ||
  item.invoiceNumber ||
  (item.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : null) ||
  `${item._typeLabel} #${item._id?.slice(-6)}`;

export default function RecycleBin() {
  const { user, isDeveloper, hasRole, can } = useAuth();
  const isDev = Boolean(isDeveloper || user?.role === 'developer');
  const isAdmin = Boolean(hasRole('admin') || isDev);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal for Move All Operational Data to Recycle Bin
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [cleanLoading, setCleanLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/recycle-bin');
      setItems(Array.isArray(res.data) ? res.data : []);
      setSelected(new Set());
    } catch (err) {
      console.error('[RecycleBin] load error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── filtering ── */
  const displayed = filter === 'all' ? items : items.filter((i) => i._type === filter);

  /* ── selection ── */
  const allChecked = displayed.length > 0 && displayed.every((i) => selected.has(i._id));
  const someChecked = displayed.some((i) => selected.has(i._id));
  const toggleAll = () => {
    if (allChecked) {
      setSelected((prev) => {
        const n = new Set(prev);
        displayed.forEach((i) => n.delete(i._id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        displayed.forEach((i) => n.add(i._id));
        return n;
      });
    }
  };
  const toggleOne = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  /* ── single restore (Developer Only) ── */
  const handleRestore = async (item) => {
    if (!isDev) {
      showToast('Permission Denied: Only the System Developer & Owner can restore records.', 'error');
      return;
    }
    setWorking(true);
    try {
      const res = await api.post(`/recycle-bin/${item._type}/${item._id}/restore`);
      showToast(res.data?.message || `"${itemName(item)}" restored successfully.`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Restore failed.', 'error');
      load();
    } finally {
      setWorking(false);
    }
  };

  /* ── single permanent delete ── */
  const handlePermanent = async (item) => {
    if (!isAdmin) {
      showToast('Permission Denied: Administrator role required to permanently delete items.', 'error');
      return;
    }
    if (!window.confirm(`Permanently delete "${itemName(item)}"? This will wipe it from the database forever.`)) return;
    setWorking(true);
    try {
      await api.delete(`/recycle-bin/${item._type}/${item._id}`);
      showToast(`"${itemName(item)}" permanently deleted.`);
      load();
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('Item was already removed. Refreshing…', 'error');
        load();
      } else {
        showToast(err.response?.data?.message || 'Delete failed.', 'error');
      }
    } finally {
      setWorking(false);
    }
  };

  /* ── bulk restore (Developer Only) ── */
  const handleBulkRestore = async () => {
    if (!isDev) {
      showToast('Permission Denied: Only the System Developer & Owner can restore records.', 'error');
      return;
    }
    const toRestore = items.filter((i) => selected.has(i._id));
    if (!toRestore.length) return;
    setWorking(true);
    let ok = 0;
    let fail = 0;
    for (const item of toRestore) {
      try {
        await api.post(`/recycle-bin/${item._type}/${item._id}/restore`);
        ok++;
      } catch {
        fail++;
      }
    }
    showToast(`${ok} item(s) restored${fail ? `, ${fail} failed` : ''}.`, fail ? 'error' : 'success');
    load();
    setWorking(false);
  };

  /* ── bulk permanent delete ── */
  const handleBulkPermanent = async () => {
    if (!isAdmin) {
      showToast('Permission Denied: Administrator role required.', 'error');
      return;
    }
    const toDelete = items.filter((i) => selected.has(i._id));
    if (!toDelete.length) return;
    if (!window.confirm(`Permanently delete ${toDelete.length} item(s)? This CANNOT be undone.`)) return;
    setWorking(true);
    let ok = 0;
    let fail = 0;
    for (const item of toDelete) {
      try {
        await api.delete(`/recycle-bin/${item._type}/${item._id}`);
        ok++;
      } catch {
        fail++;
      }
    }
    showToast(`${ok} permanently deleted${fail ? `, ${fail} failed` : ''}.`, fail ? 'error' : 'success');
    load();
    setWorking(false);
  };

  /* ── empty bin ── */
  const handleEmptyBin = async () => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        'Empty the entire recycle bin? All items across all collections will be PERMANENTLY deleted and cannot be recovered!'
      )
    )
      return;
    setWorking(true);
    try {
      await api.delete('/recycle-bin/empty');
      showToast('Recycle bin emptied completely.');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to empty bin.', 'error');
    } finally {
      setWorking(false);
    }
  };

  /* ── Move all operational data to recycle bin ── */
  const handleExecuteDeleteAllData = async () => {
    if (confirmPhrase !== 'MOVE ALL TO RECYCLE BIN') {
      showToast('Please type the exact confirmation phrase.', 'warning');
      return;
    }
    setCleanLoading(true);
    try {
      const res = await api.post('/recycle-bin/delete-all-data');
      showToast(res.data?.message || 'Operational data moved to Recycle Bin safely.');
      setShowDeleteAllModal(false);
      setConfirmPhrase('');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to move data to recycle bin', 'error');
    } finally {
      setCleanLoading(false);
    }
  };

  /* ── counts by type ── */
  const counts = Object.keys(TYPE_META).reduce((acc, k) => {
    acc[k] = items.filter((i) => i._type === k).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5 pb-8">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-xs">
            <Trash2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recycle Bin</h1>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                {items.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Soft-deleted and voided system records. Excluded from dashboard metrics &amp; financial reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} /> Refresh
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 transition shadow-2xs"
              title="Move all active transactions and operational data to Recycle Bin safely"
            >
              <AlertTriangle size={14} className="text-amber-600" /> Void &amp; Move All Data to Bin
            </button>
          )}

          {isAdmin && items.length > 0 && (
            <button
              onClick={handleEmptyBin}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white transition shadow-2xs disabled:opacity-50"
            >
              <Trash size={14} /> Empty Bin
            </button>
          )}
        </div>
      </div>

      {/* ── Security Policy Notification Card ── */}
      <div
        className={`rounded-2xl border p-4 shadow-2xs transition-all ${
          isDev
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
            : 'border-amber-200 bg-amber-50/70 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isDev ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck size={18} />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white">
                <Lock size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 text-xs leading-relaxed">
            {isDev ? (
              <>
                <p className="font-extrabold text-sm text-emerald-900">
                  Developer &amp; Owner Authorised Recovery Zone
                </p>
                <p className="text-emerald-800 mt-0.5">
                  You are logged in with <strong>System Developer &amp; Owner</strong> privileges. You have exclusive
                  rights to restore any soft-deleted or voided transaction, inventory item, purchase order, or customer
                  back to the active database. Restored transactions automatically re-synchronize stock movements and
                  audit trails.
                </p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-sm text-amber-900">
                  Access Restricted — Restoration Reserved for Developer/Owner
                </p>
                <p className="text-amber-800 mt-0.5">
                  When administrators delete or void data, records are safely moved here and excluded from all Dashboard
                  KPIs, cash/credit sales, and inventory balances. Under system policy,{' '}
                  <strong className="underline">only the System Developer &amp; Owner</strong> has authorization to restore
                  records from the Recycle Bin.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { key: 'all', label: `All Records (${items.length})` },
          ...Object.entries(TYPE_META).map(([k, v]) => ({
            key: k,
            label: `${v.label} (${counts[k] || 0})`,
          })),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setSelected(new Set());
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-2xs ${
              filter === tab.key
                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Bulk Action Bar ── */}
      {someChecked && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/90 p-3 shadow-sm">
          <span className="text-xs font-bold text-blue-900 ml-1">
            {selected.size} record{selected.size !== 1 ? 's' : ''} selected
          </span>

          {isDev ? (
            <button
              onClick={handleBulkRestore}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
            >
              <RotateCcw size={13} /> Restore Selected
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 cursor-not-allowed"
              title="Only System Developer & Owner can restore items"
            >
              <Lock size={12} /> Restore (Developer Only)
            </span>
          )}

          {isAdmin && (
            <button
              onClick={handleBulkPermanent}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
            >
              <Trash2 size={13} /> Delete Permanently
            </button>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Records Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 60%, #ef4444 100%)' }}>
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded cursor-pointer accent-white"
                  />
                </th>
                {['Type', 'Status', 'Name / Identifier', 'Details', 'Deleted At', 'Deleted By', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-rose-50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                    <RefreshCw size={24} className="inline animate-spin mr-2 text-rose-600" />
                    Loading recycle bin items…
                  </td>
                </tr>
              )}

              {!loading && displayed.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Trash2 size={28} />
                    </div>
                    <p className="text-base font-bold text-slate-700">Recycle bin is empty</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Whenever data is deleted or voided, it will be safely placed here and hidden from your dashboard.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                displayed.map((item) => {
                  const meta = TYPE_META[item._type] || {
                    label: item._typeLabel || 'Record',
                    icon: Boxes,
                    color: 'bg-slate-50 text-slate-700 border-slate-200',
                  };
                  const Icon = meta.icon || Trash2;
                  const isSelected = selected.has(item._id);

                  return (
                    <tr
                      key={item._id}
                      className={`transition-colors ${isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50/60'}`}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(item._id)}
                          className="h-4 w-4 rounded accent-rose-600 cursor-pointer"
                        />
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}
                        >
                          <Icon size={12} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Status Voided vs Deleted */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.isVoided || item.status === 'voided' || item.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            <AlertOctagon size={10} /> Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <Trash2 size={10} /> Deleted
                          </span>
                        )}
                      </td>

                      {/* Name / ID */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-bold text-slate-900 text-xs truncate" title={itemName(item)}>
                          {itemName(item)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {item._id?.slice(-8)}</p>
                      </td>

                      {/* Details context */}
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                        {item._type === 'material' && (
                          <span className="truncate block">
                            Cat: {item.category || 'General'} · Stock: {item.currentStock || 0} {item.unit}
                          </span>
                        )}
                        {item._type === 'supplier' && (
                          <span className="truncate block">
                            Phone: {item.phone || '—'} · TIN: {item.tin || '—'}
                          </span>
                        )}
                        {item._type === 'product' && (
                          <span className="truncate block">
                            Price: ETB {item.sellingPrice || 0} · {item.ingredients?.length || 0} ingredient(s)
                          </span>
                        )}
                        {item._type === 'transaction' && (
                          <span className="truncate block">
                            {item.voucherType?.replace(/_/g, ' ')} · ETB {(item.totalAmount || 0).toFixed(2)}
                          </span>
                        )}
                        {item._type === 'purchase' && (
                          <span className="truncate block">
                            Status: {item.status} · ETB {(item.totalAmount || 0).toFixed(2)}
                          </span>
                        )}
                        {item._type === 'consumption' && (
                          <span className="truncate block">
                            Beneficiary: {item.beneficiary || item.department || 'Staff'} · Pax: {item.pax || 1}
                          </span>
                        )}
                        {item._type === 'stockRequest' && (
                          <span className="truncate block">Dept: {item.department}</span>
                        )}
                        {item._type === 'employee' && (
                          <span className="truncate block">
                            Dept: {item.department} · {item.position}
                          </span>
                        )}
                        {item._type === 'customer' && (
                          <span className="truncate block">
                            Type: {item.customerType} · {item.phone || 'No phone'}
                          </span>
                        )}
                      </td>

                      {/* Deleted At */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(item.deletedAt)}</td>

                      {/* Deleted By */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                        {item.deletedBy || 'System / Admin'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isDev ? (
                            <button
                              onClick={() => handleRestore(item)}
                              disabled={working}
                              title="Restore to active database"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition shadow-2xs disabled:opacity-50"
                            >
                              <RotateCcw size={12} /> Restore
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Only the System Developer & Owner can restore records"
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 px-2.5 py-1 text-xs font-bold cursor-not-allowed opacity-80"
                            >
                              <Lock size={11} className="text-slate-400" /> Developer Only
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handlePermanent(item)}
                              disabled={working}
                              title="Permanently remove from database"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {!loading && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing <strong>{displayed.length}</strong> of <strong>{items.length}</strong> recycled items
            </span>
            {selected.size > 0 && <span className="font-bold text-blue-600">{selected.size} selected</span>}
          </div>
        )}
      </div>

      {/* ── Modal: Void & Move All Data to Recycle Bin ── */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Move All Operational Data to Recycle Bin</h3>
                <p className="text-xs text-slate-500">Safely void &amp; archive all transactions without data loss</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-amber-50/60 border border-amber-200 rounded-xl p-4 leading-relaxed">
              <p className="font-bold text-amber-900">What happens when you proceed:</p>
              <ul className="list-disc pl-4 space-y-1 text-amber-800">
                <li>All active transactions and sales imports will be voided and moved to the Recycle Bin.</li>
                <li>All stock movements applied to inventory will be safely reversed.</li>
                <li>Purchases, consumptions, and stock requests will be moved to the Recycle Bin.</li>
                <li>
                  <strong>Dashboard metrics will immediately reset to zero</strong> for transactions/sales.
                </li>
                <li>
                  <strong>No data is permanently destroyed.</strong> Everything remains stored in the Recycle Bin.
                </li>
                <li className="font-extrabold text-amber-950">
                  Only the System Developer &amp; Owner can restore any of these records!
                </li>
              </ul>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                To confirm, type <span className="font-mono text-rose-600">MOVE ALL TO RECYCLE BIN</span> below:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="MOVE ALL TO RECYCLE BIN"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAllModal(false);
                  setConfirmPhrase('');
                }}
                disabled={cleanLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAllData}
                disabled={cleanLoading || confirmPhrase !== 'MOVE ALL TO RECYCLE BIN'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-40"
              >
                {cleanLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Moving records…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Confirm Move to Recycle Bin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
