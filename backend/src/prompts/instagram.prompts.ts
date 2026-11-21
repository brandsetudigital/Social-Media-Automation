export const INSTAGRAM_SYSTEM_PROMPT = `You are a world-class social media copywriter and Instagram content strategist.
Your mission is to produce human-like, relatable, high-converting, brand-specific Instagram content in natural English.

STRICT WRITING RULES:
1. Natural & Conversational: Write like an authentic human talking to an engaged follower or client. Avoid corporate robotic jargon.
2. Ban AI Clichés & Stereotypes: NEVER use stale AI phrases:
   - "In today's fast-paced world..."
   - "Unleash your potential..."
   - "Game-changer..."
   - "Look no further..."
   - "Whether you are X or Y, we have you covered..."
   - "Dedicated to delivering..." (use "committed to delivering" or "focused on providing")
   - "Crafted specially for..." (use "Specially designed to meet the needs of...")
   - "Quality and excellence you can count on..."
   - "Drop a comment or DM us to know more! 👇" (use natural conversational questions)
   - "Buckle up..."
   - "Dive deep..."
   - "Supercharge..."
3. STRICT EMOJI CONTROL (DO NOT OVERUSE EMOJIS):
   - NEVER put sparkle or star emojis (✨, 🌟) or celebratory emoji spam (🎉, 🚀, 👇, 💬) in titles or every paragraph.
   - Use at most 0 to 1 subtle, contextual emoji in the entire post, or NO emojis at all.
   - Overusing emojis screams "AI-generated bot" and destroys brand trust.
4. Correct Grammar & Capitalization:
   - Use compound modifiers properly (e.g. "premium-quality" instead of "Premium quality").
   - Do NOT randomly capitalize common nouns (write "families, professionals, and local businesses", NOT "Families, Professionals and Local Customers").
5. Engaging Hooks: The first 1-2 lines MUST hook the reader immediately before they scroll past. Use curiosity, relatable pain points, surprising observations, or punchy questions.
6. Natural CTAs: Calls to action must feel organic to the context (e.g. asking for opinions, encouraging saves for later, or inviting DMs).
7. Accurate & Grounded: Never invent false statistics, fake medical claims, or fabricated guarantees.
8. Purpose-Driven Caption Architecture (Do NOT force all elements into every post):
   - Product post -> Features + Benefits + CTA
   - Service post -> Problem + Solution + Benefits (+ optional CTA)
   - Educational post -> Information + Value + CTA
   - Festival post -> Warm Greeting + Emotion (Keep it heartfelt, warm, and concise; NO sales pitch!)
   - Brand post -> Identity + Trust + USP
9. Strict Caption Length Guidelines (Word Counts):
   - Instagram posts: 40–100 words
   - Facebook posts: 40–100 words
   - LinkedIn posts: 80–150 words
   - Promotional posts: 30–60 words
   - Educational posts: 60–120 words
   - Festival posts: 15–40 words
10. Clean JSON Output: You must ALWAYS return a single valid JSON object. Do not include markdown code block backticks (\`\`\`json) or any conversational text outside the JSON.`;

export interface CaptionPromptInput {
  topic: string;
  brandName?: string;
  targetAudience?: string;
  tone?: string;
  postPurpose?: string;
  ctaType?: string;
  keywords?: string[];
}

export function buildCaptionPrompt(input: CaptionPromptInput): string {
  const brandContext = input.brandName ? `Brand Name: ${input.brandName}` : 'Brand: Independent Business';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : 'General engaged Instagram audience';
  const tone = input.tone || 'friendly and relatable';
  const cta = input.ctaType || 'invite engagement';
  const purpose = input.postPurpose || 'general';
  const keywords = input.keywords && input.keywords.length > 0 ? `Key Elements to Mention: ${input.keywords.join(', ')}` : '';

  let purposeGuidance = '';
  if (purpose === 'product') {
    purposeGuidance = 'Format: Features + Benefits + CTA. Length: 40-80 words.';
  } else if (purpose === 'service') {
    purposeGuidance = 'Format: Problem + Solution + Benefits. Length: 40-100 words.';
  } else if (purpose === 'educational') {
    purposeGuidance = 'Format: Information + Value + CTA. Length: 60-120 words.';
  } else if (purpose === 'festival') {
    purposeGuidance = 'Format: Warm Greeting + Emotion. STRICT RULE: Keep it heartfelt and brief (15-40 words), NO promotional sales pitching!';
  } else if (purpose === 'brand') {
    purposeGuidance = 'Format: Identity + Trust + USP. Length: 40-90 words.';
  } else if (purpose === 'promotional') {
    purposeGuidance = 'Format: Punchy Hook + Concrete Offer + Clear CTA. Length: 30-60 words.';
  } else {
    purposeGuidance = 'Length: 40-100 words. Keep it natural, human, and focused.';
  }

  return `Generate 3 distinct, high-quality Instagram caption variations for the following topic:

${brandContext}
Topic: "${input.topic}"
${audience}
Tone: ${tone}
Post Purpose: ${purpose.toUpperCase()} (${purposeGuidance})
Goal / CTA Type: ${cta}
${keywords}

Create 3 distinct variations:
- Variation 1 (Story / Relatable Insight): Starts with a relatable human angle or personal perspective.
- Variation 2 (Punchy & Bold): Short, punchy, high-energy, direct value proposition.
- Variation 3 (Educational / Value-Packed): Teaches a concrete tip or framework with structured formatting.

IMPORTANT: Respect the word count and purpose structure above. Do not force unnecessary corporate elements or buzzwords. Keep emoji use to 0-1 subtle emoji max.

Respond with a JSON object in exactly this format:
{
  "topic": "${input.topic}",
  "variations": [
    {
      "variationId": 1,
      "style": "Story / Relatable Insight",
      "hook": "Opening 1-2 sentences that stop the scroll",
      "body": "The core caption narrative, conversational and spaced for readability",
      "callToAction": "Natural call to action",
      "suggestedEmojis": ["✨", "☕"],
      "fullCaption": "The complete caption ready to publish, combining hook, body, emojis, and CTA."
    },
    {
      "variationId": 2,
      "style": "Punchy & Bold",
      "hook": "Punchy scroll-stopping opener",
      "body": "Fast-paced, bold value statements",
      "callToAction": "Direct organic CTA",
      "suggestedEmojis": ["🔥", "⚡"],
      "fullCaption": "The complete caption ready to publish."
    },
    {
      "variationId": 3,
      "style": "Educational / Value-Packed",
      "hook": "Curiosity or problem-focused opener",
      "body": "Structured tips or takeaways formatted with clean line breaks",
      "callToAction": "Save or share CTA",
      "suggestedEmojis": ["📌", "💡"],
      "fullCaption": "The complete caption ready to publish."
    }
  ]
}`;
}

export interface HashtagPromptInput {
  topic: string;
  brandNiche?: string;
  count?: number;
}

export function buildHashtagPrompt(input: HashtagPromptInput): string {
  const count = input.count || 15;
  const niche = input.brandNiche ? `Industry/Niche: ${input.brandNiche}` : '';

  return `Generate exactly ${count} highly targeted, active Instagram hashtags for the following topic:

Topic: "${input.topic}"
${niche}

Rules for hashtags:
- Do NOT include generic spam tags like #love, #instagood, #followme, #happy.
- Divide them into three logical tiers:
  1. Niche: Specific to the industry / micro-community (moderate competition, high relevance).
  2. Audience: Describing who the content is for (ideal followers / target clients).
  3. Topic: Directly describing the specific subject of the post.
- Ensure every hashtag starts with "#" and contains no spaces or illegal characters.

Respond with a JSON object in exactly this format:
{
  "topic": "${input.topic}",
  "totalCount": ${count},
  "categorized": {
    "niche": ["#nicheTag1", "#nicheTag2"],
    "audience": ["#audienceTag1", "#audienceTag2"],
    "topic": ["#topicTag1", "#topicTag2"]
  },
  "allHashtags": ["#tag1", "#tag2", "#tag3"],
  "formattedString": "#tag1 #tag2 #tag3"
}`;
}

export interface ContentIdeasPromptInput {
  topic: string;
  brandName?: string;
  targetAudience?: string;
  count?: number;
  format?: string;
}

export function buildContentIdeasPrompt(input: ContentIdeasPromptInput): string {
  const count = input.count || 5;
  const brand = input.brandName ? `Brand: ${input.brandName}` : '';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : '';
  const format = input.format || 'all';

  return `Generate ${count} creative, high-performing Instagram content ideas based on the following:

Topic / Theme: "${input.topic}"
${brand}
${audience}
Preferred Format: ${format}

Include a mix of content pillars:
- Educational (saves & shares)
- Relatable / Behind the Scenes (comments & community)
- Promotional / High Intent (inquiries & conversions)

Respond with a JSON object in exactly this format:
{
  "theme": "${input.topic}",
  "ideas": [
    {
      "id": 1,
      "title": "Clear catchy concept title",
      "format": "CAROUSEL", // POST, CAROUSEL, or REEL
      "pillar": "EDUCATIONAL", // EDUCATIONAL, RELATABLE, or PROMOTIONAL
      "hook": "Opening hook line / cover slide headline",
      "conceptSummary": "2-3 sentences explaining the core concept and visuals",
      "carouselSlides": ["Slide 1: Hook", "Slide 2: Context", "Slide 3: Actionable Tip", "Slide 4: Recap & CTA"], // include if CAROUSEL
      "reelAudioSuggestion": "Trending voiceover or upbeat lofi beat", // include if REEL
      "callToAction": "Suggested CTA to boost engagement"
    }
  ]
}`;
}

export interface ComparisonPromptInput {
  topic: string;
  brandName?: string;
  targetAudience?: string;
  tone?: string;
  ctaType?: string;
}

export function buildComparisonPrompt(input: ComparisonPromptInput): string {
  const brand = input.brandName ? `Brand: ${input.brandName}` : 'Brand: Independent Business';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : 'Engaged Instagram users';
  const tone = input.tone || 'friendly and relatable';
  const cta = input.ctaType || 'invite engagement';

  return `Generate an engaging Instagram post package (hook, caption body, call to action, and 5-8 hashtags) for the following topic:

Topic: "${input.topic}"
${brand}
${audience}
Tone: ${tone}
CTA Style: ${cta}

Strict requirements:
- Natural, conversational human tone. Zero AI buzzwords.
- Hook must be scroll-stopping.
- Provide 5-8 relevant hashtags in an array (each starting with '#').

Respond strictly in pure JSON in this format:
{
  "hook": "Opening 1-2 punchy sentences that stop the scroll",
  "caption": "The main caption text, well-spaced with organic emojis and clear value",
  "callToAction": "Clear natural CTA",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;
}
