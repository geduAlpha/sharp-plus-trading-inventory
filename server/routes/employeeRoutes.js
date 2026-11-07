const express = require('express');
const router  = express.Router();
const {
  getEmployees, getDepartments, createEmployee, updateEmployee, deleteEmployee, restoreEmployee,
} = require('../controllers/employeeController');
const { protect, authorize, authorizePermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/departments', authorizePermission('employees', 'view'), getDepartments);
router.get('/',            authorizePermission('employees', 'view'), getEmployees);
router.post('/',           authorizePermission('employees', 'create'), createEmployee);
router.put('/:id',         authorizePermission('employees', 'edit'), updateEmployee);
router.post('/:id/restore', authorize('developer'), restoreEmployee);
router.delete('/:id',      authorizePermission('employees', 'delete'), deleteEmployee);

module.exports = router;
