import pool from '../config/db.js';

export async function createProject({ name, description, ownerId }) {
  const [result] = await pool.query(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
    [name.trim(), description.trim(), ownerId]
  );
  return result.insertId;
}

export async function findProjectById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, u.name AS owner_name, u.email AS owner_email
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function listProjectsForUser(userId, isGlobalAdmin) {
  if (isGlobalAdmin) {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS owner_name
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT DISTINCT p.*, u.name AS owner_name
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE p.owner_id = ? OR pm.user_id IS NOT NULL
     ORDER BY p.created_at DESC`,
    [userId, userId]
  );
  return rows;
}

export async function updateProject(id, { name, description }) {
  await pool.query('UPDATE projects SET name = ?, description = ? WHERE id = ?', [
    name.trim(),
    description.trim(),
    id,
  ]);
}

export async function deleteProject(id) {
  await pool.query('DELETE FROM projects WHERE id = ?', [id]);
}
