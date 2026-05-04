import pool from '../config/db.js';

function buildTaskVisibilityWhere(userId, isGlobalAdmin, projectId = null) {
  const params = [];
  let where = '1=1';
  if (projectId) {
    where += ' AND t.project_id = ?';
    params.push(projectId);
  }
  if (!isGlobalAdmin) {
    where += ` AND (
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = t.project_id AND pm.user_id = ?
      )
      OR EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.owner_id = ?)
    )`;
    params.push(userId, userId);
  }
  return { where, params };
}

export async function createTask({
  title,
  description,
  projectId,
  assignedTo,
  createdBy,
  status = 'todo',
  priority = 'medium',
  dueDate,
}) {
  const [result] = await pool.query(
    `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      description.trim(),
      projectId,
      assignedTo ?? null,
      createdBy,
      status,
      priority,
      dueDate || null,
    ]
  );
  return result.insertId;
}

export async function findTaskById(id) {
  const [rows] = await pool.query(
    `SELECT t.*,
            u_assign.name AS assignee_name, u_assign.email AS assignee_email,
            u_creator.name AS creator_name
     FROM tasks t
     LEFT JOIN users u_assign ON u_assign.id = t.assigned_to
     JOIN users u_creator ON u_creator.id = t.created_by
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function listTasks({ userId, isGlobalAdmin, projectId, status, priority }) {
  const { where, params } = buildTaskVisibilityWhere(userId, isGlobalAdmin, projectId);
  let sql = `SELECT t.*,
                    p.name AS project_name,
                    p.owner_id AS project_owner_id,
                    pm_self.role AS my_project_member_role,
                    u_assign.name AS assignee_name
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             LEFT JOIN users u_assign ON u_assign.id = t.assigned_to
             LEFT JOIN project_members pm_self ON pm_self.project_id = t.project_id AND pm_self.user_id = ?
             WHERE ${where}`;
  const allParams = [userId, ...params];
  if (status) {
    sql += ' AND t.status = ?';
    allParams.push(status);
  }
  if (priority) {
    sql += ' AND t.priority = ?';
    allParams.push(priority);
  }
  sql += ' ORDER BY t.created_at DESC';
  const [rows] = await pool.query(sql, allParams);
  return rows;
}

export async function listOverdueTasks(userId, isGlobalAdmin) {
  const { where, params } = buildTaskVisibilityWhere(userId, isGlobalAdmin);
  const sql = `SELECT t.*,
                      p.name AS project_name,
                      p.owner_id AS project_owner_id,
                      pm_self.role AS my_project_member_role,
                      u_assign.name AS assignee_name
               FROM tasks t
               JOIN projects p ON p.id = t.project_id
               LEFT JOIN users u_assign ON u_assign.id = t.assigned_to
               LEFT JOIN project_members pm_self ON pm_self.project_id = t.project_id AND pm_self.user_id = ?
               WHERE ${where}
                 AND t.due_date IS NOT NULL
                 AND t.due_date < CURDATE()
                 AND t.status != 'completed'
               ORDER BY t.due_date ASC`;
  const [rows] = await pool.query(sql, [userId, ...params]);
  return rows;
}

export async function updateTask(id, fields) {
  const allowed = [
    'title',
    'description',
    'assigned_to',
    'status',
    'priority',
    'due_date',
  ];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      const col = key === 'assigned_to' ? 'assigned_to' : key;
      sets.push(`${col} = ?`);
      values.push(fields[key]);
    }
  }
  if (!sets.length) return;
  values.push(id);
  await pool.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteTask(id) {
  await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function getDashboardStats(userId, isGlobalAdmin) {
  const { where, params } = buildTaskVisibilityWhere(userId, isGlobalAdmin);
  const baseFrom = `FROM tasks t WHERE ${where}`;

  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS total_tasks,
       SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status != 'completed' THEN 1 ELSE 0 END) AS overdue
     ${baseFrom}`,
    params
  );

  const assignParams = [...params, userId];
  const [[assigned]] = await pool.query(
    `SELECT COUNT(*) AS assigned_to_me
     FROM tasks t
     WHERE ${where}
       AND t.assigned_to = ?`,
    assignParams
  );

  return {
    total_tasks: Number(totals.total_tasks) || 0,
    completed: Number(totals.completed) || 0,
    in_progress: Number(totals.in_progress) || 0,
    overdue: Number(totals.overdue) || 0,
    assigned_to_me: Number(assigned.assigned_to_me) || 0,
  };
}
