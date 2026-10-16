const Shift = require('../models/Shift');
const Employee = require('../models/Employee');

/**
 * @desc    Create a new shift
 * @route   POST /api/shifts
 * @access  Admin
 */
exports.createShift = async (req, res) => {
    try {
        const { name, startTime, endTime, gracePeriodMinutes } = req.body;

        const existingShift = await Shift.findOne({ name });
        if (existingShift) {
            return res.status(400).json({ success: false, message: 'Shift with this name already exists.' });
        }

        const shift = await Shift.create({
            name,
            startTime,
            endTime,
            gracePeriodMinutes: gracePeriodMinutes !== undefined ? gracePeriodMinutes : 15
        });

        res.status(201).json({
            success: true,
            message: 'Shift created successfully.',
            data: shift
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get all shifts
 * @route   GET /api/shifts
 * @access  Admin / Manager / Staff
 */
exports.getAllShifts = async (req, res) => {
    try {
        const shifts = await Shift.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: shifts.length,
            data: shifts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get shift by ID
 * @route   GET /api/shifts/:id
 * @access  Admin / Manager
 */
exports.getShiftById = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found.' });
        }

        res.status(200).json({
            success: true,
            data: shift
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Update shift details
 * @route   PUT /api/shifts/:id
 * @access  Admin
 */
exports.updateShift = async (req, res) => {
    try {
        const { name, startTime, endTime, gracePeriodMinutes } = req.body;

        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found.' });
        }

        if (name) shift.name = name;
        if (startTime) shift.startTime = startTime;
        if (endTime) shift.endTime = endTime;
        if (gracePeriodMinutes !== undefined) shift.gracePeriodMinutes = gracePeriodMinutes;

        await shift.save();

        res.status(200).json({
            success: true,
            message: 'Shift updated successfully.',
            data: shift
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Delete shift
 * @route   DELETE /api/shifts/:id
 * @access  Admin
 */
exports.deleteShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found.' });
        }

        // Check if any employees are assigned to this shift
        const employeeCount = await Employee.countDocuments({ shiftId: shift._id });
        if (employeeCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete shift. There are ${employeeCount} employees assigned to this shift.`
            });
        }

        await shift.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Shift deleted successfully.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
