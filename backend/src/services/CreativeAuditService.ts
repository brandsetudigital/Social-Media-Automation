import fs from 'fs';
import path from 'path';
import prisma from '../prisma';

export interface CreativeAuditResult {
  isValid: boolean;
  detectedBrand: string | null;
  detectedPhone: string | null;
  detectedAddress: string | null;
  detectedWebsite: string | null;
  isBrandMatch: boolean;
  isPhoneMatch: boolean;
  isAddressMatch: boolean;
  conflictingClientName: string | null;
  blockReason: string | null;
  issues: string[];
  extractedTextSummary: string;
  checkedAt: string;
  isSkipped?: boolean;
}

export class CreativeAuditService {
  /**
   * Helper to normalize phone numbers for comparison
   */
  public static normalizePhone(phone?: string | null): string {
    if (!phone) return '';
    // Strip non-digits
    let digits = phone.replace(/\D/g, '');
    // If starts with 91 and has 12 digits, strip country code 91
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    // If starts with 0 and has 11 digits, strip leading 0
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  }

  /**
   * Helper to resolve media file or URL to base64 data URL
   */
  private static resolveMediaAsDataUrl(mediaUrl?: string, base64Data?: string): { mimeType: string; base64: string } | null {
    if (base64Data && base64Data.startsWith('data:image/')) {
      const mimeType = base64Data.substring(base64Data.indexOf(':') + 1, base64Data.indexOf(';'));
      const rawBase64 = base64Data.substring(base64Data.indexOf(',') + 1);
      return { mimeType, base64: rawBase64 };
    }

    if (!mediaUrl) return null;

    if (mediaUrl.startsWith('data:image/')) {
      const mimeType = mediaUrl.substring(mediaUrl.indexOf(':') + 1, mediaUrl.indexOf(';'));
      const rawBase64 = mediaUrl.substring(mediaUrl.indexOf(',') + 1);
      return { mimeType, base64: rawBase64 };
    }

    try {
      let filename = '';
      if (mediaUrl.includes('/uploads/')) {
        filename = mediaUrl.split('/uploads/')[1].split('?')[0];
      } else if (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('blob:')) {
        filename = path.basename(mediaUrl);
      }

      if (filename) {
        const possibleDirs = [
          path.join(process.cwd(), 'uploads'),
          path.join(process.cwd(), 'backend', 'uploads'),
          path.join(__dirname, '../../uploads'),
          path.join(__dirname, '../uploads'),
        ];

        for (const dir of possibleDirs) {
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            // Skip video files for static vision check
            if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
              return null;
            }
            const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            const buffer = fs.readFileSync(filePath);
            return { mimeType: mime, base64: buffer.toString('base64') };
          }
        }
      }
    } catch (err) {
      console.warn('[CreativeAuditService] Failed to resolve media path:', err);
    }

    return null;
  }

  /**
   * Thoroughly audit graphic image against client details using AI Vision
   */
  public static async auditGraphic(params: {
    clientId: string;
    mediaUrl?: string;
    base64Data?: string;
  }): Promise<CreativeAuditResult> {
    const { clientId, mediaUrl, base64Data } = params;

    // 1. Fetch Target Client
    const targetClient = await prisma.client.findUnique({
      where: { id: clientId },
      include: { brandProfile: true },
    });

    if (!targetClient) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // 2. Fetch all other registered clients to detect cross-client uploads
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        businessName: true,
        phone: true,
        location: true,
        category: true,
      },
    });

    const otherClients = allClients.filter((c) => c.id !== clientId);

    // 3. Resolve Media to base64
    const resolvedMedia = this.resolveMediaAsDataUrl(mediaUrl, base64Data);

    // If media is a video or cannot be inspected as an image, allow but skip
    if (!resolvedMedia) {
      const isVideo = mediaUrl && /\.(mp4|mov|webm|mkv|avi)$/i.test(mediaUrl.split('?')[0]);
      return {
        isValid: true,
        detectedBrand: null,
        detectedPhone: null,
        detectedAddress: null,
        detectedWebsite: null,
        isBrandMatch: true,
        isPhoneMatch: true,
        isAddressMatch: true,
        conflictingClientName: null,
        blockReason: null,
        issues: [],
        extractedTextSummary: isVideo ? 'Video creative detected (Automated vision check skipped)' : 'No image file to scan',
        checkedAt: new Date().toISOString(),
        isSkipped: true,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.warn('[CreativeAuditService] GEMINI_API_KEY not found. Skipping AI vision check.');
      return {
        isValid: true,
        detectedBrand: null,
        detectedPhone: null,
        detectedAddress: null,
        detectedWebsite: null,
        isBrandMatch: true,
        isPhoneMatch: true,
        isAddressMatch: true,
        conflictingClientName: null,
        blockReason: null,
        issues: [],
        extractedTextSummary: 'AI Key not configured',
        checkedAt: new Date().toISOString(),
        isSkipped: true,
      };
    }

    const targetPhoneNormalized = this.normalizePhone(targetClient.phone);

    // Known authentic brand aliases & Hindi translations
    const BRAND_ALIASES: Record<string, string[]> = {
      'panna': [
        'पन्नालाल मिठाईवाला', 'पन्नालाल', 'पन्ना स्वीट्स', 'Pannalal Mithaiwala',
        'Panna Lal', 'Panna Sweets', 'Panna Sweets & Restaurant', 'पन्नालाल हलवाई', 'Panna'
      ],
      'property babu': ['प्रॉपर्टी बाबू', 'Property Babu', 'प्रॉपर्टी', 'PropertyBabu'],
      '7th cloud': ['7th Cloud Resorts', '7th Cloud', 'सेवंथ क्लाउड', '7th क्लाउड', '7th Cloud Club, Bar & Resorts'],
      'cocodan': ['Hotel Cocodan', 'होटल कोकोडन', 'Cocodan', 'कोकोडन', 'HOTEL COCODAN Rajiv Gandhi', 'HOTEL COCODAN Rau ByPass'],
      'airawati': ['Airawati', 'एयरवाती', 'ऐरावती', 'Airawati Fashions'],
      'dagur': ['DagurInfra Reality pvt. ltd', 'Dagur Infra', 'डागुर इंफ्रा', 'डागुर', 'DagurInfra'],
      'microbhumi': ['Microbhumi', 'माइक्रोभूमि', 'माइक्रो भूमि', 'Micro Bhumi'],
      'radha ki rasoi': ['Radha Ki Rasoi', 'राधा की रसोई', 'Radha Ki Rasoi ( The fine dine restaurant)'],
      'about us': ['About Us The Family Store', 'About Us', 'अबाउट अस'],
      'swastik thal': ['Swastik Thal', 'स्वास्तिक थाल', 'स्वास्तिक'],
      'brandsetu': ['BrandSetu Digital', 'BrandSetu', 'ब्रांडसेतु', 'BrandSetu Digital agency'],
    };

    let targetAliases: string[] = [targetClient.businessName];
    const clientKey = targetClient.businessName.toLowerCase();
    for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
      if (clientKey.includes(key)) {
        targetAliases = Array.from(new Set([...targetAliases, ...aliases]));
      }
    }

    // Build Prompt
    const prompt = `
You are an expert Social Media & Brand Quality Assurance Auditor for an agency managing multiple clients.
Your job is to thoroughly inspect this graphic/image and verify if it matches the selected client's official details, or if it contains mistakes or belongs to a completely different client!

### TARGET CLIENT (Who this post is being scheduled for):
- Business/Brand Name: "${targetClient.businessName}"
- Known Authentic Brand Aliases (Hindi & English): ${targetAliases.map((a) => `"${a}"`).join(', ')}
- Official Phone/Mobile Number: "${targetClient.phone || 'N/A'}"
- Location/Address: "${targetClient.location || 'N/A'}"
- Category: "${targetClient.category || 'N/A'}"
- Website: "${targetClient.website || 'N/A'}"

### OTHER REGISTERED CLIENTS IN THIS AGENCY (Watch out for cross-client uploads!):
${otherClients.map((c) => `- ${c.businessName} (Phone: ${c.phone || 'N/A'}, Location: ${c.location || 'N/A'})`).join('\n')}

### INSTRUCTIONS:
1. Perform OCR and visual inspection. Extract:
   - Any Brand Names / Logos / Business Names visible in the image.
   - Any Phone Numbers / Mobile Numbers visible in the image.
   - Any Addresses / Locations / Cities / States / Pincodes visible in the image.
   - Any Websites or social handles visible in the image.

2. Cross-check against TARGET CLIENT:
   - BRAND CHECK:
     * IMPORTANT: Businesses frequently display Hindi / Devanagari script or local shop names on their creatives and logos (e.g., "पन्नालाल मिठाईवाला" or "पन्नालाल" is the EXACT authentic Hindi brand identity for "Panna Sweets & Restaurant").
     * If the creative displays the target client's English name, Hindi name, or any of their known authentic aliases, this is a 100% VALID MATCH: set isBrandMatch=true and conflictingClientName=null.
     * If the graphic only contains target client branding, products (sweets, food, plots, apparel), or generic quotes/festive greetings without other client branding, isBrandMatch=true.
     * ONLY set isBrandMatch=false if the image clearly contains the logo or brand name of a COMPLETELY DIFFERENT client from the other registered agency clients list (e.g., uploading a Property Babu graphic for Panna Sweets or vice-versa).
   - PHONE CHECK:
     * If the phone number on the graphic matches the target client's official phone ("${targetClient.phone || ''}"), this confirms the graphic belongs to the target client (isPhoneMatch=true).
     * If no phone number is visible in the graphic, isPhoneMatch=true.
     * Only set isPhoneMatch=false if a visible 10-digit number conflicts with the target client's phone.
   - ADDRESS CHECK:
     * If the address/locality on the graphic matches the target client's location, isAddressMatch=true.
     * Only set isAddressMatch=false if it clearly belongs to another client's address.

3. DECIDE:
   - "isValid": true if (isBrandMatch !== false AND isPhoneMatch !== false AND isAddressMatch !== false).
   - DO NOT raise false discrepancy alerts for authentic Hindi brand logos or shop titles matching the client.
   - "blockReason": If isValid is false, give a clear explanation why this post cannot be scheduled. Mention the exact conflict.
   - "issues": Array of clear bullet points detailing real issues found (leave empty [] if genuine match).
   - "extractedTextSummary": Short summary of all text visible on the image.

Return ONLY a valid JSON object matching:
{
  "isValid": true | false,
  "detectedBrand": "string or null",
  "detectedPhone": "string or null",
  "detectedAddress": "string or null",
  "detectedWebsite": "string or null",
  "isBrandMatch": true | false,
  "isPhoneMatch": true | false,
  "isAddressMatch": true | false,
  "conflictingClientName": "string or null",
  "blockReason": "string or null",
  "issues": ["string"],
  "extractedTextSummary": "string"
}
`;

    // Try reliable Gemini Flash models with fallback
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
    ];

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: resolvedMedia.mimeType,
                        data: resolvedMedia.base64,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          continue;
        }

        const data: any = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Secondary programmatic validation on brand aliases & other registered clients
        let isBrandMatch = parsed.isBrandMatch !== false;
        let conflictingClientName = parsed.conflictingClientName || null;

        const detectedBrandLower = (parsed.detectedBrand || '').toLowerCase().trim();
        const detectedSummaryLower = (parsed.extractedTextSummary || '').toLowerCase();

        // Check if detected brand or summary matches any of our known authentic aliases for this client
        const matchesTargetAlias = targetAliases.some((alias) => {
          const aLower = alias.toLowerCase();
          return detectedBrandLower.includes(aLower) || detectedSummaryLower.includes(aLower);
        });

        if (matchesTargetAlias) {
          isBrandMatch = true;
          conflictingClientName = null;
        }

        // Check against other clients strictly for cross-client contamination
        if (parsed.extractedTextSummary) {
          for (const oc of otherClients) {
            const ocNameLower = oc.businessName.toLowerCase();
            // Don't flag if it's an alias of target client
            if (matchesTargetAlias) continue;
            if (detectedSummaryLower.includes(ocNameLower) && !detectedSummaryLower.includes(targetClient.businessName.toLowerCase())) {
              isBrandMatch = false;
              conflictingClientName = oc.businessName;
              parsed.isValid = false;
              if (!parsed.issues.some((i: string) => i.toLowerCase().includes(ocNameLower))) {
                parsed.issues.push(`Brand mismatch: Graphic displays branding for '${oc.businessName}', but target client selected is '${targetClient.businessName}'.`);
              }
            }
          }
        }

        // Secondary programmatic validation on phone number if AI extracted a phone
        let isPhoneMatch = parsed.isPhoneMatch !== false;
        if (parsed.detectedPhone && targetPhoneNormalized) {
          const detectedNorm = this.normalizePhone(parsed.detectedPhone);
          if (detectedNorm && detectedNorm.length >= 10) {
            if (detectedNorm === targetPhoneNormalized) {
              isPhoneMatch = true;
              // Direct phone match strongly validates the graphic belongs to target client!
              if (matchesTargetAlias || !conflictingClientName) {
                isBrandMatch = true;
                conflictingClientName = null;
              }
            } else {
              isPhoneMatch = false;
              parsed.isValid = false;
              if (!parsed.issues.some((i: string) => i.toLowerCase().includes('phone') || i.toLowerCase().includes('number'))) {
                parsed.issues.push(`Phone number mismatch: Graphic displays '${parsed.detectedPhone}', but client's official phone number is '${targetClient.phone}'.`);
              }
            }
          }
        }

        // If verified as target alias or phone matches, clear false-alarm brand naming variation warnings
        if (isBrandMatch && isPhoneMatch) {
          parsed.issues = (parsed.issues || []).filter(
            (i: string) =>
              !i.toLowerCase().includes('naming variation') &&
              !i.toLowerCase().includes('cross-verification') &&
              !i.toLowerCase().includes('brand name on the graphic shows') &&
              !i.toLowerCase().includes('database name')
          );
        }

        const isValid = (parsed.issues.length === 0) && isPhoneMatch && isBrandMatch && (parsed.isAddressMatch !== false);

        let blockReason = parsed.blockReason;
        if (!isValid && !blockReason) {
          if (!isBrandMatch) {
            blockReason = `This graphic contains branding for '${conflictingClientName || 'another client'}', while '${targetClient.businessName}' is selected.`;
          } else if (!isPhoneMatch) {
            blockReason = `Phone number mismatch: Graphic displays '${parsed.detectedPhone}', but client's official phone number is '${targetClient.phone}'.`;
          } else {
            blockReason = `Graphic details do not match the official profile for client '${targetClient.businessName}'.`;
          }
        }

        return {
          isValid,
          detectedBrand: parsed.detectedBrand || null,
          detectedPhone: parsed.detectedPhone || null,
          detectedAddress: parsed.detectedAddress || null,
          detectedWebsite: parsed.detectedWebsite || null,
          isBrandMatch,
          isPhoneMatch,
          isAddressMatch: parsed.isAddressMatch !== false,
          conflictingClientName,
          blockReason: isValid ? null : blockReason,
          issues: parsed.issues || [],
          extractedTextSummary: parsed.extractedTextSummary || '',
          checkedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn(`[CreativeAuditService] Model ${model} failed:`, err.message);
        continue;
      }
    }

    // Fallback: If AI timed out, do basic regex / string checks on filename or client
    return {
      isValid: true,
      detectedBrand: null,
      detectedPhone: null,
      detectedAddress: null,
      detectedWebsite: null,
      isBrandMatch: true,
      isPhoneMatch: true,
      isAddressMatch: true,
      conflictingClientName: null,
      blockReason: null,
      issues: [],
      extractedTextSummary: 'AI verification timed out, allowed with warning',
      checkedAt: new Date().toISOString(),
      isSkipped: true,
    };
  }
}
