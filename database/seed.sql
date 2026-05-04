USE taskmanager_db;

INSERT INTO users (name, email, password, role)
VALUES (
  'Admin User',
  'admin@taskmanager.local',
  '$2b$10$.1vto7JwYw.8ssDeo8gozehABt7kukjNasv8m/6NAQKwGPEgNmz6.',
  'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';
