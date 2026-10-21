const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tradeName: { type: String, trim: true, default: '' },
    systemEmail: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: 'Addis Ababa' },
    country: { type: String, trim: true, default: 'Ethiopia' },
    tinNumber: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, default: 'ETB' },
    currencySymbol: { type: String, trim: true, default: 'ETB' },
    taxRate: { type: Number, default: 15 },
    logo: { type: String, default: '' },
    notes: { type: String, default: '' },

    // Primary Company Owner
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    ownerPhone: { type: String, trim: true, default: '' },
    ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Access Control governed by System Developer
    accessGranted: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    accessNotes: { type: String, default: 'Full system access granted by System Developer' },
    maxUsers: { type: Number, default: 50 },
    allowedModules: {
      type: Object,
      default: {
        items: true,
        products: true,
        cashSales: true,
        creditSales: true,
        customers: true,
        suppliers: true,
        purchases: true,
        stockMovements: true,
        stockRequests: true,
        consumption: true,
        reports: true,
        analytics: true,
      },
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
