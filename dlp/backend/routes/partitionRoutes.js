const express = require('express');
const router = express.Router();
const { getPartitionOverview, getPartitionFiles } = require('../controllers/partitionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getPartitionOverview);
router.get('/:key/files', getPartitionFiles);

module.exports = router;
