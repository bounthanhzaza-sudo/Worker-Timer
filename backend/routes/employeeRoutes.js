const express = require('express');
const router = express.Router();
const {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    updateEmployeeStatus
} = require('../controllers/employeeController');

// Routes mapping
router.route('/')
    .post(createEmployee)
    .get(getAllEmployees);

router.route('/:id')
    .get(getEmployeeById)
    .put(updateEmployee);

router.patch('/:id/status', updateEmployeeStatus);

module.exports = router;
