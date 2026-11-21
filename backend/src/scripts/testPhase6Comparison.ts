import dotenv from 'dotenv';
dotenv.config();

import { aiComparisonService } from '../services/ai/AIComparisonService';
import { compareProvidersSchema } from '../validators/aiComparison.validator';

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('       PHASE 6: AI MULTI-PROVIDER COMPARISON        ');
  console.log('====================================================\n');

  console.log('--- 1. Validation Schema Tests ---');
  const invalidTopic = compareProvidersSchema.safeParse({ topic: 'x' });
  console.log(`✅ Short topic caught: ${!invalidTopic.success}`);

  const validPayload = compareProvidersSchema.safeParse({
    topic: 'How to scale local service business with Instagram Reels',
    tone: 'bold',
    ctaType: 'save',
  });
  console.log(`✅ Valid payload passed: ${validPayload.success}`);
  console.log('');

  console.log('--- 2. Live Multi-Provider Parallel Comparison Test ---');
  console.log('🚀 Querying all 4 AI providers (Gemini, OpenAI, Groq, Claude) simultaneously...\n');

  try {
    const comparison = await aiComparisonService.compareProviders({
      topic: 'How to scale a local service business with Instagram Reels',
      brandName: 'BrandSetu Digital',
      targetAudience: 'Local plumbers, dentists, and salon owners',
      tone: 'bold',
      ctaType: 'save',
      timeoutMs: 35000,
    });

    console.log(`====================================================`);
    console.log(`Topic:                    "${comparison.topic}"`);
    console.log(`Timestamp:                ${comparison.timestamp}`);
    console.log(`Providers Attempted:      ${comparison.totalProvidersAttempted}`);
    console.log(`Successful:               ${comparison.successfulCount}`);
    console.log(`Failed:                   ${comparison.failedCount}`);
    if (comparison.fastestProvider) {
      console.log(`⚡ Fastest Provider:       ${comparison.fastestProvider}`);
    }
    if (comparison.lowestCostProvider) {
      console.log(`💰 Lowest Cost Provider:   ${comparison.lowestCostProvider}`);
    }
    console.log(`====================================================\n`);

    comparison.results.forEach((r, idx) => {
      console.log(`----------------------------------------------------`);
      console.log(`[#${idx + 1}] Provider: ${r.provider.toUpperCase()} (${r.modelId})`);
      console.log(`Status: ${r.status === 'success' ? '✅ SUCCESS' : '❌ ERROR'}`);

      if (r.status === 'success') {
        console.log(`• Latency:       ${r.latencyMs}ms`);
        console.log(`• Tokens:        ${r.tokens?.input} in / ${r.tokens?.output} out (total: ${r.tokens?.total})`);
        console.log(`• Est. Cost:     $${r.estimatedCostUSD?.toFixed(6)} USD`);
        console.log(`• Hook:          "${r.hook}"`);
        console.log(`• CTA:           "${r.callToAction}"`);
        console.log(`• Hashtags (${r.hashtags?.length}):  ${r.hashtags?.join(' ')}`);
        console.log(`• Caption Preview:\n"${r.caption?.slice(0, 160)}..."\n`);
      } else {
        console.log(`• Latency:       ${r.latencyMs}ms`);
        console.log(`• Error Reason:  ${r.error}\n`);
      }
    });
  } catch (err: any) {
    console.error('❌ Comparison test failed:', err.message);
  }

  console.log('====================================================');
  console.log('          PHASE 6 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase6Tests().catch(console.error);
