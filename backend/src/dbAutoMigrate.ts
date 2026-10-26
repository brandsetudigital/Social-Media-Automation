import prisma from './prisma';

export async function ensureAnalyticsTablesExist(): Promise<void> {
  try {
    // 1. Check if InstagramMediaInsightSnapshot exists and has the required clientId column
    const mediaTableCols = await prisma.$queryRawUnsafe<any[]>(
      `PRAGMA table_info("InstagramMediaInsightSnapshot")`
    ).catch(() => [] as any[]);

    if (mediaTableCols.length > 0) {
      const hasClientId = mediaTableCols.some((col: any) => col.name === 'clientId');
      if (!hasClientId) {
        console.log('[AutoMigrate] Dropping outdated InstagramMediaInsightSnapshot table to apply latest schema...');
        await prisma.$executeRawUnsafe(`DROP TABLE "InstagramMediaInsightSnapshot"`);
      }
    }

    // 2. Create InstagramAccountInsightSnapshot
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InstagramAccountInsightSnapshot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "socialAccountId" TEXT NOT NULL,
        "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "date" TEXT NOT NULL,
        "views" INTEGER,
        "reach" INTEGER,
        "totalInteractions" INTEGER,
        "accountsEngaged" INTEGER,
        "likes" INTEGER,
        "comments" INTEGER,
        "shares" INTEGER,
        "saves" INTEGER,
        "followersCount" INTEGER,
        "followerGrowth" INTEGER,
        "onlineFollowersByHour" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "errorDetails" TEXT,
        CONSTRAINT "InstagramAccountInsightSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "InstagramAccountInsightSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 3. Create InstagramMediaInsightSnapshot
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InstagramMediaInsightSnapshot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "socialAccountId" TEXT NOT NULL,
        "mediaId" TEXT NOT NULL,
        "mediaType" TEXT NOT NULL,
        "caption" TEXT,
        "permalink" TEXT,
        "mediaUrl" TEXT,
        "thumbnailUrl" TEXT,
        "publishedAt" DATETIME NOT NULL,
        "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ageBenchmark" TEXT,
        "views" INTEGER,
        "reach" INTEGER,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "comments" INTEGER NOT NULL DEFAULT 0,
        "shares" INTEGER NOT NULL DEFAULT 0,
        "saves" INTEGER NOT NULL DEFAULT 0,
        "totalInteractions" INTEGER NOT NULL DEFAULT 0,
        "avgWatchTimeSec" REAL,
        "totalWatchTimeSec" REAL,
        "syncStatus" TEXT NOT NULL DEFAULT 'SUCCESS',
        "rawMetricsJson" TEXT,
        CONSTRAINT "InstagramMediaInsightSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "InstagramMediaInsightSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 4. Create PostingTimeRecommendation
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PostingTimeRecommendation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "socialAccountId" TEXT,
        "dayOfWeek" INTEGER NOT NULL,
        "dayName" TEXT NOT NULL,
        "targetHour" INTEGER NOT NULL,
        "targetTime" TEXT NOT NULL,
        "mediaType" TEXT NOT NULL,
        "expectedReachMultiplier" REAL NOT NULL DEFAULT 1.0,
        "confidenceLevel" TEXT NOT NULL,
        "sampleSize" INTEGER NOT NULL DEFAULT 0,
        "avgViews" INTEGER NOT NULL DEFAULT 0,
        "avgEngagement" REAL NOT NULL DEFAULT 0.0,
        "rationale" TEXT NOT NULL,
        "isAudiencePeak" BOOLEAN NOT NULL DEFAULT 0,
        "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "validUntil" DATETIME,
        CONSTRAINT "PostingTimeRecommendation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PostingTimeRecommendation_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 5. Create AnalyticsSyncRun
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsSyncRun" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT,
        "socialAccountId" TEXT,
        "runType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "accountsSynced" INTEGER NOT NULL DEFAULT 0,
        "mediaSynced" INTEGER NOT NULL DEFAULT 0,
        "snapshotsCreated" INTEGER NOT NULL DEFAULT 0,
        "errorsJson" TEXT,
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" DATETIME,
        CONSTRAINT "AnalyticsSyncRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AnalyticsSyncRun_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 6. Indices
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "InstagramMediaInsightSnapshot_mediaId_ageBenchmark_key" ON "InstagramMediaInsightSnapshot"("mediaId", "ageBenchmark");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InstagramMediaInsightSnapshot_clientId_publishedAt_idx" ON "InstagramMediaInsightSnapshot"("clientId", "publishedAt");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InstagramMediaInsightSnapshot_socialAccountId_capturedAt_idx" ON "InstagramMediaInsightSnapshot"("socialAccountId", "capturedAt");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InstagramMediaInsightSnapshot_mediaType_idx" ON "InstagramMediaInsightSnapshot"("mediaType");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InstagramAccountInsightSnapshot_clientId_capturedAt_idx" ON "InstagramAccountInsightSnapshot"("clientId", "capturedAt");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InstagramAccountInsightSnapshot_socialAccountId_date_idx" ON "InstagramAccountInsightSnapshot"("socialAccountId", "date");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostingTimeRecommendation_clientId_dayOfWeek_mediaType_idx" ON "PostingTimeRecommendation"("clientId", "dayOfWeek", "mediaType");
    `);

    console.log('✅ [Database Auto-Migration] Instagram analytics tables verified/created successfully.');
  } catch (err: any) {
    console.warn('[Database Auto-Migration Warning]:', err.message);
  }
}
