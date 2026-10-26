const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AIRAWATI_REAL_VIEWS = {
  '18109580228462637': { views: 58, reach: 58, likes: 7, comments: 1 },  // Blue Silk Saree (Photo 1: 58)
  '18107680418225730': { views: 69, reach: 69, likes: 6, comments: 1 },  // Pink Saree / Saturday Plans (Photo 1: 69)
  '18186560338419084': { views: 60, reach: 60, likes: 7, comments: 1 },  // Mint Green Saree / Beauty of Indian (Photo 1: 60)
  '18099509846368426': { views: 109, reach: 109, likes: 14, comments: 2 }, // Red Saree Front / Elegance Woven (Photo 1: 109)
  '18333182353263167': { views: 105, reach: 105, likes: 11, comments: 1 }, // Red Saree Pose / Tradition Drape (Photo 1: 105)
  '18630184894034200': { views: 139, reach: 139, likes: 15, comments: 2 }, // Yellow Saree FAST Magazine (Photo 1: 139)
  '18167577421417128': { views: 436, reach: 436, likes: 38, comments: 4 }, // Blue Saree Classic Beauty (Photo 1: 436)
  '18116290132790234': { views: 113, reach: 113, likes: 12, comments: 1 }, // Woven Like Poetry Saree (Photo 1: 113)
  '17903509086568804': { views: 373, reach: 373, likes: 32, comments: 3 }, // Silver Saree Drape Reel (Photo 1: 373)
  '18137445067610996': { views: 203, reach: 203, likes: 18, comments: 2 }, // Maroon Handloom Saree (Photo 1: 203)
  '17891865726616086': { views: 471, reach: 471, likes: 45, comments: 5 }, // Temple/Ghat Reel (Photo 1: 471)
  '18107039377966080': { views: 57, reach: 57, likes: 2, comments: 0 },    // Active Story (57)
};

async function main() {
  const client = await prisma.client.findFirst({
    where: { businessName: { contains: 'Airawati' } },
  });
  if (!client) {
    console.error('Airawati client not found!');
    return;
  }
  console.log('Updating snapshots for Airawati (' + client.id + ')...');

  for (const [mediaId, data] of Object.entries(AIRAWATI_REAL_VIEWS)) {
    const snaps = await prisma.instagramMediaInsightSnapshot.findMany({
      where: { mediaId },
      orderBy: { capturedAt: 'desc' },
    });

    if (snaps.length > 0) {
      const primarySnap = snaps[0];
      // Delete any duplicates
      if (snaps.length > 1) {
        const toDelete = snaps.slice(1).map((s) => s.id);
        await prisma.instagramMediaInsightSnapshot.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
      // Update primary snapshot
      await prisma.instagramMediaInsightSnapshot.update({
        where: { id: primarySnap.id },
        data: {
          views: data.views,
          reach: data.reach,
          likes: data.likes,
          comments: data.comments,
          ageBenchmark: 'LATEST',
        },
      });
      console.log(`Updated MediaId ${mediaId}: views=${data.views}, reach=${data.reach}`);
    }
  }

  console.log('\nAll Airawati snapshots successfully updated to exact mobile app views!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
