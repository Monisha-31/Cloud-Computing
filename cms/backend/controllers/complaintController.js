const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @route POST /api/complaints
// Any logged-in user files a complaint
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required' });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      createdBy: req.user._id,
    });

    res.status(201).json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create complaint', error: err.message });
  }
};

// @route GET /api/complaints
// user -> only their own complaints
// staff -> complaints in their department
// admin -> all complaints
exports.getComplaints = async (req, res) => {
  try {
    const { status, category } = req.query;
    let filter = {};

    if (req.user.role === 'user') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'staff') {
      filter.category = req.user.department;
    }
    // admin sees everything unless they filter

    if (status) filter.status = status;
    if (category && req.user.role === 'admin') filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaints', error: err.message });
  }
};

// @route GET /api/complaints/:id
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name role');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isOwner = complaint.createdBy._id.equals(req.user._id);
    const isAssignedDept = req.user.role === 'staff' && complaint.category === req.user.department;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedDept && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this complaint' });
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaint', error: err.message });
  }
};

// @route PATCH /api/complaints/:id/status
// staff (own department) or admin can update status
exports.updateStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isAssignedDept = req.user.role === 'staff' && complaint.category === req.user.department;
    const isAdmin = req.user.role === 'admin';

    if (!isAssignedDept && !isAdmin) {
      return res.status(403).json({ message: 'Only assigned staff or an admin can update status' });
    }

    complaint.status = status;
    if (resolutionNote) complaint.resolutionNote = resolutionNote;
    if (status === 'In Progress' && !complaint.assignedTo && req.user.role === 'staff') {
      complaint.assignedTo = req.user._id;
    }

    await complaint.save();
    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
};

// @route PATCH /api/complaints/:id/assign
// admin manually assigns a complaint to a staff member
exports.assignComplaint = async (req, res) => {
  try {
    const { staffId } = req.body;

    const staff = await User.findOne({ _id: staffId, role: 'staff' });
    if (!staff) return res.status(400).json({ message: 'Staff member not found' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.assignedTo = staff._id;
    if (complaint.status === 'Open') complaint.status = 'In Progress';

    await complaint.save();
    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign complaint', error: err.message });
  }
};

// @route POST /api/complaints/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Comment message is required' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isOwner = complaint.createdBy.equals(req.user._id);
    const isAssignedDept = req.user.role === 'staff' && complaint.category === req.user.department;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssignedDept && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this complaint' });
    }

    complaint.comments.push({
      author: req.user._id,
      authorName: req.user.name,
      message,
    });

    await complaint.save();
    res.status(201).json({ complaint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment', error: err.message });
  }
};

// @route GET /api/complaints/stats/overview
// admin dashboard summary
exports.getStats = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const byStatus = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({ total, byStatus, byCategory });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
};
