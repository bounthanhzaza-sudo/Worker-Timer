const express = require('express');
const mongoose = require('mongoose');

// Import Routers
const branchRoutes = require('./routes/branchRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const overtimeRoutes = require('./routes/overtimeRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middleware
app.use(express.json());

// Mount Routes
app.use('/api/branches', branchRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/reports', reportRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Welcome to EAMS (Employee Attendance Management System) API' });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eams_db';

if (require.main === module) {
    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('Connected to MongoDB successfully.');
            app.listen(PORT, () => {
                console.log(`EAMS Server running on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error('MongoDB connection error:', err);
        });
}

module.exports = app;
