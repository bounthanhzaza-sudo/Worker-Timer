const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getMonthlySummaryReport
} = require('../controllers/reportController');

router.get('/dashboard', getDashboardStats);
router.get('/monthly', getMonthlySummaryReport);

module.exports = router;
