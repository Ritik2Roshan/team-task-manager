import * as projectModel from '../models/projectModel.js';

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

/** Global admin or project owner (for update/delete project). */
export async function requireAdminOrProjectOwner(req, res, next) {
  try {
    if (req.user?.role === 'admin') return next();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project id' });
    const project = await projectModel.findProjectById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner_id === req.user.id) return next();
    return res.status(403).json({ message: 'Admin or project owner required' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
