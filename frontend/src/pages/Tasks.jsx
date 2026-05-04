import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

const DEFAULT_TASK_FORM = {
  title: '',
  description: '',
  project_id: '',
  priority: 'medium',
  status: 'todo',
  due_date: '',
};

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    setProjectsLoading(true);
    setFormError('');
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
      if (data.length > 0) {
        setTaskForm((current) =>
          current.project_id
            ? current
            : {
                ...current,
                project_id: String(data[0].id),
              }
        );
      } else {
        setTaskForm((current) => ({ ...current, project_id: '' }));
      }
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (projectId) params.project_id = projectId;
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    load();
  }, [status, priority, projectId]);

  const resetFilters = () => {
    setStatus('');
    setPriority('');
    setProjectId('');
  };

  const createTask = async (e) => {
    e.preventDefault();
    setError('');
    setFormError('');

    if (!taskForm.project_id) {
      setFormError('Choose a project first.');
      return;
    }
    if (!taskForm.title.trim() || !taskForm.description.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    setCreating(true);
    try {
      await api.post('/tasks', {
        title: taskForm.title,
        description: taskForm.description,
        project_id: Number(taskForm.project_id),
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || undefined,
      });
      setTaskForm((current) => ({
        ...DEFAULT_TASK_FORM,
        project_id: current.project_id,
      }));
      await load();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Could not create task');
    } finally {
      setCreating(false);
    }
  };

  const handleStatus = async (taskId, newStatus) => {
    setError('');
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setError('');
    try {
      await api.delete(`/tasks/${taskId}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All tasks</h1>
          <p className="text-slate-400">Create work here or narrow the list with filters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Clear filters
          </button>
          <Link
            to="/projects"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Open projects
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Create task</h2>
            <p className="text-sm text-slate-400">
              Add a task directly from this view, then manage it from the list below.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {projectsLoading ? 'Loading projects…' : `${projects.length} accessible project(s)`}
          </span>
        </div>

        {formError && (
          <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {formError}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
            You need at least one project before you can create a task here.{' '}
            <Link to="/projects" className="text-indigo-400 hover:text-indigo-300">
              Go to projects
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={createTask} className="mt-4 grid gap-3">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <input
                value={taskForm.title}
                onChange={(e) => setTaskForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Task title"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
              />
              <select
                value={taskForm.project_id}
                onChange={(e) => setTaskForm((current) => ({ ...current, project_id: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm((current) => ({ ...current, description: e.target.value }))
              }
              rows={3}
              placeholder="Describe the task"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((current) => ({ ...current, priority: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm((current) => ({ ...current, status: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm((current) => ({ ...current, due_date: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Add task'}
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="">Any status</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="">Any priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-slate-400">Loading…</p>
      ) : (
        <div className="mt-8 space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-slate-400">
              <p>No tasks match the current filters.</p>
              <p className="mt-1 text-sm text-slate-500">
                Clear the filters or create a task above to get started.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Clear filters
                </button>
                <Link
                  to="/projects"
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Browse projects
                </Link>
              </div>
            </div>
          ) : (
            tasks.map((t) => {
              const isProjectManager =
                isAdmin ||
                (t.project_owner_id != null && Number(t.project_owner_id) === Number(user?.id)) ||
                t.my_project_member_role === 'admin';
              const canRemove = isProjectManager || t.created_by === user?.id;
              return (
                <TaskCard
                  key={t.id}
                  task={t}
                  onStatusChange={handleStatus}
                  onDelete={canRemove ? handleDelete : undefined}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
