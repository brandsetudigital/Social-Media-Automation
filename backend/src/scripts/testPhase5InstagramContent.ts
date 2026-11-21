import dotenv from 'dotenv';
dotenv.config();

import { instagramContentService } from '../services/ai/InstagramContentService';
import {
  generateCaptionsSchema,
  generateHashtagsSchema,
  generateIdeasSchema,
} from '../validators/instagramContent.validator';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('    PHASE 5: INSTAGRAM CONTENT GENERATION TESTS     ');
  console.log('====================================================\n');

  console.log('--- 1. Zod Request Validation Schema Tests ---');
  const invalidCaption = generateCaptionsSchema.safeParse({ topic: 'ab' }); // Too short (< 3 chars)
  console.log(`✅ Short topic caught: ${!invalidCaption.success}`);

  const invalidHashtagCount = generateHashtagsSchema.safeParse({ topic: 'Valid topic', count: 50 }); // Max 30
  console.log(`✅ Oversized hashtag count caught: ${!invalidHashtagCount.success}`);

  const validIdeas = generateIdeasSchema.safeParse({ topic: 'Sustainable fashion tips', count: 3 });
  console.log(`✅ Valid ideas input passed: ${validIdeas.success}`);
  console.log('');

  console.log('--- 2. Live Caption Generation (3 Variations) ---');
  try {
    console.log('🚀 Generating 3 caption variations for "Handcrafted Italian Leather Shoes"...');
    const captionsResult = await instagramContentService.generateCaptions({
      topic: 'Handcrafted Italian Leather Shoes',
      brandName: 'Veloce Atelier',
      targetAudience: 'Fashion-conscious modern professionals',
      tone: 'storyteller',
      ctaType: 'comment',
      keywords: ['heritage craftsmanship', 'full-grain leather', 'all-day comfort'],
    });

    console.log(`✅ Captions generated successfully!`);
    console.log(`   Topic:              ${captionsResult.topic}`);
    console.log(`   Variations Count:   ${captionsResult.variations.length}`);
    console.log(`   Provider Used:      ${captionsResult.meta.provider} (${captionsResult.meta.modelId})`);
    console.log(`   Latency:            ${captionsResult.meta.latencyMs}ms`);
    console.log(`   Tokens:             ${captionsResult.meta.tokens.total} total`);
    console.log(`   Est. Cost:          $${captionsResult.meta.costUSD.toFixed(6)} USD`);
    console.log('');

    captionsResult.variations.forEach((v, idx) => {
      console.log(`   [Variation ${idx + 1}: ${v.style}]`);
      console.log(`   • Hook: ${v.hook}`);
      console.log(`   • CTA:  ${v.callToAction}`);
      console.log(`   • Emojis: ${v.suggestedEmojis?.join(' ')}`);
      console.log(`   • Full Caption Preview:\n"${v.fullCaption?.slice(0, 160)}..."\n`);
    });
  } catch (err: any) {
    console.error('❌ Caption generation failed:', err.message);
  }

  console.log('--- 3. Live Categorized Hashtag Generation ---');
  try {
    console.log('🚀 Generating categorized hashtags for "Cold Brew Coffee At Home"...');
    const hashtagResult = await instagramContentService.generateHashtags({
      topic: 'Cold Brew Coffee At Home',
      brandNiche: 'Specialty Coffee Roasters',
      count: 12,
    });

    console.log(`✅ Hashtags generated successfully!`);
    console.log(`   Total Generated:    ${hashtagResult.totalCount}`);
    console.log(`   Niche Tags:         [${hashtagResult.categorized.niche.join(', ')}]`);
    console.log(`   Audience Tags:      [${hashtagResult.categorized.audience.join(', ')}]`);
    console.log(`   Topic Tags:         [${hashtagResult.categorized.topic.join(', ')}]`);
    console.log(`   Formatted String:   "${hashtagResult.formattedString}"`);
    console.log(`   Latency:            ${hashtagResult.meta.latencyMs}ms`);
    console.log(`   Est. Cost:          $${hashtagResult.meta.costUSD.toFixed(6)} USD`);
  } catch (err: any) {
    console.error('❌ Hashtag generation failed:', err.message);
  }
  console.log('');

  console.log('--- 4. Live Content Ideas Generation (Multi-Pillar & Formats) ---');
  try {
    console.log('🚀 Generating Instagram content ideas for "Minimalist Skincare Routines"...');
    const ideasResult = await instagramContentService.generateContentIdeas({
      topic: 'Minimalist Skincare Routines',
      brandName: 'DermaPure',
      targetAudience: 'Busy women aged 25-40',
      format: 'all',
      count: 3,
    });

    console.log(`✅ Content ideas generated successfully!`);
    console.log(`   Theme:              ${ideasResult.theme}`);
    console.log(`   Ideas Count:        ${ideasResult.ideas.length}`);
    console.log(`   Latency:            ${ideasResult.meta.latencyMs}ms`);
    console.log('');

    ideasResult.ideas.forEach((idea, idx) => {
      console.log(`   [Idea ${idx + 1}: ${idea.title}]`);
      console.log(`   • Format:  ${idea.format} | Pillar: ${idea.pillar}`);
      console.log(`   • Hook:    "${idea.hook}"`);
      console.log(`   • Concept: ${idea.conceptSummary}`);
      if (idea.carouselSlides && idea.carouselSlides.length > 0) {
        console.log(`   • Carousel Slides: [${idea.carouselSlides.slice(0, 3).join(' -> ')}...]`);
      }
      if (idea.reelAudioSuggestion) {
        console.log(`   • Reel Audio: ${idea.reelAudioSuggestion}`);
      }
      console.log(`   • CTA:     "${idea.callToAction}"\n`);
    });
  } catch (err: any) {
    console.error('❌ Content ideas generation failed:', err.message);
  }

  console.log('====================================================');
  console.log('          PHASE 5 VERIFICATION COMPLETE             ');
  console.log('====================================================');
}

runPhase5Tests().catch(console.error);
