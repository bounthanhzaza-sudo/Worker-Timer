const express = require('express');
const router = express.Router();
const {
    submitLeaveRequest,
    getLeaveRequests,
    updateLeaveStatus
} = require('../controllers/leaveController');

router.route('/')
    .post(submitLeaveRequest)
    .get(getLeaveRequests);

router.patch('/:id/status', updateLeaveStatus);

module.exports = router;
