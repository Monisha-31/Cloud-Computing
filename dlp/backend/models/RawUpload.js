const mongoose = require('mongoose');

const rawUploadSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    recordCount: { type: Number, required: true },
    partitionsTouched: [{ type: String }], // e.g. ["2026/08/25", "2026/08/26"]
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RawUpload', rawUploadSchema);
