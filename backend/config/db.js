import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function buildConfigFromUrl(connectionUrl) {
  const url = new URL(connectionUrl);
  const sslValue = url.searchParams.get('ssl');
  const useSsl = url.protocol === 'mysqls:' || ['1', 'true', 'yes'].includes(String(sslValue).toLowerCase());

  const config = {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

function getPoolConfig() {
  const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (connectionUrl) {
    return buildConfigFromUrl(connectionUrl);
  }

  return {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const pool = mysql.createPool(getPoolConfig());

export default pool;
