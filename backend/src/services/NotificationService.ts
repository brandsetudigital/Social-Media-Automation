import prisma from '../prisma';

export class NotificationService {
  static async create(params: {
    userRole?: 'ADMIN' | 'SMM' | null;
    clientId?: string;
    type: string;
    title: string;
    message: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userRole: params.userRole ?? null,
          clientId: params.clientId ?? null,
          type: params.type,
          title: params.title,
          message: params.message,
          read: false,
        },
      });
    } catch (err) {
      console.error('[NotificationService Error]', err);
      return null;
    }
  }

  static async getNotifications(userRole?: string, clientId?: string, limit = 50) {
    return prisma.notification.findMany({
      where: {
        AND: [
          userRole ? { OR: [{ userRole: null }, { userRole }] } : {},
          clientId ? { OR: [{ clientId: null }, { clientId }] } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: {
          select: { businessName: true },
        },
      },
    });
  }

  static async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  static async markAllAsRead(userRole?: string) {
    return prisma.notification.updateMany({
      where: userRole ? { OR: [{ userRole: null }, { userRole }] } : {},
      data: { read: true },
    });
  }
}
