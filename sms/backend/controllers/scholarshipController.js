const Scholarship = require('../models/Scholarship');

// @route POST /api/scholarships  (admin only)
exports.createScholarship = async (req, res) => {
  try {
    const { title, description, category, amount, minAcademicScore, maxFamilyIncome, deadline } = req.body;

    if (!title || !description || !category || amount == null || minAcademicScore == null || maxFamilyIncome == null || !deadline) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const scholarship = await Scholarship.create({
      title, description, category, amount, minAcademicScore, maxFamilyIncome, deadline,
      createdBy: req.user._id,
    });

    res.status(201).json({ scholarship });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create scholarship', error: err.message });
  }
};

// @route GET /api/scholarships
// students see only active, non-expired scholarships; admin sees everything
exports.getScholarships = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'student') {
      filter.isActive = true;
    }

    const scholarships = await Scholarship.find(filter).sort({ deadline: 1 });
    res.json({ scholarships });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch scholarships', error: err.message });
  }
};

// @route GET /api/scholarships/:id
exports.getScholarshipById = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });
    res.json({ scholarship });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch scholarship', error: err.message });
  }
};

// @route PATCH /api/scholarships/:id  (admin only)
exports.updateScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });

    const fields = ['title', 'description', 'category', 'amount', 'minAcademicScore', 'maxFamilyIncome', 'deadline', 'isActive'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) scholarship[f] = req.body[f];
    });

    await scholarship.save();
    res.json({ scholarship });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update scholarship', error: err.message });
  }
};

// @route DELETE /api/scholarships/:id  (admin only)
exports.deleteScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.findByIdAndDelete(req.params.id);
    if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });
    res.json({ message: 'Scholarship deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete scholarship', error: err.message });
  }
};
