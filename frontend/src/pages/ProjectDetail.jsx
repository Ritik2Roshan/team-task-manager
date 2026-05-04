import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberUserId, setMemberUserId] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    status: 'todo',
  });

  const projectId = Number(id);

  const load = useCallback(async () => {
    if (!Number.isInteger(projectId)) return;
    setLoading(true);
    setError('');
    try {
      const [projRes, tasksRes, filesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/tasks', { params: { project_id: projectId } }),
        api.get(`/projects/${projectId}/files`).catch(() => ({ data: [] })),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setFiles(Array.isArray(filesRes.data) ? filesRes.data : []);
      if (isAdmin) {
        try {
          const { data } = await api.get('/users');
          setUsers(data);
        } catch {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load project');
      if (e.response?.status === 404) setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = project && user && project.owner_id === user.id;
  const isProjectManager =
    isAdmin ||
    isOwner ||
    (project?.members?.some((m) => m.user_id === user?.id && m.role === 'admin') ?? false);

  const addMember = async (e) => {
    e.preventDefault();
    const uid = Number(memberUserId);
    if (!Number.isInteger(uid) || uid < 1) {
      setError(isAdmin ? 'Select a user' : 'Enter a valid user ID');
      return;
    }
    setError('');
    try {
      await api.post(`/projects/${projectId}/members`, { user_id: uid, role: 'member' });
      setMemberUserId('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member');
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.description.trim()) {
      setError('Task title and description are required');
      return;
    }
    setError('');
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      project_id: projectId,
      status: taskForm.status,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
    };
    if (taskForm.assigned_to) {
      payload.assigned_to = Number(taskForm.assigned_to);
    } else {
      payload.assigned_to = null;
    }
    try {
      await api.post('/tasks', payload);
      setTaskForm({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
        status: 'todo',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create task');
    }
  };

  const handleStatus = async (taskId, status) => {
    setError('');
    try {
      await api.put(`/tasks/${taskId}`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setError('');
    try {
      await api.delete(`/tasks/${taskId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this entire project?')) return;
    setError('');
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const updateProjectMeta = async (e) => {
    e.preventDefault();
    if (!project) return;
    setError('');
    try {
      await api.put(`/projects/${projectId}`, {
        name: project.name,
        description: project.description,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const taskDeleteHandler = (task) => {
    const allowed =
      isProjectManager || task.created_by === user?.id;
    return allowed ? handleDeleteTask : undefined;
  };

  const uploadProjectFiles = async (fileList) => {
    if (!fileList?.length) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      for (const f of fileList) {
        const entryName = f.webkitRelativePath || f.name;
        fd.append('files', f, entryName);
      }
      const { data } = await api.post(`/projects/${projectId}/upload`, fd);
      setFiles(data.files || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    uploadProjectFiles(list);
  };

  const downloadProjectFile = async (fileRow) => {
    const token = localStorage.getItem('token');
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    const url = `${base}/projects/${projectId}/files/${fileRow.id}/download`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileRow.relative_path?.split('/').pop() || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('Could not download file');
    }
  };

  const deleteProjectFile = async (fileRow) => {
    if (!window.confirm(`Remove “${fileRow.relative_path}”?`)) return;
    setError('');
    try {
      await api.delete(`/projects/${projectId}/files/${fileRow.id}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileRow.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-slate-400">Loading…</div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-rose-300">{error || 'Project not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            ← Back to projects
          </button>
          <h1 className="mt-2 text-2xl font-bold text-white">{project.name}</h1>
          <p className="mt-1 text-slate-400">{project.description}</p>
        </div>
        {(isAdmin || isOwner) && (
          <button
            type="button"
            onClick={deleteProject}
            className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
          >
            Delete project
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </div>
      )}

      {(isAdmin || isOwner) && (
        <form onSubmit={updateProjectMeta} className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Edit project</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={project.name}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
            <textarea
              value={project.description}
              onChange={(e) => setProject((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white sm:col-span-2"
            />
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600">
            Save changes
          </button>
        </form>
      )}

      {(isAdmin || isOwner) && (
        <form onSubmit={addMember} className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Add team member</h2>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? 'Pick a user from the directory.'
              : 'Enter the numeric user ID (ask your teammate to share it from their profile URL).'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isAdmin ? (
              <select
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Select user…</option>
                {users
                  .filter((u) => !project.members?.some((m) => m.user_id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                placeholder="User ID"
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            )}
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
              Add
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold text-white">Files & folders</h2>
        <p className="mt-1 text-xs text-slate-500">
          Upload single or multiple files, or choose a folder (preserves paths like{' '}
          <code className="text-slate-400">src/app.js</code>). Any project member can upload.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            {uploading ? 'Uploading…' : 'Upload files'}
            <input
              type="file"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={handleFileInput}
            />
          </label>
          <label className="cursor-pointer rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            {uploading ? '…' : 'Upload folder'}
            <input
              type="file"
              multiple
              {...{ webkitdirectory: '' }}
              className="hidden"
              disabled={uploading}
              onChange={handleFileInput}
            />
          </label>
        </div>
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
          {files.length === 0 ? (
            <li className="text-slate-500">No files yet.</li>
          ) : (
            files.map((f) => {
              const canRemove = isAdmin || project.owner_id === user?.id || f.uploaded_by === user?.id;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <span className="font-mono text-xs text-slate-300">{f.relative_path}</span>
                  <span className="text-xs text-slate-500">
                    {(f.size_bytes / 1024).toFixed(1)} KB · {f.uploaded_by_name}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadProjectFile(f)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Download
                    </button>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => deleteProjectFile(f)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    )}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Members</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {project.members?.map((m) => (
            <li key={m.id}>
              {m.name} — {m.email}{' '}
              <span className="text-slate-500">({m.role})</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Tasks</h2>
        <form onSubmit={createTask} className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="text-sm font-medium text-slate-200">New task</h3>
          <input
            placeholder="Title"
            value={taskForm.title}
            onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
          <textarea
            placeholder="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isProjectManager && (
              <select
                value={taskForm.assigned_to}
                onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Unassigned</option>
                {project.members?.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
            <select
              value={taskForm.status}
              onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
            Add task
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {tasks.length === 0 ? (
            <p className="text-slate-500">No tasks in this project.</p>
          ) : (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={{ ...t, project_name: project.name }}
                canManageOverride={isProjectManager}
                onStatusChange={handleStatus}
                onDelete={taskDeleteHandler(t)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
