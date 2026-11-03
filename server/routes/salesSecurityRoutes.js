const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkModuleEnabled } = require('../middleware/moduleGateMiddleware');
const {
  getSecurityAuditReport,
  createZeroingVoucher,
  recordCreditCollection,
  getCustomerCreditLedger,
} = require('../controllers/salesSecurityAuditController');

router.use(protect);
router.use(checkModuleEnabled('salesMarketing'));

router.get('/report', getSecurityAuditReport);
router.post('/zeroing', createZeroingVoucher);
router.post('/collect-credit', recordCreditCollection);
router.get('/credit-ledger', getCustomerCreditLedger);

module.exports = router;
