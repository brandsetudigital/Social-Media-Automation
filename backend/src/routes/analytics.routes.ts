import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/AnalyticsService';
import { BufferHealthService } from '../services/BufferHealthService';

const router = Router();

// GET agency analytics overview
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' ? (clientId as string) : undefined;
    const overview = await AnalyticsService.getOverview(cleanClientId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET 10-day content buffer health
router.get('/buffer-health', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' ? (clientId as string) : undefined;
    const buffer = await BufferHealthService.getBufferStatus(cleanClientId);
    return res.json(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET client monthly report
router.get('/report/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { month, year } = req.query;

    const report = await AnalyticsService.generateMonthlyReport(
      clientId,
      (month as string) || 'September',
      Number(year) || 2026
    );

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
