import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const StatCard = ({ label, value, color, icon }) => (
  <div className="stat-card" style={{ '--accent-color': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  const stats = data?.stats || {};
  const tasks = data?.my_tasks || [];

  const isOverdue = (task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Here's what's on your plate today</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="My Tasks" value={stats.my_tasks || 0} color="var(--accent)" icon="📋" />
        <StatCard label="In Progress" value={stats.my_in_progress || 0} color="#a78bfa" icon="⚡" />
        <StatCard label="Completed" value={stats.my_done || 0} color="var(--accent3)" icon="✅" />
        <StatCard label="Overdue" value={stats.overdue || 0} color="var(--accent2)" icon="🔥" />
        <StatCard label="Projects" value={stats.project_count || 0} color="#fbbf24" icon="📁" />
      </div>

      <div className="dashboard-section">
        <h2 className="section-title">My Tasks</h2>
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p>No tasks assigned to you yet.</p>
            <Link to="/projects" className="btn btn-primary btn-sm">Browse Projects</Link>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <Link to={`/projects/${task.project_id}`} key={task.id} className="task-row">
                <div className="task-row-left">
                  <span className={`tag tag-${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="task-title">{task.title}</span>
                  {isOverdue(task) && <span className="overdue-badge">Overdue</span>}
                </div>
                <div className="task-row-right">
                  <span className={`tag tag-${task.priority}`}>{task.priority}</span>
                  <span className="task-project">{task.project_name}</span>
                  {task.due_date && (
                    <span className="task-due" style={{ color: isOverdue(task) ? 'var(--accent2)' : 'var(--text3)' }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
