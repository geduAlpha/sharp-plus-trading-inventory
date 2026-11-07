const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  restoreProduct,
  permanentDeleteProduct,
  exportProductsExcel,
  importProductsExcel,
  exportRecipeTemplate,
  importRecipesExcel,
} = require('../controllers/productController');
const { protect, authorize, authorizePermission } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Excel import/export — must be before /:id
router.get('/export/excel',           authorizePermission('products', 'view'), exportProductsExcel);
router.post('/import/excel',          authorizePermission('products', 'create'), upload.single('file'), importProductsExcel);
router.get('/export/recipe-template', authorizePermission('products', 'view'), exportRecipeTemplate);
router.post('/import/recipes',        authorizePermission('products', 'create'), upload.single('file'), importRecipesExcel);

// Bulk + restore — must be before /:id
router.delete('/bulk',          authorizePermission('products', 'delete'), bulkDeleteProducts);
router.post('/:id/restore',     authorize('developer'), restoreProduct);
router.delete('/:id/permanent', authorize('admin'), permanentDeleteProduct);

router.get('/', authorizePermission('products', 'view'), getProducts);
router.get('/:id', authorizePermission('products', 'view'), getProductById);
router.post('/', authorizePermission('products', 'create'), createProduct);
router.put('/:id', authorizePermission('products', 'edit'), updateProduct);
router.delete('/:id', authorizePermission('products', 'delete'), deleteProduct);

module.exports = router;
