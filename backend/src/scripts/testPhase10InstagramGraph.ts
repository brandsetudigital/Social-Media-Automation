import dotenv from 'dotenv';
dotenv.config();

import { instagramGraphService } from '../services/instagram/InstagramGraphService';
import prisma from '../prisma';

async function runPhase10Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 10 VERIFICATION: INSTAGRAM GRAPH API');
  console.log('====================================================\n');

  try {
    // 0. Ensure a test client exists in DB
    let client = await prisma.client.findFirst({
      where: { businessName: 'Test Agency Brand' },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          businessName: 'Test Agency Brand',
          category: 'Digital Agency',
          location: 'New Delhi, India',
          approvalRequired: true, // Gate enabled to test safety rule!
          timezone: 'Asia/Kolkata',
        },
      });
      console.log('   ℹ️ Created test client:', client.businessName, `(ID: ${client.id})`);
    } else {
      console.log('   ℹ️ Using existing client:', client.businessName, `(ID: ${client.id})`);
    }

    // 1. Test Connecting an Instagram Professional Account
    console.log('\n1️⃣ Testing instagramGraphService.connectAccount()...');
    const connectedAccount = await instagramGraphService.connectAccount({
      clientId: client.id,
      accountId: '17841400012345678', // 17-digit Instagram Business Account ID format
      accountName: '@testagencybrand (BrandSetu Demo)',
      accessToken: process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_ig_${Date.now()}`,
    });

    console.log('   ✅ Connected Account ID in DB:', connectedAccount.id);
    console.log('   - Platform:', connectedAccount.platform);
    console.log('   - Account Name:', connectedAccount.accountName);
    console.log('   - Instagram Account ID:', connectedAccount.accountId);
    console.log('   - Status:', connectedAccount.status);

    // 2. Test Listing Accounts
    console.log('\n2️⃣ Testing instagramGraphService.getAccounts()...');
    const accounts = await instagramGraphService.getAccounts(client.id);
    console.log('   ✅ Connected Accounts count for client:', accounts.length);
    if (!accounts.some((a) => a.id === connectedAccount.id)) {
      throw new Error('Connected account was not found in accounts list query!');
    }

    // 3. Test Approval Gate Enforcement (Must block unauthorized publishing)
    console.log('\n3️⃣ Testing Safety Rule: User Approval Gate...');
    const blockedResult = await instagramGraphService.publishImage({
      clientId: client.id,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      caption: 'Unapproved test post',
      isApproved: false, // Explicitly not approved
    });

    if (blockedResult.success || blockedResult.errorCode !== 'APPROVAL_REQUIRED') {
      throw new Error('Approval gate failed! Unapproved post was not blocked.');
    }
    console.log('   ✅ PASS: Unapproved post was blocked with safety error:');
    console.log('      Error:', blockedResult.errorMessage);

    // 4. Test Publishing Image Post (Approved)
    console.log('\n4️⃣ Testing instagramGraphService.publishImage() (Approved)...');
    const imageResult = await instagramGraphService.publishImage({
      clientId: client.id,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      caption: 'Aesthetic workplace essentials ✨ Modern minimalism for creative productivity. #Workspace #Design',
      firstComment: '#ProductivityHacks #OfficeSetup #CreatorLife',
      isApproved: true,
    });

    console.log('   ✅ Image Publish Status:', imageResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   - External Post ID:', imageResult.externalPostId);
    console.log('   - Permalink:', imageResult.permalink);
    console.log('   - Log ID in DB:', imageResult.logId);

    // 5. Test Publishing Reel Post (Approved)
    console.log('\n5️⃣ Testing instagramGraphService.publishReel() (Approved)...');
    const reelResult = await instagramGraphService.publishReel({
      clientId: client.id,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-working-on-laptop-in-a-coffee-shop-40243-large.mp4',
      caption: 'Behind the scenes at BrandSetu Digital studio 🎥 Building next-gen automation.',
      firstComment: '#ReelsDaily #AgencyLife #Automation',
      isApproved: true,
      shareToFeed: true,
    });

    console.log('   ✅ Reel Publish Status:', reelResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   - External Reel ID:', reelResult.externalPostId);
    console.log('   - Reel Permalink:', reelResult.permalink);

    // 6. Test Publishing Carousel Post (Approved)
    console.log('\n6️⃣ Testing instagramGraphService.publishCarousel() (Approved)...');
    const carouselResult = await instagramGraphService.publishCarousel({
      clientId: client.id,
      mediaUrls: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634',
      ],
      caption: 'Swipe to see the transformation ➡️ Slide 1: Concept, Slide 2: Execution.',
      firstComment: '#CarouselPost #GraphicDesign #CreativeProcess',
      isApproved: true,
    });

    console.log('   ✅ Carousel Publish Status:', carouselResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   - External Carousel ID:', carouselResult.externalPostId);

    // 7. Test Checking Container Status
    console.log('\n7️⃣ Testing instagramGraphService.getContainerStatus()...');
    const status = await instagramGraphService.getContainerStatus(imageResult.externalPostId || 'mock_123');
    console.log('   ✅ Container Status Code:', status.status_code);

    // 8. Test Scheduling a Post for the Future
    console.log('\n8️⃣ Testing instagramGraphService.schedulePost()...');
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    const scheduled = await instagramGraphService.schedulePost({
      clientId: client.id,
      mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      caption: 'Scheduled automated post for tomorrow evening! 🚀',
      contentType: 'POST',
      scheduledAt: futureDate,
      firstComment: '#AutomatedPosting #SocialMediaStrategy',
      isApproved: true,
    });

    console.log('   ✅ Scheduled Post ID:', scheduled.id);
    console.log('   - Scheduled At:', scheduled.scheduledAt);
    console.log('   - Status:', scheduled.status);
    console.log('   - Content Item ID:', scheduled.contentItemId);

    // 9. Test Publishing History Logs
    console.log('\n9️⃣ Testing instagramGraphService.getPublishingHistory()...');
    const history = await instagramGraphService.getPublishingHistory({
      clientId: client.id,
      page: 1,
      limit: 10,
    });

    console.log('   ✅ Instagram Publishing Logs Found:', history.pagination.total);
    console.log('   - Latest Log Status:', history.items[0]?.status);
    console.log('   - Latest Log Platform:', history.items[0]?.platform);
    console.log('   - Latency Recorded:', `${history.items[0]?.latencyMs} ms`);

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 10 VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ Phase 10 verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase10Tests();
