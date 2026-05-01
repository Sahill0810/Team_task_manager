const express = require('express');
const { body } = require('express-validator');
const { getTasks, createTask, updateTask, deleteTask, getDashboard } = require('../controllers/taskController');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboard);

// Tasks within a project
router.get('/projects/:projectId/tasks', requireProjectMember, getTasks);
router.post('/projects/:projectId/tasks', requireProjectMember, [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], createTask);

router.put('/projects/:projectId/tasks/:taskId', requireProjectMember, updateTask);
router.delete('/projects/:projectId/tasks/:taskId', requireProjectAdmin, deleteTask);

module.exports = router;
