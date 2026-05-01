import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Modal from '../components/Modal';
import './Projects.css';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/projects', form);
      setProjects(p => [res.data.project, ...p]);
      setShowModal(false);
      setForm({ name: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const progress = (p) => {
    if (!p.task_count || p.task_count == 0) return 0;
    return Math.round((p.done_count / p.task_count) * 100);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p>No projects yet. Create your first one!</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-header">
                <div className="project-icon">{p.name[0].toUpperCase()}</div>
                <span className={`tag tag-${p.role}`}>{p.role}</span>
              </div>
              <h3 className="project-name">{p.name}</h3>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-stats">
                <span>👥 {p.member_count} members</span>
                <span>📋 {p.task_count} tasks</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress(p)}%` }} />
                </div>
                <span className="progress-label">{progress(p)}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="modal-form">
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="What's this project about?"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? <span className="spinner" /> : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
