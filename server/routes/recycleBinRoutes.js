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

// Restore: developer and admin (controller checks explicit owner-delegated authority)
router.post('/:type/:id/restore', authorize('admin', 'developer'), restoreItem);

// Bulk move all operational data to recycle bin: Admin & Developer
router.post('/delete-all-data', authorize('admin', 'developer'), deleteAllData);

// Permanent removal / emptying bin: Admin & Developer
router.delete('/empty', authorize('admin', 'developer'), emptyRecycleBin);
router.delete('/:type/:id', authorize('admin', 'developer'), permanentDelete);

module.exports = router;
