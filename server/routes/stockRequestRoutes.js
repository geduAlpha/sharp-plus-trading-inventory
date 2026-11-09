const express = require('express');
const router  = express.Router();
const {
  getStockRequests,
  getStockRequestById,
  createStockRequest,
  updateStockRequest,
  approveStockRequest,
  issueStock,
  rejectStockRequest,
  cancelStockRequest,
  deleteStockRequest,
  getStockRequestSummary,
} = require('../controllers/stockRequestController');
const { protect, authorizePermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', authorizePermission('stockRequests', 'view'), getStockRequestSummary);
router.get('/',        authorizePermission('stockRequests', 'view'), getStockRequests);
router.get('/:id',     authorizePermission('stockRequests', 'view'), getStockRequestById);

router.post('/',   authorizePermission('stockRequests', 'create'), createStockRequest);
router.put('/:id', authorizePermission('stockRequests', 'edit'), updateStockRequest);

router.post('/:id/approve', authorizePermission('approveGoods'),     approveStockRequest);
router.post('/:id/issue',   authorizePermission('recordGoods'),       issueStock);
router.post('/:id/reject',  authorizePermission('approveGoods'),      rejectStockRequest);
router.post('/:id/cancel',  cancelStockRequest);

router.delete('/:id', authorizePermission('voidTransactions'), deleteStockRequest);

module.exports = router;
