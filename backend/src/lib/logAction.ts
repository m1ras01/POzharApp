import { prisma } from './prisma.js';

export async function logAction(
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  details?: string
) {
  await prisma.actionLog.create({
    data: { userId, action, entity, entityId, details },
  });
}
