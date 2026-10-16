const Branch = require('../models/Branch');
const Employee = require('../models/Employee');

/**
 * @desc    Create a new branch
 * @route   POST /api/branches
 * @access  Admin
 */
exports.createBranch = async (req, res) => {
    try {
        const { name, address, location } = req.body;

        const existingBranch = await Branch.findOne({ name });
        if (existingBranch) {
            return res.status(400).json({ success: false, message: 'Branch with this name already exists.' });
        }

        const branch = await Branch.create({
            name,
            address,
            location: location || { type: 'Point', coordinates: [0, 0] }
        });

        res.status(201).json({
            success: true,
            message: 'Branch created successfully.',
            data: branch
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get all branches
 * @route   GET /api/branches
 * @access  Admin / Manager / Staff
 */
exports.getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: branches.length,
            data: branches
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get branch by ID
 * @route   GET /api/branches/:id
 * @access  Admin / Manager
 */
exports.getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }

        res.status(200).json({
            success: true,
            data: branch
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Update branch details
 * @route   PUT /api/branches/:id
 * @access  Admin
 */
exports.updateBranch = async (req, res) => {
    try {
        const { name, address, location } = req.body;

        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }

        if (name) branch.name = name;
        if (address) branch.address = address;
        if (location) branch.location = location;

        await branch.save();

        res.status(200).json({
            success: true,
            message: 'Branch updated successfully.',
            data: branch
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Delete branch
 * @route   DELETE /api/branches/:id
 * @access  Admin
 */
exports.deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }

        // Check if any employees are assigned to this branch
        const employeeCount = await Employee.countDocuments({ branchId: branch._id });
        if (employeeCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete branch. There are ${employeeCount} employees assigned to this branch.`
            });
        }

        await branch.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Branch deleted successfully.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
