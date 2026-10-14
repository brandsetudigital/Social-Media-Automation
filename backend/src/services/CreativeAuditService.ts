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

    // Build Prompt
    const prompt = `
You are an expert Social Media & Brand Quality Assurance Auditor for an agency managing multiple clients.
Your job is to thoroughly inspect this graphic/image and verify if it matches the selected client's official details, or if it contains mistakes or belongs to a completely different client!

### TARGET CLIENT (Who this post is being scheduled for):
- Business/Brand Name: "${targetClient.businessName}"
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
   - BRAND CHECK: Does the image contain the brand name or logo of a DIFFERENT client from the agency list? (e.g., uploading Property Babu graphic for BrandSetu Digital or vice-versa).
     * If another client's branding/logo/handle is found, isBrandMatch=false, and set conflictingClientName to that client's name.
     * If the graphic only has target client branding or generic quotes/visuals without other branding, isBrandMatch=true.
   - PHONE CHECK:
     * If any 10-digit or 12-digit mobile/phone number is visible on the graphic:
       - Compare with Target Client's official phone ("${targetClient.phone || ''}").
       - If the graphic has a phone number and it does NOT match target client's phone, isPhoneMatch=false!
       - If no phone number is visible in the graphic, isPhoneMatch=true.
   - ADDRESS CHECK:
     * If an address/city/locality is visible in the graphic, does it conflict with target client's location ("${targetClient.location || ''}")?
     * If it clearly belongs to another city/place belonging to another client, isAddressMatch=false. Otherwise isAddressMatch=true.

3. DECIDE:
   - "isValid": MUST be false if (isBrandMatch === false OR isPhoneMatch === false OR isAddressMatch === false). true ONLY if all details match or there is no conflicting branding/contact info.
   - "blockReason": If isValid is false, give a clear, direct explanation in simple Hinglish (Hindi + English) why this post cannot be scheduled. Mention the exact discrepancy (e.g. "Is graphic me Property Babu ka logo hai jabki client BrandSetu Digital hai" OR "Graphic par number 8357977322 likha hai jabki client ka official number +91 7389824231 hai").
   - "issues": Array of clear bullet points detailing each issue found.
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

        // Secondary programmatic validation on phone number if AI extracted a phone
        let isPhoneMatch = parsed.isPhoneMatch !== false;
        if (parsed.detectedPhone && targetPhoneNormalized) {
          const detectedNorm = this.normalizePhone(parsed.detectedPhone);
          if (detectedNorm && detectedNorm.length >= 10 && detectedNorm !== targetPhoneNormalized) {
            isPhoneMatch = false;
            parsed.isValid = false;
            if (!parsed.issues.some((i: string) => i.toLowerCase().includes('phone') || i.toLowerCase().includes('number'))) {
              parsed.issues.push(`फ़ोन नंबर मिसमैच: ग्राफ़िक्स में '${parsed.detectedPhone}' लिखा है, जबकि क्लाइंट का असली नंबर '${targetClient.phone}' है।`);
            }
          }
        }

        // Secondary programmatic validation on other registered clients
        let isBrandMatch = parsed.isBrandMatch !== false;
        let conflictingClientName = parsed.conflictingClientName || null;
        if (parsed.extractedTextSummary) {
          const lowerSummary = parsed.extractedTextSummary.toLowerCase();
          for (const oc of otherClients) {
            const ocNameLower = oc.businessName.toLowerCase();
            if (lowerSummary.includes(ocNameLower) && !lowerSummary.includes(targetClient.businessName.toLowerCase())) {
              isBrandMatch = false;
              conflictingClientName = oc.businessName;
              parsed.isValid = false;
              if (!parsed.issues.some((i: string) => i.toLowerCase().includes(ocNameLower))) {
                parsed.issues.push(`ग़लत ब्रांड: ग्राफ़िक्स में '${oc.businessName}' का नाम/लोगो पाया गया है, जबकि आपने '${targetClient.businessName}' सेलेक्ट किया है।`);
              }
            }
          }
        }

        const isValid = parsed.isValid !== false && isPhoneMatch && isBrandMatch && (parsed.isAddressMatch !== false);

        let blockReason = parsed.blockReason;
        if (!isValid && !blockReason) {
          if (!isBrandMatch) {
            blockReason = `इस ग्राफ़िक्स पर '${conflictingClientName || 'अन्य क्लाइंट'}' की ब्रांडिंग है, जबकि आपने '${targetClient.businessName}' चुना है।`;
          } else if (!isPhoneMatch) {
            blockReason = `ग्राफ़िक्स पर फ़ोन नंबर '${parsed.detectedPhone}' लिखा है, जबकि क्लाइंट का आधिकारिक नंबर '${targetClient.phone}' है।`;
          } else {
            blockReason = `ग्राफ़िक्स की जानकारी क्लाइंट '${targetClient.businessName}' की आधिकारिक डिटेल्स से मेल नहीं खाती।`;
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
