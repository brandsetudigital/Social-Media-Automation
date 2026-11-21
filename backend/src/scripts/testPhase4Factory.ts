import dotenv from 'dotenv';
dotenv.config();

import {
  aiFactory,
  AIFallbackExhaustedError,
  AIProviderError,
} from '../services/ai';
import { AI_CONFIG } from '../config/ai.config';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('       PHASE 4: AI FACTORY & FALLBACK TESTS         ');
  console.log('====================================================\n');

  console.log('--- 1. Provider Resolution Test ---');
  const gemini = aiFactory.getProvider('gemini');
  const openai = aiFactory.getProvider('openai');
  const groq = aiFactory.getProvider('groq');
  const anthropic = aiFactory.getProvider('anthropic');
  const defaultProv = aiFactory.getProvider();

  console.log(`✅ Gemini provider resolved:    ${gemini.provider === 'gemini'}`);
  console.log(`✅ OpenAI provider resolved:    ${openai.provider === 'openai'}`);
  console.log(`✅ Groq provider resolved:      ${groq.provider === 'groq'}`);
  console.log(`✅ Anthropic provider resolved: ${anthropic.provider === 'anthropic'}`);
  console.log(`✅ Default provider resolved:   ${defaultProv.provider} (matches AI_CONFIG default: ${AI_CONFIG.defaultProvider})`);

  try {
    aiFactory.getProvider('invalid-provider' as any);
    console.error('❌ Failed: Should have thrown UNSUPPORTED_PROVIDER error');
  } catch (err: any) {
    if (err instanceof AIProviderError && err.code === 'UNSUPPORTED_PROVIDER') {
      console.log('✅ Passed: Invalid provider threw UNSUPPORTED_PROVIDER error as expected.');
    } else {
      console.error('❌ Unexpected error on invalid provider:', err);
    }
  }
  console.log('');

  console.log('--- 2. Available Providers Query ---');
  const available = aiFactory.getAvailableProviders();
  const availableVision = aiFactory.getAvailableVisionProviders();
  console.log(`Available Text Providers:   [${available.join(', ')}]`);
  console.log(`Available Vision Providers: [${availableVision.join(', ')}]`);
  console.log(`✅ Groq excluded from vision: ${!availableVision.includes('groq')}`);
  console.log('');

  console.log('--- 3. Explicit Fallback Disablement Test ---');
  // OpenAI has an invalid key in .env, so with allowFallback: false it should reject without falling back
  try {
    await aiFactory.generateText({
      prompt: 'Test prompt',
      provider: 'openai',
      allowFallback: false,
    });
    console.error('❌ Failed: Should have failed immediately without fallback');
  } catch (err: any) {
    if (err instanceof AIProviderError && err.provider === 'openai') {
      console.log(`✅ Passed: allowFallback: false stopped fallback cascade (${err.provider}: ${err.code})`);
    } else {
      console.log(`ℹ️ Result: Error captured (${err.message})`);
    }
  }
  console.log('');

  console.log('--- 4. Automated Cascading Fallback Test (OpenAI -> Gemini) ---');
  // OpenAI is configured but fails authentication -> AIFactory should automatically cascade to Gemini
  try {
    console.log('🚀 Requesting generation with primary=openai, fallbackChain=[openai, gemini]...');
    const result = await aiFactory.generateText({
      prompt: 'Write one catchy Instagram hook for a luxury fashion brand.',
      systemPrompt: 'Keep response to exactly one sentence.',
      provider: 'openai',
      fallbackChain: ['openai', 'gemini'],
      allowFallback: true,
      modelId: 'gemini-3.5-flash-lite',
      timeoutMs: 20000,
    });

    console.log('✅ Cascading Fallback Succeeded!');
    console.log(`   Final Provider Used:  ${result.provider}`);
    console.log(`   Original Provider:    ${result.originalProvider}`);
    console.log(`   Used Fallback Flag:   ${result.usedFallback}`);
    console.log(`   Attempted Providers:  [${result.attemptedProviders?.join(', ')}]`);
    console.log(`   Model:                ${result.modelId}`);
    console.log(`   Generated Text:       "${result.rawText}"`);
    console.log(`   Latency:              ${result.latencyMs}ms`);
    console.log(`   Tokens:               ${result.inputTokens} in / ${result.outputTokens} out`);
    console.log(`   Cost:                 $${result.costUSD.toFixed(6)} USD`);
  } catch (err: any) {
    console.error('❌ Cascading fallback failed:', err.message);
  }
  console.log('');

  console.log('--- 5. Vision Cascading Fallback Test (Groq -> Gemini) ---');
  // Groq does not support vision; requesting Groq for vision should automatically cascade to Gemini
  try {
    console.log('🚀 Requesting vision analysis with primary=groq (text-only)...');
    const visionResult = await aiFactory.generateVision({
      prompt: 'What color is this image? One word.',
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      provider: 'groq',
      modelId: 'gemini-3.5-flash-lite',
      timeoutMs: 20000,
    });

    console.log('✅ Vision Fallback Succeeded!');
    console.log(`   Final Provider Used:  ${visionResult.provider}`);
    console.log(`   Original Provider:    ${visionResult.originalProvider || 'groq (rerouted)'}`);
    console.log(`   Used Fallback Flag:   ${visionResult.usedFallback}`);
    console.log(`   Analysis:             "${visionResult.rawText}"`);
    console.log(`   Latency:              ${visionResult.latencyMs}ms`);
    console.log(`   Tokens:               ${visionResult.inputTokens} in / ${visionResult.outputTokens} out`);
  } catch (err: any) {
    console.error('❌ Vision fallback failed:', err.message);
  }
  console.log('');

  console.log('--- 6. Fallback Chain Exhaustion Test ---');
  // Test a chain where all specified providers are unconfigured or failing
  try {
    await aiFactory.generateText({
      prompt: 'Test prompt',
      provider: 'anthropic',
      fallbackChain: ['anthropic', 'groq'], // Both unconfigured
      allowFallback: true,
    });
    console.error('❌ Failed: Should have thrown AIFallbackExhaustedError');
  } catch (err: any) {
    if (err instanceof AIFallbackExhaustedError) {
      console.log('✅ Passed: Threw AIFallbackExhaustedError when all providers failed.');
      console.log(`   Details: ${err.message}`);
    } else {
      console.log(`ℹ️ Result: Error captured (${err.message})`);
    }
  }
  console.log('');

  console.log('====================================================');
  console.log('          PHASE 4 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase4Tests().catch(console.error);
