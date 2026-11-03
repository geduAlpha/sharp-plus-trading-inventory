const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkModuleEnabled } = require('../middleware/moduleGateMiddleware');
const {
  getSalesClosings,
  getUnclosedSalesStats,
  createSalesClosing,
} = require('../controllers/salesClosingController');

router.use(protect);
router.use(checkModuleEnabled('salesMarketing'));

router.get('/', getSalesClosings);
router.get('/unclosed-stats', getUnclosedSalesStats);
router.post('/', createSalesClosing);

module.exports = router;

