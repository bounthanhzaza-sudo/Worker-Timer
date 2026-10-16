const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['Present', 'Late', 'Absent', 'On Leave'],
        default: 'Absent',
        required: true,
        index: true
    },
    workHours: {
        type: Number,
        default: 0,
        min: 0
    },
    otHours: {
        type: Number,
        default: 0,
        min: 0
    },
    lateMinutes: {
        type: Number,
        default: 0,
        min: 0
    },
    lateDeduction: {
        type: Number,
        default: 0,
        min: 0
    },
    auditTrail: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        editedAt: {
            type: Date,
            default: Date.now
        },
        previousCheckIn: { type: Date },
        newCheckIn: { type: Date },
        previousCheckOut: { type: Date },
        newCheckOut: { type: Date },
        reason: {
            type: String,
            required: true,
            trim: true
        }
    }]
}, {
    timestamps: true
});

// Compound unique index ensuring an employee can only have one attendance record per calendar date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Index for reporting queries by date range and status
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
