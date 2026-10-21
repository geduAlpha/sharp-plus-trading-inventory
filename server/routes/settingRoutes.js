const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  applyProductPriceAdjustment,
  getPublicCompanyProfile,
} = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route for landing, login, and registration branding
router.get('/public', getPublicCompanyProfile);

router.route('/')
  .get(protect, getSettings)
  .put(protect, authorize('admin', 'manager'), updateSettings);

router.put('/company-profile', protect, authorize('admin', 'manager'), updateSettings);
router.post('/apply-product-price-adjustment', protect, authorize('admin', 'manager'), applyProductPriceAdjustment);

module.exports = router;
