const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany();
  console.log('Clients count:', clients.length);
  let brandsetuClient = await prisma.client.findFirst({
    where: { businessName: { contains: 'BrandSetu' } }
  });
  if (!brandsetuClient) {
    brandsetuClient = await prisma.client.create({
      data: {
        businessName: 'BrandSetu Digital',
        category: 'Digital Marketing & Social Media Agency',
        location: 'Indore, India',
        approvalRequired: false,
      }
    });
  }
  console.log('BrandSetu Client:', brandsetuClient.id, brandsetuClient.businessName);


  // Find or create social accounts for platforms
  const platforms = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TWITTER'];
  const socialAccounts = {};
  for (const plat of platforms) {
    let sa = await prisma.socialAccount.findFirst({
      where: { clientId: brandsetuClient.id, platform: plat }
    });
    if (!sa) {
      sa = await prisma.socialAccount.create({
        data: {
          clientId: brandsetuClient.id,
          platform: plat,
          accountName: `${brandsetuClient.businessName} (${plat})`,
          accountId: `acc_${plat.toLowerCase()}_${Date.now()}`,
          status: 'CONNECTED'
        }
      });
    }
    socialAccounts[plat] = sa;
  }

  // Find all content items
  const items = await prisma.contentItem.findMany();
  console.log('Total content items:', items.length);

  // Dates for scheduled items: Sep 20, Sep 22, Sep 24, Sep 26, 2026
  const targetDates = [
    new Date('2026-09-20T18:00:00.000Z'),
    new Date('2026-09-22T19:30:00.000Z'),
    new Date('2026-09-24T14:00:00.000Z'),
    new Date('2026-09-26T20:00:00.000Z'),
  ];

  let dateIdx = 0;
  for (const item of items) {
    // If it's not published, make it SCHEDULED so it shows up in upcoming posts
    const schedDate = targetDates[dateIdx % targetDates.length];
    dateIdx++;

    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        clientId: brandsetuClient.id,
        status: 'SCHEDULED'
      }
    });

    // Check if scheduledPost exists
    const existingSched = await prisma.scheduledPost.findFirst({
      where: { contentItemId: item.id }
    });

    if (!existingSched) {
      await prisma.scheduledPost.create({
        data: {
          clientId: brandsetuClient.id,
          contentItemId: item.id,
          platform: 'INSTAGRAM',
          socialAccountId: socialAccounts['INSTAGRAM'].id,
          scheduledAt: schedDate,
          timezone: 'Asia/Kolkata',
          status: 'SCHEDULED',
          idempotencyKey: `init_sched_${item.id}_${Date.now()}`
        }
      });
      console.log(`Created ScheduledPost for "${item.title}" at ${schedDate.toISOString()}`);
    } else {
      await prisma.scheduledPost.update({
        where: { id: existingSched.id },
        data: {
          scheduledAt: schedDate,
          status: 'SCHEDULED'
        }
      });
      console.log(`Updated ScheduledPost for "${item.title}" to ${schedDate.toISOString()}`);
    }
  }

  const allSched = await prisma.scheduledPost.findMany({
    include: { contentItem: true }
  });
  console.log('All scheduled posts count:', allSched.length);
  for (const s of allSched) {
    console.log(`- Post: "${s.contentItem?.title}" | Date: ${s.scheduledAt} | Status: ${s.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
