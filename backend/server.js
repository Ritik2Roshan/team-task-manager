import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

const clientDistCandidates = [
  path.resolve(process.cwd(), '..', 'frontend', 'dist'),
  path.resolve(process.cwd(), 'frontend', 'dist'),
  path.resolve(process.cwd(), 'dist'),
];
const clientDist = clientDistCandidates.find((candidate) => fs.existsSync(candidate));

if (clientDist) {
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  if (err?.name === 'MulterError') {
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
