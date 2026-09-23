import prisma from './prisma';

export async function syncScheduledPosts() {
  console.log('🔄 [Sync Engine] Checking scheduled ContentItems vs ScheduledPosts...');

  const scheduledItems = await prisma.contentItem.findMany({
    where: { status: 'SCHEDULED' },
    include: {
      client: true,
      scheduledPosts: true,
      variants: true,
    },
  });

  console.log(`Found ${scheduledItems.length} ContentItems with status SCHEDULED.`);

  const sampleDates = [
    new Date('2026-09-20T11:00:00.000Z'),
    new Date('2026-09-20T18:30:00.000Z'),
    new Date('2026-09-21T10:00:00.000Z'),
    new Date('2026-09-22T14:00:00.000Z'),
    new Date('2026-09-23T16:30:00.000Z'),
    new Date('2026-09-24T12:00:00.000Z'),
    new Date('2026-09-25T19:00:00.000Z'),
    new Date('2026-09-26T15:00:00.000Z'),
    new Date('2026-09-27T17:30:00.000Z'),
    new Date('2026-09-28T13:00:00.000Z'),
    new Date('2026-09-29T18:00:00.000Z'),
  ];

  let dateIndex = 0;

  for (const item of scheduledItems) {
    if (item.scheduledPosts.length === 0) {
      // Pick platform from variant or default INSTAGRAM
      const platform = item.variants[0]?.platform || 'INSTAGRAM';

      // Find or create social account
      let soc = await prisma.socialAccount.findFirst({
        where: { clientId: item.clientId, platform, status: 'CONNECTED' },
      });

      if (!soc) {
        soc = await prisma.socialAccount.create({
          data: {
            clientId: item.clientId,
            platform,
            accountName: `@${item.client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            accountId: `${platform.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            status: 'CONNECTED',
            accessToken: `oauth_${platform.toLowerCase()}_token`,
          },
        });
      }

      const scheduledAt = sampleDates[dateIndex % sampleDates.length];
      dateIndex++;

      await prisma.scheduledPost.create({
        data: {
          clientId: item.clientId,
          contentItemId: item.id,
          platform,
          socialAccountId: soc.id,
          scheduledAt,
          timezone: item.client.timezone || 'Asia/Kolkata',
          status: 'SCHEDULED',
          idempotencyKey: `sched_sync_${item.id}_${platform}_${scheduledAt.getTime()}`,
        },
      });

      console.log(`✅ Created ScheduledPost for "${item.title}" on ${scheduledAt.toISOString()}`);
    }
  }

  const finalContentScheduled = await prisma.contentItem.count({ where: { status: 'SCHEDULED' } });
  const finalPostScheduled = await prisma.scheduledPost.count({ where: { status: 'SCHEDULED' } });

  console.log(`🎉 [Sync Finished] ContentItems SCHEDULED: ${finalContentScheduled}, ScheduledPosts SCHEDULED: ${finalPostScheduled}`);
}

if (require.main === module) {
  syncScheduledPosts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
