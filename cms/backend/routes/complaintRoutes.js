const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateStatus,
  assignComplaint,
  addComment,
  getStats,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // every complaint route requires login

router.get('/stats/overview', authorize('admin'), getStats);

router.route('/')
  .post(createComplaint)
  .get(getComplaints);

router.route('/:id')
  .get(getComplaintById);

router.patch('/:id/status', authorize('staff', 'admin'), updateStatus);
router.patch('/:id/assign', authorize('admin'), assignComplaint);
router.post('/:id/comments', addComment);

module.exports = router;
