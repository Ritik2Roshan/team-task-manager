import fs from 'fs/promises';
import path from 'path';
import { userHasProjectAccess } from '../utils/projectAccess.js';
import * as projectFileModel from '../models/projectFileModel.js';
import * as projectModel from '../models/projectModel.js';
import { getProjectUploadDir } from '../middleware/projectUpload.js';

function normalizeRelativePath(originalname) {
  if (!originalname || typeof originalname !== 'string') return 'file';
  let p = originalname.replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (p.startsWith('/') || p.includes('..')) return null;
  if (p.length > 1020) p = p.slice(0, 1020);
  return p;
}

export async function listFiles(req, res) {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) return res.status(400).json({ message: 'Invalid project id' });

    const isAdmin = req.user.role === 'admin';
    const ok = await userHasProjectAccess(req.user.id, projectId, isAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const project = await projectModel.findProjectById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const files = await projectFileModel.listByProject(projectId);
    return res.json(files);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function uploadFiles(req, res) {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) return res.status(400).json({ message: 'Invalid project id' });

    const isAdmin = req.user.role === 'admin';
    const ok = await userHasProjectAccess(req.user.id, projectId, isAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const project = await projectModel.findProjectById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!req.files?.length) {
      return res.status(400).json({ message: 'No files uploaded (use field name "files")' });
    }

    for (const file of req.files) {
      const relativePath = normalizeRelativePath(file.originalname);
      if (!relativePath) {
        return res.status(400).json({ message: 'Invalid file path' });
      }
      await projectFileModel.insertFile({
        projectId,
        uploadedBy: req.user.id,
        relativePath,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    }

    const files = await projectFileModel.listByProject(projectId);
    return res.status(201).json({ message: 'Upload complete', files });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function downloadFile(req, res) {
  try {
    const projectId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!Number.isInteger(projectId) || !Number.isInteger(fileId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const isAdmin = req.user.role === 'admin';
    const ok = await userHasProjectAccess(req.user.id, projectId, isAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const row = await projectFileModel.findById(fileId);
    if (!row || row.project_id !== projectId) return res.status(404).json({ message: 'File not found' });

    const abs = path.resolve(path.join(getProjectUploadDir(projectId), row.stored_name));
    const safeName = path.basename(row.relative_path || 'download').replace(/"/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    return res.sendFile(abs, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'File missing on disk' });
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteFile(req, res) {
  try {
    const projectId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!Number.isInteger(projectId) || !Number.isInteger(fileId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const isGlobalAdmin = req.user.role === 'admin';
    const ok = await userHasProjectAccess(req.user.id, projectId, isGlobalAdmin);
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    const row = await projectFileModel.findById(fileId);
    if (!row || row.project_id !== projectId) return res.status(404).json({ message: 'File not found' });

    const project = await projectModel.findProjectById(projectId);
    const isOwner = project && project.owner_id === req.user.id;
    const isUploader = row.uploaded_by === req.user.id;
    if (!isGlobalAdmin && !isOwner && !isUploader) {
      return res.status(403).json({ message: 'Only uploader, project owner, or admin can delete' });
    }

    const abs = path.resolve(path.join(getProjectUploadDir(projectId), row.stored_name));
    try {
      await fs.unlink(abs);
    } catch {
      /* still remove DB row if disk missing */
    }
    await projectFileModel.deleteById(fileId);
    return res.json({ message: 'File removed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
