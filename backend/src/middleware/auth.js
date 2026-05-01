const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Check if user is admin of a project
const requireProjectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project_id;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this project' });
    }
    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.projectRole = 'admin';
    next();
  } catch (err) {
    next(err);
  }
};

// Check if user is any member of a project
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this project' });
    }

    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireProjectAdmin, requireProjectMember };
