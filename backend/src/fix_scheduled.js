const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brandSetu = await prisma.client.findFirst({
    where: { businessName: { contains: 'BrandSetu' } }
  });
  if (!brandSetu) {
    console.error('BrandSetu client not found');
    return;
  }
  console.log('BrandSetu ID:', brandSetu.id);

  // Update all ContentItems to BrandSetu Digital
  await prisma.contentItem.updateMany({
    data: { clientId: brandSetu.id }
  });

  // Update all ScheduledPosts to BrandSetu Digital
  await prisma.scheduledPost.updateMany({
    data: { clientId: brandSetu.id }
  });

  // Ensure each ContentItem with status 'SCHEDULED' has a ScheduledPost
  const schedItems = await prisma.contentItem.findMany({
    where: { status: 'SCHEDULED' },
    include: { scheduledPosts: true }
  });

  let sa = await prisma.socialAccount.findFirst({
    where: { clientId: brandSetu.id }
  });
  if (!sa) {
    sa = await prisma.socialAccount.create({
      data: {
        clientId: brandSetu.id,
        platform: 'INSTAGRAM',
        accountName: 'BrandSetu Digital (Instagram)',
        accountId: `acc_brandsetu_${Date.now()}`,
        status: 'CONNECTED'
      }
    });
  }

  const targetDates = [
    new Date('2026-09-20T18:00:00.000Z'),
    new Date('2026-09-22T19:30:00.000Z'),
    new Date('2026-09-24T14:00:00.000Z'),
    new Date('2026-09-26T20:00:00.000Z'),
  ];

  let dIdx = 0;
  for (const item of schedItems) {
    const targetDate = targetDates[dIdx % targetDates.length];
    dIdx++;

    if (item.scheduledPosts.length === 0) {
      await prisma.scheduledPost.create({
        data: {
          clientId: brandSetu.id,
          contentItemId: item.id,
          platform: 'INSTAGRAM',
          socialAccountId: sa.id,
          scheduledAt: targetDate,
          timezone: 'Asia/Kolkata',
          status: 'SCHEDULED',
          idempotencyKey: `sched_${item.id}_${Date.now()}`
        }
      });
      console.log(`Created ScheduledPost for "${item.title}" at ${targetDate.toISOString()}`);
    } else {
      await prisma.scheduledPost.update({
        where: { id: item.scheduledPosts[0].id },
        data: {
          clientId: brandSetu.id,
          scheduledAt: targetDate,
          status: 'SCHEDULED'
        }
      });
      console.log(`Updated ScheduledPost for "${item.title}" to ${targetDate.toISOString()}`);
    }
  }

  const finalCount = await prisma.scheduledPost.count({
    where: { clientId: brandSetu.id, status: 'SCHEDULED' }
  });
  console.log('Final ScheduledPosts for BrandSetu Digital:', finalCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
