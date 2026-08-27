const express = require('express');
const router = express.Router();
const { triggerRun, getRunHistory } = require('../controllers/pipelineController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/run', triggerRun);
router.get('/runs', getRunHistory);

module.exports = router;
