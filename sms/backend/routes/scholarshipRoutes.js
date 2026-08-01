const express = require('express');
const router = express.Router();
const {
  createScholarship,
  getScholarships,
  getScholarshipById,
  updateScholarship,
  deleteScholarship,
} = require('../controllers/scholarshipController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getScholarships)
  .post(authorize('admin'), createScholarship);

router.route('/:id')
  .get(getScholarshipById)
  .patch(authorize('admin'), updateScholarship)
  .delete(authorize('admin'), deleteScholarship);

module.exports = router;
