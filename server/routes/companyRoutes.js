const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  toggleCompanyAccess,
  getCompanyStaff,
  createCompanyStaff,
  updateCompanyStaff,
  deleteCompany,
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('developer', 'admin'), getCompanies)
  .post(protect, authorize('developer'), createCompany);

router.route('/:id')
  .get(protect, authorize('developer', 'admin'), getCompanyById)
  .put(protect, authorize('developer', 'admin'), updateCompany)
  .delete(protect, authorize('developer'), deleteCompany);

// System Developer Access Toggle (Give Access / Deny Access)
router.put('/:id/access', protect, authorize('developer'), toggleCompanyAccess);

// Staff management under this company
router.route('/:id/staff')
  .get(protect, authorize('developer', 'admin'), getCompanyStaff)
  .post(protect, authorize('developer', 'admin'), createCompanyStaff);

router.put('/:id/staff/:userId', protect, authorize('developer', 'admin'), updateCompanyStaff);

module.exports = router;
