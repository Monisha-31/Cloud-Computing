const express = require('express');
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplicationById,
  reviewApplication,
  getStats,
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats/overview', authorize('admin'), getStats);

router.route('/')
  .post(authorize('student'), createApplication)
  .get(getApplications);

router.route('/:id').get(getApplicationById);

router.patch('/:id/review', authorize('admin'), reviewApplication);

module.exports = router;
