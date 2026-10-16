const express = require('express');
const router = express.Router();
const {
    createBranch,
    getAllBranches,
    getBranchById,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');

router.route('/')
    .post(createBranch)
    .get(getAllBranches);

router.route('/:id')
    .get(getBranchById)
    .put(updateBranch)
    .delete(deleteBranch);

module.exports = router;
