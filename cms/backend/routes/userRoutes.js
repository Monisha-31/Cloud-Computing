const express = require('express');
const router = express.Router();
const { getUsers, getStaff, createUser, toggleUserStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin')); // all user-management routes are admin-only

router.get('/', getUsers);
router.get('/staff', getStaff);
router.post('/', createUser);
router.patch('/:id/status', toggleUserStatus);

module.exports = router;
