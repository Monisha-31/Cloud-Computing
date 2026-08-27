const PartitionFile = require('../models/PartitionFile');

// @route GET /api/partitions — one row per partition, with raw vs compacted stats
exports.getPartitionOverview = async (req, res) => {
  try {
    const threshold = parseInt(process.env.COMPACTION_THRESHOLD || '3', 10);
    const files = await PartitionFile.find({ status: { $in: ['raw', 'compacted'] } });

    const byPartition = {};
    files.forEach((f) => {
      if (!byPartition[f.partitionKey]) {
        byPartition[f.partitionKey] = {
          partitionKey: f.partitionKey,
          rawFileCount: 0,
          rawSizeBytes: 0,
          compactedFileCount: 0,
          compactedSizeBytes: 0,
        };
      }
      const entry = byPartition[f.partitionKey];
      if (f.status === 'raw') {
        entry.rawFileCount += 1;
        entry.rawSizeBytes += f.sizeBytes;
      } else {
        entry.compactedFileCount += 1;
        entry.compactedSizeBytes += f.sizeBytes;
      }
    });

    const partitions = Object.values(byPartition)
      .map((p) => ({ ...p, needsCompaction: p.rawFileCount >= threshold }))
      .sort((a, b) => (a.partitionKey < b.partitionKey ? 1 : -1));

    res.json({ threshold, partitions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch partition overview', error: err.message });
  }
};

// @route GET /api/partitions/:key/files  (":key" is partitionKey with slashes, e.g. 2026/08/25)
exports.getPartitionFiles = async (req, res) => {
  try {
    const partitionKey = req.params.key.replace(/--/g, '/'); // see frontend note on encoding slashes
    const files = await PartitionFile.find({ partitionKey }).sort({ createdAt: -1 });
    res.json({ partitionKey, files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch partition files', error: err.message });
  }
};
