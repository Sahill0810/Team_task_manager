const { validationResult } = require('express-validator');
const pool = require('../config/db');

// GET /api/projects — list projects for logged-in user
const getProjects = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pm.role, u.name as owner_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      JOIN users u ON u.id = p.owner_id
      WHERE pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({ projects: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/projects — create project
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const projResult = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );
    const project = projResult.rows[0];

    // Auto-add creator as admin
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, req.user.id, 'admin']
    );

    await client.query('COMMIT');
    res.status(201).json({ project: { ...project, role: 'admin' } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/projects/:projectId — get single project
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const projResult = await pool.query(`
      SELECT p.*, pm.role, u.name as owner_name
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `, [projectId, req.user.id]);

    if (projResult.rows.length === 0) return res.status(404).json({ message: 'Project not found' });

    const membersResult = await pool.query(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.role DESC, u.name ASC
    `, [projectId]);

    res.json({ project: projResult.rows[0], members: membersResult.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/projects/:projectId — update project (admin only)
const updateProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET name=$1, description=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [name, description, req.params.projectId]
    );
    res.json({ project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/projects/:projectId — delete project (admin only)
const deleteProject = async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.projectId]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/projects/:projectId/members — add member (admin only)
const addMember = async (req, res) => {
  const { email, role = 'member' } = req.body;
  try {
    const userResult = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = userResult.rows[0];
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [req.params.projectId, user.id, role]
    );

    res.json({ message: 'Member added', member: { ...user, role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/projects/:projectId/members/:userId — remove member (admin only)
const removeMember = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.projectId, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };
