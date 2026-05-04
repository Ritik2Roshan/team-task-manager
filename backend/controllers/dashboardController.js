import * as taskModel from '../models/taskModel.js';
import * as projectModel from '../models/projectModel.js';

export async function getDashboard(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const [stats, projects] = await Promise.all([
      taskModel.getDashboardStats(req.user.id, isAdmin),
      projectModel.listProjectsForUser(req.user.id, isAdmin),
    ]);
    return res.json({
      ...stats,
      projects_count: projects.length,
      recent_projects: projects.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description?.length > 120 ? `${p.description.slice(0, 117)}…` : p.description,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
