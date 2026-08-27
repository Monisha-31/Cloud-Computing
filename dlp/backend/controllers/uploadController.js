const RawUpload = require('../models/RawUpload');
const PartitionFile = require('../models/PartitionFile');
const { parseFileContent, groupByDatePartition, writeRawPartitionFile } = require('../services/partitionService');

// @route POST /api/uploads  (multipart/form-data, field name "file")
exports.uploadAndPartition = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded — attach a .json or .csv file' });
    }

    const records = parseFileContent(req.file.buffer, req.file.originalname);
    if (records.length === 0) {
      return res.status(400).json({ message: 'The uploaded file has no records' });
    }

    const grouped = groupByDatePartition(records);
    const sourceLabel = req.file.originalname.replace(/\.[^/.]+$/, '');

    const createdFiles = [];
    for (const [partitionKey, groupRecords] of Object.entries(grouped)) {
      const meta = writeRawPartitionFile(partitionKey, groupRecords, sourceLabel);
      const doc = await PartitionFile.create({ ...meta, status: 'raw' });
      createdFiles.push(doc);
    }

    await RawUpload.create({
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      recordCount: records.length,
      partitionsTouched: Object.keys(grouped),
      uploadedBy: req.user._id,
    });

    res.status(201).json({
      message: `Ingested ${records.length} record(s) into ${createdFiles.length} partition file(s)`,
      partitionsTouched: Object.keys(grouped),
      files: createdFiles,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @route GET /api/uploads — upload history
exports.getUploadHistory = async (req, res) => {
  try {
    const uploads = await RawUpload.find().populate('uploadedBy', 'name').sort({ createdAt: -1 });
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch upload history', error: err.message });
  }
};
