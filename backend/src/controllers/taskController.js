const { validationResult } = require('express-validator');
const pool = require('../config/db');

// GET /api/projects/:projectId/tasks
const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee_id } = req.query;

    let query = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email,
        c.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params = [projectId];
    let paramIdx = 2;

    if (status) { query += ` AND t.status = $${paramIdx++}`; params.push(status); }
    if (priority) { query += ` AND t.priority = $${paramIdx++}`; params.push(priority); }
    if (assignee_id) { query += ` AND t.assignee_id = $${paramIdx++}`; params.push(assignee_id); }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/projects/:projectId/tasks
const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, due_date, assignee_id } = req.body;
  const { projectId } = req.params;

  try {
    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description, status || 'todo', priority || 'medium', due_date || null, projectId, assignee_id || null, req.user.id]);

    const task = result.rows[0];

    // Fetch full task with user info
    const fullTask = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = $1
    `, [task.id]);

    res.status(201).json({ task: fullTask.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/projects/:projectId/tasks/:taskId
const updateTask = async (req, res) => {
  const { taskId, projectId } = req.params;
  const { title, description, status, priority, due_date, assignee_id } = req.body;

  try {
    // Members can only update status; admins can update everything
    let query, params;
    if (req.projectRole === 'admin') {
      query = `
        UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, 
          due_date=$5, assignee_id=$6, updated_at=NOW()
        WHERE id=$7 AND project_id=$8 RETURNING *
      `;
      params = [title, description, status, priority, due_date || null, assignee_id || null, taskId, projectId];
    } else {
      // Members can only update status
      query = 'UPDATE tasks SET status=$1, updated_at=NOW() WHERE id=$2 AND project_id=$3 RETURNING *';
      params = [status, taskId, projectId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const fullTask = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = $1
    `, [taskId]);

    res.json({ task: fullTask.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/projects/:projectId/tasks/:taskId (admin only)
const deleteTask = async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1 AND project_id = $2', [req.params.taskId, req.params.projectId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/dashboard — user's dashboard stats
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const myTasks = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.assignee_id = $1
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      LIMIT 20
    `, [userId]);

    const stats = await pool.query(`
      SELECT
        COUNT(CASE WHEN t.assignee_id = $1 THEN 1 END) as my_tasks,
        COUNT(CASE WHEN t.assignee_id = $1 AND t.status = 'done' THEN 1 END) as my_done,
        COUNT(CASE WHEN t.assignee_id = $1 AND t.status = 'in_progress' THEN 1 END) as my_in_progress,
        COUNT(CASE WHEN t.assignee_id = $1 AND t.due_date < NOW() AND t.status != 'done' THEN 1 END) as overdue
      FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
    `, [userId]);

    const projects = await pool.query(`
      SELECT COUNT(*) as project_count FROM project_members WHERE user_id = $1
    `, [userId]);

    res.json({
      stats: { ...stats.rows[0], project_count: projects.rows[0].project_count },
      my_tasks: myTasks.rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, getDashboard };
