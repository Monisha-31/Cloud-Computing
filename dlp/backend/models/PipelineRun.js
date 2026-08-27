const mongoose = require('mongoose');

const pipelineRunSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    threshold: { type: Number, required: true },
    partitionsAffected: { type: Number, default: 0 },
    filesBefore: { type: Number, default: 0 },
    filesAfter: { type: Number, default: 0 },
    sizeBeforeBytes: { type: Number, default: 0 },
    sizeAfterBytes: { type: Number, default: 0 },
    logs: [{ type: String }],
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PipelineRun', pipelineRunSchema);
