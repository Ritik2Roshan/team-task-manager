import * as taskModel from '../models/taskModel.js';
import * as projectModel from '../models/projectModel.js';
import * as projectMemberModel from '../models/projectMemberModel.js';
import { requireNonEmptyString } from '../utils/validation.js';

const TASK_STATUSES = ['todo', 'in_progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];

async function canAccessProject(userId, projectId, isGlobalAdmin) {
  if (isGlobalAdmin) return true;
  const project = await projectModel.findProjectById(projectId);
  if (!project) return false;
  if (project.owner_id === userId) return true;
  const m = await projectMemberModel.isProjectMember(projectId, userId);
  return !!m;
}

/** Global admin, project owner, or project member with role admin — can assign & edit tasks. */
async function getProjectTaskManagerRole(userId, projectId, isGlobalAdmin) {
  if (isGlobalAdmin) return 'manager';
  const project = await projectModel.findProjectById(projectId);
  if (!project) return null;
  if (project.owner_id === userId) return 'manager';
  const m = await projectMemberModel.isProjectMember(projectId, userId);
  if (m?.role === 'admin') return 'manager';
  if (m) return 'member';
  return null;
}

async function validateAssigneeInProject(projectId, assigneeId) {
  if (assigneeId === null || assigneeId === undefined) return true;
  const project = await projectModel.findProjectById(projectId);
  if (!project) return false;
  if (Number(assigneeId) === Number(project.owner_id)) return true;
  const m = await projectMemberModel.isProjectMember(projectId, assigneeId);
  return !!m;
}

export async function listTasks(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const projectId = req.query.project_id ? Number(req.query.project_id) : undefined;
    if (req.query.project_id && !Number.isInteger(projectId)) {
      return res.status(400).json({ message: 'Invalid project_id' });
    }
    if (projectId) {
      const ok = await canAccessProject(req.user.id, projectId, isAdmin);
      if (!ok) return res.status(403).json({ message: 'Access denied' });
    }

    const status = TASK_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const priority = PRIORITIES.includes(req.query.priority) ? req.query.priority : undefined;

    const tasks = await taskModel.listTasks({
      userId: req.user.id,
      isGlobalAdmin: isAdmin,
      projectId: projectId || null,
      status,
      priority,
    });
    return res.json(tasks);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function listOverdue(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const tasks = await taskModel.listOverdueTasks(req.user.id, isAdmin);
    return res.json(tasks);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function getTask(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id' });

    const task = await taskModel.findTaskById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const ok = await canAccessProject(req.user.id, task.project_id, isAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    return res.json(task);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function createTask(req, res) {
  try {
    const {
      title,
      description,
      project_id: projectIdRaw,
      assigned_to: assignedToRaw,
      status = 'todo',
      priority = 'medium',
      due_date: dueDate,
    } = req.body;

    const errTitle = requireNonEmptyString(title, 'Title');
    if (errTitle) return res.status(400).json({ message: errTitle });
    const errDesc = requireNonEmptyString(description, 'Description');
    if (errDesc) return res.status(400).json({ message: errDesc });

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId)) return res.status(400).json({ message: 'project_id is required' });

    if (!TASK_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    const isGlobalAdmin = req.user.role === 'admin';
    const ok = await canAccessProject(req.user.id, projectId, isGlobalAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const managerRole = await getProjectTaskManagerRole(req.user.id, projectId, isGlobalAdmin);
    if (!managerRole) return res.status(403).json({ message: 'Access denied' });

    let assignedTo =
      assignedToRaw === null || assignedToRaw === undefined || assignedToRaw === ''
        ? null
        : Number(assignedToRaw);
    if (assignedTo !== null && !Number.isInteger(assignedTo)) {
      return res.status(400).json({ message: 'Invalid assigned_to' });
    }

    if (managerRole !== 'manager') {
      if (assignedTo !== null && assignedTo !== req.user.id) {
        return res.status(403).json({
          message: 'Only project owners or admins can assign tasks to others',
        });
      }
    }

    if (assignedTo !== null) {
      const validAssignee = await validateAssigneeInProject(projectId, assignedTo);
      if (!validAssignee) {
        return res.status(400).json({ message: 'Assignee must be the owner or a member of this project' });
      }
    }

    const taskId = await taskModel.createTask({
      title,
      description,
      projectId,
      assignedTo,
      createdBy: req.user.id,
      status,
      priority,
      dueDate: dueDate || null,
    });
    const task = await taskModel.findTaskById(taskId);
    return res.status(201).json(task);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateTask(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id' });

    const task = await taskModel.findTaskById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isGlobalAdmin = req.user.role === 'admin';
    const ok = await canAccessProject(req.user.id, task.project_id, isGlobalAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const managerRole = await getProjectTaskManagerRole(req.user.id, task.project_id, isGlobalAdmin);
    const isAssignee = task.assigned_to === req.user.id;
    const isManager = managerRole === 'manager';

    if (!isManager) {
      if (!isAssignee) {
        return res.status(403).json({ message: 'Only assignee or project managers can update this task' });
      }
      const allowedKeys = ['status'];
      const keys = Object.keys(req.body).filter((k) => req.body[k] !== undefined);
      const invalid = keys.filter((k) => !allowedKeys.includes(k));
      if (invalid.length) {
        return res.status(403).json({ message: 'Members may only update task status' });
      }
    }

    const body = req.body;
    const fields = {};
    if (body.title !== undefined) {
      const err = requireNonEmptyString(body.title, 'Title');
      if (err) return res.status(400).json({ message: err });
      fields.title = body.title.trim();
    }
    if (body.description !== undefined) {
      const err = requireNonEmptyString(body.description, 'Description');
      if (err) return res.status(400).json({ message: err });
      fields.description = body.description.trim();
    }
    if (body.assigned_to !== undefined) {
      if (!isManager) {
        return res.status(403).json({ message: 'Only project managers can reassign tasks' });
      }
      fields.assigned_to =
        body.assigned_to === null || body.assigned_to === '' ? null : Number(body.assigned_to);
      if (fields.assigned_to !== null && !Number.isInteger(fields.assigned_to)) {
        return res.status(400).json({ message: 'Invalid assigned_to' });
      }
      if (fields.assigned_to !== null) {
        const validAssignee = await validateAssigneeInProject(task.project_id, fields.assigned_to);
        if (!validAssignee) {
          return res.status(400).json({ message: 'Assignee must be the owner or a member of this project' });
        }
      }
    }
    if (body.status !== undefined) {
      if (!TASK_STATUSES.includes(body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      fields.status = body.status;
    }
    if (body.priority !== undefined) {
      if (!isManager) return res.status(403).json({ message: 'Only project managers can change priority' });
      if (!PRIORITIES.includes(body.priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      fields.priority = body.priority;
    }
    if (body.due_date !== undefined) {
      if (!isManager) return res.status(403).json({ message: 'Only project managers can change due date' });
      fields.due_date = body.due_date === null || body.due_date === '' ? null : body.due_date;
    }

    if (!Object.keys(fields).length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    await taskModel.updateTask(id, fields);
    const updated = await taskModel.findTaskById(id);
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteTask(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid task id' });

    const task = await taskModel.findTaskById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isGlobalAdmin = req.user.role === 'admin';
    const isCreator = task.created_by === req.user.id;
    const managerRole = await getProjectTaskManagerRole(req.user.id, task.project_id, isGlobalAdmin);
    const isManager = managerRole === 'manager';

    if (!isManager && !isCreator) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await taskModel.deleteTask(id);
    return res.json({ message: 'Task deleted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
