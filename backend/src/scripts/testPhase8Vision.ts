import dotenv from 'dotenv';
dotenv.config();

import { visionContentService } from '../services/ai/VisionContentService';

async function runPhase8Tests() {
  console.log('====================================================');
  console.log('    PHASE 8: IMAGE-BASED CAPTION GENERATION (VISION) ');
  console.log('====================================================\n');

  console.log('--- 1. Missing Image Guard Test ---');
  try {
    await visionContentService.generateCaptionFromImage({} as any);
    console.error('❌ Failed: Should have rejected empty image input');
  } catch (err: any) {
    console.log(`✅ Passed: Empty image caught cleanly with error: "${err.message}"\n`);
  }

  // 1x1 test PNG pixel in base64 (Coral/Peach color)
  const sampleImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  console.log('--- 2. Live Base64 Vision Caption Generation ---');
  console.log('🚀 Sending image + context hint to Vision AI (Gemini / OpenAI / Claude)...\n');

  try {
    const result = await visionContentService.generateCaptionFromImage({
      imageBase64: sampleImageBase64,
      contextHint: 'New warm coral lipstick shade launch for summer season',
      brandName: 'Aura Cosmetics',
      targetAudience: 'Beauty lovers and daily makeup minimalists',
      tone: 'friendly',
      ctaType: 'comment',
      modelId: 'gemini-3.5-flash-lite',
    });

    console.log(`✅ Vision Caption Generated Successfully!`);
    console.log(`   Visual Elements:    [${result.visualElementsDetected.join(', ')}]`);
    console.log(`   Provider Used:      ${result.meta.provider} (${result.meta.modelId})`);
    console.log(`   Latency:            ${result.meta.latencyMs}ms`);
    console.log(`   Tokens:             ${result.meta.tokens.input} in / ${result.meta.tokens.output} out`);
    console.log(`   Est. Cost:          $${result.meta.costUSD.toFixed(6)} USD`);
    console.log(`   Hook:               "${result.hook}"`);
    console.log(`   CTA:                "${result.callToAction}"`);
    console.log(`   Emojis:             ${result.suggestedEmojis.join(' ')}`);
    console.log(`   Hashtags (${result.hashtags.length}):     ${result.hashtags.join(' ')}`);
    console.log(`\n--- FULL INSTAGRAM POST ---\n${result.fullPostText}\n---------------------------\n`);
  } catch (err: any) {
    console.error('❌ Base64 vision test failed:', err.message);
  }

  console.log('--- 3. Live File Buffer (Multer Simulation) Vision Test ---');
  try {
    const buffer = Buffer.from(sampleImageBase64, 'base64');
    console.log(`🚀 Simulating multipart upload of ${buffer.length} bytes file buffer...\n`);

    const bufferResult = await visionContentService.generateCaptionFromImage({
      fileBuffer: buffer,
      fileMimeType: 'image/png',
      contextHint: 'Sunset rooftop terrace ambiance at evening',
      brandName: 'Skyline Lounge',
      tone: 'bold',
      ctaType: 'save',
      modelId: 'gemini-3.5-flash-lite',
    });

    console.log(`✅ Multer Buffer Vision Analysis Succeeded!`);
    console.log(`   Hook:       "${bufferResult.hook}"`);
    console.log(`   Visuals:    [${bufferResult.visualElementsDetected.join(', ')}]`);
    console.log(`   CTA:        "${bufferResult.callToAction}"`);
    console.log(`   Hashtags:   ${bufferResult.hashtags.slice(0, 5).join(' ')}`);
    console.log(`   Latency:    ${bufferResult.meta.latencyMs}ms\n`);
  } catch (err: any) {
    console.error('❌ Buffer vision test failed:', err.message);
  }

  console.log('====================================================');
  console.log('          PHASE 8 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase8Tests().catch(console.error);
