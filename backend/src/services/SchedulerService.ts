import prisma from '../prisma';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';

export interface ProjectedSlot {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  stepOrder: number;
  contentType: string;
  targetTime: string;
  platforms: string[];
  isGap: boolean;
  gapDays?: number;
}

export class SchedulerService {
  /**
   * Projects the exact schedule dates and slots based on a client's recurring rule
   * E.g.: Story (10 Sep) -> Post (11 Sep) -> Post (12 Sep) -> Gap (14 Sep) -> Story (15 Sep repeat)
   */
  static async projectRuleSchedule(ruleId: string, startDateStr?: string, daysLimit = 30): Promise<ProjectedSlot[]> {
    const rule = await prisma.recurringContentRule.findUnique({
      where: { id: ruleId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!rule || rule.steps.length === 0) return [];

    const slots: ProjectedSlot[] = [];
    const baseDate = startDateStr ? new Date(startDateStr) : new Date(rule.startDate);
    let currentDate = new Date(baseDate.getTime());
    let stepIndex = 0;
    const totalSteps = rule.steps.length;
    let daysProjected = 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    while (daysProjected < daysLimit) {
      const step = rule.steps[stepIndex % totalSteps];
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = dayNames[currentDate.getDay()];

      let parsedPlatforms: string[] = ['INSTAGRAM', 'FACEBOOK'];
      try {
        parsedPlatforms = JSON.parse(step.platforms || '["INSTAGRAM", "FACEBOOK"]');
      } catch {
        parsedPlatforms = ['INSTAGRAM', 'FACEBOOK'];
      }

      if (step.stepType === 'GAP') {
        const gap = step.gapDays || 1;
        slots.push({
          date: dateStr,
          dayOfWeek: dayName,
          stepOrder: step.stepOrder,
          contentType: 'REST_DAY',
          targetTime: '-',
          platforms: [],
          isGap: true,
          gapDays: gap,
        });
        // Advance current date by gap days
        currentDate.setDate(currentDate.getDate() + gap);
        daysProjected += gap;
      } else {
        slots.push({
          date: dateStr,
          dayOfWeek: dayName,
          stepOrder: step.stepOrder,
          contentType: step.contentType || 'POST',
          targetTime: step.targetTime || '19:00',
          platforms: parsedPlatforms,
          isGap: false,
        });
        // Advance current date by 1 day for next step
        currentDate.setDate(currentDate.getDate() + 1);
        daysProjected += 1;
      }

      stepIndex++;

      // Check if end date reached
      if (rule.endDate && currentDate > rule.endDate) break;
      if (!rule.repeatInfinite && Math.floor(stepIndex / totalSteps) >= rule.repeatCycles) break;
    }

    return slots;
  }

  /**
   * Automatically fills open recurring schedule slots from the client's approved queue
   */
  static async fillSlotsFromQueue(clientId: string, daysAhead = 14) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        recurringRules: {
          where: { isActive: true },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        socialAccounts: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    if (!client || client.recurringRules.length === 0) {
      return { scheduledCount: 0, message: 'No active recurring rules configured' };
    }

    const activeRule = client.recurringRules[0];
    const slots = await this.projectRuleSchedule(activeRule.id, new Date().toISOString().split('T')[0], daysAhead);

    let scheduledCount = 0;

    for (const slot of slots) {
      if (slot.isGap) continue;

      // Check if slot is already occupied
      const slotStart = new Date(`${slot.date}T${slot.targetTime || '19:00'}:00`);
      if (slotStart < new Date()) continue; // Skip past dates

      const alreadyScheduled = await prisma.scheduledPost.findFirst({
        where: {
          clientId,
          scheduledAt: {
            gte: new Date(`${slot.date}T00:00:00`),
            lte: new Date(`${slot.date}T23:59:59`),
          },
          status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
        },
      });

      if (alreadyScheduled) continue;

      // Find next eligible APPROVED content item for this contentType from queue
      const eligibleQueueItem = await prisma.contentQueueItem.findFirst({
        where: {
          clientId,
          contentType: slot.contentType,
          contentItem: {
            status: 'APPROVED',
            scheduledPosts: {
              none: { status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] } },
            },
          },
        },
        include: { contentItem: true },
        orderBy: { priority: 'asc' },
      });

      if (!eligibleQueueItem) continue; // No approved content ready in queue for this type

      // Match platforms to social accounts
      for (const plat of slot.platforms) {
        const account = client.socialAccounts.find((a) => a.platform === plat);
        if (!account) continue;

        const idempotencyKey = `sched_${client.id}_${eligibleQueueItem.contentItemId}_${plat}_${slotStart.getTime()}`;

        await prisma.scheduledPost.create({
          data: {
            clientId,
            contentItemId: eligibleQueueItem.contentItemId,
            platform: plat,
            socialAccountId: account.id,
            scheduledAt: slotStart,
            timezone: client.timezone,
            status: 'SCHEDULED',
            idempotencyKey,
          },
        });

        scheduledCount++;
      }

      // Mark content item as SCHEDULED
      await prisma.contentItem.update({
        where: { id: eligibleQueueItem.contentItemId },
        data: { status: 'SCHEDULED' },
      });

      // Remove from queue or update status
      await prisma.contentQueueItem.delete({
        where: { id: eligibleQueueItem.id },
      });
    }

    if (scheduledCount > 0) {
      await AuditService.logAction({
        actorName: 'Automation Engine',
        actorRole: 'SYSTEM',
        action: 'AUTO_FILL_SCHEDULE',
        entityType: 'SCHEDULE',
        clientId,
        details: { scheduledCount, daysAhead },
      });
    }

    return { scheduledCount, message: `Successfully populated ${scheduledCount} slots from approved queue` };
  }

  /**
   * Get all scheduled posts across all clients or for a specific client
   */
  static async getCalendarEvents(params: {
    clientId?: string;
    platform?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (params.clientId && params.clientId !== 'ALL' && params.clientId !== 'undefined' && params.clientId !== 'null') {
      where.clientId = params.clientId;
    }
    if (params.platform) where.platform = params.platform;
    if (params.status && params.status !== 'PENDING_APPROVAL') where.status = params.status;

    if (params.startDate || params.endDate) {
      where.scheduledAt = {};
      if (params.startDate) where.scheduledAt.gte = new Date(params.startDate);
      if (params.endDate) where.scheduledAt.lte = new Date(params.endDate);
    }

    // 1. Fetch scheduled / published / failed posts
    let scheduledPosts: any[] = [];
    if (params.status !== 'PENDING_APPROVAL') {
      scheduledPosts = await prisma.scheduledPost.findMany({
        where,
        include: {
          client: {
            select: { id: true, businessName: true, category: true, logo: true, brandColors: true },
          },
          contentItem: {
            include: {
              variants: true,
              approvalRequests: {
                include: {
                  reviewedBy: { select: { id: true, name: true, role: true } },
                },
                orderBy: { requestedAt: 'desc' },
                take: 1,
              },
            },
          },
          socialAccount: {
            select: { id: true, accountName: true, accountId: true, platform: true, status: true },
          },
          publishingLogs: {
            orderBy: { executedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      // Ensure failed posts have a human-readable lastError for clarity
      scheduledPosts = scheduledPosts.map((sp) => {
        if (sp.status === 'FAILED' && !sp.lastError) {
          const logErr = sp.publishingLogs?.[0]?.errorMessage;
          sp.lastError = logErr || 'Meta Graph API Error: Account authentication expired or media format needs verification. Please retry or re-authenticate account.';
        }
        return sp;
      });

      // Ensure ContentItems with status PUBLISHED or SCHEDULED that lack a ScheduledPost record are also represented on the calendar
      const representedItemIds = new Set(scheduledPosts.map((sp) => sp.contentItemId));
      const directContentItems = await prisma.contentItem.findMany({
        where: {
          status: { in: ['PUBLISHED', 'SCHEDULED'] },
          ...(params.clientId && params.clientId !== 'ALL' ? { clientId: params.clientId } : {}),
        },
        include: {
          client: { select: { id: true, businessName: true, category: true, logo: true, brandColors: true } },
          variants: true,
        },
      });

      for (const ci of directContentItems) {
        if (!representedItemIds.has(ci.id)) {
          const plats = (ci.variants && ci.variants.length > 0) ? ci.variants.map((v) => v.platform) : ['INSTAGRAM'];
          for (const plat of plats) {
            if (params.platform && params.platform !== 'ALL' && params.platform !== plat) continue;
            scheduledPosts.push({
              id: `direct_${ci.id}_${plat}`,
              clientId: ci.clientId,
              contentItemId: ci.id,
              platform: plat,
              socialAccountId: `account_${plat.toLowerCase()}`,
              scheduledAt: ci.updatedAt || ci.createdAt,
              publishedAt: ci.status === 'PUBLISHED' ? (ci.updatedAt || ci.createdAt) : null,
              timezone: 'Asia/Kolkata',
              status: ci.status,
              client: ci.client,
              contentItem: ci,
              socialAccount: {
                accountName: ci.client?.businessName || 'BrandSetu',
                status: 'CONNECTED',
              },
            });
          }
        }
      }
    }

    // 2. Also include approval requests (Pending approvals, and Admin changes requested / rejected)
    let pendingEvents: any[] = [];
    if (!params.status || params.status === 'ALL' || params.status === 'PENDING_APPROVAL' || params.status === 'CHANGES_REQUESTED') {
      const targetApprovalStatus =
        params.status === 'CHANGES_REQUESTED'
          ? { in: ['CHANGES_REQUESTED', 'REJECTED'] }
          : params.status === 'PENDING_APPROVAL'
          ? 'PENDING'
          : { in: ['PENDING', 'CHANGES_REQUESTED', 'REJECTED'] };

      const approvalRequests = await prisma.approvalRequest.findMany({
        where: {
          status: targetApprovalStatus,
          contentItem: params.clientId ? { clientId: params.clientId } : undefined,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, role: true } },
          contentItem: {
            include: {
              client: { select: { id: true, businessName: true, category: true, logo: true, brandColors: true } },
              variants: true,
            },
          },
        },
      });

      for (const app of approvalRequests) {
        let meta: any = null;
        try {
          if (app.feedbackNote && app.feedbackNote.trim().startsWith('{')) {
            meta = JSON.parse(app.feedbackNote);
          }
        } catch {
          // not json metadata, regular feedback note
        }

        const scheduledAt = meta?.scheduledAt ? new Date(meta.scheduledAt) : new Date(app.requestedAt);
        const targetPlatforms: string[] = (meta?.platforms && meta.platforms.length > 0)
          ? meta.platforms
          : ['INSTAGRAM'];

        const itemStatus =
          app.status === 'CHANGES_REQUESTED'
            ? 'CHANGES_REQUESTED'
            : app.status === 'REJECTED'
            ? 'REJECTED'
            : 'PENDING_APPROVAL';

        for (const plat of targetPlatforms) {
          if (params.platform && params.platform !== 'ALL' && params.platform !== plat) continue;

          // Check if already represented in scheduledPosts
          const alreadyInScheduled = scheduledPosts.some(
            (sp) => sp.contentItemId === app.contentItemId && sp.platform === plat
          );
          if (alreadyInScheduled) continue;

          pendingEvents.push({
            id: `approval_${app.id}_${plat}`,
            clientId: app.contentItem.clientId,
            contentItemId: app.contentItemId,
            platform: plat,
            socialAccountId: `account_${plat.toLowerCase()}`,
            scheduledAt,
            timezone: 'Asia/Kolkata',
            status: itemStatus,
            approvalRequestId: app.id,
            reviewFeedback: app.feedbackNote,
            reviewedByName: app.reviewedBy?.name || 'Admin',
            reviewedAt: app.reviewedAt,
            client: app.contentItem.client,
            contentItem: {
              ...app.contentItem,
              status: itemStatus,
            },
            socialAccount: {
              accountName: `${app.contentItem.client.businessName} (${itemStatus === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Awaiting Approval'})`,
              status: itemStatus,
            },
          });
        }
      }
    }

    const allEvents = [...scheduledPosts, ...pendingEvents];
    allEvents.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return allEvents;
  }
}
