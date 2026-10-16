const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

/**
 * Helper function to parse "HH:mm" time string into minutes from midnight
 */
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * @desc    Record Employee Check-In
 * @route   POST /api/attendance/check-in
 * @access  Employee / Staff
 */
exports.checkIn = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const employee = await Employee.findById(employeeId).populate('shiftId');
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        if (!employee.shiftId) {
            return res.status(400).json({ success: false, message: 'No shift assigned to this employee.' });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let attendance = await Attendance.findOne({ employeeId, date: today });
        if (attendance && attendance.checkInTime) {
            return res.status(400).json({ success: false, message: 'Employee has already checked in today.' });
        }

        const shift = employee.shiftId;
        const shiftStartMinutes = timeToMinutes(shift.startTime);
        const gracePeriod = shift.gracePeriodMinutes || 0;
        const allowedCheckInLimit = shiftStartMinutes + gracePeriod;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const isLate = currentMinutes > allowedCheckInLimit;
        const status = isLate ? 'Late' : 'Present';
        let lateMinutes = 0;
        let lateDeduction = 0;

        if (isLate) {
            lateMinutes = currentMinutes - allowedCheckInLimit;
            const hourlyRate = (employee.baseSalary || 30000) / 160;
            const minuteRate = hourlyRate / 60;
            lateDeduction = Number((lateMinutes * minuteRate).toFixed(2));
        }

        if (!attendance) {
            attendance = await Attendance.create({
                employeeId,
                date: today,
                checkInTime: now,
                status,
                lateMinutes,
                lateDeduction
            });
        } else {
            attendance.checkInTime = now;
            attendance.status = status;
            attendance.lateMinutes = lateMinutes;
            attendance.lateDeduction = lateDeduction;
            await attendance.save();
        }

        res.status(200).json({
            success: true,
            message: `Check-in recorded successfully as ${status}.`,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Record Employee Check-Out & Calculate Work Hours & Overtime
 * @route   POST /api/attendance/check-out
 * @access  Employee / Staff
 */
exports.checkOut = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const employee = await Employee.findById(employeeId).populate('shiftId');
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const attendance = await Attendance.findOne({ employeeId, date: today });
        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ success: false, message: 'No check-in record found for today. Please check in first.' });
        }

        if (attendance.checkOutTime) {
            return res.status(400).json({ success: false, message: 'Employee has already checked out today.' });
        }

        attendance.checkOutTime = now;

        const diffMs = attendance.checkOutTime - attendance.checkInTime;
        const totalWorkHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        attendance.workHours = totalWorkHours;

        const shift = employee.shiftId;
        if (shift && shift.endTime) {
            const shiftEndMinutes = timeToMinutes(shift.endTime);
            const checkOutMinutes = now.getHours() * 60 + now.getMinutes();

            if (checkOutMinutes > shiftEndMinutes) {
                const otMinutes = checkOutMinutes - shiftEndMinutes;
                attendance.otHours = parseFloat((otMinutes / 60).toFixed(2));
            } else {
                attendance.otHours = 0;
            }
        }

        await attendance.save();

        res.status(200).json({
            success: true,
            message: 'Check-out recorded successfully.',
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Admin / Manager Manual Attendance Editing / Adjustment with Audit Trail
 * @route   PUT /api/attendance/:id
 * @access  Admin / Manager
 */
exports.editAttendance = async (req, res) => {
    try {
        const { checkInTime, checkOutTime, status, editorId, reason } = req.body;

        if (!editorId || !reason) {
            return res.status(400).json({ success: false, message: 'Editor ID and reason for adjustment are required.' });
        }

        const attendance = await Attendance.findById(req.params.id).populate({
            path: 'employeeId',
            populate: { path: 'shiftId' }
        });

        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        }

        const previousCheckIn = attendance.checkInTime;
        const previousCheckOut = attendance.checkOutTime;

        if (checkInTime) attendance.checkInTime = new Date(checkInTime);
        if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
        if (status) attendance.status = status;

        // Recalculate workHours and otHours if both checkIn and checkOut are present
        if (attendance.checkInTime && attendance.checkOutTime) {
            const diffMs = attendance.checkOutTime - attendance.checkInTime;
            attendance.workHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

            const shift = attendance.employeeId && attendance.employeeId.shiftId;
            if (shift && shift.endTime) {
                const shiftEndMinutes = timeToMinutes(shift.endTime);
                const outDate = attendance.checkOutTime;
                const checkOutMinutes = outDate.getHours() * 60 + outDate.getMinutes();

                if (checkOutMinutes > shiftEndMinutes) {
                    const otMinutes = checkOutMinutes - shiftEndMinutes;
                    attendance.otHours = parseFloat((otMinutes / 60).toFixed(2));
                } else {
                    attendance.otHours = 0;
                }
            }
        }

        // Push audit log entry
        attendance.auditTrail.push({
            editedBy: editorId,
            editedAt: new Date(),
            previousCheckIn,
            newCheckIn: attendance.checkInTime,
            previousCheckOut,
            newCheckOut: attendance.checkOutTime,
            reason
        });

        await attendance.save();

        const updatedAttendance = await Attendance.findById(attendance._id)
            .populate('employeeId', 'name email')
            .populate('auditTrail.editedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Attendance record adjusted successfully with audit log.',
            data: updatedAttendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get attendance records with filtering
 * @route   GET /api/attendance
 * @access  Admin / Manager / Staff
 */
exports.getAttendance = async (req, res) => {
    try {
        const { employeeId, branchId, startDate, endDate, status } = req.query;
        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        let attendanceQuery = Attendance.find(query).populate({
            path: 'employeeId',
            select: 'name email branchId',
            populate: { path: 'branchId', select: 'name' }
        }).populate('auditTrail.editedBy', 'name email').sort({ date: -1 });

        const records = await attendanceQuery;

        let filteredRecords = records;
        if (branchId) {
            filteredRecords = records.filter(record => 
                record.employeeId && 
                record.employeeId.branchId && 
                record.employeeId.branchId._id.toString() === branchId
            );
        }

        res.status(200).json({
            success: true,
            count: filteredRecords.length,
            data: filteredRecords
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
