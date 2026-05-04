import * as projectModel from '../models/projectModel.js';
import * as projectMemberModel from '../models/projectMemberModel.js';

export async function userHasProjectAccess(userId, projectId, isGlobalAdmin) {
  if (isGlobalAdmin) return true;
  const project = await projectModel.findProjectById(projectId);
  if (!project) return false;
  if (project.owner_id === userId) return true;
  const member = await projectMemberModel.isProjectMember(projectId, userId);
  return !!member;
}
