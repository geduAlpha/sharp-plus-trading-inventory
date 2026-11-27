const mongoose = require('mongoose');

const saleLineSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    productCode: { type: String, default: '' },
    articleCode: { type: String, default: '' },
    articleName: { type: String, default: '' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', default: null },
    quantitySold: { type: Number, required: true, default: 1 },
    sellingPrice: { type: Number, default: 0 },   // revenue per unit (if known)
    revenue: { type: Number, default: 0 },   // total revenue for this line
    cogs: { type: Number, default: 0 },   // total ingredient cost
    grossProfit: { type: Number, default: 0 },   // revenue - cogs
    matchStatus: { type: String, default: 'matched' }, // 'recipe_deducted', 'direct_material', 'no_recipe', 'unmatched'
    // Stock balance detection & last balance after deductions
    openingBalance: { type: Number, default: null },
    availableStock: { type: Number, default: null },
    stockBalance: { type: Number, default: null },
    remainingStock: { type: Number, default: null },
    finalStock: { type: Number, default: null },
    storeLocation: { type: String, default: 'Main Store' },
    ingredientsUsed: [
      {
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
        materialName: { type: String },
        materialCode: { type: String, default: '' },
        unit: { type: String },
        quantityUsed: { type: Number },
        unitCost: { type: Number },
        totalCost: { type: Number },
        openingBalance: { type: Number, default: null },
        availableStock: { type: Number, default: null },
        stockBalance: { type: Number, default: null },
        remainingStock: { type: Number, default: null },
      }
    ],
  },
  { _id: false }
);

const salesRecordSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, default: '' },
    storeLocation: { type: String, default: 'Main Store' },
    importDate: { type: Date, default: Date.now },
    saleDate: { type: Date, default: Date.now },
    reference: { type: String, default: '' },         // e.g. POS order code
    notes: { type: String, default: '' },
    source: { type: String, default: 'excel_import' },

    lines: [saleLineSchema],

    // Totals (aggregated from lines)
    totalRevenue: { type: Number, default: 0 },
    totalCOGS: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },          // percentage

    // Link to stock transaction created during import
    stockTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'StockTransaction', default: null },

    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedFrom: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesRecord', salesRecordSchema);
