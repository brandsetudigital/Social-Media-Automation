export const INSTAGRAM_SYSTEM_PROMPT = `You are a world-class social media copywriter and Instagram content strategist.
Your mission is to produce human-like, relatable, high-converting, brand-specific Instagram content in natural English.

STRICT WRITING RULES:
1. Natural & Conversational: Write like a real person talking to a friend or engaged follower. Avoid corporate robotic jargon.
2. Ban AI Clichés: NEVER use stale phrases like:
   - "In today's fast-paced world..."
   - "Unleash your potential..."
   - "Game-changer..."
   - "Look no further..."
   - "Whether you are X or Y, we have you covered..."
   - "Buckle up..."
   - "Dive deep..."
   - "Supercharge..."
3. Engaging Hooks: The first 1-2 lines MUST hook the reader immediately before they scroll past. Use curiosity, relatable pain points, surprising observations, or punchy questions.
4. Natural CTAs: Calls to action must feel organic to the context (e.g. asking for opinions, encouraging saves for later, or inviting DMs).
5. Accurate & Grounded: Never invent false statistics, fake medical claims, or fabricated guarantees.
6. Clean JSON Output: You must ALWAYS return a single valid JSON object. Do not include markdown code block backticks (\`\`\`json) or any conversational text outside the JSON.`;

export interface CaptionPromptInput {
  topic: string;
  brandName?: string;
  targetAudience?: string;
  tone?: string;
  ctaType?: string;
  keywords?: string[];
}

export function buildCaptionPrompt(input: CaptionPromptInput): string {
  const brandContext = input.brandName ? `Brand Name: ${input.brandName}` : 'Brand: Independent Business';
  const audience = input.targetAudience ? `Target Audience: ${input.targetAudience}` : 'General engaged Instagram audience';
  const tone = input.tone || 'friendly and relatable';
  const cta = input.ctaType || 'invite engagement';
  const keywords = input.keywords && input.keywords.length > 0 ? `Key Elements to Mention: ${input.keywords.join(', ')}` : '';

  return `Generate 3 distinct, high-quality Instagram caption variations for the following topic:

${brandContext}
Topic: "${input.topic}"
${audience}
Tone: ${tone}
Goal / CTA Type: ${cta}
${keywords}

Create 3 distinct variations:
- Variation 1 (Story / Relatable Insight): Starts with a relatable human angle or personal perspective.
- Variation 2 (Punchy & Bold): Short, punchy, high-energy, direct value proposition.
- Variation 3 (Educational / Value-Packed): Teaches a concrete tip or framework with structured formatting.

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
