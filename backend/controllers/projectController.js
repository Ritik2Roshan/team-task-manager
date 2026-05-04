import * as projectModel from '../models/projectModel.js';
import * as projectMemberModel from '../models/projectMemberModel.js';
import * as userModel from '../models/userModel.js';
import { requireNonEmptyString } from '../utils/validation.js';
import { userHasProjectAccess } from '../utils/projectAccess.js';

export async function listProjects(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const projects = await projectModel.listProjectsForUser(req.user.id, isAdmin);
    return res.json(projects);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function createProject(req, res) {
  try {
    const { name, description } = req.body;
    const errName = requireNonEmptyString(name, 'Name');
    if (errName) return res.status(400).json({ message: errName });
    const errDesc = requireNonEmptyString(description, 'Description');
    if (errDesc) return res.status(400).json({ message: errDesc });

    const projectId = await projectModel.createProject({
      name,
      description,
      ownerId: req.user.id,
    });
    await projectMemberModel.addProjectMember(projectId, req.user.id, 'admin');

    const project = await projectModel.findProjectById(projectId);
    return res.status(201).json(project);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function getProject(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project id' });

    const isAdmin = req.user.role === 'admin';
    const ok = await userHasProjectAccess(req.user.id, id, isAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const project = await projectModel.findProjectById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const members = await projectMemberModel.listMembersByProject(id);
    return res.json({ ...project, members });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateProject(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project id' });

    const { name, description } = req.body;
    const errName = requireNonEmptyString(name, 'Name');
    if (errName) return res.status(400).json({ message: errName });
    const errDesc = requireNonEmptyString(description, 'Description');
    if (errDesc) return res.status(400).json({ message: errDesc });

    const project = await projectModel.findProjectById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await projectModel.updateProject(id, { name, description });
    const updated = await projectModel.findProjectById(id);
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteProject(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project id' });

    const project = await projectModel.findProjectById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await projectModel.deleteProject(id);
    return res.status(200).json({ message: 'Project deleted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function addMember(req, res) {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) return res.status(400).json({ message: 'Invalid project id' });

    const { user_id: userIdRaw, role: memberRole = 'member' } = req.body;
    const userId = Number(userIdRaw);
    if (!Number.isInteger(userId)) return res.status(400).json({ message: 'user_id is required' });

    const project = await projectModel.findProjectById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isGlobalAdmin = req.user.role === 'admin';
    const isOwner = project.owner_id === req.user.id;
    if (!isGlobalAdmin && !isOwner) {
      return res.status(403).json({ message: 'Only admin or project owner can add members' });
    }

    const target = await userModel.findUserById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const allowed = ['admin', 'member'];
    const r = allowed.includes(memberRole) ? memberRole : 'member';
    await projectMemberModel.addProjectMember(projectId, userId, r);

    const members = await projectMemberModel.listMembersByProject(projectId);
    return res.status(201).json({ message: 'Member added', members });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
