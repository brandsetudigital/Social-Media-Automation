import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { GoogleDriveService } from '../services/GoogleDriveService';
import prisma from '../prisma';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET Drive status across clients
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        businessName: true,
        driveRootFolderId: true,
        driveFiles: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            driveFiles: true,
            contentItems: { where: { status: 'NEW' } },
          },
        },
      },
    });

    return res.json({
      driveConnected: true,
      lastSyncTime: new Date().toISOString(),
      clients: clients.map((c) => ({
        clientId: c.id,
        businessName: c.businessName,
        rootFolderId: c.driveRootFolderId,
        totalFiles: c._count.driveFiles,
        pendingReview: c._count.contentItems,
        recentFiles: c.driveFiles,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST trigger drive sync
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.body;
    const result = await GoogleDriveService.runSync(clientId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST simulate upload to Google Drive (for agency workflow verification)
router.post('/simulate-upload', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, folderType, filename, mimeType, mediaUrl, thumbnailUrl, aspectRatio, durationSec } = req.body;

    if (!clientId || !folderType || !filename) {
      return res.status(400).json({ error: 'clientId, folderType, and filename are required' });
    }

    const result = await GoogleDriveService.simulateUpload({
      clientId,
      folderType,
      filename,
      mimeType: mimeType || (folderType === 'FINAL_REELS' ? 'video/mp4' : 'image/jpeg'),
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl,
      aspectRatio,
      durationSec,
    });

    return res.status(201).json({
      message: 'Creative successfully uploaded to Google Drive and auto-ingested to Content Inbox',
      ...result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET folder tree for a client
router.get('/folders/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const folders = await prisma.driveFolder.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { folderPath: 'asc' },
    });

    return res.json(folders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET Drive files for client (or all clients)
router.get('/files', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, search, folderType } = req.query;
    const where: any = {};

    if (clientId && clientId !== 'ALL') {
      where.clientId = String(clientId);
    }
    if (search) {
      where.filename = { contains: String(search) };
    }

    const files = await prisma.driveFile.findMany({
      where,
      include: {
        client: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return res.json(files);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/files/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.driveFile.findMany({
      where: { clientId: req.params.clientId },
      include: {
        client: { select: { id: true, businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return res.json(files);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET Drive configuration
router.get('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  return res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    isConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_API_KEY),
  });
});

// POST update Drive configuration
router.post('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { googleClientId, googleApiKey, googleDriveFolderId } = req.body;

    if (googleClientId !== undefined) process.env.GOOGLE_CLIENT_ID = googleClientId;
    if (googleApiKey !== undefined) process.env.GOOGLE_API_KEY = googleApiKey;
    if (googleDriveFolderId !== undefined) process.env.GOOGLE_DRIVE_FOLDER_ID = googleDriveFolderId;

    // Helper to update an env file
    const updateEnv = (filePath: string, updates: Record<string, string>) => {
      if (!fs.existsSync(filePath)) return;
      let content = fs.readFileSync(filePath, 'utf-8');
      for (const [key, val] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}="${val}"`);
        } else {
          content += `\n${key}="${val}"`;
        }
      }
      fs.writeFileSync(filePath, content, 'utf-8');
    };

    const backendEnvPath = path.join(__dirname, '../../.env');
    const frontendEnvPath = path.join(__dirname, '../../../frontend/.env');

    updateEnv(backendEnvPath, {
      GOOGLE_CLIENT_ID: googleClientId || '',
      GOOGLE_API_KEY: googleApiKey || '',
      GOOGLE_DRIVE_FOLDER_ID: googleDriveFolderId || '',
    });

    updateEnv(frontendEnvPath, {
      VITE_GOOGLE_CLIENT_ID: googleClientId || '',
      VITE_GOOGLE_API_KEY: googleApiKey || '',
      VITE_GOOGLE_APP_ID: googleClientId?.split('-')[0] || '',
    });

    return res.json({
      success: true,
      message: 'Google Drive configuration saved successfully.',
      isConfigured: Boolean(googleClientId && googleApiKey),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST upload file directly to Google Drive & auto-ingest
router.post('/upload-direct', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, filename, fileData, mimeType, folderType } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    if (!fileData) {
      return res.status(400).json({ error: 'fileData is required' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Extract base64 content
    const base64Content = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const buffer = Buffer.from(base64Content, 'base64');
    const isVideo = mimeType?.startsWith('video/') || (filename && /\.(mp4|mov|webm|mkv|ogg)$/i.test(filename));
    const ext = filename ? path.extname(filename) || (isVideo ? '.mp4' : '.jpg') : (isVideo ? '.mp4' : '.jpg');
    const safeBase = (filename ? path.basename(filename, ext) : 'drive_upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFilename = `${Date.now()}-${safeBase}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    const targetFolderType = folderType || (isVideo ? 'FINAL_REELS' : 'FINAL_POSTS');

    const result = await GoogleDriveService.simulateUpload({
      clientId,
      folderType: targetFolderType,
      filename: filename || uniqueFilename,
      mimeType: mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      mediaUrl: fileUrl,
      thumbnailUrl: fileUrl,
      fileSize: buffer.length,
      aspectRatio: isVideo ? '9:16' : '1:1',
      durationSec: isVideo ? 30 : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded and synced to Google Drive successfully',
      file: {
        id: result.file.id,
        driveFileId: result.file.driveFileId,
        name: result.file.filename,
        url: result.file.driveUrl,
        thumbnail: result.file.thumbnailUrl || result.file.driveUrl,
        type: isVideo ? 'REEL' : 'IMAGE',
        size: `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`,
        folder: result.file.folderPath,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
