const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

/**
 * @desc    Submit an overtime request
 * @route   POST /api/overtime
 * @access  Employee / Staff / System
 */
exports.createOvertimeRequest = async (req, res) => {
    try {
        const { employeeId, date, hours, reason, multiplier = 1.5 } = req.body;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        const otDate = new Date(date);
        const hourlyRate = (employee.baseSalary || 30000) / 160;
        const otRate = hourlyRate * multiplier;
        const otPay = Number((hours * otRate).toFixed(2));

        const overtimeRequest = await OvertimeRequest.create({
            employeeId,
            date: otDate,
            hours,
            multiplier,
            otPay,
            reason,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            message: 'Overtime request logged successfully.',
            data: overtimeRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get all overtime requests (with filtering)
 * @route   GET /api/overtime
 * @access  Admin / Manager / Staff
 */
exports.getOvertimeRequests = async (req, res) => {
    try {
        const { status, employeeId, branchId, startDate, endDate } = req.query;
        const query = {};

        if (status) query.status = status;
        if (employeeId) query.employeeId = employeeId;

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        let otQuery = OvertimeRequest.find(query).populate({
            path: 'employeeId',
            select: 'name email branchId',
            populate: { path: 'branchId', select: 'name' }
        }).populate('approvedBy', 'name email').sort({ date: -1 });

        const requests = await otQuery;

        // Filter by branch if requested
        let filteredRequests = requests;
        if (branchId) {
            filteredRequests = requests.filter(reqItem =>
                reqItem.employeeId &&
                reqItem.employeeId.branchId &&
                reqItem.employeeId.branchId._id.toString() === branchId
            );
        }

        res.status(200).json({
            success: true,
            count: filteredRequests.length,
            data: filteredRequests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Approve or Reject overtime request
 * @route   PATCH /api/overtime/:id/status
 * @access  Admin / Manager
 */
exports.updateOvertimeStatus = async (req, res) => {
    try {
        const { status, managerId } = req.body;
        const validStatuses = ['Approved', 'Rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected.' });
        }

        const overtimeRequest = await OvertimeRequest.findById(req.params.id);
        if (!overtimeRequest) {
            return res.status(404).json({ success: false, message: 'Overtime request not found.' });
        }

        if (overtimeRequest.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Overtime request has already been ${overtimeRequest.status.toLowerCase()}.` });
        }

        overtimeRequest.status = status;
        if (managerId) {
            overtimeRequest.approvedBy = managerId;
        }

        await overtimeRequest.save();

        const updatedRequest = await OvertimeRequest.findById(overtimeRequest._id)
            .populate('employeeId', 'name email')
            .populate('approvedBy', 'name email');

        res.status(200).json({
            success: true,
            message: `Overtime request ${status.toLowerCase()} successfully.`,
            data: updatedRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get monthly aggregated approved overtime report for payroll integration
 * @route   GET /api/overtime/monthly-report
 * @access  Admin / Manager
 */
exports.getMonthlyOvertimeReport = async (req, res) => {
    try {
        const { year, month, branchId } = req.query;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Please provide year and month query parameters.' });
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        const matchStage = {
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
        };

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: '$employeeId',
                    totalApprovedOtHours: { $sum: '$hours' },
                    requestCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' },
            {
                $lookup: {
                    from: 'branches',
                    localField: 'employee.branchId',
                    foreignField: '_id',
                    as: 'branch'
                }
            },
            { $unwind: '$branch' },
            {
                $project: {
                    employeeId: '$_id',
                    employeeName: '$employee.name',
                    employeeEmail: '$employee.email',
                    branchName: '$branch.name',
                    branchId: '$branch._id',
                    totalApprovedOtHours: 1,
                    requestCount: 1
                }
            }
        ];

        let report = await OvertimeRequest.aggregate(pipeline);

        if (branchId) {
            report = report.filter(item => item.branchId.toString() === branchId);
        }

        res.status(200).json({
            success: true,
            year: parseInt(year),
            month: parseInt(month),
            count: report.length,
            data: report
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
