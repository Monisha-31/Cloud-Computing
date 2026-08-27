const PipelineRun = require('../models/PipelineRun');
const { runCompaction } = require('../services/compactionService');

// @route POST /api/pipeline/run — triggers a compaction pass across all eligible partitions
exports.triggerRun = async (req, res) => {
  try {
    const threshold = parseInt(process.env.COMPACTION_THRESHOLD || '3', 10);
    const result = await runCompaction({ threshold, triggeredBy: req.user._id });
    const run = await PipelineRun.create(result);
    res.status(201).json({ run });
  } catch (err) {
    res.status(500).json({ message: 'Pipeline run failed', error: err.message });
  }
};

// @route GET /api/pipeline/runs — run history
exports.getRunHistory = async (req, res) => {
  try {
    const runs = await PipelineRun.find().populate('triggeredBy', 'name').sort({ createdAt: -1 });
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch run history', error: err.message });
  }
};
