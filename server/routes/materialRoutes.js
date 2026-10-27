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
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Excel import/export (before /:id to avoid conflict)
router.get('/export/excel', authorize('admin', 'manager'), exportMaterialsExcel);
router.post('/import/excel', authorize('admin', 'manager'), upload.single('file'), importMaterialsExcel);

// Next sequential code generation (before /:id)
router.get('/next-code', authorize('admin', 'manager'), getNextCode);

// Bulk + restore (before /:id)
router.delete('/bulk',          authorize('admin', 'manager'), bulkDeleteMaterials);
router.post('/:id/restore',     authorize('developer'), restoreMaterial);
router.delete('/:id/permanent', authorize('admin'), permanentDeleteMaterial);

// Activate / Deactivate status toggle
router.patch('/:id/status',     authorize('admin', 'manager'), toggleMaterialStatus);

router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.post('/', authorize('admin', 'manager'), createMaterial);
router.put('/:id', authorize('admin', 'manager'), updateMaterial);
router.delete('/:id', authorize('admin'), deleteMaterial);

module.exports = router;
