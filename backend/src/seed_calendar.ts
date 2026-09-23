import prisma from './prisma';

async function seedUpcomingCalendarPosts() {
  console.log('Seeding upcoming scheduled posts on Agency Calendar...');

  const clients = await prisma.client.findMany({
    include: {
      socialAccounts: true,
    },
  });

  const abc = clients.find((c) => c.businessName.includes('ABC'));
  const xyz = clients.find((c) => c.businessName.includes('XYZ'));

  if (!abc) {
    console.log('ABC client not found');
    return;
  }

  // 1. Post for 18 Sep 2026 - ABC Restaurant (Instagram & Facebook)
  const item18 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Royal Dal Bafla & Pure Desi Ghee Weekend Special',
      contentType: 'POST',
      status: 'SCHEDULED',
      mediaUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'MANUAL',
      variants: {
        create: [
          {
            platform: 'INSTAGRAM',
            caption: 'Authentic Indori Dal Bafla drenched in 100% pure desi ghee! Come with family this weekend. ✨📍 Vijay Nagar, Indore',
            hashtags: '#IndoreFoodie #ABCRestaurant #DalBafla #TasteOfIndore #WeekendFood',
          },
          {
            platform: 'FACEBOOK',
            caption: 'Looking for the best traditional food in Indore? ABC Restaurant is ready to serve you fresh hot Dal Bafla with signature chutneys. Call +91 98260 12345 to reserve your table.',
            hashtags: '#IndoreRestaurant #PureVeg #FamilyDining',
          },
        ],
      },
    },
  });

  const abcIg = abc.socialAccounts.find((a) => a.platform === 'INSTAGRAM');
  const abcFb = abc.socialAccounts.find((a) => a.platform === 'FACEBOOK');
  const abcGbp = abc.socialAccounts.find((a) => a.platform === 'GOOGLE_BUSINESS');

  if (abcIg) {
    await prisma.scheduledPost.create({
      data: {
        clientId: abc.id,
        contentItemId: item18.id,
        platform: 'INSTAGRAM',
        socialAccountId: abcIg.id,
        scheduledAt: new Date('2026-09-18T12:30:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_abc_18_ig_${Date.now()}`,
      },
    });
  }

  if (abcFb) {
    await prisma.scheduledPost.create({
      data: {
        clientId: abc.id,
        contentItemId: item18.id,
        platform: 'FACEBOOK',
        socialAccountId: abcFb.id,
        scheduledAt: new Date('2026-09-18T12:30:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_abc_18_fb_${Date.now()}`,
      },
    });
  }

  // 2. Post for 20 Sep 2026 - ABC Restaurant (Instagram, Facebook & Google Business Profile)
  const item20 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Sunday Mega Shahi Thali & Live Sizzler Festival',
      contentType: 'POST',
      status: 'SCHEDULED',
      mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'MANUAL',
      variants: {
        create: [
          {
            platform: 'INSTAGRAM',
            caption: 'Grand Shahi Thali feast this Sunday at ABC Restaurant! 30+ items prepared in pure royal tradition. Book early! ✨ #IndoreFood',
            hashtags: '#SundayFeast #IndoreFoodDiaries #ABCRestaurant #IndoreThali',
          },
          {
            platform: 'FACEBOOK',
            caption: 'Celebrate Sunday with your loved ones at ABC Restaurant. Enjoy unlimited Shahi Thali and live sizzling starters.',
            hashtags: '#FamilyDining #SundaySpecial #IndoreFood',
          },
          {
            platform: 'GOOGLE_BUSINESS',
            caption: 'Special Update: Sunday Mega Shahi Thali is live this 20th September at ABC Restaurant Vijay Nagar. Dine-in and Takeaway available.',
          },
        ],
      },
    },
  });

  if (abcIg) {
    await prisma.scheduledPost.create({
      data: {
        clientId: abc.id,
        contentItemId: item20.id,
        platform: 'INSTAGRAM',
        socialAccountId: abcIg.id,
        scheduledAt: new Date('2026-09-20T11:00:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_abc_20_ig_${Date.now()}`,
      },
    });
  }

  if (abcFb) {
    await prisma.scheduledPost.create({
      data: {
        clientId: abc.id,
        contentItemId: item20.id,
        platform: 'FACEBOOK',
        socialAccountId: abcFb.id,
        scheduledAt: new Date('2026-09-20T11:00:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_abc_20_fb_${Date.now()}`,
      },
    });
  }

  if (abcGbp) {
    await prisma.scheduledPost.create({
      data: {
        clientId: abc.id,
        contentItemId: item20.id,
        platform: 'GOOGLE_BUSINESS',
        socialAccountId: abcGbp.id,
        scheduledAt: new Date('2026-09-20T11:00:00.000Z'),
        timezone: 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_abc_20_gbp_${Date.now()}`,
      },
    });
  }

  // 3. Post for 21 Sep 2026 - XYZ Coaching
  if (xyz) {
    const xyzIg = xyz.socialAccounts.find((a) => a.platform === 'INSTAGRAM');
    const item21 = await prisma.contentItem.create({
      data: {
        clientId: xyz.id,
        title: 'New JEE & NEET Crash Course Admissions Open',
        contentType: 'POST',
        status: 'SCHEDULED',
        mediaUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80',
        aspectRatio: '1:1',
        source: 'MANUAL',
      },
    });

    if (xyzIg) {
      await prisma.scheduledPost.create({
        data: {
          clientId: xyz.id,
          contentItemId: item21.id,
          platform: 'INSTAGRAM',
          socialAccountId: xyzIg.id,
          scheduledAt: new Date('2026-09-21T10:00:00.000Z'),
          timezone: 'Asia/Kolkata',
          status: 'SCHEDULED',
          idempotencyKey: `sched_xyz_21_ig_${Date.now()}`,
        },
      });
    }
  }

  console.log('Successfully seeded scheduled calendar posts for 18 Sep, 20 Sep, and 21 Sep 2026!');
}

seedUpcomingCalendarPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
