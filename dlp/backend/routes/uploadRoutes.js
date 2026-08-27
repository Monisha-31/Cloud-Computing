const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadAndPartition, getUploadHistory } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Files are read into memory, parsed, then written straight into the
// partitioned data-lake folders — no need to keep the original upload around.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.post('/', upload.single('file'), uploadAndPartition);
router.get('/', getUploadHistory);

module.exports = router;
