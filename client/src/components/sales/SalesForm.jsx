import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import { ShoppingBag, CreditCard } from 'lucide-react';

// Basic sales form used for both Cash and Credit sales
export default function SalesForm({ voucherType }) {
  const [customer, setCustomer] = useState('');
  const [materials, setMaterials] = useState([]);
  const [items, setItems] = useState([{ material: '', quantity: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load materials for selection
  useEffect(() => {
    api.get('/materials')
      .then(r => setMaterials(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMaterials([]));
  }, []);

  const addItem = () => setItems(i => [...i, { material: '', quantity: '' }]);
  const removeItem = idx => setItems(i => i.filter((_, i2) => i2 !== idx));
  const updateItem = (idx, field, value) => {
    setItems(i => {
      const copy = [...i];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = {
      voucherType,
      customer: customer || undefined,
      items: items
        .filter(it => it.material && it.quantity)
        .map(it => ({ material: it.material, quantity: Number(it.quantity) })),
    };
    try {
      await api.post('/transactions', payload);
      // reset form
      setCustomer('');
      setItems([{ material: '', quantity: '' }]);
    } catch (err) {
      setError('Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white/5 backdrop-blur-md rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">
        {voucherType === 'cash_sales' ? 'Cash Sales' : 'Credit Sales'}
      </h2>
      {error && <p className="text-red-400 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-300 mb-1">Customer</label>
          <input
            type="text"
            value={customer}
            onChange={e => setCustomer(e.target.value)}
            className="w-full rounded-md bg-white/10 border border-ink-200 text-ink-100 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Customer name"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-ink-300 mb-1">Items</label>
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={it.material}
                onChange={e => updateItem(idx, 'material', e.target.value)}
                className="flex-1 rounded-md bg-white/10 border border-ink-200 text-ink-100 py-2 px-2 focus:outline-none"
              >
                <option value="">Select material</option>
                {materials.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={it.quantity}
                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                className="w-24 rounded-md bg-white/10 border border-ink-200 text-ink-100 py-2 px-2 focus:outline-none"
                placeholder="Qty"
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-200">
                  ✕
                </button>
              )}
            </div>
          ))}
          <Button type="button" onClick={addItem} className="mt-2" variant="secondary">
            + Add Item
          </Button>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {voucherType === 'cash_sales' ? <ShoppingBag size={16} className="inline mr-2" /> : <CreditCard size={16} className="inline mr-2" />}
          {submitting ? 'Submitting...' : 'Submit Sale'}
        </Button>
      </form>
    </div>
  );
}
