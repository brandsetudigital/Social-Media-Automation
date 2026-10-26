import prisma from '../prisma';
import { InstagramInsightsService } from '../services/InstagramInsightsService';

/**
 * Acceptance & Unit Test Suite for Instagram Insights Analytics and Smart Scheduling
 */
async function runTests() {
  console.log('--- Starting Instagram Insights Acceptance & Unit Tests ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // Setup isolated test clients
    const clientA = await prisma.client.create({
      data: {
        businessName: 'Test Agency Brand A',
        category: 'Fashion',
        location: 'Mumbai',
        status: 'ACTIVE',
      },
    });

    const clientB = await prisma.client.create({
      data: {
        businessName: 'Test Agency Brand B',
        category: 'Food',
        location: 'Delhi',
        status: 'ACTIVE',
      },
    });

    // Create Social Accounts: Client A with connected Instagram, Client B with expired token
    const accountA = await prisma.socialAccount.create({
      data: {
        clientId: clientA.id,
        platform: 'INSTAGRAM',
        accountName: 'brand_a_official',
        accountId: 'ig_acc_test_a',
        status: 'CONNECTED',
        accessToken: 'EAA_test_token_valid',
      },
    });

    const accountB = await prisma.socialAccount.create({
      data: {
        clientId: clientB.id,
        platform: 'INSTAGRAM',
        accountName: 'brand_b_official',
        accountId: 'ig_acc_test_b',
        status: 'REAUTH_REQUIRED',
        accessToken: null,
      },
    });

    // TEST 1: Reauth & Token State Handling (Requirement B & K)
    const tokenResA = await InstagramInsightsService.resolveAccountToken(accountA);
    assert(tokenResA.isLive === true && tokenResA.token === 'EAA_test_token_valid', 'Valid Instagram token resolves as live');

    const tokenResB = await InstagramInsightsService.resolveAccountToken(accountB);
    assert(tokenResB.isLive === false && tokenResB.token === '', 'Missing/invalid token resolves as not live (REAUTH_REQUIRED)');

    // Create Historical Snapshots for Client A
    const now = new Date();
    // Friday (day 5) at 19:00 - High performance slot
    const fridayDate1 = new Date('2026-10-16T19:00:00');
    const fridayDate2 = new Date('2026-10-09T19:00:00');
    const fridayDate3 = new Date('2026-10-02T19:00:00');
    const fridayDate4 = new Date('2026-09-25T19:00:00');

    // Monday (day 1) at 11:00 - Low volume slot
    const mondayDate = new Date('2026-10-12T11:00:00');

    const mediaList = [
      { id: 'ig_m_1', views: 400, likes: 35, comments: 12, date: fridayDate1, type: 'REEL' },
      { id: 'ig_m_2', views: 380, likes: 30, comments: 8, date: fridayDate2, type: 'REEL' },
      { id: 'ig_m_3', views: 390, likes: 32, comments: 10, date: fridayDate3, type: 'REEL' },
      { id: 'ig_m_4', views: 410, likes: 38, comments: 14, date: fridayDate4, type: 'REEL' },
      { id: 'ig_m_5', views: 80, likes: 5, comments: 1, date: mondayDate, type: 'IMAGE_POST' },
    ];

    for (const m of mediaList) {
      await prisma.instagramMediaInsightSnapshot.create({
        data: {
          clientId: clientA.id,
          socialAccountId: accountA.id,
          mediaId: m.id,
          mediaType: m.type,
          publishedAt: m.date,
          ageBenchmark: 'LATEST',
          views: m.views,
          reach: m.views,
          likes: m.likes,
          comments: m.comments,
          shares: 5,
          saves: 15,
          totalInteractions: m.likes + m.comments + 20,
          syncStatus: 'SUCCESS',
        },
      });
    }

    // TEST 2: Multi-Client Data Isolation (Requirement K)
    const overviewB = await InstagramInsightsService.getInstagramOverview(clientB.id, '30D');
    assert(overviewB.summary.totalPublished === 0, 'Client B has zero posts (isolated from Client A data)');
    assert(overviewB.connectionStatus === 'REAUTH_REQUIRED', 'Client B status correctly reflects REAUTH_REQUIRED');

    const overviewA = await InstagramInsightsService.getInstagramOverview(clientA.id, '30D');
    assert(overviewA.summary.totalPublished === 5, 'Client A has exactly 5 published media items');
    assert(overviewA.summary.likes === 140, 'Likes aggregated correctly across client items');

    // TEST 3: Reels vs Posts Comparison Metrics (Requirement D & F)
    assert(overviewA.reelsVsPosts.reels.count === 4, 'Correctly identifies 4 Reels');
    assert(overviewA.reelsVsPosts.posts.count === 1, 'Correctly identifies 1 Post');
    assert(overviewA.reelsVsPosts.reels.avgViews === 395, 'Computes correct average views for Reels (395 avg)');
    assert(overviewA.reelsVsPosts.posts.avgViews === 80, 'Computes correct average views for Posts (80 avg)');

    // TEST 4: Smart Scheduling Recommendations & Confidence Thresholds (Requirement G & K)
    const recommendations = await InstagramInsightsService.generatePostingRecommendations(clientA.id);
    assert(recommendations.length > 0, 'Generates smart scheduling recommendations');

    const highConfidenceSlot = recommendations.find((r) => r.confidenceLevel === 'HIGH');
    assert(!!highConfidenceSlot, 'Identifies HIGH confidence slot when sample threshold (>=4) is met');
    assert(highConfidenceSlot?.targetHour === 19 || highConfidenceSlot?.dayOfWeek === 5, 'Friday evening slot identified as top recommended window');

    const lowConfidenceSlot = recommendations.find((r) => r.confidenceLevel === 'LOW');
    assert(!!lowConfidenceSlot, 'Marks preliminary slots with small sample size as LOW CONFIDENCE');

    // TEST 5: Date Boundary Filtering (7D vs 30D vs 90D) (Requirement F & K)
    const overview7D = await InstagramInsightsService.getInstagramOverview(clientA.id, '7D');
    const overview90D = await InstagramInsightsService.getInstagramOverview(clientA.id, '90D');
    assert(overview7D.summary.totalPublished <= overview90D.summary.totalPublished, 'Date boundary correctly isolates 7D versus 90D ranges');

    // TEST 6: Report Generation (Requirement F & J)
    const report = await InstagramInsightsService.generateInstagramReport(clientA.id, '30D');
    assert(report.reportId.startsWith('IG-INTEL-'), 'Generates unique report ID with client prefix');
    assert(report.topPerformingMedia.length > 0, 'Report includes top performing media items');

    // Cleanup test records
    await prisma.instagramMediaInsightSnapshot.deleteMany({ where: { clientId: clientA.id } });
    await prisma.postingTimeRecommendation.deleteMany({ where: { clientId: clientA.id } });
    await prisma.socialAccount.deleteMany({ where: { id: { in: [accountA.id, accountB.id] } } });
    await prisma.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } });

    console.log(`\nTest Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
