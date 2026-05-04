import pool from '../config/db.js';

export async function addProjectMember(projectId, userId, role = 'member') {
  await pool.query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
    [projectId, userId, role]
  );
}

export async function isProjectMember(projectId, userId) {
  const [rows] = await pool.query(
    'SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return rows[0] || null;
}

export async function listMembersByProject(projectId) {
  const [rows] = await pool.query(
    `SELECT pm.id, pm.user_id, pm.role, u.name, u.email
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY u.name`,
    [projectId]
  );
  return rows;
}

export async function removeProjectMember(projectId, userId) {
  await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [
    projectId,
    userId,
  ]);
}
