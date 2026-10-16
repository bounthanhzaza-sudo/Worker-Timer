const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const OvertimeRequest = require('../models/OvertimeRequest');
const mongoose = require('mongoose');

/**
 * @desc    Get Today's Dashboard Statistics
 * @route   GET /api/reports/dashboard
 * @access  Admin / Manager
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // 1. Total Active Employees
        const totalEmployees = await Employee.countDocuments({ status: 'Active' });

        // 2. Attendance Stats Today
        const todayAttendances = await Attendance.find({
            date: { $gte: todayStart, $lte: todayEnd }
        });

        const presentToday = todayAttendances.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const lateToday = todayAttendances.filter(a => a.status === 'Late').length;

        // 3. On Leave Today (Approved leaves covering today)
        const onLeaveToday = await LeaveRequest.countDocuments({
            status: 'Approved',
            startDate: { $lte: todayEnd },
            endDate: { $gte: todayStart }
        });

        // 4. Pending Requests (Pending Leaves + Pending Overtime)
        const pendingLeaves = await LeaveRequest.countDocuments({ status: 'Pending' });
        const pendingOvertime = await OvertimeRequest.countDocuments({ status: 'Pending' });
        const pendingRequests = pendingLeaves + pendingOvertime;

        res.status(200).json({
            success: true,
            date: todayStart.toISOString().split('T')[0],
            data: {
                totalEmployees,
                presentToday,
                lateToday,
                onLeaveToday,
                absentToday: Math.max(0, totalEmployees - presentToday - onLeaveToday),
                pendingRequests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Generate Monthly Summary Report for Employees or Branch
 * @route   GET /api/reports/monthly
 * @access  Admin / Manager
 */
exports.getMonthlySummaryReport = async (req, res) => {
    try {
        const { year, month, branchId, employeeId } = req.query;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Please provide year and month query parameters.' });
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        const matchStage = {
            date: { $gte: startDate, $lte: endDate }
        };

        if (employeeId) {
            matchStage.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: '$employeeId',
                    totalDaysPresent: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0]
                        }
                    },
                    totalLateCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Late'] }, 1, 0]
                        }
                    },
                    totalWorkHours: { $sum: '$workHours' },
                    totalOtHours: { $sum: '$otHours' }
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
                    totalDaysPresent: 1,
                    totalLateCount: 1,
                    totalWorkHours: { $round: ['$totalWorkHours', 2] },
                    totalOtHours: { $round: ['$totalOtHours', 2] }
                }
            }
        ];

        let report = await Attendance.aggregate(pipeline);

        // Filter by branch if requested
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
