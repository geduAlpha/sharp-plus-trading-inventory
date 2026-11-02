const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedFrom: { type: String, default: null },
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 });

module.exports = mongoose.model('Category', categorySchema);
