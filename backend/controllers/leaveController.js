const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');

/**
 * @desc    Submit a leave request
 * @route   POST /api/leaves
 * @access  Employee / Staff
 */
exports.submitLeaveRequest = async (req, res) => {
    try {
        const { employeeId, leaveType, startDate, endDate, reason } = req.body;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({ success: false, message: 'Start date cannot be after end date.' });
        }

        // Prevent overlapping leave dates for the same employee (for Pending or Approved requests)
        const overlappingLeave = await LeaveRequest.findOne({
            employeeId,
            status: { $in: ['Pending', 'Approved'] },
            $and: [
                { startDate: { $lte: end } },
                { endDate: { $gte: start } }
            ]
        });

        if (overlappingLeave) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending or approved leave request overlapping with these dates.'
            });
        }

        const leaveRequest = await LeaveRequest.create({
            employeeId,
            leaveType,
            startDate: start,
            endDate: end,
            reason,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully.',
            data: leaveRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get all leave requests (with optional status & employee filter)
 * @route   GET /api/leaves
 * @access  Admin / Manager / Staff
 */
exports.getLeaveRequests = async (req, res) => {
    try {
        const { status, employeeId, branchId } = req.query;
        const query = {};

        if (status) query.status = status;
        if (employeeId) query.employeeId = employeeId;

        let leaveQuery = LeaveRequest.find(query).populate({
            path: 'employeeId',
            select: 'name email branchId',
            populate: { path: 'branchId', select: 'name' }
        }).populate('approvedBy', 'name email').sort({ createdAt: -1 });

        const requests = await leaveQuery;

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
 * @desc    Approve or Reject leave request
 * @route   PATCH /api/leaves/:id/status
 * @access  Admin / Manager
 */
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, managerId } = req.body; // managerId or req.user.id
        const validStatuses = ['Approved', 'Rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected.' });
        }

        const leaveRequest = await LeaveRequest.findById(req.params.id);
        if (!leaveRequest) {
            return res.status(404).json({ success: false, message: 'Leave request not found.' });
        }

        if (leaveRequest.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Leave request has already been ${leaveRequest.status.toLowerCase()}.` });
        }

        leaveRequest.status = status;
        if (managerId) {
            leaveRequest.approvedBy = managerId;
        }

        await leaveRequest.save();

        const updatedRequest = await LeaveRequest.findById(leaveRequest._id)
            .populate('employeeId', 'name email')
            .populate('approvedBy', 'name email');

        res.status(200).json({
            success: true,
            message: `Leave request ${status.toLowerCase()} successfully.`,
            data: updatedRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
