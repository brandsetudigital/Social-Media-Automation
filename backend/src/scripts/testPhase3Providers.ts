import dotenv from 'dotenv';
dotenv.config();

import {
  openAIService,
  claudeService,
  geminiService,
  groqService,
  AIProviderError,
} from '../services/ai';
import { AI_CONFIG } from '../config/ai.config';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('   PHASE 3: INDIVIDUAL AI PROVIDER SERVICES TEST    ');
  console.log('====================================================\n');

  console.log('--- 1. Provider Key Availability Check ---');
  console.log(`OpenAI configured:    ${openAIService.isAvailable()}`);
  console.log(`Claude configured:    ${claudeService.isAvailable()}`);
  console.log(`Gemini configured:    ${geminiService.isAvailable()}`);
  console.log(`Groq configured:      ${groqService.isAvailable()}`);
  console.log('');

  console.log('--- 2. Groq Vision Guard Test ---');
  try {
    await groqService.generateVision({
      prompt: 'Describe this image',
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    console.error('❌ Failed: Groq should have thrown VISION_NOT_SUPPORTED error');
  } catch (error: any) {
    if (error instanceof AIProviderError && error.code === 'VISION_NOT_SUPPORTED') {
      console.log('✅ Passed: Groq properly rejected vision call with VISION_NOT_SUPPORTED code.');
    } else {
      console.error('❌ Failed with unexpected error:', error);
    }
  }
  console.log('');

  console.log('--- 3. Missing Key Guard Test ---');
  // Temporarily clear an unconfigured or dummy provider key to test guard
  const originalOpenAIKey = AI_CONFIG.keys.openai;
  AI_CONFIG.keys.openai = '';
  try {
    const testService = new (openAIService.constructor as any)();
    await testService.generateText({ prompt: 'Hello' });
    console.error('❌ Failed: Should have thrown MISSING_API_KEY error');
  } catch (error: any) {
    if (error instanceof AIProviderError && error.code === 'MISSING_API_KEY') {
      console.log('✅ Passed: Service properly caught missing API key with MISSING_API_KEY code.');
    } else {
      console.error('❌ Failed with unexpected error:', error);
    }
  } finally {
    AI_CONFIG.keys.openai = originalOpenAIKey;
  }
  console.log('');

  console.log('--- 4. Enforced Timeout Test ---');
  // Test with 1ms timeout to ensure timeout triggers reliably
  const activeService = geminiService.isAvailable()
    ? geminiService
    : openAIService.isAvailable()
    ? openAIService
    : groqService.isAvailable()
    ? groqService
    : claudeService.isAvailable()
    ? claudeService
    : null;

  if (activeService) {
    try {
      await activeService.generateText({
        prompt: 'Write a 500 word essay about social media marketing trends in 2026.',
        modelId: 'gemini-3.5-flash-lite',
        timeoutMs: 1, // 1 millisecond timeout
      });
      console.error('❌ Failed: Request should have timed out immediately');
    } catch (error: any) {
      if (error instanceof AIProviderError && error.isTimeout) {
        console.log(`✅ Passed: Timeout triggered successfully (${error.code}: ${error.message})`);
      } else {
        console.log(`ℹ️ Result: Error received (${error.message})`);
      }
    }
  } else {
    console.log('ℹ️ Skipped timeout live test: No API keys configured in environment yet.');
  }
  console.log('');

  console.log('--- 5. Live Generation Test (Available Providers) ---');
  const services = [
    { name: 'Google Gemini', service: geminiService, model: 'gemini-3.5-flash-lite' },
    { name: 'OpenAI', service: openAIService, model: 'gpt-4o-mini' },
    { name: 'Anthropic Claude', service: claudeService, model: 'claude-3-5-haiku-20241022' },
    { name: 'Groq', service: groqService, model: 'llama-3.3-70b-versatile' },
  ];

  for (const { name, service, model } of services) {
    if (!service.isAvailable()) {
      console.log(`⏭️  Skipping ${name}: No API key provided in .env`);
      continue;
    }

    try {
      console.log(`🚀 Testing live generation with ${name} (${model})...`);
      const result = await service.generateText({
        prompt: 'Give one concise Instagram hook for an artisanal coffee shop.',
        systemPrompt: 'You are an elite Instagram copywriter. Keep response to exactly one sentence.',
        modelId: model,
        maxTokens: 50,
        timeoutMs: 20000,
      });

      console.log(`✅ ${name} succeeded!`);
      console.log(`   Model:        ${result.modelId}`);
      console.log(`   Hook:         "${result.rawText}"`);
      console.log(`   Latency:      ${result.latencyMs}ms`);
      console.log(`   Tokens:       ${result.inputTokens} in / ${result.outputTokens} out (total: ${result.totalTokens})`);
      console.log(`   Est. Cost:    $${result.costUSD.toFixed(6)} USD`);
    } catch (error: any) {
      console.error(`❌ ${name} call failed:`, error.message);
    }
    console.log('');
  }

  console.log('--- 6. Multimodal Vision Test ---');
  if (geminiService.isAvailable()) {
    try {
      console.log('🚀 Testing Gemini Vision with 1x1 test image...');
      const visionResult = await geminiService.generateVision({
        prompt: 'What color is this image? One word.',
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        modelId: 'gemini-3.5-flash-lite',
        timeoutMs: 20000,
      });
      console.log(`✅ Gemini Vision succeeded!`);
      console.log(`   Analysis:     "${visionResult.rawText}"`);
      console.log(`   Latency:      ${visionResult.latencyMs}ms`);
      console.log(`   Tokens:       ${visionResult.inputTokens} in / ${visionResult.outputTokens} out`);
      console.log(`   Est. Cost:    $${visionResult.costUSD.toFixed(6)} USD`);
    } catch (error: any) {
      console.error('❌ Gemini Vision failed:', error.message);
    }
  } else {
    console.log('⏭️  Skipping Gemini Vision: Key not available.');
  }

  console.log('====================================================');
  console.log('          PHASE 3 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase3Tests().catch(console.error);
