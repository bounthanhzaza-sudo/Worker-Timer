const express = require('express');
const router = express.Router();
const {
    createOvertimeRequest,
    getOvertimeRequests,
    updateOvertimeStatus,
    getMonthlyOvertimeReport
} = require('../controllers/overtimeController');

router.get('/monthly-report', getMonthlyOvertimeReport);

router.route('/')
    .post(createOvertimeRequest)
    .get(getOvertimeRequests);

router.patch('/:id/status', updateOvertimeStatus);

module.exports = router;
