const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Merit', 'Need-Based', 'Sports', 'Minority', 'Research', 'General'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    minAcademicScore: { type: Number, required: true, min: 0, max: 100 },
    maxFamilyIncome: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scholarship', scholarshipSchema);
