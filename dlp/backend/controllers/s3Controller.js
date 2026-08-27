const PartitionFile = require('../models/PartitionFile');
const { isConfigured, uploadFileToS3 } = require('../services/s3Service');

// @route GET /api/s3/status — lets the frontend know whether to show the S3 button at all
exports.getStatus = async (req, res) => {
  res.json({ configured: isConfigured(), bucket: process.env.AWS_S3_BUCKET || null });
};

// @route POST /api/s3/upload/:fileId — push one compacted file up to S3
exports.pushToS3 = async (req, res) => {
  try {
    const fileDoc = await PartitionFile.findById(req.params.fileId);
    if (!fileDoc) return res.status(404).json({ message: 'File not found' });

    const key = await uploadFileToS3(fileDoc);

    fileDoc.s3Key = key;
    fileDoc.s3UploadedAt = new Date();
    await fileDoc.save();

    res.json({ message: 'Uploaded to S3', s3Key: key });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
