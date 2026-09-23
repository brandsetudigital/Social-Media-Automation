import prisma from '../prisma';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';

export interface SimulatedDriveUpload {
  clientId: string;
  folderType: 'FINAL_POSTS' | 'FINAL_REELS' | 'FINAL_STORIES';
  filename: string;
  mimeType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  aspectRatio?: string;
  durationSec?: number;
}

export class GoogleDriveService {
  /**
   * Initializes or gets the standard client Drive folder structure
   */
  static async setupClientFolders(clientId: string, rootFolderId?: string) {
    const rootId = rootFolderId || `drive_root_${clientId}_${Date.now()}`;
    
    // Check if folders already exist
    const existing = await prisma.driveFolder.findMany({ where: { clientId } });
    if (existing.length > 0) return existing;

    const folders = [
      { folderType: 'ROOT', driveFolderId: rootId, folderName: 'Client Root', folderPath: '/' },
      { folderType: 'BRAND_ASSETS', driveFolderId: `f_assets_${clientId}`, folderName: '01_Brand_Assets', folderPath: '/01_Brand_Assets' },
      { folderType: 'RAW_CONTENT', driveFolderId: `f_raw_${clientId}`, folderName: '02_Raw_Content', folderPath: '/02_Raw_Content' },
      { folderType: 'FINAL_CONTENT', driveFolderId: `f_final_${clientId}`, folderName: '03_Final_Content', folderPath: '/03_Final_Content' },
      { folderType: 'FINAL_POSTS', driveFolderId: `f_posts_${clientId}`, folderName: 'Posts', folderPath: '/03_Final_Content/Posts' },
      { folderType: 'FINAL_REELS', driveFolderId: `f_reels_${clientId}`, folderName: 'Reels', folderPath: '/03_Final_Content/Reels' },
      { folderType: 'FINAL_STORIES', driveFolderId: `f_stories_${clientId}`, folderName: 'Stories', folderPath: '/03_Final_Content/Stories' },
      { folderType: 'PUBLISHED_ARCHIVE', driveFolderId: `f_archive_${clientId}`, folderName: '04_Published_Archive', folderPath: '/04_Published_Archive' },
    ];

    await prisma.client.update({
      where: { id: clientId },
      data: { driveRootFolderId: rootId },
    });

    return prisma.$transaction(
      folders.map((f) =>
        prisma.driveFolder.create({
          data: {
            clientId,
            folderType: f.folderType,
            driveFolderId: f.driveFolderId,
            folderName: f.folderName,
            folderPath: f.folderPath,
          },
        })
      )
    );
  }

  /**
   * Determine content type based on folder path and mime type
   */
  static inferContentType(folderPath: string, filename: string): 'POST' | 'REEL' | 'STORY' {
    const lower = folderPath.toLowerCase();
    if (lower.includes('reels')) return 'REEL';
    if (lower.includes('stories') || lower.includes('story')) return 'STORY';
    return 'POST';
  }

  /**
   * Ingest or update a Drive creative file with duplicate protection
   */
  static async ingestFile(params: {
    clientId: string;
    driveFileId: string;
    filename: string;
    mimeType: string;
    folderPath: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    fileSize?: number;
    aspectRatio?: string;
    durationSec?: number;
    driveModifiedAt?: Date;
  }) {
    const { clientId, driveFileId, filename, mimeType, folderPath, mediaUrl, thumbnailUrl, fileSize, aspectRatio, durationSec } = params;

    // Check duplicate
    const existingFile = await prisma.driveFile.findUnique({
      where: { driveFileId },
    });

    const contentType = this.inferContentType(folderPath, filename);

    if (existingFile) {
      // Check if modified
      const updatedFile = await prisma.driveFile.update({
        where: { driveFileId },
        data: {
          filename,
          driveUrl: mediaUrl,
          thumbnailUrl: thumbnailUrl || existingFile.thumbnailUrl,
          driveModifiedAt: params.driveModifiedAt || new Date(),
        },
      });

      // Update associated content item title/media if not yet published
      const contentItem = await prisma.contentItem.findFirst({
        where: { driveFileId, status: { notIn: ['PUBLISHED', 'PUBLISHING'] } },
      });

      if (contentItem) {
        await prisma.contentItem.update({
          where: { id: contentItem.id },
          data: {
            title: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            mediaUrl,
            thumbnailUrl: thumbnailUrl || contentItem.thumbnailUrl,
          },
        });
      }

      return { file: updatedFile, isNew: false };
    }

    // New File Detected!
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error(`Client with ID ${clientId} not found`);

    const newDriveFile = await prisma.driveFile.create({
      data: {
        clientId,
        driveFileId,
        filename,
        mimeType,
        contentType,
        driveUrl: mediaUrl,
        thumbnailUrl: thumbnailUrl || mediaUrl,
        folderPath,
        fileSize: fileSize || 2048576, // default ~2MB
        status: 'NEW',
        driveModifiedAt: new Date(),
      },
    });

    // Automatically create item in Content Inbox
    const contentTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const contentItem = await prisma.contentItem.create({
      data: {
        clientId,
        driveFileId,
        title: contentTitle.charAt(0).toUpperCase() + contentTitle.slice(1),
        contentType,
        status: 'NEW',
        mediaUrl,
        thumbnailUrl: thumbnailUrl || mediaUrl,
        aspectRatio: aspectRatio || (contentType === 'REEL' || contentType === 'STORY' ? '9:16' : '1:1'),
        durationSec: durationSec || (contentType === 'REEL' ? 30 : null),
        source: 'DRIVE',
      },
    });

    // Notify agency team
    await NotificationService.create({
      clientId,
      type: 'DRIVE_NEW_CONTENT',
      title: 'New Drive Creative Detected',
      message: `${filename} (${contentType}) was uploaded to ${client.businessName}'s Final Content folder.`,
    });

    // Audit log
    await AuditService.logAction({
      actorName: 'Google Drive Sync',
      actorRole: 'SYSTEM',
      action: 'DETECT_DRIVE_FILE',
      entityType: 'DRIVE_FILE',
      entityId: driveFileId,
      clientId,
      details: { filename, contentType, folderPath },
    });

    return { file: newDriveFile, contentItem, isNew: true };
  }

  /**
   * Run sync for a client or all clients
   */
  static async runSync(clientId?: string) {
    const clients = clientId
      ? await prisma.client.findMany({ where: { id: clientId } })
      : await prisma.client.findMany();

    let newFilesCount = 0;
    const results = [];

    for (const client of clients) {
      // Ensure folder structure
      await this.setupClientFolders(client.id, client.driveRootFolderId || undefined);

      const pendingReview = await prisma.contentItem.count({
        where: { clientId: client.id, status: { in: ['NEW', 'IN_REVIEW'] } },
      });

      results.push({
        clientId: client.id,
        clientName: client.businessName,
        status: 'CONNECTED',
        lastSync: new Date().toISOString(),
        pendingReview,
      });
    }

    return {
      syncedAt: new Date().toISOString(),
      clients: results,
      totalNewFiles: newFilesCount,
    };
  }

  /**
   * Upload Simulator for agency test workflows
   */
  static async simulateUpload(data: SimulatedDriveUpload) {
    const folderPathMap: Record<string, string> = {
      FINAL_POSTS: '/03_Final_Content/Posts',
      FINAL_REELS: '/03_Final_Content/Reels',
      FINAL_STORIES: '/03_Final_Content/Stories',
    };

    const folderPath = folderPathMap[data.folderType] || '/03_Final_Content/Posts';
    const driveFileId = `drive_sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    return this.ingestFile({
      clientId: data.clientId,
      driveFileId,
      filename: data.filename,
      mimeType: data.mimeType,
      folderPath,
      mediaUrl: data.mediaUrl,
      thumbnailUrl: data.thumbnailUrl,
      fileSize: data.fileSize,
      aspectRatio: data.aspectRatio,
      durationSec: data.durationSec,
    });
  }
}
