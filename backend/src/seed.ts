import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { GoogleDriveService } from './services/GoogleDriveService';

async function main() {
  console.log('Seeding BrandSetu Digital database with realistic agency data...');

  // 1. Clean existing records
  await prisma.publishingLog.deleteMany();
  await prisma.scheduledPost.deleteMany();
  await prisma.contentQueueItem.deleteMany();
  await prisma.ruleStep.deleteMany();
  await prisma.recurringContentRule.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.contentVariant.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.driveFile.deleteMany();
  await prisma.driveFolder.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.clientBrandProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.analyticsMetric.deleteMany();
  await prisma.clientReport.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const smmPassword = await bcrypt.hash('setu@123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'soumitravajpayee@gmail.com',
      passwordHash: adminPassword,
      name: 'Soumitra (Admin)',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const smm = await prisma.user.create({
    data: {
      email: 'brandsetudigital@gmail.com',
      passwordHash: smmPassword,
      name: 'BrandSetu SMM',
      role: 'SMM',
      status: 'ACTIVE',
    },
  });

  console.log('Users created: Admin (soumitravajpayee@gmail.com), SMM (brandsetudigital@gmail.com)');


  // 3. Client 1: ABC Restaurant (Indore)
  const abc = await prisma.client.create({
    data: {
      businessName: 'ABC Restaurant',
      category: 'Restaurant',
      location: 'Indore, Madhya Pradesh',
      phone: '+91 98260 12345',
      email: 'contact@abcrestaurant.in',
      website: 'https://abcrestaurant-indore.com',
      description: 'Premier authentic dining experience in Indore serving royal North Indian curries, Indo-Chinese and gourmet fast food.',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      brandColors: JSON.stringify(['#F59E0B', '#DC2626']),
      timezone: 'Asia/Kolkata',
      approvalRequired: true,
      requiredBufferDays: 10,
      brandProfile: {
        create: {
          services: 'North Indian, Dal Bafla, Chinese, Gourmet Fast Food, Home Delivery, Private Dining',
          products: 'Signature Paneer Tikka, Shahi Thali, Dal Makhani, Crispy Corn, Sizzlers',
          usp: 'Authentic royal flavors prepared fresh with 100% pure desi ghee and farm-fresh ingredients.',
          targetAudience: 'Families, College Students, Foodies, Working Professionals in Vijay Nagar and Palasia',
          brandTone: 'Friendly + Premium',
          language: 'Hindi + English',
          keywords: 'Indore Food, Best Restaurant Vijay Nagar, Family Dining Indore, Pure Veg, Dal Bafla, North Indian',
          hashtags: '#IndoreFoodie #ABCRestaurant #IndoreFoodDiaries #BestFoodIndore #TasteOfIndore #FoodiesOfIndore',
          preferredCta: 'Visit us in Vijay Nagar, Indore or Order Online via Swiggy/Zomato!',
          openingHours: '11:30 AM - 11:30 PM (Mon-Sun)',
          restrictedClaims: 'Do not promise delivery under 10 minutes; avoid clinical health claims',
          importantNotes: 'Highlight cleanliness, cozy ambient seating, and weekend live music sessions.',
        },
      },
    },
  });

  // Setup Drive folders for ABC
  await GoogleDriveService.setupClientFolders(abc.id, 'gdrive_folder_abc_indore_root');

  // Social Accounts for ABC
  const abcFb = await prisma.socialAccount.create({
    data: {
      clientId: abc.id,
      platform: 'FACEBOOK',
      accountName: 'ABC Restaurant Indore - Official Page',
      accountId: 'fb_page_abc_9812',
      status: 'CONNECTED',
      accessToken: 'fb_oauth_token_abc_live',
      lastHealthCheck: new Date(),
    },
  });

  const abcIg = await prisma.socialAccount.create({
    data: {
      clientId: abc.id,
      platform: 'INSTAGRAM',
      accountName: '@abcrestaurant_indore',
      accountId: 'ig_biz_abc_5521',
      status: 'CONNECTED',
      accessToken: 'ig_oauth_token_abc_live',
      lastHealthCheck: new Date(),
    },
  });

  const abcGbp = await prisma.socialAccount.create({
    data: {
      clientId: abc.id,
      platform: 'GOOGLE_BUSINESS',
      accountName: 'ABC Restaurant - Vijay Nagar Branch',
      accountId: 'gbp_loc_abc_1102',
      status: 'CONNECTED',
      accessToken: 'gbp_oauth_token_abc_live',
      lastHealthCheck: new Date(),
    },
  });

  // Recurring Rule for ABC (Matches User's exact focus: Story -> 2 day sequence -> gap -> repeat)
  const abcRule = await prisma.recurringContentRule.create({
    data: {
      clientId: abc.id,
      name: 'ABC Restaurant Weekly Cycle (Story → Post → Post → Rest Day → Repeat)',
      isActive: true,
      startDate: new Date('2026-09-10T00:00:00Z'),
      repeatInfinite: true,
      timezone: 'Asia/Kolkata',
      steps: {
        create: [
          {
            stepOrder: 1,
            stepType: 'CONTENT',
            contentType: 'STORY',
            targetTime: '10:00',
            platforms: JSON.stringify(['INSTAGRAM', 'FACEBOOK']),
          },
          {
            stepOrder: 2,
            stepType: 'CONTENT',
            contentType: 'POST',
            targetTime: '13:00',
            platforms: JSON.stringify(['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS']),
          },
          {
            stepOrder: 3,
            stepType: 'CONTENT',
            contentType: 'POST',
            targetTime: '19:30',
            platforms: JSON.stringify(['INSTAGRAM', 'FACEBOOK']),
          },
          {
            stepOrder: 4,
            stepType: 'GAP',
            gapDays: 1, // Rest day on 4th/5th day!
            platforms: '[]',
          },
        ],
      },
    },
  });

  // 4. Client 2: XYZ Coaching (Delhi)
  const xyz = await prisma.client.create({
    data: {
      businessName: 'XYZ Coaching',
      category: 'Education & Coaching',
      location: 'Delhi (Kalu Sarai & Mukherjee Nagar)',
      phone: '+91 98110 56789',
      email: 'admissions@xyzcoaching.edu',
      website: 'https://xyzcoaching.edu.in',
      description: 'Indias leading coaching institute for IIT-JEE, NEET and Foundation examinations with top national rankers.',
      logo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=200&q=80',
      brandColors: JSON.stringify(['#2563EB', '#059669']),
      timezone: 'Asia/Kolkata',
      approvalRequired: true,
      requiredBufferDays: 10,
      brandProfile: {
        create: {
          services: 'IIT-JEE Main & Advanced, NEET Medical Prep, Olympiads, 9th-12th Foundation',
          products: 'Year-long Classroom Courses, Test Series, All India Mock Exams, Doubt Resolution Pods',
          usp: 'Top rankers in IIT-JEE and NEET for 12 consecutive years with 1-on-1 personal faculty mentorship.',
          targetAudience: 'Science Aspirants (Classes 9-12), Droppers, Concerned Parents',
          brandTone: 'Motivational + Authoritative',
          language: 'English + Hindi',
          keywords: 'IIT JEE Delhi, Best NEET Coaching, Kalu Sarai Coaching, JEE Advanced Prep, Doubt Pods',
          hashtags: '#JEE2027 #NEETPrep #IITJEEAspirants #XYZCoaching #SuccessInScience #DreamIIT',
          preferredCta: 'Book your Free Scholarship Diagnostic Test today! Call +91 98110 56789',
          openingHours: '08:00 AM - 08:00 PM (Mon-Sat)',
          restrictedClaims: 'Do not promise 100% selection guarantees; ensure all rank claims have student roll numbers',
          importantNotes: 'Emphasize student discipline, daily mock tests, and stress management webinars.',
        },
      },
    },
  });

  await GoogleDriveService.setupClientFolders(xyz.id, 'gdrive_folder_xyz_delhi_root');

  const xyzIg = await prisma.socialAccount.create({
    data: {
      clientId: xyz.id,
      platform: 'INSTAGRAM',
      accountName: '@xyzcoaching_delhi',
      accountId: 'ig_xyz_4431',
      status: 'CONNECTED',
      accessToken: 'ig_token_xyz_valid',
      lastHealthCheck: new Date(),
    },
  });

  const xyzFb = await prisma.socialAccount.create({
    data: {
      clientId: xyz.id,
      platform: 'FACEBOOK',
      accountName: 'XYZ Coaching Institute Delhi',
      accountId: 'fb_xyz_9981',
      status: 'CONNECTED',
      accessToken: 'fb_token_xyz_valid',
      lastHealthCheck: new Date(),
    },
  });

  // 5. Client 3: DEF Hospital (Mumbai)
  const def = await prisma.client.create({
    data: {
      businessName: 'DEF Hospital',
      category: 'Healthcare & Multispeciality',
      location: 'Mumbai, Maharashtra',
      phone: '+91 98200 99887',
      email: 'emergency@defhospital.org',
      website: 'https://defhospital.org',
      description: 'NABH and JCI accredited 350-bed multi-speciality tertiary care hospital with 24x7 trauma and emergency care.',
      logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=200&q=80',
      brandColors: JSON.stringify(['#0891B2', '#0D9488']),
      timezone: 'Asia/Kolkata',
      approvalRequired: true,
      requiredBufferDays: 10,
      brandProfile: {
        create: {
          services: 'Cardiology, Orthopedics, Oncology, 24x7 Trauma & Ambulance, Executive Health Checks',
          products: 'Healthy Heart Package, Joint Replacement Clinic, Senior Citizen Wellness Plan',
          usp: 'NABH accredited 24x7 emergency and world-class clinical care with compassionate doctor consultations.',
          targetAudience: 'Families, Senior Citizens, Corporate Employees in Western Mumbai',
          brandTone: 'Empathetic + Authoritative',
          language: 'English + Marathi + Hindi',
          keywords: 'Mumbai Hospital, Best Cardiologist Andheri, 24x7 Emergency Care, NABH Hospital Mumbai',
          hashtags: '#DEFHospital #HealthFirstMumbai #CareWithCompassion #MumbaiDoctors #EmergencyCare24x7',
          preferredCta: 'Call our 24x7 Emergency Helpline or Book an OPD Appointment online.',
          openingHours: '24 Hours Emergency | OPD: 09:00 AM - 07:00 PM',
          restrictedClaims: 'No unverified medical cure claims; include physician discretion disclaimers on health tips',
        },
      },
    },
  });

  await GoogleDriveService.setupClientFolders(def.id, 'gdrive_folder_def_mumbai_root');

  // Simulated account with expired token for realistic reconnect / failure test
  const defIg = await prisma.socialAccount.create({
    data: {
      clientId: def.id,
      platform: 'INSTAGRAM',
      accountName: '@defhospital_mumbai',
      accountId: 'ig_def_1122',
      status: 'EXPIRED',
      accessToken: 'EXPIRED',
      lastHealthCheck: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastError: 'Authentication expired. Reconnection required.',
    },
  });

  const defFb = await prisma.socialAccount.create({
    data: {
      clientId: def.id,
      platform: 'FACEBOOK',
      accountName: 'DEF Superspeciality Hospital Mumbai',
      accountId: 'fb_def_7761',
      status: 'CONNECTED',
      accessToken: 'fb_token_def_valid',
      lastHealthCheck: new Date(),
    },
  });

  // 6. Realistic Content Items across lifecycles
  // Item 1: NEW (In Content Inbox, from Google Drive)
  const driveFile1 = await prisma.driveFile.create({
    data: {
      clientId: abc.id,
      driveFileId: 'drive_abc_weekend_promo_01',
      filename: 'weekend-special-thali.jpg',
      mimeType: 'image/jpeg',
      contentType: 'POST',
      driveUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      folderPath: '/03_Final_Content/Posts',
      fileSize: 2451000,
      status: 'NEW',
    },
  });

  const item1 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      driveFileId: driveFile1.driveFileId,
      title: 'Weekend Special Shahi Thali',
      contentType: 'POST',
      status: 'NEW',
      mediaUrl: driveFile1.driveUrl,
      thumbnailUrl: driveFile1.thumbnailUrl,
      aspectRatio: '1:1',
      source: 'DRIVE',
    },
  });

  // Item 2: READY_FOR_APPROVAL (Submitted by SMM, awaiting Admin)
  const item2 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Monsoon Chai & Crispy Corn Special',
      contentType: 'POST',
      status: 'READY_FOR_APPROVAL',
      mediaUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'DRIVE',
      createdById: smm.id,
      variants: {
        create: [
          {
            platform: 'INSTAGRAM',
            caption: '🌧️ Rainy evenings in Indore hit differently with steaming Chai & golden Crispy Corn at ABC Restaurant! Pure comfort crafted with love. Tag your chai partner below! ☕✨',
            hashtags: '#IndoreMonsoon #IndoreFoodie #ABCRestaurant #ChaiLoversIndore #VijayNagarEats',
            cta: 'Visit us in Vijay Nagar or order online!',
          },
          {
            platform: 'FACEBOOK',
            caption: 'Nothing beats the magic of Indore monsoons! Drop by ABC Restaurant today for freshly brewed Adrak Chai paired with our bestselling Crispy Corn. Bring your family along!',
            cta: 'Call +91 98260 12345 to reserve your table.',
          },
        ],
      },
    },
  });

  await prisma.approvalRequest.create({
    data: {
      contentItemId: item2.id,
      requestedById: smm.id,
      status: 'PENDING',
    },
  });

  // Item 3: APPROVED & in QUEUE for ABC Restaurant
  const item3 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Royal Dal Bafla Culinary Journey Reel',
      contentType: 'REEL',
      status: 'APPROVED',
      mediaUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '9:16',
      durationSec: 28,
      source: 'DRIVE',
      variants: {
        create: [
          {
            platform: 'INSTAGRAM',
            caption: '🔥 Golden, crispy, and soaked in authentic desi ghee! Watch how our chefs handcraft Indore’s royal Dal Bafla daily at ABC Restaurant. One bite is all it takes! 😍',
            hashtags: '#DalBafla #IndoreSpecial #TraditionalFood #ABCRestaurantIndore #DesiGheeFlavors',
            cta: 'Available for Lunch & Dinner in Vijay Nagar!',
          },
        ],
      },
    },
  });

  await prisma.contentQueueItem.create({
    data: {
      clientId: abc.id,
      contentItemId: item3.id,
      contentType: 'REEL',
      priority: 1,
    },
  });

  // Item 4: SCHEDULED on calendar
  const item4 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Chef Special Paneer Tikka Platter',
      contentType: 'POST',
      status: 'SCHEDULED',
      mediaUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'DRIVE',
    },
  });

  const scheduledPost = await prisma.scheduledPost.create({
    data: {
      clientId: abc.id,
      contentItemId: item4.id,
      platform: 'INSTAGRAM',
      socialAccountId: abcIg.id,
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // in 6 hours
      timezone: 'Asia/Kolkata',
      status: 'SCHEDULED',
      idempotencyKey: `sched_seed_abc_tikka_${Date.now()}`,
    },
  });

  // Item 5: PUBLISHED with log
  const item5 = await prisma.contentItem.create({
    data: {
      clientId: abc.id,
      title: 'Grand Family Sunday Feast Announcement',
      contentType: 'POST',
      status: 'PUBLISHED',
      mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'DRIVE',
    },
  });

  const publishedPost = await prisma.scheduledPost.create({
    data: {
      clientId: abc.id,
      contentItemId: item5.id,
      platform: 'INSTAGRAM',
      socialAccountId: abcIg.id,
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000),
      timezone: 'Asia/Kolkata',
      status: 'PUBLISHED',
      idempotencyKey: `sched_seed_abc_published_1`,
    },
  });

  await prisma.publishingLog.create({
    data: {
      scheduledPostId: publishedPost.id,
      clientId: abc.id,
      platform: 'INSTAGRAM',
      status: 'SUCCESS',
      requestPayload: JSON.stringify({ mediaUrl: item5.mediaUrl, captionSnippet: 'Grand Family Sunday Feast' }),
      responseSummary: JSON.stringify({ externalId: 'ig_post_99214_success', status: 'FINISHED' }),
      latencyMs: 1420,
      executedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000),
    },
  });

  // Item 6: FAILED post for DEF Hospital (demonstrates human-readable error & 1-click retry!)
  const item6 = await prisma.contentItem.create({
    data: {
      clientId: def.id,
      title: 'World Heart Day Cardiac Health Checkup',
      contentType: 'POST',
      status: 'FAILED',
      mediaUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80',
      aspectRatio: '1:1',
      source: 'DRIVE',
    },
  });

  const failedPost = await prisma.scheduledPost.create({
    data: {
      clientId: def.id,
      contentItemId: item6.id,
      platform: 'INSTAGRAM',
      socialAccountId: defIg.id,
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      timezone: 'Asia/Kolkata',
      status: 'FAILED',
      idempotencyKey: `sched_seed_def_failed_1`,
      attemptCount: 2,
      lastAttemptAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      lastError: 'Instagram publishing failed because the connected account requires reauthorization.',
    },
  });

  await prisma.publishingLog.create({
    data: {
      scheduledPostId: failedPost.id,
      clientId: def.id,
      platform: 'INSTAGRAM',
      status: 'FAILED',
      errorCode: 'TOKEN_EXPIRED',
      errorMessage: 'Instagram publishing failed because the connected account requires reauthorization.',
      latencyMs: 820,
      executedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  });

  // 7. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userRole: 'ADMIN',
        clientId: abc.id,
        type: 'PENDING_APPROVAL',
        title: 'New Creative Submitted for Approval',
        message: 'Priya Sharma submitted "Monsoon Chai & Crispy Corn Special" for ABC Restaurant.',
        read: false,
      },
      {
        userRole: 'ADMIN',
        clientId: def.id,
        type: 'PUBLISHING_FAILURE',
        title: 'Publishing Failed: DEF Hospital',
        message: 'Instagram publishing failed: Account token expired. Reconnection needed.',
        read: false,
      },
      {
        userRole: 'SMM',
        clientId: abc.id,
        type: 'DRIVE_NEW_CONTENT',
        title: 'New Drive Creative Detected',
        message: 'weekend-special-thali.jpg was detected in ABC Restaurant/03_Final_Content/Posts.',
        read: true,
      },
      {
        userRole: 'ADMIN',
        clientId: abc.id,
        type: 'LOW_BUFFER',
        title: 'Content Buffer Low Alert',
        message: 'ABC Restaurant Reels buffer is only 4 days. 6 more Reels needed to reach 10-day buffer.',
        read: false,
      },
    ],
  });

  // 8. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorName: 'Arjun - BrandSetu Admin',
        actorRole: 'ADMIN',
        action: 'APPROVE_CONTENT',
        entityType: 'CONTENT',
        entityId: item3.id,
        clientId: abc.id,
        detailsJson: JSON.stringify({ title: item3.title, approvedFor: 'REELS_QUEUE' }),
      },
      {
        actorName: 'Priya Sharma - Senior SMM',
        actorRole: 'SMM',
        action: 'SUBMIT_FOR_APPROVAL',
        entityType: 'CONTENT',
        entityId: item2.id,
        clientId: abc.id,
        detailsJson: JSON.stringify({ title: item2.title }),
      },
      {
        actorName: 'Google Drive Sync',
        actorRole: 'SYSTEM',
        action: 'DETECT_DRIVE_FILE',
        entityType: 'DRIVE_FILE',
        entityId: driveFile1.driveFileId,
        clientId: abc.id,
        detailsJson: JSON.stringify({ filename: driveFile1.filename, folder: '/03_Final_Content/Posts' }),
      },
    ],
  });

  // 9. Seed Analytics Metrics
  const sampleDays = ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
  for (const day of sampleDays) {
    await prisma.analyticsMetric.create({
      data: {
        clientId: abc.id,
        platform: 'INSTAGRAM',
        date: day,
        reach: Math.floor(Math.random() * 3000) + 2000,
        impressions: Math.floor(Math.random() * 6000) + 4000,
        likes: Math.floor(Math.random() * 400) + 150,
        comments: Math.floor(Math.random() * 80) + 20,
        shares: Math.floor(Math.random() * 60) + 10,
        saves: Math.floor(Math.random() * 50) + 15,
        engagementRate: 4.8,
      },
    });
  }

  console.log('✅ BrandSetu Digital database successfully seeded with full agency data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
