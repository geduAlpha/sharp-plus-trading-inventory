const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getMaterials,
  getNextCode,
  getMaterialById,
  createMaterial,
  updateMaterial,
  toggleMaterialStatus,
  deleteMaterial,
  bulkDeleteMaterials,
  restoreMaterial,
  permanentDeleteMaterial,
  exportMaterialsExcel,
  importMaterialsExcel,
} = require('../controllers/materialController');
const { protect, authorize, authorizePermission } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Excel import/export (before /:id to avoid conflict)
router.get('/export/excel', authorizePermission('items', 'view'), exportMaterialsExcel);
router.post('/import/excel', authorizePermission('items', 'create'), upload.single('file'), importMaterialsExcel);

// Next sequential code generation (before /:id)
router.get('/next-code', authorizePermission('items', 'view'), getNextCode);

// Bulk + restore (before /:id)
router.delete('/bulk',          authorizePermission('items', 'delete'), bulkDeleteMaterials);
router.post('/:id/restore',     authorize('developer'), restoreMaterial);
router.delete('/:id/permanent', authorize('admin'), permanentDeleteMaterial);

// Activate / Deactivate status toggle
router.patch('/:id/status',     authorizePermission('items', 'edit'), toggleMaterialStatus);

router.get('/', authorizePermission('items', 'view'), getMaterials);
router.get('/:id', authorizePermission('items', 'view'), getMaterialById);
router.post('/', authorizePermission('items', 'create'), createMaterial);
router.put('/:id', authorizePermission('items', 'edit'), updateMaterial);
router.delete('/:id', authorizePermission('items', 'delete'), deleteMaterial);

module.exports = router;
