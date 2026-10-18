const mongoose = require('mongoose');

const Itemschema = new mongoose.Schema(
  {
    code: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    unit: { type: String, required: true, trim: true }, // kg, ltr, pcs, box...
    currentStock: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, required: true, default: 10 },
    unitCost: { type: Number, default: 0 },
    storeLocation: { type: String, trim: true, default: 'Main Store' },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedFrom: { type: String, default: null }, // 'materials' | 'suppliers' etc.
  },
  { timestamps: true }
);

Itemschema.index({ isActive: 1, currentStock: 1 });
Itemschema.index({ code: 1 });
Itemschema.index({ name: 1 });
Itemschema.index({ category: 1 });

Itemschema.virtual('status').get(function () {
  if (this.currentStock <= 0) return 'out_of_stock';
  if (this.currentStock <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

Itemschema.set('toJSON', { virtuals: true });
Itemschema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RawMaterial', Itemschema);

