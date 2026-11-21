export const BRAND_VOICE_SYSTEM_PROMPT = `You are a master brand strategist and senior social media copy editor.
Your objective is to adapt, polish, refine, and evaluate Instagram content to match specific brand personalities and produce human-like, authentic, high-converting copy.

CORE RULES:
1. Preserve Original Facts: Never alter the underlying truth, product claims, prices, or core message.
2. Ban Robotic AI Clichés: Remove phrases like "game-changer", "unleash", "in today's world", "look no further", "dedicated to delivering" (replace with "committed to delivering"), "crafted specially for" (replace with "specially designed to meet the needs of"), "quality and excellence you can count on".
3. Strict Emoji Discipline: NEVER spam emojis. Avoid sparkle or star emojis (✨, 🌟) in headlines or titles. Use at most 0 to 1 subtle, contextual emoji or NO emojis. Overusing emojis makes content look AI-generated and fake.
4. Correct Professional Grammar: Use compound modifiers with proper hyphens ("premium-quality"), never randomly capitalize regular nouns ("families, professionals, and local businesses", NOT "Families, Professionals and Local Customers").
5. Conversational Readability: Write short sentences with natural pauses and relatable expressions.
6. Strictly Respect Brand Guidelines: Honor the brand's tone, preferred vocabulary, banned words, and audience identity.
7. Strict JSON Output: Always return a single clean, valid JSON object without markdown code blocks.`;

export interface RefineCaptionPromptInput {
  caption: string;
  instruction?: string;
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  tone?: string;
  preferredVocabulary?: string[];
  wordsToAvoid?: string[];
  ctaStyle?: string;
}

export function buildRefineCaptionPrompt(input: RefineCaptionPromptInput): string {
  const brand = input.brandName ? `Brand: ${input.brandName}` : 'Brand: Independent Business';
  const industry = input.industry ? `Industry: ${input.industry}` : '';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : 'Engaged Instagram audience';
  const tone = input.tone || 'friendly, conversational, and authentic';
  const instruction = input.instruction ? `User's Custom Refinement Request: "${input.instruction}"` : 'Make it sound natural, remove repetitive expressions, and improve readability.';
  const vocab = input.preferredVocabulary && input.preferredVocabulary.length > 0 ? `Preferred Vocabulary: ${input.preferredVocabulary.join(', ')}` : '';
  const avoid = input.wordsToAvoid && input.wordsToAvoid.length > 0 ? `BANNED Words to Avoid: ${input.wordsToAvoid.join(', ')}` : '';
  const cta = input.ctaStyle ? `CTA Style: ${input.ctaStyle}` : '';

  return `Refine and improve the following rough Instagram caption:

--- ORIGINAL CAPTION ---
"${input.caption}"
-----------------------

${brand}
${industry}
${audience}
Tone Required: ${tone}
${instruction}
${vocab}
${avoid}
${cta}

Refinement Goals:
1. Make the opening hook punchy and attention-grabbing.
2. Fix all awkward phrasing, passive voice, and grammar issues.
3. Remove robotic buzzwords, repetitive filler phrases, and cheesy sparkle/star emojis (✨, 🌟).
4. Maintain the brand voice and original message intact.
5. Strict Word Count Constraint: Keep length within 40–100 words (promotional: 30–60 words, educational: 60–120 words, festival: 15–40 words).
6. Purpose-Driven Focus:
   - Product post -> Features + Benefits + CTA
   - Service post -> Problem + Solution + Benefits
   - Educational post -> Information + Value + CTA
   - Festival post -> Greeting + Emotion (Warm, brief, NO promotional pitch!)
   - Brand post -> Identity + Trust + USP

Respond with a JSON object in exactly this format:
{
  "originalCaption": "${input.caption.replace(/"/g, '\\"')}",
  "refinedCaption": "The complete polished, ready-to-publish caption with line breaks and natural emojis",
  "hook": "The extracted or improved opening hook sentence",
  "callToAction": "The extracted or improved CTA",
  "improvementsMade": [
    "Removed AI filler words",
    "Enhanced scroll-stopping power of the opening hook",
    "Formatted spacing for mobile readability"
  ],
  "readabilityScore": 92 // Estimated readability on a scale of 0-100
}`;
}

export interface EvaluateQualityPromptInput {
  caption: string;
  topic?: string;
  hashtags?: string[];
  brandName?: string;
  targetAudience?: string;
  tone?: string;
}

export function buildEvaluateQualityPrompt(input: EvaluateQualityPromptInput): string {
  const brand = input.brandName ? `Brand: ${input.brandName}` : '';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : '';
  const topic = input.topic ? `Intended Topic: "${input.topic}"` : '';
  const tags = input.hashtags && input.hashtags.length > 0 ? `Hashtags Included: ${input.hashtags.join(' ')}` : '';

  return `Critically evaluate the following Instagram caption across professional copywriting benchmarks:

--- CAPTION TO EVALUATE ---
"${input.caption}"
---------------------------
${topic}
${brand}
${audience}
${tags}

Evaluate on a scale of 0-100 for each category:
1. Natural Language Quality: Does it sound like a real human wrote it, or robotic/AI-generated?
2. Topic Relevance: How closely does the text address the core subject?
3. Originality & Hook Strength: Does the opening grab attention without clickbait?
4. Grammar & Clarity: Punctuation, rhythm, flow, sentence structure, mobile spacing.
5. Brand Voice & Audience Fit: Does it resonate with the target audience?
6. Hashtag Relevance: Are the tags contextual rather than generic spam?

Respond with a JSON object in exactly this format:
{
  "overallScore": 88, // 0-100 composite average
  "categoryScores": {
    "naturalLanguage": 90,
    "topicRelevance": 92,
    "originality": 85,
    "grammarAndClarity": 95,
    "brandVoice": 84,
    "hashtagRelevance": 82
  },
  "isHumanSounding": true,
  "strengths": [
    "Strong opening question that creates immediate curiosity",
    "Clean paragraph spacing that prevents eye strain"
  ],
  "suggestionsForImprovement": [
    "Add a more specific call-to-action inviting followers to share their experiences"
  ],
  "flaggedClichés": [] // List any overused marketing buzzwords found, or empty array if clean
}`;
}
