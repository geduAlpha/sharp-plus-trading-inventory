const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { checkModuleEnabled } = require('../middleware/moduleGateMiddleware');

router.use(protect);
router.use(checkModuleEnabled('salesMarketing'));

router.route('/')
  .get(getCustomers)
  .post(createCustomer);

router.route('/:id')
  .put(updateCustomer)
  .delete(deleteCustomer);

router.post('/:id/restore', authorize('developer'), restoreCustomer);

module.exports = router;
