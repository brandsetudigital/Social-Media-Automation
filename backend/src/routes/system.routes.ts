import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { NotificationService } from '../services/NotificationService';
import { AuditService } from '../services/AuditService';

const router = Router();

// GET notifications
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const notifications = await NotificationService.getNotifications(
      req.user?.role,
      clientId as string
    );
    return res.json(notifications);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST mark notification as read
router.post('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notif = await NotificationService.markAsRead(req.params.id);
    return res.json(notif);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST mark all as read
router.post('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await NotificationService.markAllAsRead(req.user?.role);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET immutable audit logs
router.get('/audit-logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const logs = await AuditService.getLogs(clientId as string);
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET publishing logs
router.get('/publishing-logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, status } = req.query;

    const logs = await prisma.publishingLog.findMany({
      where: {
        ...(clientId ? { clientId: clientId as string } : {}),
        ...(status ? { status: status as string } : {}),
      },
      include: {
        client: { select: { businessName: true, logo: true } },
        scheduledPost: {
          include: { contentItem: true },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    });

    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
