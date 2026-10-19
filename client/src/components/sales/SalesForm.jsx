import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import {
  ShoppingBag,
  CreditCard,
  Plus,
  Trash2,
  Search,
  User,
  UserPlus,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  Printer,
  ChevronDown,
  Building,
  Phone,
  MapPin,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

const formatETB = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalesForm({ voucherType = 'cash_sale' }) {
  const isCredit = voucherType === 'credit_sale';

  // ── Form State ──────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // New Customer Modal State
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    tinNumber: '',
    customerType: isCredit ? 'credit' : 'regular',
    notes: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Materials & Products for item selection
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Line Items
  const [items, setItems] = useState([
    {
      material: '',
      description: '',
      category: '',
      uom: '',
      currentStock: 0,
      quantity: 1,
      sellingPrice: 0,
      total: 0,
    },
  ]);

  // Voucher details
  const [voucherNo, setVoucherNo] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Submission & Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successVoucher, setSuccessVoucher] = useState(null);

  // Recent transactions list
  const [recentSales, setRecentSales] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // ── Load Customers & Materials ───────────────────────────────────────────
  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load customers:', err);
    }
  };

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const res = await api.get('/materials');
      setMaterials(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load materials:', err);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const loadRecentSales = async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get('/transactions', {
        params: { voucherType: isCredit ? 'credit_sale' : 'cash_sale' },
      });
      setRecentSales(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (err) {
      console.warn('Failed to load recent sales:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadMaterials();
    loadRecentSales();
  }, [voucherType]);

  // Close customer dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target)
      ) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // ── Customer Handlers ───────────────────────────────────────────────────
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDropdownOpen(false);
    setCustomerSearch('');
  };

  const handleSelectWalkIn = () => {
    setSelectedCustomer({
      name: 'Walk-in Customer',
      phone: '',
      address: '',
      customerType: 'walk_in',
      source: 'default',
    });
    setCustomerDropdownOpen(false);
    setCustomerSearch('');
  };

  const handleCreateNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;
    setSavingCustomer(true);
    try {
      const res = await api.post('/customers', newCustomerForm);
      const created = res.data;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      setNewCustomerModalOpen(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        address: '',
        email: '',
        tinNumber: '',
        customerType: isCredit ? 'credit' : 'regular',
        notes: '',
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // ── Line Items Handlers with Auto-Fill ───────────────────────────────────
  const handleItemMaterialChange = (idx, materialId) => {
    const mat = materials.find((m) => m._id === materialId);
    setItems((prev) => {
      const updated = [...prev];
      if (!mat) {
        updated[idx] = {
          material: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          total: 0,
        };
      } else {
        // Auto-fill Description, Category, UOM, Available stock, and Recommended Price
        const defaultPrice = mat.unitCost ? Number((mat.unitCost * 1.25).toFixed(2)) : 0;
        const currentQty = Number(updated[idx].quantity) || 1;
        updated[idx] = {
          material: mat._id,
          description: mat.code ? `${mat.code} - ${mat.name}` : mat.name,
          category: mat.category || 'General',
          uom: mat.unit || 'Pcs',
          currentStock: mat.currentStock || 0,
          quantity: currentQty,
          sellingPrice: defaultPrice,
          total: Number((currentQty * defaultPrice).toFixed(2)),
        };
      }
      return updated;
    });
  };

  const handleItemFieldChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };

      if (field === 'quantity' || field === 'sellingPrice') {
        const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
        const price = Number(field === 'sellingPrice' ? value : item.sellingPrice) || 0;
        item.total = Number((qty * price).toFixed(2));
      }

      updated[idx] = item;
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        material: '',
        description: '',
        category: '',
        uom: '',
        currentStock: 0,
        quantity: 1,
        sellingPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItemRow = (idx) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Financial Calculations ──────────────────────────────────────────────
  const totalRevenue = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [items]);

  const creditBalance = useMemo(() => {
    if (!isCredit) return 0;
    return Math.max(0, totalRevenue - (Number(amountPaid) || 0));
  }, [isCredit, totalRevenue, amountPaid]);

  // Automatically sync amountPaid for cash sales
  useEffect(() => {
    if (!isCredit) {
      setAmountPaid(totalRevenue);
    }
  }, [isCredit, totalRevenue]);

  // ── Form Submission ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isCredit && !selectedCustomer) {
      setError('Please select or add a registered customer for Credit Sales.');
      return;
    }

    const validItems = items.filter((it) => it.material && Number(it.quantity) > 0);
    if (!validItems.length) {
      setError('Please select at least one item with a valid quantity.');
      return;
    }

    // Check for stock availability
    for (const it of validItems) {
      if (Number(it.quantity) > Number(it.currentStock)) {
        setError(
          `Insufficient stock for "${it.description}". Available: ${it.currentStock} ${it.uom}, requested: ${it.quantity}.`
        );
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      voucherType: isCredit ? 'credit_sale' : 'cash_sale',
      voucherNo: voucherNo.trim() || undefined,
      date: saleDate,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer ? selectedCustomer.phone : '',
      customerAddress: selectedCustomer ? selectedCustomer.address : '',
      paymentType: isCredit ? 'credit' : 'cash',
      paymentStatus: isCredit
        ? Number(amountPaid) >= totalRevenue
          ? 'paid'
          : Number(amountPaid) > 0
          ? 'partial'
          : 'unpaid'
        : 'paid',
      amountPaid: isCredit ? Number(amountPaid) || 0 : totalRevenue,
      dueDate: isCredit ? dueDate : null,
      reference: reference.trim(),
      notes: notes.trim(),
      items: validItems.map((it) => ({
        material: it.material,
        quantity: Number(it.quantity),
        sellingPrice: Number(it.sellingPrice),
        unitCost: it.unitCost || 0,
      })),
    };

    try {
      const res = await api.post('/transactions', payload);
      setSuccessVoucher(res.data);
      // Reset form
      setItems([
        {
          material: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          total: 0,
        },
      ]);
      setVoucherNo('');
      setReference('');
      setNotes('');
      if (!isCredit) {
        setSelectedCustomer(null);
      }
      loadMaterials(); // Refresh live stock numbers
      loadRecentSales(); // Refresh recent sales table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit sales voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isCredit ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {isCredit ? <CreditCard size={26} /> : <ShoppingBag size={26} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink-900">
                {isCredit ? 'Credit Sales Entry' : 'Cash Sales Entry'}
              </h1>
              <Badge color={isCredit ? 'amber' : 'green'}>
                {isCredit ? 'CRSALE' : 'CSALE'}
              </Badge>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              {isCredit
                ? 'Issue goods on credit to registered/imported accounts with payment due date tracking.'
                : 'Record direct counter cash sales with immediate inventory stock deduction.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Clock size={14} className="text-slate-400" />
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 border border-red-200 text-red-700 text-sm">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-600 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main Sales Form Card ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
          {/* Section 1: Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                <User size={16} className="text-blue-600" />
                Customer / Client Account {isCredit && <span className="text-red-500">*</span>}
              </label>
              {!isCredit && (
                <button
                  type="button"
                  onClick={handleSelectWalkIn}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  ⚡ Fast Walk-in Customer
                </button>
              )}
            </div>

            {/* Customer Dropdown / Combobox */}
            <div className="relative" ref={customerDropdownRef}>
              <div
                onClick={() => setCustomerDropdownOpen((v) => !v)}
                className={`w-full min-h-[46px] rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition ${
                  customerDropdownOpen
                    ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {selectedCustomer ? (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                      {selectedCustomer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {selectedCustomer.name}
                        </span>
                        <Badge
                          color={
                            selectedCustomer.source === 'registered'
                              ? 'green'
                              : selectedCustomer.customerType === 'walk_in'
                              ? 'ink'
                              : 'amber'
                          }
                        >
                          {selectedCustomer.source === 'registered'
                            ? 'Registered'
                            : selectedCustomer.customerType === 'walk_in'
                            ? 'Walk-in'
                            : 'Imported'}
                        </Badge>
                      </div>
                      {(selectedCustomer.phone || selectedCustomer.address) && (
                        <p className="text-xs text-slate-500">
                          {selectedCustomer.phone}
                          {selectedCustomer.phone && selectedCustomer.address ? ' · ' : ''}
                          {selectedCustomer.address}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">
                    {isCredit
                      ? 'Select registered or imported credit customer…'
                      : 'Select registered/imported customer or choose Walk-in…'}
                  </span>
                )}
                <ChevronDown size={18} className="text-slate-400" />
              </div>

              {/* Dropdown Menu */}
              {customerDropdownOpen && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search size={15} className="text-slate-400 ml-1" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Type to filter registered or imported customers..."
                      className="w-full bg-transparent text-xs py-1 outline-none text-slate-700 placeholder-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Customer Options List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
                    {!isCredit && (
                      <div
                        onClick={handleSelectWalkIn}
                        className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-600 text-xs font-bold">
                            W
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            Walk-in Customer
                          </span>
                        </div>
                        <Badge color="ink">Default</Badge>
                      </div>
                    )}

                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => handleSelectCustomer(c)}
                          className={`p-2.5 rounded-lg hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition ${
                            selectedCustomer?._id === c._id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-800">
                                {c.name}
                              </span>
                              <Badge
                                color={c.source === 'registered' ? 'green' : 'amber'}
                              >
                                {c.source === 'registered' ? 'Registered' : 'Imported'}
                              </Badge>
                              {c.customerType && c.customerType !== 'regular' && (
                                <span className="text-[10px] text-slate-400 font-mono uppercase">
                                  {c.customerType}
                                </span>
                              )}
                            </div>
                            {(c.phone || c.address) && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {c.phone && `📞 ${c.phone}`}
                                {c.phone && c.address ? '  |  ' : ''}
                                {c.address && `📍 ${c.address}`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100">
                            Select
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No customer found matching "{customerSearch}"
                      </div>
                    )}
                  </div>

                  {/* Add New Customer Button directly under the list of customers */}
                  <div className="border-t border-slate-100 p-2 bg-slate-50/80">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerDropdownOpen(false);
                        setNewCustomerModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm"
                    >
                      <UserPlus size={15} />
                      + Add New Customer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Sale Date & Voucher Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Sale Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            {isCredit ? (
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1 flex items-center gap-1 text-amber-700">
                  <Calendar size={13} />
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={saleDate}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/30 py-2 px-3 text-xs text-slate-700 outline-none focus:border-amber-500 focus:bg-white transition"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  <option value="Cash">Cash Counter</option>
                  <option value="Telebirr">Telebirr Transfer</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="POS Card">POS Card Payment</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Reference / POS Slip #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. INV-2026-092"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Line Items with Auto-fill */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <Layers size={17} className="text-blue-600" />
                Sales Items &amp; Stock Deduction
              </h3>
              <p className="text-xs text-slate-500">
                Select an item or material — description, UOM, category, and price auto-fill automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition"
            >
              <Plus size={14} /> Add Row
            </button>
          </div>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-2 w-[28%]">Select Item / Material</th>
                  <th className="py-2 px-2 w-[22%]">Description</th>
                  <th className="py-2 px-2 w-[12%]">Category</th>
                  <th className="py-2 px-2 w-[8%] text-center">UOM</th>
                  <th className="py-2 px-2 w-[10%] text-right">Available</th>
                  <th className="py-2 px-2 w-[9%] text-right">Qty</th>
                  <th className="py-2 px-2 w-[11%] text-right">Rate (ETB)</th>
                  <th className="py-2 px-2 w-[12%] text-right">Total (ETB)</th>
                  <th className="py-2 px-1 w-[4%] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    {/* Item / Material select */}
                    <td className="py-2.5 px-2">
                      <select
                        value={it.material}
                        onChange={(e) => handleItemMaterialChange(idx, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2 text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:bg-white"
                        required
                      >
                        <option value="">-- Choose item / material --</option>
                        {materials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.unit}) — Stock: {m.currentStock}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Auto-filled Description */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Auto-filled Category */}
                    <td className="py-2.5 px-2">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[110px]">
                        {it.category || '—'}
                      </span>
                    </td>

                    {/* Auto-filled UOM */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {it.uom || '—'}
                      </span>
                    </td>

                    {/* Available Stock Indicator */}
                    <td className="py-2.5 px-2 text-right">
                      {it.material ? (
                        <span
                          className={`inline-block font-mono text-xs font-semibold ${
                            it.currentStock <= 0
                              ? 'text-red-600'
                              : it.currentStock < 10
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {it.currentStock} {it.uom}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Quantity input */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                        className={`w-20 rounded-lg border py-1.5 px-2 text-xs text-right font-mono font-semibold outline-none focus:bg-white ${
                          Number(it.quantity) > Number(it.currentStock) && it.material
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                        }`}
                        required
                      />
                    </td>

                    {/* Selling Price / Rate input */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.sellingPrice}
                        onChange={(e) => handleItemFieldChange(idx, 'sellingPrice', e.target.value)}
                        className="w-24 rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-right font-mono font-medium outline-none focus:border-blue-500"
                        required
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-ink-900">
                      {formatETB(it.total)}
                    </td>

                    {/* Remove row */}
                    <td className="py-2.5 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length === 1}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Add Row Button */}
          <button
            type="button"
            onClick={addItemRow}
            className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1.5 transition"
          >
            <Plus size={15} /> Add Another Item
          </button>
        </div>

        {/* Section 4: Totals & Checkout Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes & Memo */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-3">
            <label className="block text-xs font-semibold text-ink-700 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              Notes / Sales Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions, delivery address, or invoice terms..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Checkout & Summary Panel */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-md space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Sale Voucher Summary
            </h4>

            <div className="space-y-2 text-xs border-b border-slate-700/60 pb-3">
              <div className="flex justify-between text-slate-300">
                <span>Total Items / Rows</span>
                <span className="font-semibold text-white">{items.length} items</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Quantity</span>
                <span className="font-semibold text-white">{totalQuantity.toFixed(2)} units</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatETB(totalRevenue)}</span>
              </div>
            </div>

            {/* Credit-specific inputs */}
            {isCredit && (
              <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Advance Paid (ETB)</span>
                  <input
                    type="number"
                    min="0"
                    max={totalRevenue}
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="w-24 rounded-lg bg-black/30 border border-slate-600 px-2 py-1 text-right font-mono text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center justify-between text-amber-300 font-bold border-t border-white/10 pt-2">
                  <span>Balance Due on Credit</span>
                  <span className="font-mono text-sm">{formatETB(creditBalance)}</span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-slate-200">Total Due</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formatETB(totalRevenue)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg ${
                isCredit
                  ? 'bg-amber-500 hover:bg-amber-600 text-ink-950 disabled:opacity-50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Processing Sale...
                </>
              ) : isCredit ? (
                <>
                  <CreditCard size={18} />
                  Authorize &amp; Post Credit Sale
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Complete Cash Sale &amp; Print
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── Modal: Add New Customer ── */}
      <Modal
        open={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        title="Register New Customer"
        width="max-w-md"
      >
        <form onSubmit={handleCreateNewCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer / Organization Name *
            </label>
            <input
              type="text"
              required
              value={newCustomerForm.name}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
              }
              placeholder="e.g. Skyline Hotel & Suites"
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newCustomerForm.phone}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                }
                placeholder="0911..."
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Type
              </label>
              <select
                value={newCustomerForm.customerType}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, customerType: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="regular">Regular Customer</option>
                <option value="corporate">Corporate Client</option>
                <option value="credit">Credit Client</option>
                <option value="walk_in">Retail / Walk-in</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Address / Location
            </label>
            <input
              type="text"
              value={newCustomerForm.address}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
              }
              placeholder="e.g. Bole Medhanialem, House 402"
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TIN / Reg Number (Optional)
              </label>
              <input
                type="text"
                value={newCustomerForm.tinNumber}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, tinNumber: e.target.value })
                }
                placeholder="0001234567"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credit Limit (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={newCustomerForm.creditLimit}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, creditLimit: e.target.value })
                }
                placeholder="50000"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewCustomerModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCustomer}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white disabled:opacity-50"
            >
              {savingCustomer ? 'Saving...' : 'Save & Select Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Success & Printable Voucher ── */}
      {successVoucher && (
        <Modal
          open={Boolean(successVoucher)}
          onClose={() => setSuccessVoucher(null)}
          title="Sales Voucher Created"
          width="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
              <CheckCircle size={24} className="text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">
                  Sale Recorded Successfully ({successVoucher.voucherNo})
                </h4>
                <p className="text-xs text-emerald-700">
                  Stock has been deducted and the sale transaction has been logged to the ledger.
                </p>
              </div>
            </div>

            {/* Printable Voucher Card */}
            <div
              id="printable-voucher"
              className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-lg text-ink-950 uppercase tracking-tight">
                    Sharp Plus Trading PLC
                  </h3>
                  <p className="text-xs text-slate-500">Official Sales Voucher</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 text-base">
                    {successVoucher.voucherNo}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Date: {new Date(successVoucher.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 font-medium">Billed To:</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {successVoucher.customerName || 'Walk-in Customer'}
                  </p>
                  {successVoucher.customerPhone && (
                    <p className="text-slate-600">Phone: {successVoucher.customerPhone}</p>
                  )}
                  {successVoucher.customerAddress && (
                    <p className="text-slate-600">Address: {successVoucher.customerAddress}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-400">Payment Type: </span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {successVoucher.paymentType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Payment Status: </span>
                    <Badge
                      color={
                        successVoucher.paymentStatus === 'paid'
                          ? 'green'
                          : successVoucher.paymentStatus === 'partial'
                          ? 'amber'
                          : 'red'
                      }
                    >
                      {successVoucher.paymentStatus}
                    </Badge>
                  </div>
                  {successVoucher.dueDate && (
                    <p className="text-amber-700 font-semibold">
                      Due: {new Date(successVoucher.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Summary Table */}
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {successVoucher.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-slate-800">
                        {it.material?.name || `Item #${idx + 1}`}
                      </td>
                      <td className="py-2 text-center font-mono">{it.quantity}</td>
                      <td className="py-2 text-right font-mono">{formatETB(it.sellingPrice)}</td>
                      <td className="py-2 text-right font-mono font-semibold">
                        {formatETB(it.totalRevenue || it.quantity * it.sellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono text-base text-blue-700">
                  {formatETB(successVoucher.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuccessVoucher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Record Another Sale
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
              >
                <Printer size={15} />
                Print Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Recent Sales Transactions List ── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              Recent {isCredit ? 'Credit' : 'Cash'} Sales Records
            </h3>
            <p className="text-xs text-slate-500">
              Latest transactions posted to the inventory and sales journal.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRecentSales}
            disabled={loadingRecent}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <RefreshCw size={12} className={loadingRecent ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {recentSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase">
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {sale.voucherNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {sale.items?.length || 1}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                      {formatETB(sale.totalRevenue || sale.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        color={
                          sale.paymentStatus === 'paid'
                            ? 'green'
                            : sale.paymentStatus === 'partial'
                            ? 'amber'
                            : 'red'
                        }
                      >
                        {sale.paymentStatus || 'posted'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {sale.performedBy?.name || 'Staff'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSuccessVoucher(sale)}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto text-[11px]"
                      >
                        <FileText size={13} /> View Voucher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            {loadingRecent
              ? 'Loading sales history...'
              : `No ${isCredit ? 'credit' : 'cash'} sales recorded yet.`}
          </div>
        )}
      </div>
    </div>
  );
}
