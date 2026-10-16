const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    startTime: {
        type: String, // Format: "HH:mm" (24-hour e.g., "09:00")
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
        type: String, // Format: "HH:mm" (24-hour e.g., "18:00")
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    gracePeriodMinutes: {
        type: Number,
        required: true,
        default: 15,
        min: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Shift', shiftSchema);
