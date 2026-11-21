import dotenv from 'dotenv';
dotenv.config();

import { brandVoiceService } from '../services/ai/BrandVoiceService';

async function runPhase7Tests() {
  console.log('====================================================');
  console.log('    PHASE 7: BRAND VOICE & CONTENT REFINEMENT       ');
  console.log('====================================================\n');

  console.log('--- 1. Brand Voice Profile Persistence Test ---');
  const savedProfile = await brandVoiceService.saveBrandVoice({
    brandName: 'The Vintage Roastery',
    industry: 'Artisanal Coffee & Specialty Roasters',
    targetAudience: 'Slow-living coffee enthusiasts and discerning home baristas',
    tone: 'storyteller',
    preferredVocabulary: ['single-origin', 'slow-drip', 'morning ritual', 'terroir'],
    wordsToAvoid: ['cheap', 'instant', 'grab-and-go', 'game-changer', 'unleash'],
    emojiPreference: 'minimal',
    ctaStyle: 'comment',
    captionLength: 'medium',
  });

  console.log(`✅ Brand voice profile saved: "${savedProfile.brandName}"`);
  console.log(`   Tone:                ${savedProfile.tone}`);
  console.log(`   Preferred Vocab:     [${savedProfile.preferredVocabulary.join(', ')}]`);
  console.log(`   Words to Avoid:      [${savedProfile.wordsToAvoid.join(', ')}]`);

  const retrieved = await brandVoiceService.getBrandVoice('The Vintage Roastery');
  console.log(`✅ Brand voice successfully retrieved from storage: ${retrieved !== null && retrieved.brandName === savedProfile.brandName}\n`);

  console.log('--- 2. Live Caption Refinement Test (Anti-Cliché & Naturalization) ---');
  const roughDraft =
    "In today's fast-paced world, getting your caffeine fix is an absolute game-changer! Our coffee is super cheap and convenient grab-and-go. Unleash your inner energy, look no further for great coffee! Buy now!";

  console.log('Raw Draft to Refine:');
  console.log(`"${roughDraft}"\n`);
  console.log('🚀 Running refinement through BrandVoiceService with brand rules applied...\n');

  let refinedResult: any;
  try {
    refinedResult = await brandVoiceService.refineCaption({
      caption: roughDraft,
      brandName: 'The Vintage Roastery',
      instruction: 'Make it sound calm, poetic, and reflective of a slow morning ritual. Eliminate all cheap commercial hype.',
    });

    console.log(`✅ Caption Refined Successfully!`);
    console.log(`   Readability Score:    ${refinedResult.readabilityScore} / 100`);
    console.log(`   Latency:              ${refinedResult.meta.latencyMs}ms`);
    console.log(`   Improvements Made:    [${refinedResult.improvementsMade.join('; ')}]`);
    console.log(`   Hook:                 "${refinedResult.hook}"`);
    console.log(`   CTA:                  "${refinedResult.callToAction}"`);
    console.log(`\n--- POLISHED REFINED CAPTION ---\n${refinedResult.refinedCaption}\n--------------------------------\n`);
  } catch (err: any) {
    console.error('❌ Refinement failed:', err.message);
  }

  console.log('--- 3. Live AI Content Quality Evaluation Test ---');
  try {
    const captionToEvaluate = refinedResult?.refinedCaption || roughDraft;
    console.log('🚀 Evaluating quality of refined caption across 6 copywriting dimensions...\n');

    const evaluation = await brandVoiceService.evaluateContentQuality({
      caption: captionToEvaluate,
      topic: 'Morning artisanal coffee ritual',
      brandName: 'The Vintage Roastery',
      targetAudience: 'Slow-living coffee enthusiasts',
      hashtags: ['#SingleOriginCoffee', '#SlowLivingMorning', '#TheVintageRoastery'],
    });

    console.log(`✅ Quality Evaluation Completed!`);
    console.log(`   Overall Score:         ${evaluation.overallScore} / 100`);
    console.log(`   Natural Language:      ${evaluation.categoryScores.naturalLanguage} / 100`);
    console.log(`   Topic Relevance:       ${evaluation.categoryScores.topicRelevance} / 100`);
    console.log(`   Originality:           ${evaluation.categoryScores.originality} / 100`);
    console.log(`   Grammar & Clarity:     ${evaluation.categoryScores.grammarAndClarity} / 100`);
    console.log(`   Brand Voice Fit:       ${evaluation.categoryScores.brandVoice} / 100`);
    console.log(`   Hashtag Relevance:     ${evaluation.categoryScores.hashtagRelevance} / 100`);
    console.log(`   Sounds Human:          ${evaluation.isHumanSounding}`);
    console.log(`   Flagged Buzzwords:     ${evaluation.flaggedClichés.length === 0 ? 'None (Clean)' : evaluation.flaggedClichés.join(', ')}`);
    console.log(`   Key Strengths:         [${evaluation.strengths.join('; ')}]`);
    console.log(`   Next Improvement Tip:  [${evaluation.suggestionsForImprovement.join('; ')}]\n`);
  } catch (err: any) {
    console.error('❌ Evaluation failed:', err.message);
  }

  console.log('--- 4. Human Feedback & 5-Star Rating Logging Test ---');
  const userFeedback = brandVoiceService.submitUserFeedback({
    caption: refinedResult?.refinedCaption || roughDraft,
    rating: 5,
    feedbackNotes: 'Exquisite improvement. Zero AI buzzwords, perfect tone of quiet luxury.',
    likedAspects: ['Natural pacing', 'Preserved original meaning', 'Gentle storytelling CTA'],
    provider: 'gemini',
    modelId: 'gemini-3.5-flash-lite',
  });

  console.log(`✅ Human feedback recorded with ID: ${userFeedback.id}`);
  console.log(`   Star Rating:         ${userFeedback.rating} / 5 ⭐`);
  console.log(`   User Notes:          "${userFeedback.feedbackNotes}"`);
  console.log(`   Liked Aspects:       [${userFeedback.likedAspects.join(', ')}]`);

  const allLogs = brandVoiceService.getFeedbackLogs();
  console.log(`✅ Total feedback records in log: ${allLogs.length}\n`);

  console.log('====================================================');
  console.log('          PHASE 7 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase7Tests().catch(console.error);
