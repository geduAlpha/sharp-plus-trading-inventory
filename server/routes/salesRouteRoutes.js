const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkModuleEnabled } = require('../middleware/moduleGateMiddleware');
const {
  getSalesRoutes,
  createSalesRoute,
  updateSalesRoute,
  assignCustomersToRoute,
  getRouteWiseSalesReport,
} = require('../controllers/salesRouteController');

router.use(protect);
router.use(checkModuleEnabled('salesMarketing'));

router.get('/', getSalesRoutes);
router.post('/', createSalesRoute);
router.put('/:id', updateSalesRoute);
router.post('/assign-customers', assignCustomersToRoute);
router.get('/report', getRouteWiseSalesReport);

module.exports = router;
