const express = require('express');
const router  = express.Router();
const {
  getRecycleBin,
  restoreItem,
  permanentDelete,
  emptyRecycleBin,
  deleteAllData,
} = require('../controllers/recycleBinController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Viewing Recycle Bin: admin, manager, developer
router.get('/', authorize('admin', 'manager', 'developer'), getRecycleBin);

// STRICT SECURITY REQUIREMENT: Only System Developer & Owner can restore items from Recycle Bin
router.post('/:type/:id/restore', authorize('developer'), restoreItem);

// Bulk move all operational data to recycle bin: Admin & Developer
router.post('/delete-all-data', authorize('admin', 'developer'), deleteAllData);

// Permanent removal / emptying bin: Admin & Developer
router.delete('/empty', authorize('admin', 'developer'), emptyRecycleBin);
router.delete('/:type/:id', authorize('admin', 'developer'), permanentDelete);

module.exports = router;
