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

router.get('/next-voucher-no', getNextVoucherNo);
router.get('/reconciliation', getReconciliationSummary);
router.get('/summary', getVoucherSummary);
router.get('/', getTransactions);
router.post('/', authorizePermission('recordGoods'), createTransaction);
router.post('/import-sales', checkModuleEnabled('salesMarketing'), authorizePermission('recordGoods'), importSales);
router.post('/parse-image-sales', checkModuleEnabled('salesMarketing'), authorizePermission('recordGoods'), require('../controllers/transactionController').parseImageSales);
router.delete('/bulk', authorizePermission('voidTransactions'), bulkDeleteTransactions);
router.put('/:id/payment', checkModuleEnabled('salesMarketing'), authorizePermission('recordGoods'), recordSalePayment);
router.put('/:id', authorizePermission('recordGoods'), updateTransaction);
router.post('/:id/advance', advanceTransaction);
router.post('/:id/restore', authorize('developer'), restoreTransaction);
router.delete('/:id/permanent', authorizePermission('voidTransactions'), permanentDeleteTransaction);
router.delete('/:id', authorizePermission('voidTransactions'), deleteTransaction);

module.exports = router;

