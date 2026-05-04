import pool from '../config/db.js';

export async function insertFile({
  projectId,
  uploadedBy,
  relativePath,
  storedName,
  mimeType,
  sizeBytes,
}) {
  const [result] = await pool.query(
    `INSERT INTO project_files (project_id, uploaded_by, relative_path, stored_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, uploadedBy, relativePath, storedName, mimeType || null, sizeBytes]
  );
  return result.insertId;
}

export async function listByProject(projectId) {
  const [rows] = await pool.query(
    `SELECT pf.id, pf.project_id, pf.relative_path, pf.stored_name, pf.mime_type, pf.size_bytes, pf.created_at,
            pf.uploaded_by, u.name AS uploaded_by_name
     FROM project_files pf
     JOIN users u ON u.id = pf.uploaded_by
     WHERE pf.project_id = ?
     ORDER BY pf.relative_path`,
    [projectId]
  );
  return rows;
}

export async function findById(fileId) {
  const [rows] = await pool.query('SELECT * FROM project_files WHERE id = ?', [fileId]);
  return rows[0] || null;
}

export async function deleteById(fileId) {
  await pool.query('DELETE FROM project_files WHERE id = ?', [fileId]);
}
