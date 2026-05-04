import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';

const priorityColor = {
  low: 'text-slate-400',
  medium: 'text-sky-300',
  high: 'text-rose-300',
};

function userCanManageTask(user, isAdmin, task) {
  if (isAdmin) return true;
  if (!user || !task) return false;
  if (task.project_owner_id != null && Number(task.project_owner_id) === Number(user.id)) return true;
  if (task.my_project_member_role === 'admin') return true;
  return false;
}

export default function TaskCard({ task, onStatusChange, onDelete, canManageOverride }) {
  const { user, isAdmin } = useAuth();
  const canManage =
    typeof canManageOverride === 'boolean' ? canManageOverride : userCanManageTask(user, isAdmin, task);
  const canEditStatus = canManage || task.assigned_to === user?.id;
  const showDelete = typeof onDelete === 'function';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-medium text-white">{task.title}</h4>
          <p className="mt-1 text-sm text-slate-400">{task.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {task.project_name && <span>Project: {task.project_name}</span>}
            {task.assignee_name && <span>Assigned: {task.assignee_name}</span>}
            {task.due_date && <span>Due: {task.due_date}</span>}
            <span className={priorityColor[task.priority] || ''}>Priority: {task.priority}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={task.status} />
          {canEditStatus && onStatusChange && (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          )}
          {showDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="text-xs text-rose-400 hover:text-rose-300"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
