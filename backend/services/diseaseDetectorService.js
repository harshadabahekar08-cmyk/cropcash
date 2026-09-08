/**
 * CropCash Crop Disease Detector Service
 * Handles safe WhatsApp image retrieval, validation, Gemini Multimodal Vision AI adapter,
 * and multilingual farmer-friendly response formatting.
 */

const { detectLanguage } = require("./languageDetector");

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MEDIA_FETCH_TIMEOUT_MS = 8000;           // 8000 ms
const GEMINI_VISION_TIMEOUT_MS = 12000;        // 12000 ms

/**
 * Resolves temporary download URL for a Meta WhatsApp media ID
 * @param {string} mediaId - WhatsApp media ID
 * @param {Function} [fetchFn=fetch] - Injected fetcher for testing
 * @returns {Promise<{ url: string, mimeType: string, fileSize?: number } | null>}
 */
async function getWhatsAppMediaUrl(mediaId, fetchFn = fetch) {
  if (!mediaId || typeof mediaId !== "string") {
    return null;
  }

  const accessToken = process.env.ACCESS_TOKEN?.trim();
  const apiVersion = process.env.GRAPH_API_VERSION || "v21.0";

  if (!accessToken) {
    console.error("Missing ACCESS_TOKEN in environment for media URL retrieval.");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);

    const response = await fetchFn(
      `https://graph.facebook.com/${apiVersion}/${mediaId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "CropCash-DiseaseDetector/1.0"
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Meta media URL lookup failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.url) {
      return null;
    }

    return {
      url: data.url,
      mimeType: data.mime_type || "image/jpeg",
      fileSize: data.file_size
    };
  } catch (error) {
    console.error("Error retrieving WhatsApp media URL:", error.message || error);
    return null;
  }
}

/**
 * Safely downloads image media bytes from Meta Cloud API
 * Enforces image-only validation, allowed MIME types, 10MB limit, and 8000ms timeout
 * @param {string} mediaId - WhatsApp media ID
 * @param {Function} [fetchFn=fetch] - Injected fetcher for testing
 * @returns {Promise<{ imageBuffer: Buffer|null, mimeType: string|null, success: boolean, errorCode?: string }>}
 */
async function retrieveWhatsAppImage(mediaId, fetchFn = fetch) {
  const mediaInfo = await getWhatsAppMediaUrl(mediaId, fetchFn);

  if (!mediaInfo || !mediaInfo.url) {
    return { imageBuffer: null, mimeType: null, success: false, errorCode: "MEDIA_NOT_FOUND" };
  }

  // Enforce MIME type validation
  const cleanMime = mediaInfo.mimeType.toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(cleanMime)) {
    console.warn(`Unsupported media type: ${cleanMime}. Allowed: JPEG, PNG, WEBP.`);
    return { imageBuffer: null, mimeType: cleanMime, success: false, errorCode: "UNSUPPORTED_TYPE" };
  }

  const accessToken = process.env.ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { imageBuffer: null, mimeType: cleanMime, success: false, errorCode: "AUTH_MISSING" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);

    const response = await fetchFn(mediaInfo.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CropCash-DiseaseDetector/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Media download failed: HTTP ${response.status}`);
      return { imageBuffer: null, mimeType: cleanMime, success: false, errorCode: "DOWNLOAD_FAILED" };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Enforce 10 MB size limit
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.warn(`Image size (${buffer.length} bytes) exceeds 10MB limit.`);
      return { imageBuffer: null, mimeType: cleanMime, success: false, errorCode: "FILE_TOO_LARGE" };
    }

    return {
      imageBuffer: buffer,
      mimeType: cleanMime,
      success: true
    };
  } catch (error) {
    console.error("Error downloading WhatsApp image media:", error.message || error);
    return { imageBuffer: null, mimeType: cleanMime, success: false, errorCode: "FETCH_TIMEOUT_OR_ERROR" };
  }
}

/**
 * Gemini Multimodal Vision Detector Adapter
 * Sends image buffer to Gemini Flash with unbiased, two-step visual pathology inspection:
 * Step 1: Positively identify the specific crop species strictly from the image.
 * Step 2: If identified, analyze for health / disease / pests.
 * @param {object} params
 * @param {Buffer} params.imageBuffer - Image binary buffer
 * @param {string} params.mimeType - Image MIME type
 * @param {string} [params.caption] - Optional farmer caption
 * @param {'en'|'hi'|'mr'|'hinglish'} [params.lang] - Target language
 * @param {Function} [params.fetchFn=fetch] - Injected fetcher for testing
 * @returns {Promise<object>} Structured disease diagnosis
 */
async function geminiVisionDetectorAdapter({ imageBuffer, mimeType = "image/jpeg", caption = "", lang = "en", fetchFn = fetch }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    console.log("No GEMINI_API_KEY found in environment. Disease model analysis skipped.");
    return {
      status: "uncertain",
      reason: "GEMINI_API_KEY_NOT_CONFIGURED"
    };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    return { status: "error", errorCode: "EMPTY_IMAGE_BUFFER" };
  }

  const promptLanguageInstruction = {
    mr: "Respond with descriptions, symptoms, and good practices in Marathi (मराठी). Include the disease name with common Marathi and English terminology.",
    hi: "Respond with descriptions, symptoms, and good practices in Hindi (हिंदी). Include the disease name with common Hindi and English terminology.",
    hinglish: "Respond in simple conversational Hinglish.",
    en: "Respond in clear English with common Indian agricultural terms."
  }[lang] || "Respond in clear English with Indian agricultural context.";

  const systemPrompt = `You are an expert, objective plant pathologist and agronomist.
Your task is to analyze the provided image with high scientific accuracy.

Farmer's optional caption: "${caption}"

Language Instruction: ${promptLanguageInstruction}

MANDATORY STEP-BY-STEP PROCESS:
1. CROP IDENTIFICATION:
   - Carefully inspect the botanical characteristics in the image (leaf shape, venation, leaf margins, arrangement, stem, texture).
   - Identify the EXACT agricultural crop/plant species shown in the photo.
   - DO NOT assume any default crop.
   - DO NOT assume the crop is Soybean unless the visual botanical features clearly match a Soybean plant (Glycine max).
   - If the image shows a different plant (e.g. Cotton, Tomato, Wheat, Mango, Guava, Rose, Citrus, Chilli, Maize, Weed, Houseplant, etc.), state that specific crop name.
   - If the plant species is ambiguous, obscured, non-crop, or cannot be reliably determined from the image, you MUST set "status": "uncertain" and "crop": null.

2. HEALTH & PATHOLOGY EVALUATION (Conditional on Step 1):
   - You may ONLY diagnose a crop disease if you have positively identified the crop in Step 1.
   - If the identified plant is healthy with no significant pest/pathogen symptoms, set "status": "healthy".
   - If clear, distinctive symptoms of disease, deficiency, or pest damage are visible, set "status": "detected".
   - If symptoms are vague, blurry, or inconclusive, set "status": "uncertain".

3. STRICT SAFETY RULES:
   - Never fabricate or guess a crop name or disease.
   - For "confidence", output a genuine float between 0.0 and 1.0 reflecting your true visual certainty.
   - In "goodPractices", recommend ONLY safe cultural and organic practices (e.g. proper aeration, water drainage, neem extract, Trichoderma, removing infected leaves). NEVER recommend hazardous or restricted chemical pesticides.

Output MUST be a strict JSON object with this schema:
{
  "status": "detected" | "healthy" | "uncertain" | "error",
  "crop": "Exact crop name in detected language (or null if uncertain/unidentified)",
  "diseaseName": "Specific disease/pest name (or null if healthy/uncertain)",
  "confidence": 0.0 to 1.0 (float reflecting model certainty),
  "symptoms": "Concise key symptoms visible in this photo (or empty if none)",
  "goodPractices": "Safe organic/cultural management advice (or empty if none)",
  "reason": "Brief explanation if status is uncertain"
}

Return ONLY the JSON object. No other text or markdown commentary.`;

  try {
    const base64Data = imageBuffer.toString("base64");
    const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_VISION_TIMEOUT_MS);

    const payload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            },
            {
              text: systemPrompt
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.0
      }
    };

    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Gemini API call failed: HTTP ${response.status}`);
      return { status: "uncertain", reason: `API_HTTP_${response.status}` };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return { status: "uncertain", reason: "EMPTY_MODEL_RESPONSE" };
    }

    // Clean JSON markdown block formatting if present
    const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleanedText);

    // Validate and sanitize parsed fields
    let status = ["detected", "healthy", "uncertain", "error"].includes(parsed.status) ? parsed.status : "uncertain";
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null;
    let crop = parsed.crop && typeof parsed.crop === "string" ? parsed.crop.trim() : null;
    let diseaseName = parsed.diseaseName && typeof parsed.diseaseName === "string" ? parsed.diseaseName.trim() : null;

    // Strict Rule: If crop is unknown, invalid, or confidence is too low, force uncertain
    if (crop) {
      const cropLower = crop.toLowerCase();
      if (cropLower.includes("unknown") || cropLower.includes("uncertain") || cropLower.includes("unidentified") || cropLower.includes("अस्पष्ट") || cropLower.includes("निश्चित नाही")) {
        crop = null;
        status = "uncertain";
        diseaseName = null;
      }
    }

    if (status === "detected") {
      // Must have identified crop, disease name, and reasonable confidence
      if (!crop || !diseaseName || (confidence !== null && confidence < 0.40)) {
        status = "uncertain";
        diseaseName = null;
      }
    }

    return {
      status,
      crop: status === "uncertain" && !crop ? null : crop,
      diseaseName: status === "detected" ? diseaseName : null,
      confidence,
      symptoms: parsed.symptoms || "",
      goodPractices: parsed.goodPractices || "",
      reason: parsed.reason || ""
    };
  } catch (error) {
    console.error("Gemini Vision detection error:", error.message || error);
    return { status: "uncertain", reason: "MODEL_PROCESSING_ERROR" };
  }
}

/**
 * Standard Disease Detection Result Schema:
 * {
 *   status: 'detected' | 'healthy' | 'uncertain' | 'error',
 *   crop?: string,
 *   diseaseName?: string,
 *   confidence?: number,
 *   symptoms?: string,
 *   goodPractices?: string,
 *   errorCode?: string
 * }
 */

/**
 * Disease Detector Adapter Interface
 * Accepts image bytes + metadata and evaluates through plugged model, Gemini adapter, or fallback
 * @param {object} params
 * @param {Buffer} [params.imageBuffer] - Downloaded image buffer
 * @param {string} [params.mimeType] - Image MIME type
 * @param {string} [params.caption] - Optional caption typed by farmer
 * @param {'en'|'hi'|'mr'|'hinglish'} [params.lang] - Detected language
 * @param {Function} [params.detectorModelAdapter] - Optional custom model adapter
 * @param {Function} [params.fetchFn=fetch] - Injected fetcher for testing
 * @returns {Promise<object>} Structured disease detection result
 */
async function analyzeCropDisease({ imageBuffer, mimeType = "image/jpeg", caption = "", lang = "en", detectorModelAdapter = null, fetchFn = fetch }) {
  // 1. If an explicit custom model adapter is passed, invoke it
  if (typeof detectorModelAdapter === "function") {
    try {
      const result = await detectorModelAdapter({ imageBuffer, mimeType, caption, lang, fetchFn });
      if (result && ["detected", "healthy", "uncertain", "error"].includes(result.status)) {
        return result;
      }
    } catch (err) {
      console.error("Detector model adapter error:", err);
      return { status: "error", errorCode: "MODEL_EXECUTION_ERROR" };
    }
  }

  // 2. If GEMINI_API_KEY or GOOGLE_API_KEY is available in environment, run Gemini Vision adapter
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (geminiKey) {
    return await geminiVisionDetectorAdapter({
      imageBuffer,
      mimeType,
      caption,
      lang,
      fetchFn
    });
  }

  // 3. Fallback when no ML vision model is configured (DO NOT assume any crop)
  return {
    status: "uncertain",
    crop: null,
    confidence: null,
    reason: "MODEL_INTEGRATION_PENDING"
  };
}

/**
 * Multilingual Farmer-Friendly Formatter for Disease Detection Results
 * @param {object} params
 * @param {object} params.result - Structured detection result
 * @param {string} [params.caption] - Farmer caption
 * @param {'en'|'hi'|'mr'|'hinglish'} params.lang - Language
 * @returns {string} Safe WhatsApp formatted response
 */
function formatDiseaseResponse({ result, caption = "", lang = "en" }) {
  const status = result?.status || "uncertain";

  // 1. Detected Disease Response (Conditional on identified crop)
  if (status === "detected" && result.crop) {
    const cropName = result.crop;
    const diseaseName = result.diseaseName || (lang === "mr" ? "रोग लक्षण" : lang === "hi" ? "रोग लक्षण" : "Disease Symptoms");
    const confidencePct = result.confidence ? Math.round(result.confidence * 100) : null;
    const symptoms = result.symptoms || "";
    const goodPractices = result.goodPractices || "";

    const templates = {
      mr: `🌿 *क्रॉपकॅश पीक रोग निदान (Diagnosis)*\n\n📌 *पीक:* ${cropName}\n🦠 *संभाव्य रोग:* ${diseaseName}${confidencePct ? ` (~${confidencePct}% अचूकता)` : ""}\n\n🔍 *लक्षणे:*\n${symptoms}\n\n🌱 *सल्ला व व्यवस्थापन (Good Practices):*\n${goodPractices}\n\n⚠️ *टीप:* हे विश्लेषण प्राथमिक फोटो निदानावर आधारित आहे. रासायनिक फवारणीपूर्वी स्थानिक कृषी तज्ज्ञ किंवा कृषी केंद्राचा सल्ला घ्यावा.`,
      hi: `🌿 *क्रॉपकैश फसल रोग निदान (Diagnosis)*\n\n📌 *फसल:* ${cropName}\n🦠 *संभावित रोग:* ${diseaseName}${confidencePct ? ` (~${confidencePct}% सटीकता)` : ""}\n\n🔍 *पहचान व लक्षण:*\n${symptoms}\n\n🌱 *कृषि प्रबंधन व सुझाव (Good Practices):*\n${goodPractices}\n\n⚠️ *नोट:* यह विश्लेषण फोटो आधारित प्राथमिक सुझाव है। किसी भी रासायनिक छिड़काव से पहले नजदीकी कृषि सलाहकार से पुष्टि करें।`,
      hinglish: `🌿 *CropCash Disease Diagnosis*\n\n📌 *Fasal:* ${cropName}\n🦠 *Possible Disease:* ${diseaseName}${confidencePct ? ` (~${confidencePct}% match)` : ""}\n\n🔍 *Symptoms:*\n${symptoms}\n\n🌱 *Management & Care:*\n${goodPractices}\n\n⚠️ *Note:* Ye initial photo diagnosis hai. Chemical spray karne se pehle local Krishi expert se salah lein.`,
      en: `🌿 *CropCash Disease Diagnosis*\n\n📌 *Crop:* ${cropName}\n🦠 *Identified Condition:* ${diseaseName}${confidencePct ? ` (~${confidencePct}% confidence)` : ""}\n\n🔍 *Key Symptoms:*\n${symptoms}\n\n🌱 *Management & Good Practices:*\n${goodPractices}\n\n⚠️ *Disclaimer:* This is a preliminary visual diagnosis. Consult your local agriculture extension officer before applying chemical treatments.`
    };
    return templates[lang] || templates.en;
  }

  // 2. Healthy Crop Response (Conditional on identified crop)
  if (status === "healthy" && result.crop) {
    const cropName = result.crop;
    const templates = {
      mr: `🌱 *क्रॉपकॅश पीक आरोग्य तपासणी*\n\n📌 *पीक:* ${cropName}\n✅ *आरोग्य स्थिती:* पीक निरोगी दिसत आहे.\n\n🌿 पानांवर कोणताही गंभीर रोग किंवा कीड दिसून येत नाही. योग्य पाणी आणि खत व्यवस्थापन सुरू ठेवा.`,
      hi: `🌱 *क्रॉपकैश फसल स्वास्थ्य जांच*\n\n📌 *फसल:* ${cropName}\n✅ *स्वास्थ्य स्थिति:* फसल स्वस्थ दिखाई दे रही है।\n\n🌿 पत्तियों पर कोई गंभीर कीट या रोग के लक्षण नहीं मिले हैं। संतुलित पोषण और समय पर सिंचाई जारी रखें।`,
      hinglish: `🌱 *CropCash Crop Health Check*\n\n📌 *Fasal:* ${cropName}\n✅ *Status:* Crop healthy dikh raha hai.\n\n🌿 Leaves par koi major disease ya keeda nahi dikh raha. Proper irrigation aur fertilizer routine maintain karein.`,
      en: `🌱 *CropCash Crop Health Check*\n\n📌 *Crop:* ${cropName}\n✅ *Status:* Crop appears healthy.\n\n🌿 No visible major disease or pest infestation detected on the leaves. Continue balanced nutrition and scheduled watering.`
    };
    return templates[lang] || templates.en;
  }

  // 3. Uncertain / Blurry / Unidentified Crop Response (Honest Fallback)
  const templates = {
    mr: `📷 *क्रॉपकॅश पीक रोग तपासणी कक्ष*\n\nआपला फोटो मिळाला आहे. अचूक रोग निदानासाठी पिकाचे स्पष्ट छायाचित्र आवश्यक आहे.\n\n🌿 *चांगल्या निदानासाठी सूचना:*\n1. बाधित पानाचा किंवा किडीचा जवळून (Close-up) स्पष्ट फोटो घ्या.\n2. फोटो चांगल्या सूर्यप्रकाशात आणि फोकसमध्ये असावा.\n3. सोबत पिकाचे नाव किंवा लक्षणे टाईप करून पाठवा (उदा. 'कापूस पानांवर डाग' किंवा 'टोमॅटो करपा').\n\n_स्पष्ट फोटो पाठवून पुन्हा प्रयत्न करा!_`,
    hi: `📷 *क्रॉपकैश फसल रोग जांच सेवा*\n\nआपकी फोटो मिल गई है। सटीक रोग निदान के लिए फसल की साफ और स्पष्ट तस्वीर आवश्यक है।\n\n🌿 *सटीक जांच के लिए टिप्स:*\n1. प्रभावित पत्ती या कीट की नजदीक से (Close-up) साफ फोटो लें।\n2. फोटो अच्छी रोशनी में हो और धुंधली (Blur) न हो।\n3. फोटो के साथ फसल का नाम या लक्षण लिखकर भेजें (जैसे: 'कपास में धब्बे' या 'टमाटर झुलसा')।\n\n_कृपया साफ फोटो के साथ दोबारा भेजें!_`,
    hinglish: `📷 *CropCash Disease Diagnosis*\n\nAapka photo receive hua hai. Accurate diagnosis ke liye crop ki clear picture zaroori hai.\n\n🌿 *Clear Photo Tips:*\n1. Kharab patti ya pest ki close-up focused photo click karein.\n2. Photo saaf light me ho aur blur na ho.\n3. Photo ke sath crop ka naam aur symptoms text karein (e.g. 'Cotton leaf spot' ya 'Tomato blight').\n\n_Please clear close-up photo bhejein!_`,
    en: `📷 *CropCash Crop Disease Desk*\n\nWe received your photo. For accurate crop diagnosis, a clear and well-lit image of the crop is required.\n\n🌿 *Tips for Best Diagnosis:*\n1. Take a focused close-up photo of the affected leaf, stem, or pest.\n2. Ensure good natural lighting and avoid blurry images.\n3. Type the crop name and observed symptoms in your reply (e.g., 'Tomato leaf blight' or 'Cotton leaf curl').\n\n_Please send a clear close-up photo to retry!_`
  };
  return templates[lang] || templates.en;
}

/**
 * Main Handler for Incoming WhatsApp Image Message
 * @param {object} message - WhatsApp message payload
 * @param {Function} [fetchFn=fetch] - Injected fetcher for testing
 * @param {Function} [detectorModelAdapter=null] - Optional disease model adapter
 * @returns {Promise<{ replyText: string, lang: string, type: string, result: object }>}
 */
async function processCropImageMessage(message, fetchFn = fetch, detectorModelAdapter = null) {
  const mediaId = message?.image?.id;
  const caption = message?.image?.caption || "";
  const lang = caption ? detectLanguage(caption) : "mr"; // Default to Marathi for Maharashtra prototype region

  // Step 1: Safely retrieve image media
  const retrieval = await retrieveWhatsAppImage(mediaId, fetchFn);

  let detectionResult = null;

  if (!retrieval.success) {
    if (retrieval.errorCode === "UNSUPPORTED_TYPE") {
      detectionResult = { status: "error", errorCode: "UNSUPPORTED_TYPE" };
    } else {
      // If media fetch is offline or pending, fallback to helpful guidance
      detectionResult = { status: "uncertain", errorCode: retrieval.errorCode };
    }
  } else {
    // Step 2: Pass image buffer to disease detector interface (Gemini adapter / custom adapter)
    detectionResult = await analyzeCropDisease({
      imageBuffer: retrieval.imageBuffer,
      mimeType: retrieval.mimeType,
      caption,
      lang,
      detectorModelAdapter,
      fetchFn
    });
  }

  // Step 3: Format safe, multilingual farmer response
  const replyText = formatDiseaseResponse({
    result: detectionResult,
    caption,
    lang
  });

  return {
    replyText,
    lang,
    type: "image",
    result: detectionResult
  };
}

module.exports = {
  getWhatsAppMediaUrl,
  retrieveWhatsAppImage,
  geminiVisionDetectorAdapter,
  analyzeCropDisease,
  formatDiseaseResponse,
  processCropImageMessage,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MEDIA_FETCH_TIMEOUT_MS,
  GEMINI_VISION_TIMEOUT_MS,
};
