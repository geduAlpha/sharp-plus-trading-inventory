const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    tinNumber: { type: String, trim: true, default: '' },
    customerType: {
      type: String,
      enum: ['regular', 'corporate', 'credit', 'walk_in'],
      default: 'regular',
    },
    notes: { type: String, default: '' },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedFrom: { type: String, default: 'customers' },
  },
  { timestamps: true }
);

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Customer', customerSchema);
