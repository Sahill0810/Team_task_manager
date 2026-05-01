import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from '../components/Modal';
import './ProjectDetail.css';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [filter, setFilter] = useState('all');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '', assignee_id: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = project?.role === 'admin';

  useEffect(() => {
    fetchAll();
  }, [projectId]);

  const fetchAll = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const openCreateTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '', assignee_id: '' });
    setError('');
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    if (!isAdmin) return;
    setEditTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assignee_id: task.assignee_id || '',
    });
    setError('');
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...taskForm, assignee_id: taskForm.assignee_id || null, due_date: taskForm.due_date || null };
      if (editTask) {
        const res = await api.put(`/projects/${projectId}/tasks/${editTask.id}`, payload);
        setTasks(t => t.map(x => x.id === editTask.id ? res.data.task : x));
      } else {
        const res = await api.post(`/projects/${projectId}/tasks`, payload);
        setTasks(t => [res.data.task, ...t]);
      }
      setShowTaskModal(false);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${task.id}`, { ...task, status });
      setTasks(t => t.map(x => x.id === task.id ? res.data.task : x));
    } catch {}
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      setTasks(t => t.filter(x => x.id !== taskId));
    } catch {}
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email: memberEmail, role: memberRole });
      setMembers(m => [...m.filter(x => x.email !== memberEmail), res.data.member]);
      setMemberEmail('');
      setShowMemberModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setMembers(m => m.filter(x => x.id !== userId));
    } catch {}
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const cols = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div className="project-detail">
      <div className="detail-header">
        <div>
          <div className="breadcrumb" onClick={() => navigate('/projects')}>← Projects</div>
          <h1>{project?.name}</h1>
          {project?.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div className="detail-actions">
          <span className={`tag tag-${project?.role}`}>{project?.role}</span>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreateTask}>+ Task</button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          Tasks <span className="tab-count">{tasks.length}</span>
        </button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Members <span className="tab-count">{members.length}</span>
        </button>
      </div>

      {tab === 'tasks' && (
        <div>
          <div className="filter-bar">
            {['all', 'todo', 'in_progress', 'done'].map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="kanban">
            {Object.entries(cols).map(([status, statusTasks]) => (
              <div key={status} className="kanban-col">
                <div className="kanban-col-header">
                  <span className={`tag tag-${status}`}>{status.replace('_', ' ')}</span>
                  <span className="kanban-count">{statusTasks.length}</span>
                </div>
                <div className="kanban-tasks">
                  {statusTasks.length === 0 && (
                    <div className="kanban-empty">No tasks here</div>
                  )}
                  {statusTasks.map(task => (
                    <div key={task.id} className="task-card" onClick={() => openEditTask(task)}>
                      <div className="task-card-header">
                        <span className={`tag tag-${task.priority}`}>{task.priority}</span>
                        {isAdmin && (
                          <button className="task-delete" onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>✕</button>
                        )}
                      </div>
                      <div className="task-card-title">{task.title}</div>
                      {task.description && <div className="task-card-desc">{task.description}</div>}
                      {task.assignee_name && (
                        <div className="task-assignee">
                          <div className="avatar-sm">{task.assignee_name[0]}</div>
                          <span>{task.assignee_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="task-due-date" style={{
                          color: new Date(task.due_date) < new Date() && task.status !== 'done' ? 'var(--accent2)' : 'var(--text3)'
                        }}>
                          📅 {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {!isAdmin && (
                        <select
                          value={task.status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => handleStatusChange(task, e.target.value)}
                          style={{ marginTop: 8, fontSize: 12 }}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="members-section">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setError(''); setShowMemberModal(true); }} style={{ marginBottom: 16 }}>
              + Add Member
            </button>
          )}
          <div className="members-list">
            {members.map(m => (
              <div key={m.id} className="member-row">
                <div className="avatar">{m.name[0]}</div>
                <div className="member-info">
                  <div className="member-name">{m.name}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <span className={`tag tag-${m.role}`}>{m.role}</span>
                {isAdmin && m.id !== project?.owner_id && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <Modal title={editTask ? 'Edit Task' : 'New Task'} onClose={() => setShowTaskModal(false)}>
          <form onSubmit={handleTaskSubmit} className="modal-form">
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                placeholder="Task title"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="Details..."
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Assignee</label>
                <select value={taskForm.assignee_id} onChange={e => setTaskForm(f => ({ ...f, assignee_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : (editTask ? 'Update' : 'Create Task')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showMemberModal && (
        <Modal title="Add Member" onClose={() => setShowMemberModal(false)}>
          <form onSubmit={handleAddMember} className="modal-form">
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="member@company.com"
                value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)}
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Add Member'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
