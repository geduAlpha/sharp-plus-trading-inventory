const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchaseById,
  createPurchase,
  advancePurchase,
  deletePurchase,
  restorePurchase,
} = require('../controllers/purchaseController');
const { protect, authorizePermission, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/',    getPurchases);
router.get('/:id', getPurchaseById);
router.post('/',   authorizePermission('recordGoods'), createPurchase);
// Advance workflow: check / approve / receive / cancel — capabilities checked inside controller
router.post('/:id/advance', advancePurchase);
router.post('/:id/restore', authorize('developer'), restorePurchase);
router.delete('/:id', authorizePermission('voidTransactions'), deletePurchase);

module.exports = router;

