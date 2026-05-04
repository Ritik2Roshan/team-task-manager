import pool from '../config/db.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role = 'member' }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash, role]
  );
  return result.insertId;
}

export async function listAllUsers() {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY name'
  );
  return rows;
}
