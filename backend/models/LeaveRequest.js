const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    leaveType: {
        type: String,
        enum: ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid'],
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
        required: true,
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    }
}, {
    timestamps: true
});

// Compound index for querying employee's leave history by status and date
leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
