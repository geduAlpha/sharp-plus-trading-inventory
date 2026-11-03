const mongoose = require('mongoose');

const salesRouteSchema = new mongoose.Schema(
  {
    code:         { type: String, required: true, unique: true, trim: true }, // e.g. RT-NORTH, RT-01
    name:         { type: String, required: true, trim: true }, // e.g. North Addis Commercial Zone
    description:  { type: String, default: '' },
    zone:         { type: String, default: 'Central', trim: true },
    assignedRep:  { type: String, default: 'Unassigned', trim: true }, // Assigned Sales Representative
    repPhone:     { type: String, default: '', trim: true },
    vehicleNo:    { type: String, default: '', trim: true },
    isActive:     { type: Boolean, default: true },
    targetStores: [{ type: String, trim: true }],
    customerCount:{ type: Number, default: 0 },
    deletedAt:    { type: Date, default: null },
    deletedBy:    { type: String, default: null },
  },
  { timestamps: true }
);

salesRouteSchema.index({ code: 1 });
salesRouteSchema.index({ name: 1 });
salesRouteSchema.index({ isActive: 1 });

module.exports = mongoose.model('SalesRoute', salesRouteSchema);
