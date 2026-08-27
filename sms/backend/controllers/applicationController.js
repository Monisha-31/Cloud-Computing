const Application = require('../models/Application');
const Scholarship = require('../models/Scholarship');

// @route POST /api/applications  (student)
exports.createApplication = async (req, res) => {
  try {
    const { scholarshipId, academicScore, familyIncome, documents } = req.body;

    if (!scholarshipId || academicScore == null || familyIncome == null) {
      return res.status(400).json({ message: 'Scholarship, academic score and family income are required' });
    }

    const scholarship = await Scholarship.findById(scholarshipId);
    if (!scholarship || !scholarship.isActive) {
      return res.status(404).json({ message: 'Scholarship not found or no longer active' });
    }

    if (new Date() > new Date(scholarship.deadline)) {
      return res.status(400).json({ message: 'The application deadline for this scholarship has passed' });
    }

    const existing = await Application.findOne({ student: req.user._id, scholarship: scholarshipId });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied to this scholarship' });
    }

    const application = await Application.create({
      student: req.user._id,
      scholarship: scholarshipId,
      academicScore,
      familyIncome,
      documents: documents || [],
    });

    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already applied to this scholarship' });
    }
    res.status(500).json({ message: 'Failed to submit application', error: err.message });
  }
};

// @route GET /api/applications
// student -> only their own; admin -> all, with optional filters
exports.getApplications = async (req, res) => {
  try {
    const { status, scholarshipId } = req.query;
    let filter = {};

    if (req.user.role === 'student') {
      filter.student = req.user._id;
    } else if (scholarshipId) {
      filter.scholarship = scholarshipId;
    }

    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('student', 'name email')
      .populate('scholarship', 'title category amount deadline minAcademicScore maxFamilyIncome')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
};

// @route GET /api/applications/:id
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('student', 'name email')
      .populate('scholarship');

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const isOwner = application.student._id.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this application' });
    }

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch application', error: err.message });
  }
};

// @route PATCH /api/applications/:id/review  (admin only)
exports.reviewApplication = async (req, res) => {
  try {
    const { status, reviewScore, reviewNotes } = req.body;
    const validStatuses = ['Pending', 'Under Review', 'Approved', 'Rejected'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (status) application.status = status;
    if (reviewScore !== undefined) application.reviewScore = reviewScore;
    if (reviewNotes !== undefined) application.reviewNotes = reviewNotes;
    application.reviewedBy = req.user._id;

    await application.save();
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update application', error: err.message });
  }
};

// @route GET /api/applications/stats/overview  (admin only)
exports.getStats = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments();
    const totalScholarships = await Scholarship.countDocuments({ isActive: true });
    const byStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const totalAwarded = await Application.aggregate([
      { $match: { status: 'Approved' } },
      { $lookup: { from: 'scholarships', localField: 'scholarship', foreignField: '_id', as: 'sch' } },
      { $unwind: '$sch' },
      { $group: { _id: null, total: { $sum: '$sch.amount' } } },
    ]);

    res.json({
      totalApplications,
      totalScholarships,
      byStatus,
      totalAwarded: totalAwarded[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
};
