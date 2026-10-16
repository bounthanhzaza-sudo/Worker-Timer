const express = require('express');
const router = express.Router();
const {
    checkIn,
    checkOut,
    editAttendance,
    getAttendance
} = require('../controllers/attendanceController');

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.put('/:id', editAttendance);
router.get('/', getAttendance);

module.exports = router;
