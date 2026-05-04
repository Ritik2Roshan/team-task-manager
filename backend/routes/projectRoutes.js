import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdminOrProjectOwner } from '../middleware/roleMiddleware.js';
import { projectUpload } from '../middleware/projectUpload.js';
import * as projectController from '../controllers/projectController.js';
import * as projectFileController from '../controllers/projectFileController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);

router.get('/:id/files', projectFileController.listFiles);
router.post(
  '/:id/upload',
  (req, res, next) => {
    projectUpload.array('files', 500)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'One or more files exceed the size limit' });
        }
        return res.status(400).json({ message: err.message || 'Upload error' });
      }
      next();
    });
  },
  projectFileController.uploadFiles
);
router.get('/:id/files/:fileId/download', projectFileController.downloadFile);
router.delete('/:id/files/:fileId', projectFileController.deleteFile);

router.get('/:id', projectController.getProject);
router.put('/:id', requireAdminOrProjectOwner, projectController.updateProject);
router.delete('/:id', requireAdminOrProjectOwner, projectController.deleteProject);
router.post('/:id/members', projectController.addMember);

export default router;
