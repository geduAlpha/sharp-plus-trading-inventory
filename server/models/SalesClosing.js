const mongoose = require('mongoose');

const salesClosingSchema = new mongoose.Schema(
  {
    closingCode:       { type: String, required: true, unique: true, trim: true }, // e.g. SCL-20261103-001
    date:              { type: Date, default: Date.now },
    storeLocation:     { type: String, default: 'Main Store', trim: true },
    deviceName:        { type: String, default: 'POS Terminal 01', trim: true },
    cashier:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName:       { type: String, default: 'Cashier', trim: true },
    closedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedByName:      { type: String, default: 'Supervisor', trim: true },
    status:            { type: String, enum: ['open', 'reconciled', 'closed', 'verified'], default: 'closed' },

    // Aggregated figures for this closing period
    openingCash:       { type: Number, default: 0 },
    cashSalesCount:    { type: Number, default: 0 },
    cashSalesTotal:    { type: Number, default: 0 },
    creditSalesCount:  { type: Number, default: 0 },
    creditSalesTotal:  { type: Number, default: 0 },
    zeroingCount:      { type: Number, default: 0 },
    zeroingTotal:      { type: Number, default: 0 },
    collectionsCount:  { type: Number, default: 0 },
    collectionsTotal:  { type: Number, default: 0 },
    totalVat:          { type: Number, default: 0 },
    expectedCash:      { type: Number, default: 0 }, // openingCash + cashSalesTotal + collectionsTotal
    actualCashCounted: { type: Number, default: 0 },
    cashVariance:      { type: Number, default: 0 }, // actualCashCounted - expectedCash
    notes:             { type: String, default: '' },
    vouchers:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'StockTransaction' }],

    isLocked:          { type: Boolean, default: true },
    lockedAt:          { type: Date, default: Date.now },
    deletedAt:         { type: Date, default: null },
    deletedBy:         { type: String, default: null },
  },
  { timestamps: true }
);

salesClosingSchema.index({ date: -1 });
salesClosingSchema.index({ closingCode: 1 });
salesClosingSchema.index({ storeLocation: 1 });

module.exports = mongoose.model('SalesClosing', salesClosingSchema);
