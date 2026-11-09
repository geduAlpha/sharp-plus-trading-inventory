const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  restoreTransaction,
  permanentDeleteTransaction,
  getVoucherSummary,
  getNextVoucherNo,
  getReconciliationSummary,
  advanceTransaction,
  importSales,
  recordSalePayment,
} = require('../controllers/transactionController');
const { protect, authorize, authorizePermission } = require('../middleware/authMiddleware');
const { checkModuleEnabled } = require('../middleware/moduleGateMiddleware');

router.use(protect);

router.get('/next-voucher-no', authorizePermission('stockMovements', 'view'), getNextVoucherNo);
router.get('/reconciliation', authorizePermission('stockMovements', 'view'), getReconciliationSummary);
router.get('/summary', authorizePermission('stockMovements', 'view'), getVoucherSummary);
router.get('/', authorizePermission('stockMovements', 'view'), getTransactions);
router.post('/', authorizePermission('stockMovements', 'create'), createTransaction);
router.post('/import-sales', checkModuleEnabled('salesMarketing'), authorizePermission('stockMovements', 'create'), importSales);
router.post('/parse-image-sales', checkModuleEnabled('salesMarketing'), authorizePermission('stockMovements', 'create'), require('../controllers/transactionController').parseImageSales);
router.delete('/bulk', authorizePermission('voidTransactions'), bulkDeleteTransactions);
router.put('/:id/payment', checkModuleEnabled('salesMarketing'), authorizePermission('stockMovements', 'edit'), recordSalePayment);
router.put('/:id', authorizePermission('stockMovements', 'edit'), updateTransaction);
router.post('/:id/advance', advanceTransaction);
router.post('/:id/restore', authorize('developer'), restoreTransaction);
router.delete('/:id/permanent', authorizePermission('voidTransactions'), permanentDeleteTransaction);
router.delete('/:id', authorizePermission('voidTransactions'), deleteTransaction);

module.exports = router;

