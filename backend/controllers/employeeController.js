const Employee = require('../models/Employee');
const Branch = require('../models/Branch');
const Shift = require('../models/Shift');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a new employee
 * @route   POST /api/employees
 * @access  Admin / Manager
 */
exports.createEmployee = async (req, res) => {
    try {
        const { name, email, password, role, branchId, shiftId, status } = req.body;

        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) {
            return res.status(400).json({ success: false, message: 'Employee with this email already exists.' });
        }

        // Validate Branch and Shift existence
        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Assigned branch not found.' });
        }

        const shift = await Shift.findById(shiftId);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Assigned shift not found.' });
        }

        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const employee = await Employee.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'Staff',
            branchId,
            shiftId,
            status: status || 'Active'
        });

        // Exclude password in response
        const employeeResponse = employee.toObject();
        delete employeeResponse.password;

        res.status(201).json({
            success: true,
            message: 'Employee created successfully.',
            data: employeeResponse
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get all employees with pagination, search, and branch filtering
 * @route   GET /api/employees
 * @access  Admin / Manager
 */
exports.getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {};

        // Filter by branch
        if (req.query.branchId) {
            query.branchId = req.query.branchId;
        }

        // Filter by status
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Search by name or email
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        const total = await Employee.countDocuments(query);
        const employees = await Employee.find(query)
            .populate('branchId', 'name address')
            .populate('shiftId', 'name startTime endTime')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: employees.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: employees
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get employee by ID with populated branch and shift details
 * @route   GET /api/employees/:id
 * @access  Admin / Manager / Self
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('branchId')
            .populate('shiftId');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        res.status(200).json({
            success: true,
            data: employee
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Update employee info, branch, shift, or role
 * @route   PUT /api/employees/:id
 * @access  Admin / Manager
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { name, email, role, branchId, shiftId, status } = req.body;

        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        // Validate branch if updated
        if (branchId) {
            const branch = await Branch.findById(branchId);
            if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
            employee.branchId = branchId;
        }

        // Validate shift if updated
        if (shiftId) {
            const shift = await Shift.findById(shiftId);
            if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
            employee.shiftId = shiftId;
        }

        if (name) employee.name = name;
        if (email) employee.email = email;
        if (role) employee.role = role;
        if (status) employee.status = status;

        await employee.save();

        const updatedEmployee = await Employee.findById(employee._id)
            .populate('branchId', 'name')
            .populate('shiftId', 'name startTime endTime');

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully.',
            data: updatedEmployee
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Soft delete / Update employee status (Inactive / Resigned)
 * @route   PATCH /api/employees/:id/status
 * @access  Admin
 */
exports.updateEmployeeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Active', 'Inactive', 'Suspended', 'Resigned'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }

        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('branchId shiftId');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        res.status(200).json({
            success: true,
            message: `Employee status updated to ${status}.`,
            data: employee
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
