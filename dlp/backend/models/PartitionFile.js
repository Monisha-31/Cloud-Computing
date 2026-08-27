const mongoose = require('mongoose');

const partitionFileSchema = new mongoose.Schema(
  {
    // Hive-style partition key, e.g. "2026/08/25" (year/month/day)
    partitionKey: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    relativePath: { type: String, required: true }, // path under backend/data-lake/
    sizeBytes: { type: Number, required: true },
    recordCount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['raw', 'compacted', 'archived'],
      default: 'raw',
      index: true,
    },
    // Filled in once this file (usually a compacted one) is pushed to S3
    s3Key: { type: String, default: null },
    s3UploadedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartitionFile', partitionFileSchema);
