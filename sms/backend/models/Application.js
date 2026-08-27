const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship', required: true },

    // Eligibility inputs the student submits with the application
    academicScore: { type: Number, required: true, min: 0, max: 100 },
    familyIncome: { type: Number, required: true, min: 0 },
    documents: [{ type: String, trim: true }], // e.g. "Marksheet - submitted", "Income certificate - submitted"

    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
      default: 'Pending',
    },

    // Filled in by admin during review
    reviewScore: { type: Number, min: 0, max: 100, default: null },
    reviewNotes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// A student can only apply once per scholarship
applicationSchema.index({ student: 1, scholarship: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
