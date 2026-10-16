const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        select: false // Exclude password by default in queries
    },
    role: {
        type: String,
        enum: ['Admin', 'Manager', 'Staff'],
        default: 'Staff',
        required: true,
        index: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
        index: true
    },
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended', 'Resigned'],
        default: 'Active',
        index: true
    },
    baseSalary: {
        type: Number,
        default: 30000,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});

// Compound index for querying employees by branch and role
employeeSchema.index({ branchId: 1, role: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
