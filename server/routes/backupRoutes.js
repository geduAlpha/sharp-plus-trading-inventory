const express = require('express');
const router = express.Router();
const {
  exportBackup,
  recoverRecord,
  getAuditLogs,
} = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Audit logs stream: Developer & Administrator
router.get('/audit-logs', authorize('developer', 'admin'), getAuditLogs);

// Backup export & audited recovery: Developer only
router.get('/export', authorize('developer'), exportBackup);
router.post('/recover-record', authorize('developer'), recoverRecord);

module.exports = router;
