import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { AuditService } from '../services/AuditService';
import { BufferHealthService } from '../services/BufferHealthService';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET all clients
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        brandProfile: true,
        socialAccounts: {
          select: { id: true, platform: true, accountName: true, status: true, lastHealthCheck: true, lastError: true },
        },
        _count: {
          select: { contentItems: true, scheduledPosts: true, queueItems: true },
        },
      },
      orderBy: { businessName: 'asc' },
    });

    const bufferStatuses = await BufferHealthService.getBufferStatus();
    const bufferMap = new Map(bufferStatuses.map((b) => [b.clientId, b]));

    const enriched = clients.map((c) => ({
      ...c,
      bufferHealth: bufferMap.get(c.id) || null,
    }));

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single client detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        brandProfile: true,
        socialAccounts: true,
        driveFolders: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        recurringRules: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        _count: {
          select: { contentItems: true, scheduledPosts: true, queueItems: true },
        },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    const bufferStatus = await BufferHealthService.getBufferStatus(client.id);

    return res.json({
      ...client,
      bufferHealth: bufferStatus[0] || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create client business (Admin or permitted SMM)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      businessName,
      category,
      location,
      phone,
      email,
      website,
      description,
      brandColors,
      timezone,
      approvalRequired,
      requiredBufferDays,
      brandProfile,
    } = req.body;

    if (!businessName || !category || !location) {
      return res.status(400).json({ error: 'Business name, category, and location are required' });
    }

    const client = await prisma.client.create({
      data: {
        businessName,
        category,
        location,
        phone,
        email,
        website,
        description,
        brandColors: brandColors ? JSON.stringify(brandColors) : '["#4F46E5", "#06B6D4"]',
        timezone: timezone || 'Asia/Kolkata',
        approvalRequired: approvalRequired !== undefined ? approvalRequired : true,
        requiredBufferDays: requiredBufferDays || 10,
        brandProfile: brandProfile
          ? {
              create: {
                services: brandProfile.services || category,
                products: brandProfile.products || '',
                usp: brandProfile.usp || 'Exceptional quality and reliable service',
                targetAudience: brandProfile.targetAudience || 'Local customers and families',
                brandTone: brandProfile.brandTone || 'Friendly + Premium',
                language: brandProfile.language || 'Hindi + English',
                keywords: brandProfile.keywords || `${category}, ${location}`,
                hashtags: brandProfile.hashtags || `#${businessName.replace(/\s+/g, '')}`,
                preferredCta: brandProfile.preferredCta || 'Contact us today!',
                openingHours: brandProfile.openingHours || '10:00 AM - 10:00 PM',
                restrictedClaims: brandProfile.restrictedClaims || '',
              },
            }
          : undefined,
      },
      include: { brandProfile: true },
    });

    // Auto setup Google Drive folder hierarchy for client
    await GoogleDriveService.setupClientFolders(client.id);

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'CREATE_CLIENT',
      entityType: 'CLIENT',
      entityId: client.id,
      clientId: client.id,
      details: { businessName, category, location },
    });

    return res.status(201).json(client);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update client details
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { businessName, category, location, phone, email, website, description, logo, brandColors, timezone, approvalRequired, requiredBufferDays, status } = req.body;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        businessName,
        category,
        location,
        phone,
        email,
        website,
        description,
        logo: logo !== undefined ? logo : undefined,
        brandColors: brandColors ? (typeof brandColors === 'string' ? brandColors : JSON.stringify(brandColors)) : undefined,
        timezone,
        approvalRequired,
        requiredBufferDays,
        status: status !== undefined ? status : undefined,
      },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'UPDATE_CLIENT',
      entityType: 'CLIENT',
      entityId: id,
      clientId: id,
      details: req.body,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH toggle or update client active/inactive status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const currentClient = await prisma.client.findUnique({ where: { id } });
    if (!currentClient) return res.status(404).json({ error: 'Client not found' });

    const newStatus = status || (currentClient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    const updated = await prisma.client.update({
      where: { id },
      data: { status: newStatus },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'Admin',
      actorRole: req.user?.role || 'ADMIN',
      action: newStatus === 'ACTIVE' ? 'ACTIVATE_CLIENT' : 'DEACTIVATE_CLIENT',
      entityType: 'CLIENT',
      entityId: id,
      clientId: id,
      details: { previousStatus: currentClient.status, newStatus },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE client and permanently wipe all their posts, schedules, and data
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, businessName: true },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Log before delete with undefined clientId so log record persists
    await AuditService.logAction({
      actorName: req.user?.name || 'Admin',
      actorRole: req.user?.role || 'ADMIN',
      action: 'DELETE_CLIENT',
      entityType: 'CLIENT',
      entityId: id,
      clientId: undefined,
      details: { businessName: client.businessName, deletedAt: new Date().toISOString() },
    });

    // Cascade delete: schema relations have onDelete: Cascade for all models linked to Client
    await prisma.client.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: `Client "${client.businessName}" and all associated data have been permanently deleted.`,
    });
  } catch (err: any) {
    console.error('Failed to delete client:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT update brand knowledge / business profile
router.put('/:id/brand-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      services,
      products,
      usp,
      targetAudience,
      brandTone,
      language,
      keywords,
      hashtags,
      preferredCta,
      openingHours,
      restrictedClaims,
      importantNotes,
    } = req.body;

    const profile = await prisma.clientBrandProfile.upsert({
      where: { clientId: id },
      update: {
        services,
        products,
        usp,
        targetAudience,
        brandTone,
        language,
        keywords,
        hashtags,
        preferredCta,
        openingHours,
        restrictedClaims,
        importantNotes,
      },
      create: {
        clientId: id,
        services: services || '',
        products: products || '',
        usp: usp || '',
        targetAudience: targetAudience || '',
        brandTone: brandTone || 'Friendly + Premium',
        language: language || 'Hindi + English',
        keywords: keywords || '',
        hashtags: hashtags || '',
        preferredCta,
        openingHours,
        restrictedClaims,
        importantNotes,
      },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'UPDATE_BRAND_PROFILE',
      entityType: 'BRAND_PROFILE',
      entityId: profile.id,
      clientId: id,
      details: { brandTone, usp, targetAudience },
    });

    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all documents for a client
router.get('/:id/documents', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const documents = await prisma.clientDocument.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(documents);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST upload and attach a document to client knowledge base
router.post('/:id/documents', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, fileUrl, fileType, fileSize, summary } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    const doc = await prisma.clientDocument.create({
      data: {
        clientId: id,
        title: title || 'Client Brand Document',
        fileUrl,
        fileType: fileType || (fileUrl.endsWith('.pdf') ? 'PDF' : fileUrl.endsWith('.txt') ? 'TXT' : 'DOCUMENT'),
        fileSize: fileSize || 0,
        summary: summary || null,
      },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'UPLOAD_CLIENT_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      clientId: id,
      details: { title: doc.title, fileType: doc.fileType },
    });

    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE a client document
router.delete('/:id/documents/:docId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, docId } = req.params;

    const doc = await prisma.clientDocument.findFirst({
      where: { id: docId, clientId: id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await prisma.clientDocument.delete({
      where: { id: docId },
    });

    // Best-effort removal from uploads folder
    if (doc.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../uploads', path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore error
        }
      }
    }

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'DELETE_CLIENT_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: docId,
      clientId: id,
      details: { title: doc.title },
    });

    return res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

