const express = require('express');
const router = express.Router();
const { getStatus, pushToS3 } = require('../controllers/s3Controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/status', getStatus);
router.post('/upload/:fileId', pushToS3);

module.exports = router;
