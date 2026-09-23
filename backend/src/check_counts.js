const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const clients = await prisma.client.findMany();
  console.log('--- CLIENTS & COUNTS ---');
  for (const c of clients) {
    const postCount = await prisma.contentItem.count({ where: { clientId: c.id } });
    const schedCount = await prisma.scheduledPost.count({ where: { clientId: c.id } });
    const schedItems = await prisma.scheduledPost.findMany({ where: { clientId: c.id } });
    console.log(`Client [${c.id}] "${c.businessName}": Total ContentItems=${postCount}, ScheduledPosts=${schedCount}`);
    schedItems.forEach(s => console.log(`  - SchedId: ${s.id}, Date: ${s.scheduledAt}, Status: ${s.status}`));
  }

  const allItems = await prisma.contentItem.findMany();
  console.log('\n--- ALL CONTENT ITEMS ---');
  for (const item of allItems) {
    console.log(`Item [${item.id}] "${item.title}" | Client: ${item.clientId} | Status: ${item.status}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
