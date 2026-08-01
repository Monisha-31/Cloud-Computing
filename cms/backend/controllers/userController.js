const User = require('../models/User');

// @route GET /api/users  (admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// @route GET /api/users/staff  (admin only) — used to populate assignment dropdowns
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch staff', error: err.message });
  }
};

// @route POST /api/users  (admin only) — create staff/admin accounts
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    if (role === 'staff' && !department) {
      return res.status(400).json({ message: 'Department is required for staff accounts' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: role === 'staff' ? department : undefined,
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
};

// @route PATCH /api/users/:id/status  (admin only) — activate/deactivate
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user status', error: err.message });
  }
};
