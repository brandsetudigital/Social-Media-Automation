import dotenv from 'dotenv';
dotenv.config();

import { contentHistoryService } from '../services/ai/ContentHistoryService';
import prisma from '../prisma';

async function runPhase9Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 9 VERIFICATION: CONTENT HISTORY & USAGE');
  console.log('====================================================\n');

  try {
    // 1. Test Saving Generated Content
    console.log('1️⃣ Testing contentHistoryService.saveGeneratedContent()...');
    const saved = await contentHistoryService.saveGeneratedContent({
      topic: 'Minimalist Interior Design Tips for Small Apartments',
      contentType: 'CAPTION',
      provider: 'gemini',
      modelId: 'gemini-3.5-flash-lite',
      hook: 'Living small doesn’t mean sacrificing elegance.',
      caption: 'Living small doesn’t mean sacrificing elegance.\n\nHere are 3 minimalist decor secrets to maximize your apartment:\n1. Choose multipurpose furniture\n2. Stick to a neutral palette with warm wood accents\n3. Leverage vertical space with floating shelves\n\nSave this for your next apartment refresh!',
      callToAction: 'Save this for your next apartment refresh!',
      hashtags: '#SmallSpaceLiving #MinimalistDecor #InteriorDesign',
      variationsJson: JSON.stringify([
        { style: 'Story', body: 'Story variation...' },
        { style: 'Punchy', body: 'Punchy variation...' },
      ]),
      inputTokens: 140,
      outputTokens: 210,
      totalTokens: 350,
      latencyMs: 1420,
      costUSD: 0.000105,
      usedFallback: false,
      status: 'DRAFT',
    });

    console.log('   ✅ Saved Content Item ID:', saved.id);
    console.log('   - Topic:', saved.topic);
    console.log('   - Provider & Model:', `${saved.provider} (${saved.modelId})`);
    console.log('   - Tokens / Cost:', `${saved.totalTokens} tokens / $${saved.costUSD}`);
    console.log('   - Initial Status:', saved.status);

    // 2. Test Paginated Retrieval
    console.log('\n2️⃣ Testing contentHistoryService.getGeneratedContentHistory()...');
    const history = await contentHistoryService.getGeneratedContentHistory({
      page: 1,
      limit: 10,
      contentType: 'ALL',
      provider: 'ALL',
      status: 'ALL',
    });

    console.log('   ✅ Total Content Records Found:', history.pagination.total);
    console.log('   - Page:', `${history.pagination.page} / ${history.pagination.totalPages}`);
    const foundItem = history.items.find((item) => item.id === saved.id);
    if (!foundItem) throw new Error('Newly created content item was not found in history!');
    console.log('   ✅ Found saved record in history page successfully!');

    // 3. Test Workflow Status Transition (DRAFT -> APPROVED)
    console.log('\n3️⃣ Testing contentHistoryService.updateContentStatus()...');
    const updated = await contentHistoryService.updateContentStatus(saved.id, 'APPROVED');
    console.log('   ✅ Status updated successfully to:', updated.status);

    // 4. Test Comparison Logging
    console.log('\n4️⃣ Testing contentHistoryService.saveComparisonLog()...');
    const comparisonLog = await contentHistoryService.saveComparisonLog({
      topic: 'Eco-Friendly Bamboo Toothbrushes',
      providersAttempted: ['gemini', 'openai', 'groq', 'anthropic'],
      fastestProvider: 'groq',
      lowestCostProvider: 'gemini',
      results: [
        { provider: 'gemini', latencyMs: 1100, estimatedCostUSD: 0.00008, status: 'success' },
        { provider: 'groq', latencyMs: 650, estimatedCostUSD: 0.00009, status: 'success' },
      ],
    });
    console.log('   ✅ Comparison Log Saved ID:', comparisonLog?.id);

    const comparisonHistory = await contentHistoryService.getComparisonHistory(5);
    console.log('   ✅ Comparison History Count:', comparisonHistory.length);
    console.log('   - Latest Comparison Fastest Provider:', comparisonHistory[0]?.fastestProvider);

    // 5. Test Saving User Feedback
    console.log('\n5️⃣ Testing contentHistoryService.saveFeedback()...');
    const feedback = await contentHistoryService.saveFeedback({
      contentId: saved.id,
      caption: saved.caption,
      rating: 5,
      feedbackNotes: 'Loved the clear 3-step format and conversational tone!',
      likedAspects: ['Great hook', 'Actionable tips', 'Clean CTA'],
      provider: saved.provider,
      modelId: saved.modelId,
    });
    console.log('   ✅ Feedback Saved ID:', feedback?.id);
    console.log('   - Rating:', `${feedback?.rating}/5 Stars`);

    // 6. Test Aggregated API Usage Stats
    console.log('\n6️⃣ Testing contentHistoryService.getApiUsageStats()...');
    const stats = await contentHistoryService.getApiUsageStats();
    console.log('   ✅ Overall API Usage:');
    console.log('      - Total Requests Logged:', stats.overall.totalRequests);
    console.log('      - Total Tokens Consumed:', stats.overall.totalTokens);
    console.log('      - Total Cost (USD):', `$${stats.overall.totalCostUSD}`);
    console.log('      - Avg Latency:', `${stats.overall.avgLatencyMs} ms`);

    console.log('   ✅ Usage By Provider:');
    for (const [pName, pStat] of Object.entries(stats.byProvider)) {
      console.log(`      - [${pName.toUpperCase()}]: ${pStat.totalRequests} reqs | ${pStat.totalTokens} tokens | $${pStat.totalCostUSD} | ${pStat.avgLatencyMs}ms avg`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 9 VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ Phase 9 verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase9Tests();
