import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { SchedulerService } from '../services/SchedulerService';
import { AuditService } from '../services/AuditService';

const router = Router();

// GET all rules
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const rules = await prisma.recurringContentRule.findMany({
      where: clientId ? { clientId: clientId as string } : undefined,
      include: {
        client: { select: { businessName: true, category: true, logo: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single rule
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.recurringContentRule.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    return res.json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create custom recurring rule with visual cycle steps
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, name, startDate, endDate, repeatInfinite, repeatCycles, timezone, steps } = req.body;

    if (!clientId || !name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'clientId, name, and at least one cycle step are required' });
    }

    const rule = await prisma.recurringContentRule.create({
      data: {
        clientId,
        name,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        repeatInfinite: repeatInfinite !== undefined ? repeatInfinite : true,
        repeatCycles: repeatCycles || 1,
        timezone: timezone || 'Asia/Kolkata',
        steps: {
          create: steps.map((s: any, idx: number) => ({
            stepOrder: s.stepOrder !== undefined ? s.stepOrder : idx + 1,
            stepType: s.stepType || 'CONTENT', // CONTENT or GAP
            contentType: s.contentType || 'POST',
            gapDays: s.stepType === 'GAP' ? (s.gapDays || 1) : null,
            targetTime: s.targetTime || '19:00',
            platforms: typeof s.platforms === 'string' ? s.platforms : JSON.stringify(s.platforms || ['INSTAGRAM', 'FACEBOOK']),
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'CREATE_RECURRING_RULE',
      entityType: 'RULE',
      entityId: rule.id,
      clientId,
      details: { name, stepCount: steps.length },
    });

    return res.status(201).json(rule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update rule and steps
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, startDate, endDate, repeatInfinite, repeatCycles, steps } = req.body;

    const rule = await prisma.recurringContentRule.update({
      where: { id },
      data: {
        name,
        isActive,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        repeatInfinite,
        repeatCycles,
      },
    });

    if (steps && Array.isArray(steps)) {
      // Re-create steps
      await prisma.ruleStep.deleteMany({ where: { ruleId: id } });
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await prisma.ruleStep.create({
          data: {
            ruleId: id,
            stepOrder: s.stepOrder !== undefined ? s.stepOrder : i + 1,
            stepType: s.stepType || 'CONTENT',
            contentType: s.contentType || 'POST',
            gapDays: s.stepType === 'GAP' ? (s.gapDays || 1) : null,
            targetTime: s.targetTime || '19:00',
            platforms: typeof s.platforms === 'string' ? s.platforms : JSON.stringify(s.platforms || ['INSTAGRAM', 'FACEBOOK']),
          },
        });
      }
    }

    const updated = await prisma.recurringContentRule.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST project schedule dates for preview
router.post('/:id/project', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, daysLimit } = req.body;

    const projection = await SchedulerService.projectRuleSchedule(id, startDate, daysLimit || 30);
    return res.json({
      ruleId: id,
      totalSlots: projection.length,
      projection,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST auto-fill schedule slots from client's approved queue
router.post('/:id/fill-queue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.recurringContentRule.findUnique({ where: { id: req.params.id } });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const result = await SchedulerService.fillSlotsFromQueue(rule.clientId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE rule
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.ruleStep.deleteMany({ where: { ruleId: req.params.id } });
    await prisma.recurringContentRule.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Rule deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
