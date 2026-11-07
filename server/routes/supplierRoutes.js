const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  bulkDeleteSuppliers,
  restoreSupplier,
  permanentDeleteSupplier,
} = require('../controllers/supplierController');
const { protect, authorize, authorizePermission } = require('../middleware/authMiddleware');

router.use(protect);
router.delete('/bulk',          authorizePermission('suppliers', 'delete'), bulkDeleteSuppliers);
router.post('/:id/restore',     authorize('developer'), restoreSupplier);
router.delete('/:id/permanent', authorize('admin'), permanentDeleteSupplier);
router.get('/', authorizePermission('suppliers', 'view'), getSuppliers);
router.get('/:id', authorizePermission('suppliers', 'view'), getSupplierById);
router.post('/', authorizePermission('suppliers', 'create'), createSupplier);
router.put('/:id', authorizePermission('suppliers', 'edit'), updateSupplier);
router.delete('/:id', authorizePermission('suppliers', 'delete'), deleteSupplier);

module.exports = router;
