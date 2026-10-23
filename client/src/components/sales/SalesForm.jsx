import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import ThermalBillModal from './ThermalBillModal';
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
  Barcode,
  Save,
  RotateCcw,
  Check,
  Percent,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Hash,
  X,
  Sliders,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const formatETB = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STORES = [
  { id: 'main', name: 'Main Central Warehouse (A-1)' },
  { id: 'showroom', name: 'Retail Showroom Store' },
  { id: 'branch_b', name: 'Bole Branch Store' },
];

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash Counter', icon: '💵' },
  { id: 'Telebirr', label: 'Telebirr Transfer', icon: '📱' },
  { id: 'CBE Birr', label: 'CBE Birr', icon: '🏦' },
  { id: 'Bank Transfer', label: 'Bank Wire Transfer', icon: '🏛️' },
  { id: 'POS Card', label: 'POS Terminal Card', icon: '💳' },
];

const CREDIT_TERMS_OPTIONS = [
  { days: 15, label: 'Net 15 Days' },
  { days: 30, label: 'Net 30 Days' },
  { days: 60, label: 'Net 60 Days' },
  { days: 90, label: 'Net 90 Days' },
];

export default function SalesForm({ voucherType: initialVoucherType = 'cash_sale' }) {
  const { user } = useAuth();

  // Active sales mode: 'cash_sale' or 'credit_sale'
  const [salesMode, setSalesMode] = useState(initialVoucherType);
  const isCredit = salesMode === 'credit_sale';

  // System settings (e.g. allowNegativeStock)
  const [systemSettings, setSystemSettings] = useState({ allowNegativeStock: false });

  // ── Invoice Information ──────────────────────────────────────────────────
  const [selectedStore, setSelectedStore] = useState('main');
  const [voucherNo, setVoucherNo] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [creditTermsDays, setCreditTermsDays] = useState(30);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // ── Customer & Store Selection ───────────────────────────────────────────
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
    creditLimit: 50000,
    customerType: isCredit ? 'credit' : 'regular',
    notes: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // ── Inventory / Products ─────────────────────────────────────────────────
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Quick Barcode / SKU search bar input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState('');

  // ── Line Items ───────────────────────────────────────────────────────────
  const [items, setItems] = useState([
    {
      material: '',
      description: '',
      category: '',
      uom: '',
      currentStock: 0,
      quantity: 1,
      sellingPrice: 0,
      discount: 0, // line discount percentage or fixed
      discountType: 'percent', // 'percent' | 'fixed'
      total: 0,
    },
  ]);

  // ── Payment Mode & Details ───────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState(''); // for cash sales change calculation
  const [amountPaid, setAmountPaid] = useState(0); // for credit advance or cash total

  // ── Tax / VAT Settings ───────────────────────────────────────────────────
  const [taxRate, setTaxRate] = useState(15);
  const [isVatInclusive, setIsVatInclusive] = useState(true);

  // ── Status, Draft, and Modals ────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successVoucher, setSuccessVoucher] = useState(null);
  const [savedDraftTime, setSavedDraftTime] = useState(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);

  // Fiscal Bill Modal
  const [thermalBillOpen, setThermalBillOpen] = useState(false);
  const [currentBillSale, setCurrentBillSale] = useState(null);

  // Recent Sales Table
  const [recentSales, setRecentSales] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showRecentTable, setShowRecentTable] = useState(true);

  // ── Load System Settings, Customers, Materials, and Recent Sales ─────────
  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSystemSettings({
          allowNegativeStock: Boolean(res.data.allowNegativeStock),
          taxRate: res.data.taxRate !== undefined ? res.data.taxRate : 15,
        });
        if (res.data.taxRate !== undefined) setTaxRate(res.data.taxRate);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  };

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
      const res = await api.get('/materials?isActive=true&limit=1000');
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.materials)
        ? res.data.materials
        : Array.isArray(res.data)
        ? res.data
        : [];
      setMaterials(data);
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
    loadSettings();
    loadCustomers();
    loadMaterials();
    loadRecentSales();
    checkSavedDraft();
  }, [salesMode]);

  // Sync mode if parent changes voucherType prop
  useEffect(() => {
    if (initialVoucherType && initialVoucherType !== salesMode) {
      setSalesMode(initialVoucherType);
    }
  }, [initialVoucherType]);

  // Update due date when creditTermsDays changes
  const handleCreditTermsChange = (days) => {
    setCreditTermsDays(days);
    const d = new Date(saleDate || new Date());
    d.setDate(d.getDate() + Number(days));
    setDueDate(d.toISOString().slice(0, 10));
  };

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Draft System (localStorage) ──────────────────────────────────────────
  const draftKey = `sharp_plus_erp_sales_draft_${salesMode}`;

  const checkSavedDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.items && parsed.items.length > 0 && parsed.savedAt) {
          setSavedDraftTime(parsed.savedAt);
          setHasDraftNotice(true);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSaveDraft = () => {
    try {
      const draft = {
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items,
        selectedCustomer,
        paymentMethod,
        saleDate,
        dueDate,
        reference,
        notes,
        selectedStore,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setSavedDraftTime(draft.savedAt);
      setHasDraftNotice(false);
      setError('');
      alert(`Sales order draft saved at ${draft.savedAt}. You can safely reload or resume later.`);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (parsed.selectedCustomer) setSelectedCustomer(parsed.selectedCustomer);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
        if (parsed.saleDate) setSaleDate(parsed.saleDate);
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.reference) setReference(parsed.reference);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.selectedStore) setSelectedStore(parsed.selectedStore);
        setHasDraftNotice(false);
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraftNotice(false);
    setSavedDraftTime(null);
  };

  // ── Customer Handlers ────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.tinNumber && c.tinNumber.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

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
      tinNumber: '',
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
        creditLimit: 50000,
        customerType: isCredit ? 'credit' : 'regular',
        notes: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // ── Item Selection & Auto-Fill ───────────────────────────────────────────
  const populateItem = (mat, currentQty = 1) => {
    const defaultPrice = Number(mat.sellingPrice) || Number(mat.unitPrice) || (mat.unitCost ? Number((mat.unitCost * 1.25).toFixed(2)) : 0);
    return {
      material: mat._id,
      code: mat.code || '',
      description: mat.code ? `${mat.code} - ${mat.name}` : mat.name,
      category: mat.category || 'General',
      uom: mat.unit || 'Pcs',
      currentStock: mat.currentStock !== undefined ? mat.currentStock : 0,
      quantity: currentQty,
      sellingPrice: defaultPrice,
      discount: 0,
      discountType: 'percent',
      total: Number((currentQty * defaultPrice).toFixed(2)),
    };
  };

  const handleItemMaterialChange = (idx, materialId) => {
    const mat = materials.find((m) => m._id === materialId);
    setItems((prev) => {
      const updated = [...prev];
      if (!mat) {
        updated[idx] = {
          material: '',
          code: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          discount: 0,
          discountType: 'percent',
          total: 0,
        };
      } else {
        const qty = Number(updated[idx].quantity) || 1;
        updated[idx] = populateItem(mat, qty);
      }
      return updated;
    });
  };

  const handleItemFieldChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[idx], [field]: value };

      const qty = Number(field === 'quantity' ? value : it.quantity) || 0;
      const price = Number(field === 'sellingPrice' ? value : it.sellingPrice) || 0;
      const disc = Number(field === 'discount' ? value : it.discount) || 0;
      const discType = field === 'discountType' ? value : it.discountType || 'percent';

      let discountAmount = 0;
      if (discType === 'percent') {
        discountAmount = (qty * price * Math.min(100, Math.max(0, disc))) / 100;
      } else {
        discountAmount = Math.min(qty * price, Math.max(0, disc));
      }

      it.total = Number(Math.max(0, qty * price - discountAmount).toFixed(2));
      updated[idx] = it;
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        material: '',
        code: '',
        description: '',
        category: '',
        uom: '',
        currentStock: 0,
        quantity: 1,
        sellingPrice: 0,
        discount: 0,
        discountType: 'percent',
        total: 0,
      },
    ]);
  };

  const removeItemRow = (idx) => {
    if (items.length === 1) {
      setItems([
        {
          material: '',
          code: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          discount: 0,
          discountType: 'percent',
          total: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearEmptyRows = () => {
    const valid = items.filter((it) => it.material);
    setItems(
      valid.length > 0
        ? valid
        : [
            {
              material: '',
              code: '',
              description: '',
              category: '',
              uom: '',
              currentStock: 0,
              quantity: 1,
              sellingPrice: 0,
              discount: 0,
              discountType: 'percent',
              total: 0,
            },
          ]
    );
  };

  // Quick Barcode / SKU Scanner Handler
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;

    const matched = materials.find(
      (m) =>
        (m.code && m.code.toLowerCase() === query) ||
        (m.name && m.name.toLowerCase() === query) ||
        (m.barcode && m.barcode.toLowerCase() === query)
    );

    if (matched) {
      // Check if already in items
      const existingIdx = items.findIndex((it) => it.material === matched._id);
      if (existingIdx !== -1) {
        // Increment quantity
        handleItemFieldChange(existingIdx, 'quantity', Number(items[existingIdx].quantity) + 1);
        setBarcodeFeedback(`Incremented "${matched.name}" quantity.`);
      } else {
        // Check if first row is empty
        if (items.length === 1 && !items[0].material) {
          setItems([populateItem(matched, 1)]);
        } else {
          setItems((prev) => [...prev, populateItem(matched, 1)]);
        }
        setBarcodeFeedback(`Added "${matched.name}" to invoice.`);
      }
      setBarcodeInput('');
      setTimeout(() => setBarcodeFeedback(''), 3000);
    } else {
      setBarcodeFeedback(`Item "${barcodeInput}" not found in inventory.`);
      setTimeout(() => setBarcodeFeedback(''), 4000);
    }
  };

  // ── Financial Calculations ───────────────────────────────────────────────
  const grossSubtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.sellingPrice) || 0;
      return sum + q * p;
    }, 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.sellingPrice) || 0;
      const d = Number(it.discount) || 0;
      if (it.discountType === 'percent') {
        return sum + (q * p * Math.min(100, Math.max(0, d))) / 100;
      }
      return sum + Math.min(q * p, Math.max(0, d));
    }, 0);
  }, [items]);

  const netSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  const { taxableAmount, vatAmount, totalRevenue } = useMemo(() => {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
      return {
        taxableAmount: netSubtotal,
        vatAmount: 0,
        totalRevenue: netSubtotal,
      };
    }

    if (isVatInclusive) {
      const taxable = netSubtotal / (1 + rate / 100);
      const vat = netSubtotal - taxable;
      return {
        taxableAmount: Number(taxable.toFixed(2)),
        vatAmount: Number(vat.toFixed(2)),
        totalRevenue: netSubtotal,
      };
    } else {
      const taxable = netSubtotal;
      const vat = taxable * (rate / 100);
      return {
        taxableAmount: taxable,
        vatAmount: Number(vat.toFixed(2)),
        totalRevenue: Number((taxable + vat).toFixed(2)),
      };
    }
  }, [netSubtotal, taxRate, isVatInclusive]);

  // Cash change due calculation
  const changeDue = useMemo(() => {
    if (isCredit) return 0;
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - totalRevenue);
  }, [isCredit, cashReceived, totalRevenue]);

  // Outstanding credit balance calculation
  const creditBalance = useMemo(() => {
    if (!isCredit) return 0;
    return Math.max(0, totalRevenue - (Number(amountPaid) || 0));
  }, [isCredit, totalRevenue, amountPaid]);

  // Automatically keep amountPaid synced for cash sales
  useEffect(() => {
    if (!isCredit) {
      setAmountPaid(totalRevenue);
    }
  }, [isCredit, totalRevenue]);

  // Quick cash buttons for cashier speed
  const setExactCash = () => setCashReceived(totalRevenue.toFixed(2));
  const addCash = (extra) =>
    setCashReceived((Number(cashReceived || totalRevenue) + extra).toFixed(2));

  // ── Validation & Posting ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isCredit && !selectedCustomer) {
      setError('A registered or imported customer is mandatory for Credit Sales.');
      return;
    }

    const validItems = items.filter((it) => it.material && Number(it.quantity) > 0);
    if (!validItems.length) {
      setError('Please add at least one line item with a quantity greater than zero.');
      return;
    }

    // Validate available stock against system settings
    for (const it of validItems) {
      const needed = Number(it.quantity);
      const available = Number(it.currentStock);
      if (needed > available && !systemSettings.allowNegativeStock) {
        setError(
          `Stock Insufficient: "${it.description}" has only ${available} ${it.uom} available in store. Negative stock is restricted.`
        );
        return;
      }
    }

    // Validate credit limits
    if (isCredit && selectedCustomer && selectedCustomer.creditLimit > 0) {
      const newTotalCredit = (selectedCustomer.currentBalance || 0) + creditBalance;
      if (newTotalCredit > selectedCustomer.creditLimit) {
        const proceed = window.confirm(
          `Warning: Customer "${selectedCustomer.name}" has a credit limit of ${formatETB(
            selectedCustomer.creditLimit
          )}. This invoice will bring their balance to ${formatETB(
            newTotalCredit
          )}. Do you wish to authorize this credit sale?`
        );
        if (!proceed) return;
      }
    }

    setSubmitting(true);
    const payload = {
      voucherType: salesMode,
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
      taxRate: Number(taxRate) || 0,
      taxableAmount,
      vatAmount,
      taxAmount: vatAmount,
      isVatInclusive,
      totalRevenue,
      store: selectedStore,
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
      setCurrentBillSale(res.data);

      // Clear draft after successful posting
      localStorage.removeItem(draftKey);
      setSavedDraftTime(null);
      setHasDraftNotice(false);

      // Reset form
      setItems([
        {
          material: '',
          code: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          discount: 0,
          discountType: 'percent',
          total: 0,
        },
      ]);
      setVoucherNo('');
      setReference('');
      setNotes('');
      setCashReceived('');
      if (!isCredit) {
        setSelectedCustomer(null);
      }
      loadMaterials(); // refresh live stock
      loadRecentSales(); // refresh recent sales ledger
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit sales voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    if (window.confirm('Are you sure you want to discard this order and reset the form?')) {
      setItems([
        {
          material: '',
          code: '',
          description: '',
          category: '',
          uom: '',
          currentStock: 0,
          quantity: 1,
          sellingPrice: 0,
          discount: 0,
          discountType: 'percent',
          total: 0,
        },
      ]);
      setVoucherNo('');
      setReference('');
      setNotes('');
      setCashReceived('');
      setSelectedCustomer(null);
      setError('');
      handleDiscardDraft();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* ── Top Header Banner with Mode Switcher & Quick Actions ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                <ShieldCheck size={12} className="text-blue-400" />
                Sales &amp; Marketing MS
              </span>
              <span className="text-xs text-slate-400">· Official ERP Billing</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              {isCredit ? <CreditCard className="text-amber-400" size={24} /> : <ShoppingBag className="text-emerald-400" size={24} />}
              <span>{isCredit ? 'Credit Sales Order (Accounts Receivable)' : 'Counter Cash Sales Invoice'}</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-xl">
              {isCredit
                ? 'Issue finished goods on credit with customer credit limit checking and aging due date tracking.'
                : 'Direct retail & wholesale cash settlement with real-time stock deduction and thermal fiscal slip generation.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setSalesMode('cash_sale')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  !isCredit
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ShoppingBag size={14} />
                <span>Cash Sales</span>
              </button>
              <button
                type="button"
                onClick={() => setSalesMode('credit_sale')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  isCredit
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <CreditCard size={14} />
                <span>Credit Sales</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              title="Save draft to local memory"
            >
              <Save size={14} className="text-blue-400" />
              <span>Draft</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-xs font-semibold text-slate-300 border border-slate-700 hover:border-rose-500/40 transition"
              title="Reset order form"
            >
              <RotateCcw size={14} className="text-slate-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Saved Draft Notification Banner */}
        {hasDraftNotice && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertCircle size={15} />
              <span>Saved draft found from {savedDraftTime}. Would you like to restore it?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition text-[11px]"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 font-semibold hover:text-white transition text-[11px]"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-200 text-rose-700 text-xs font-medium shadow-xs">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-700 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main ERP Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ══ FRAME 1: INVOICE INFO & CUSTOMER SELECTION (2 Columns) ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Invoice Information (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Invoice &amp; Store Setup
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Type: {isCredit ? 'CREDIT_INVOICE' : 'CASH_RECEIPT'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Voucher / Invoice Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voucher / Slip #
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    placeholder="Auto-generated"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 font-mono outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Store Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store / Branch
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  {STORES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Conditional Credit Terms & Due Date */}
              {isCredit ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Credit Terms
                    </label>
                    <select
                      value={creditTermsDays}
                      onChange={(e) => handleCreditTermsChange(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-amber-500 bg-white"
                    >
                      {CREDIT_TERMS_OPTIONS.map((t) => (
                        <option key={t.days} value={t.days}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Payment Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={saleDate}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-amber-500 bg-white"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer PO / External Ref
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. PO-2026-904"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              )}

              {/* Staff / Sales Representative */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sales Agent
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-xs text-slate-600 font-medium truncate flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span>{user?.name || 'Authorized Staff'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Customer Selection & Credit Profile (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Customer &amp; Account
                  </h2>
                </div>
                {!isCredit && (
                  <button
                    type="button"
                    onClick={handleSelectWalkIn}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    ⚡ Fast Walk-in
                  </button>
                )}
              </div>

              {/* Customer Search Dropdown */}
              <div className="relative" ref={customerDropdownRef}>
                <div
                  onClick={() => setCustomerDropdownOpen((v) => !v)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                    customerDropdownOpen
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {selectedCustomer.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <span className="font-bold text-slate-800 truncate">
                        {selectedCustomer.name}
                      </span>
                      {selectedCustomer.tinNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          TIN: {selectedCustomer.tinNumber}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Search size={13} />
                      <span>{isCredit ? 'Select credit customer (required)...' : 'Choose customer or walk-in...'}</span>
                    </span>
                  )}
                  <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                </div>

                {/* Dropdown Menu */}
                {customerDropdownOpen && (
                  <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <Search size={14} className="text-slate-400 ml-1" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search name, phone, or TIN..."
                        className="w-full bg-transparent text-xs py-1 outline-none text-slate-700"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 p-1 text-xs">
                      {!isCredit && (
                        <div
                          onClick={handleSelectWalkIn}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition"
                        >
                          <span className="font-bold text-slate-700">Walk-in Customer</span>
                          <span className="text-[10px] text-slate-400">Default POS</span>
                        </div>
                      )}

                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-2 rounded-lg hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition ${
                              selectedCustomer?._id === c._id ? 'bg-blue-50 font-bold' : ''
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {c.phone || 'No phone'} {c.tinNumber ? `· TIN: ${c.tinNumber}` : ''}
                              </p>
                            </div>
                            {c.creditLimit > 0 && (
                              <span className="text-[10px] font-mono text-emerald-600 shrink-0">
                                Limit: {formatETB(c.creditLimit)}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No customer found matching "{customerSearch}"
                        </div>
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerDropdownOpen(false);
                          setNewCustomerModalOpen(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <UserPlus size={13} /> Add New Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Customer Status Card */}
            {selectedCustomer ? (
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {selectedCustomer.customerType || 'Regular'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  {selectedCustomer.phone && <p>📞 {selectedCustomer.phone}</p>}
                  {selectedCustomer.address && <p>📍 {selectedCustomer.address}</p>}
                </div>
                {isCredit && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">Approved Credit Limit:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatETB(selectedCustomer.creditLimit || 50000)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No customer selected. {isCredit ? 'Credit invoices require an account.' : 'Will bill as Walk-in Customer.'}
              </div>
            )}
          </div>
        </div>

        {/* ══ FRAME 2: PRODUCT ENTRY & BARCODE SCANNER TABLE ══ */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-soft border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                3
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Product Entry &amp; Inventory Deduction
                </h2>
                <p className="text-xs text-slate-500">
                  Scan barcode, search SKU, or pick items. Stock levels and prices auto-populate.
                </p>
              </div>
            </div>

            {/* Quick Barcode / SKU Scanning Bar */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Barcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBarcodeSubmit(e);
                  }}
                  placeholder="Scan barcode / type SKU & Enter..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
              <button
                type="button"
                onClick={handleBarcodeSubmit}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          {barcodeFeedback && (
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold animate-fade-in">
              {barcodeFeedback}
            </div>
          )}

          {/* Product Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-[4%] text-center">#</th>
                  <th className="py-2.5 px-3 w-[28%]">Item Code &amp; Description</th>
                  <th className="py-2.5 px-3 w-[10%]">Category</th>
                  <th className="py-2.5 px-3 w-[6%] text-center">UOM</th>
                  <th className="py-2.5 px-3 w-[10%] text-right">Available Stock</th>
                  <th className="py-2.5 px-3 w-[10%] text-center">Quantity</th>
                  <th className="py-2.5 px-3 w-[11%] text-right">Unit Price (ETB)</th>
                  <th className="py-2.5 px-3 w-[8%] text-right">Discount</th>
                  <th className="py-2.5 px-3 w-[11%] text-right">Subtotal (ETB)</th>
                  <th className="py-2.5 px-2 w-[4%] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const isStockInsufficient = it.material && Number(it.quantity) > Number(it.currentStock);
                  const isLowStock = it.material && Number(it.currentStock) > 0 && Number(it.currentStock) < 10;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Select Item */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.material}
                          onChange={(e) => handleItemMaterialChange(idx, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          required
                        >
                          <option value="">-- Choose item / material --</option>
                          {materials.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.code ? `[${m.code}] ` : ''}{m.name} ({m.unit || 'Pcs'}) — Stock: {m.currentStock !== undefined ? m.currentStock : 0}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] truncate max-w-[100px]">
                          {it.category || '—'}
                        </span>
                      </td>

                      {/* UOM */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                        {it.uom || '—'}
                      </td>

                      {/* Available Stock with Visual Badge */}
                      <td className="py-2.5 px-3 text-right">
                        {it.material ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              isStockInsufficient
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {it.currentStock} {it.uom}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleItemFieldChange(idx, 'quantity', Math.max(1, Number(it.quantity) - 1))
                            }
                            className="w-5 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            className={`w-16 rounded-lg border py-1 px-1 text-center font-mono font-bold text-xs outline-none ${
                              isStockInsufficient
                                ? 'border-rose-400 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                            }`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleItemFieldChange(idx, 'quantity', Number(it.quantity) + 1)
                            }
                            className="w-5 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Unit Price (ETB) */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.sellingPrice}
                          onChange={(e) => handleItemFieldChange(idx, 'sellingPrice', e.target.value)}
                          className="w-24 rounded-lg border border-slate-200 bg-white py-1 px-2 text-right font-mono font-medium text-xs outline-none focus:border-blue-500"
                          required
                        />
                      </td>

                      {/* Discount (% or fixed) */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.discount}
                          onChange={(e) => handleItemFieldChange(idx, 'discount', e.target.value)}
                          placeholder="0%"
                          className="w-16 rounded-lg border border-slate-200 bg-white py-1 px-1.5 text-right font-mono text-xs outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Line Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatETB(it.total)}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
              >
                <Plus size={14} /> Add Line Item
              </button>
              <button
                type="button"
                onClick={clearEmptyRows}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
              >
                Clean Empty Rows
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span>Lines: <strong className="text-slate-800">{items.length}</strong></span>
              <span>Total Units: <strong className="text-slate-800">{totalQuantity.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* ══ FRAME 3: PAYMENT DETAILS & SALES FINANCIAL SUMMARY ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card: Payment Mode & Cashier Settlement (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs">
                  4
                </span>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Payment Mode &amp; Settlements
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-600 uppercase">
                {isCredit ? 'Credit Settlement' : 'Counter Cash'}
              </span>
            </div>

            {!isCredit ? (
              /* Cash Sale Settlements */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Settlement Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                          paymentMethod === pm.id
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-lg">{pm.icon}</span>
                        <span className="text-[11px] leading-tight">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Amount Received from Customer (ETB)
                      </label>
                      <span className="text-[11px] text-slate-400">Enter cash handed over</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={setExactCash}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Exact
                      </button>
                      <button
                        type="button"
                        onClick={() => addCash(100)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => addCash(500)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +500
                      </button>
                      <button
                        type="button"
                        onClick={() => addCash(1000)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        +1000
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={totalRevenue.toFixed(2)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                  />

                  {/* Change Due Box */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Change Due to Customer:
                    </span>
                    <span className="text-base font-black font-mono">
                      {formatETB(changeDue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Credit Sale Settlements */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900">
                        Advance / Deposit Paid Now (ETB)
                      </span>
                      <p className="text-[10px] text-amber-700">Optional down-payment</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={totalRevenue}
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                      className="w-32 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-right font-mono font-bold text-slate-800 text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/80 text-xs">
                    <div>
                      <span className="text-[11px] text-amber-800">Invoice Net Receivable:</span>
                      <p className="text-sm font-black font-mono text-amber-950">
                        {formatETB(creditBalance)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-amber-800">Approved Credit Limit:</span>
                      <p className="text-sm font-bold font-mono text-emerald-700">
                        {formatETB(selectedCustomer?.creditLimit || 50000)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sales Remarks &amp; Terms
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific delivery notes, warranty details, or dispatch instructions..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Card: Sales Summary & Fiscal Tax Engine (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-5 text-white shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Fiscal Summary Engine
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTaxRate(15)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      taxRate === 15 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    15% VAT
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxRate(0)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      taxRate === 0 ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Exempt
                  </button>
                </div>
              </div>

              {/* VAT Mode Toggle */}
              {taxRate > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-white/5 p-2 rounded-xl">
                  <span>Price Tax Mode:</span>
                  <button
                    type="button"
                    onClick={() => setIsVatInclusive(!isVatInclusive)}
                    className="font-bold text-blue-300 hover:text-white underline"
                  >
                    {isVatInclusive ? 'VAT Inclusive (Standard Retail)' : 'VAT Exclusive (+15% added)'}
                  </button>
                </div>
              )}

              {/* Financial Lines */}
              <div className="space-y-2 text-xs font-mono pt-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Gross Subtotal:</span>
                  <span>{formatETB(grossSubtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="font-sans">Total Discount:</span>
                    <span>-{formatETB(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Taxable Base (TXBL1):</span>
                  <span>{formatETB(taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Fiscal VAT ({taxRate}%):</span>
                  <span className="text-emerald-400">+{formatETB(vatAmount)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Grand Total
                  </span>
                  <p className="text-[10px] text-slate-500">Includes all taxes &amp; discounts</p>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {formatETB(totalRevenue)}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
                  isCredit
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 disabled:opacity-50'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-50'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : isCredit ? (
                  <>
                    <CreditCard size={18} />
                    <span>Authorize &amp; Post Credit Sale</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Complete Sale &amp; Post Ledger</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-center transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 font-semibold text-center transition"
                >
                  Cancel / Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ══ FRAME 4: RECENT TRANSACTIONS JOURNAL (COLLAPSIBLE) ══ */}
      <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-soft border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent {isCredit ? 'Credit' : 'Cash'} Sales Ledger
            </h3>
            <span className="text-xs text-slate-400">({recentSales.length} records)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadRecentSales}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <RefreshCw size={12} className={loadingRecent ? 'animate-spin' : ''} />
              Sync Ledger
            </button>
            <button
              type="button"
              onClick={() => setShowRecentTable(!showRecentTable)}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
            >
              {showRecentTable ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {showRecentTable && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue (15% VAT)</th>
                  <th className="py-2.5 px-3 text-center">Settlement</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {loadingRecent ? 'Syncing sales records...' : 'No sales records found in journal.'}
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
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
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className="font-bold text-slate-900">
                          {formatETB(sale.totalRevenue || sale.totalAmount)}
                        </span>
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
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentBillSale(sale);
                              setThermalBillOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 border border-blue-200 transition"
                            title="Print thermal bill or multi-export"
                          >
                            <Printer size={12} />
                            Fiscal Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuccessVoucher(sale)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                            title="View official voucher"
                          >
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD NEW CUSTOMER ── */}
      <Modal
        open={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        title="Register New Customer Account"
        width="max-w-md"
      >
        <form onSubmit={handleCreateNewCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer / Organization Name *
            </label>
            <input
              type="text"
              required
              value={newCustomerForm.name}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
              }
              placeholder="e.g. Skyline Hospitality Trading"
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newCustomerForm.phone}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                }
                placeholder="0911..."
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Type
              </label>
              <select
                value={newCustomerForm.customerType}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, customerType: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500 bg-white"
              >
                <option value="regular">Regular Customer</option>
                <option value="corporate">Corporate Client</option>
                <option value="credit">Credit Client</option>
                <option value="walk_in">Retail / Walk-in</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TIN Number
              </label>
              <input
                type="text"
                value={newCustomerForm.tinNumber}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, tinNumber: e.target.value })
                }
                placeholder="0001234567"
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Credit Limit (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={newCustomerForm.creditLimit}
                onChange={(e) =>
                  setNewCustomerForm({ ...newCustomerForm, creditLimit: Number(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Physical Location
            </label>
            <input
              type="text"
              value={newCustomerForm.address}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
              }
              placeholder="e.g. Bole Medhanialem, Addis Ababa"
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white disabled:opacity-50"
            >
              {savingCustomer ? 'Saving...' : 'Save & Select Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: SALE SUCCESS & PRINTABLE VOUCHER ── */}
      {successVoucher && (
        <Modal
          open={Boolean(successVoucher)}
          onClose={() => setSuccessVoucher(null)}
          title="Sales Invoice Posted Successfully"
          width="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
              <CheckCircle size={24} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">
                  Invoice {successVoucher.voucherNo} Posted ({successVoucher.fsNo || 'FS Auto'})
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Stock has been deducted from store inventory and recorded in the permanent sales ledger.
                </p>
              </div>
            </div>

            {/* Printable Voucher Preview */}
            <div
              id="printable-voucher"
              className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="Sharp Plus Logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">
                      Sharp Plus Trading PLC
                    </h3>
                    <p className="text-xs text-slate-500">Official Sales Voucher &amp; Tax Receipt</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-blue-700 text-base">
                    {successVoucher.voucherNo}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Date: {new Date(successVoucher.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

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
                    <span className="font-bold text-slate-800 uppercase">
                      {successVoucher.paymentType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fiscal FS #: </span>
                    <span className="font-mono font-bold text-blue-700">
                      {successVoucher.fsNo || 'Auto'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Status: </span>
                    <span className="font-bold text-emerald-600 capitalize">
                      {successVoucher.paymentStatus || 'Paid'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Summary Table */}
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {successVoucher.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-slate-800">
                        {item.material?.name || `Product #${idx + 1}`}
                      </td>
                      <td className="py-2 text-right font-mono">{item.quantity}</td>
                      <td className="py-2 text-right font-mono">{formatETB(item.sellingPrice)}</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">
                        {formatETB(Number(item.quantity) * Number(item.sellingPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="py-2 text-right font-bold text-slate-700">
                      Grand Total (VAT Included):
                    </td>
                    <td className="py-2 text-right font-mono font-black text-slate-950 text-sm">
                      {formatETB(successVoucher.totalRevenue || successVoucher.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuccessVoucher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessVoucher(null);
                  setCurrentBillSale(successVoucher);
                  setThermalBillOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow transition"
              >
                <Printer size={15} />
                Print Fiscal Slip &amp; Export
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: FISCAL THERMAL BILL & MULTI-EXPORT ── */}
      <ThermalBillModal
        open={thermalBillOpen}
        onClose={() => setThermalBillOpen(false)}
        sale={currentBillSale}
      />
    </div>
  );
}
