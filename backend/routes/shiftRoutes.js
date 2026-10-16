const express = require('express');
const router = express.Router();
const {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift
} = require('../controllers/shiftController');

router.route('/')
    .post(createShift)
    .get(getAllShifts);

router.route('/:id')
    .get(getShiftById)
    .put(updateShift)
    .delete(deleteShift);

module.exports = router;
