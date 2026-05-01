const express = require('express');
const { body } = require('express-validator');
const {
  getProjects, createProject, getProject,
  updateProject, deleteProject, addMember, removeMember
} = require('../controllers/projectController');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getProjects);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
], createProject);

router.get('/:projectId', requireProjectMember, getProject);
router.put('/:projectId', requireProjectAdmin, [
  body('name').trim().notEmpty(),
], updateProject);
router.delete('/:projectId', requireProjectAdmin, deleteProject);

router.post('/:projectId/members', requireProjectAdmin, addMember);
router.delete('/:projectId/members/:userId', requireProjectAdmin, removeMember);

module.exports = router;
