const express = require('express');
const router  = express.Router();
const {
  getEmployees, getDepartments, createEmployee, updateEmployee, deleteEmployee, restoreEmployee,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/departments', getDepartments);
router.get('/',            getEmployees);
router.post('/',           createEmployee);
router.put('/:id',         updateEmployee);
router.post('/:id/restore', authorize('developer'), restoreEmployee);
router.delete('/:id',      deleteEmployee);

module.exports = router;
