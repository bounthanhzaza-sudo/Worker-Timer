const mongoose = require('mongoose');

const overtimeRequestSchema = new mongoose.Schema({
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
    hours: {
        type: Number,
        required: true,
        min: 0.5,
        max: 12
    },
    multiplier: {
        type: Number,
        default: 1.5, // Standard OT rate multiplier (e.g. 1.5x)
        required: true
    },
    otPay: {
        type: Number,
        default: 0,
        min: 0
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

// Compound index for querying employee overtime requests by date and status
overtimeRequestSchema.index({ employeeId: 1, date: 1 });
overtimeRequestSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('OvertimeRequest', overtimeRequestSchema);
