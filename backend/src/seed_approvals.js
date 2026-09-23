const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brandSetu = await prisma.client.findFirst({
    where: { businessName: { contains: 'BrandSetu' } }
  });
  if (!brandSetu) return;

  const user = await prisma.user.findFirst();

  // Find 2 items to put into READY_FOR_APPROVAL with ApprovalRequest
  const items = await prisma.contentItem.findMany({
    where: { clientId: brandSetu.id },
    take: 2
  });

  for (const item of items) {
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { status: 'READY_FOR_APPROVAL' }
    });

    const existingReq = await prisma.approvalRequest.findFirst({
      where: { contentItemId: item.id }
    });

    if (!existingReq) {
      await prisma.approvalRequest.create({
        data: {
          contentItemId: item.id,
          requestedById: user ? user.id : 'admin',
          status: 'PENDING',
          feedbackNote: JSON.stringify({
            publishMode: 'SCHEDULED',
            scheduledAt: '2026-09-22T14:00:00.000Z',
            platforms: ['INSTAGRAM', 'FACEBOOK']
          })
        }
      });
      console.log(`Created Pending ApprovalRequest for "${item.title}"`);
    } else {
      await prisma.approvalRequest.update({
        where: { id: existingReq.id },
        data: { status: 'PENDING' }
      });
      console.log(`Reset ApprovalRequest to PENDING for "${item.title}"`);
    }
  }

  const pending = await prisma.approvalRequest.count({ where: { status: 'PENDING' } });
  console.log('Total pending approvals in DB:', pending);
}

main().catch(console.error).finally(() => prisma.$disconnect());
