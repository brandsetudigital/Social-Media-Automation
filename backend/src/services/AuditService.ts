import prisma from '../prisma';

export class AuditService {
  static async logAction(params: {
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string;
    clientId?: string;
    details?: any;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorName: params.actorName,
          actorRole: params.actorRole,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          clientId: params.clientId,
          detailsJson: params.details ? JSON.stringify(params.details) : null,
        },
      });
    } catch (err) {
      console.error('[AuditService Error]', err);
      return null;
    }
  }

  static async getLogs(clientId?: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: {
          select: { businessName: true },
        },
      },
    });
  }
}
