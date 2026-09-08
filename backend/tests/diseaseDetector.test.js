/**
 * Unit & Integration Tests for Crop Disease Detector Service
 */

const {
  getWhatsAppMediaUrl,
  retrieveWhatsAppImage,
  geminiVisionDetectorAdapter,
  analyzeCropDisease,
  formatDiseaseResponse,
  processCropImageMessage,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES
} = require("../services/diseaseDetectorService");

const { processIncomingMessage } = require("../services/responseHandler");

// Mock fetcher helpers
const mockValidMediaUrlFetcher = async (url) => {
  if (url.includes("graph.facebook.com")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/mock_leaf.jpg",
        mime_type: "image/jpeg",
        file_size: 102400
      })
    };
  }
  if (url.includes("lookaside.fbsbx.com")) {
    // Return 100KB mock image buffer
    const fakeBuffer = Buffer.alloc(102400, 0x41);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => fakeBuffer.buffer
    };
  }
  return { ok: false, status: 404 };
};

const mockUnsupportedMimeFetcher = async (url) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/doc.pdf",
      mime_type: "application/pdf",
      file_size: 50000
    })
  };
};

const mockOversizedMediaFetcher = async (url) => {
  if (url.includes("graph.facebook.com")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/huge.jpg",
        mime_type: "image/jpeg",
        file_size: 15 * 1024 * 1024
      })
    };
  }
  // Return 12MB buffer
  const hugeBuffer = Buffer.alloc(12 * 1024 * 1024, 0x41);
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => hugeBuffer.buffer
  };
};

const mockFailingFetcher = async () => ({
  ok: false,
  status: 500,
  json: async () => ({ error: { message: "Internal server error" } })
});

// Gemini Mock API Fetchers
const mockGeminiSoybeanFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                status: "detected",
                crop: "Soybean",
                diseaseName: "Soybean Rust / तांबेरा",
                confidence: 0.93,
                symptoms: "Yellow-brown lesions and reddish-brown pustules on the underside of leaves",
                goodPractices: "Improve field aeration, avoid excess irrigation, use Trichoderma viride biocontrol",
                reason: ""
              })
            }
          ]
        }
      }
    ]
  })
});

const mockGeminiTomatoFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                status: "detected",
                crop: "Tomato (टोमॅटो)",
                diseaseName: "Early Blight (करपा)",
                confidence: 0.89,
                symptoms: "Concentric dark brown rings with target-like spots on lower tomato leaves",
                goodPractices: "Mulching to prevent soil splash, remove infected lower foliage, ensure good spacing",
                reason: ""
              })
            }
          ]
        }
      }
    ]
  })
});

const mockGeminiCottonHealthyFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: "```json\n" + JSON.stringify({
                status: "healthy",
                crop: "Cotton (कापूस)",
                diseaseName: null,
                confidence: 0.95,
                symptoms: "Leaves are vibrant green with no visible pest or fungal infection",
                goodPractices: "Maintain balanced NPK fertilization and monitor regularly",
                reason: "Clean foliage"
              }) + "\n```"
            }
          ]
        }
      }
    ]
  })
});

const mockGeminiUnclearFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                status: "uncertain",
                crop: null,
                diseaseName: null,
                confidence: null,
                symptoms: "",
                goodPractices: "",
                reason: "Image is out of focus and botanical species cannot be determined"
              })
            }
          ]
        }
      }
    ]
  })
});

const mockGeminiNonCropFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                status: "uncertain",
                crop: "Unknown Weeds / Wild Shrub",
                diseaseName: null,
                confidence: 0.30,
                symptoms: "",
                goodPractices: "",
                reason: "Subject is a non-agricultural wild plant, not a recognized target crop"
              })
            }
          ]
        }
      }
    ]
  })
});

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      passed++;
      console.log(` PASS  ${testName}`);
    } else {
      console.error(` FAIL  ${testName}`);
    }
  }

  // Set mock access token for tests if not present
  const originalToken = process.env.ACCESS_TOKEN;
  process.env.ACCESS_TOKEN = process.env.ACCESS_TOKEN || "mock_token_for_tests";

  console.log("=== SUITE 1: MIME TYPE & SIZE BOUNDS ===");
  {
    assert(ALLOWED_IMAGE_MIME_TYPES.has("image/jpeg"), "Allowed MIME: image/jpeg");
    assert(ALLOWED_IMAGE_MIME_TYPES.has("image/png"), "Allowed MIME: image/png");
    assert(ALLOWED_IMAGE_MIME_TYPES.has("image/webp"), "Allowed MIME: image/webp");
    assert(!ALLOWED_IMAGE_MIME_TYPES.has("application/pdf"), "Reject MIME: application/pdf");
    assert(!ALLOWED_IMAGE_MIME_TYPES.has("video/mp4"), "Reject MIME: video/mp4");
    assert(MAX_IMAGE_SIZE_BYTES === 10 * 1024 * 1024, "Max image size is exactly 10 MB");
  }

  console.log("\n=== SUITE 2: SAFE MEDIA RETRIEVAL & ERROR HANDLING ===");
  {
    const mediaInfo = await getWhatsAppMediaUrl("media_12345", mockValidMediaUrlFetcher);
    assert(mediaInfo !== null && mediaInfo.url.includes("mock_leaf.jpg"), "Retrieve Meta media download URL");

    const dlSuccess = await retrieveWhatsAppImage("media_12345", mockValidMediaUrlFetcher);
    assert(dlSuccess.success === true && dlSuccess.imageBuffer.length === 102400, "Download image bytes successfully");

    const dlUnsupported = await retrieveWhatsAppImage("media_pdf", mockUnsupportedMimeFetcher);
    assert(dlUnsupported.success === false && dlUnsupported.errorCode === "UNSUPPORTED_TYPE", "Reject unsupported media MIME type");

    const dlOversized = await retrieveWhatsAppImage("media_huge", mockOversizedMediaFetcher);
    assert(dlOversized.success === false && dlOversized.errorCode === "FILE_TOO_LARGE", "Reject oversized image > 10MB");

    const dlFailed = await retrieveWhatsAppImage("media_fail", mockFailingFetcher);
    assert(dlFailed.success === false, "Graceful failure handling on API error");
  }

  console.log("\n=== SUITE 3: STRUCTURED DETECTOR ADAPTER INTERFACE ===");
  {
    // Test default behavior without plugged model (safe uncertain)
    const defaultResult = await analyzeCropDisease({
      imageBuffer: Buffer.from("test"),
      mimeType: "image/jpeg",
      caption: "पानावर पिवळे डाग",
      lang: "mr"
    });
    assert(defaultResult.status === "uncertain", "Default status is safe 'uncertain' when model pending");
    assert(defaultResult.confidence === null, "Does not fabricate fake confidence score");

    // Test adapter execution when custom model adapter is plugged in
    const mockModelAdapter = async () => ({
      status: "detected",
      crop: "Cotton (कापूस)",
      diseaseName: "Leaf Curl Virus",
      confidence: 0.91,
      symptoms: "Upward leaf curling and vein thickening",
      goodPractices: "Whitefly vector management, remove alternate weed hosts"
    });

    const detectedResult = await analyzeCropDisease({
      imageBuffer: Buffer.from("test"),
      mimeType: "image/jpeg",
      caption: "",
      lang: "en",
      detectorModelAdapter: mockModelAdapter
    });

    assert(detectedResult.status === "detected", "Detector adapter returns 'detected' status");
    assert(detectedResult.confidence === 0.91, "Detector preserves model confidence");
    assert(detectedResult.crop.includes("Cotton"), "Detector preserves identified crop Cotton (not defaulted to Soybean)");
  }

  console.log("\n=== SUITE 4: GEMINI MULTIMODAL VISION DETECTOR ADAPTER ===");
  {
    const origGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "mock_gemini_key_for_tests";

    // 1. Detected Soybean Disease from Gemini
    const geminiSoybean = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("fake_soybean_bytes"),
      mimeType: "image/jpeg",
      caption: "",
      lang: "mr",
      fetchFn: mockGeminiSoybeanFetcher
    });
    assert(geminiSoybean.status === "detected", "Gemini Adapter: Status detected");
    assert(geminiSoybean.crop === "Soybean", "Gemini Adapter: Crop accurately identified as Soybean");
    assert(geminiSoybean.diseaseName.includes("Rust") || geminiSoybean.diseaseName.includes("तांबेरा"), "Gemini Adapter: Extracted disease name");
    assert(geminiSoybean.confidence === 0.93, "Gemini Adapter: Preserved 0.93 confidence");

    // 2. Detected NON-SOYBEAN Crop (Tomato) -> must NOT become Soybean
    const geminiTomato = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("fake_tomato_leaf"),
      mimeType: "image/jpeg",
      caption: "Tomato leaf spots",
      lang: "mr",
      fetchFn: mockGeminiTomatoFetcher
    });
    assert(geminiTomato.status === "detected", "Gemini Adapter: Tomato status detected");
    assert(geminiTomato.crop.includes("Tomato") || geminiTomato.crop.includes("टोमॅटो"), "Gemini Adapter: Correctly keeps Tomato crop");
    assert(!geminiTomato.crop.toLowerCase().includes("soybean"), "Gemini Adapter: Tomato is NOT defaulted to Soybean");

    // 3. Healthy Cotton from Gemini (with markdown code block removal)
    const geminiCotton = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("fake_healthy_cotton"),
      mimeType: "image/jpeg",
      caption: "",
      lang: "en",
      fetchFn: mockGeminiCottonHealthyFetcher
    });
    assert(geminiCotton.status === "healthy", "Gemini Adapter: Status healthy & cleaned markdown JSON");
    assert(geminiCotton.crop.includes("Cotton"), "Gemini Adapter: Crop Cotton");

    // 4. Uncertain / Blurry Image
    const geminiUnclear = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("blurry_leaf"),
      mimeType: "image/jpeg",
      caption: "",
      lang: "en",
      fetchFn: mockGeminiUnclearFetcher
    });
    assert(geminiUnclear.status === "uncertain", "Gemini Adapter: Unclear image is uncertain");
    assert(geminiUnclear.crop === null, "Gemini Adapter: Uncertain image has crop = null");

    // 5. Non-Crop / Unknown Wild Shrub -> downgraded to uncertain
    const geminiNonCrop = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("wild_weed"),
      mimeType: "image/jpeg",
      caption: "",
      lang: "en",
      fetchFn: mockGeminiNonCropFetcher
    });
    assert(geminiNonCrop.status === "uncertain", "Gemini Adapter: Non-crop plant forces status uncertain");
    assert(geminiNonCrop.diseaseName === null, "Gemini Adapter: Non-crop plant has diseaseName = null");

    // 6. Missing API Key Fallback
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    const geminiNoKey = await geminiVisionDetectorAdapter({
      imageBuffer: Buffer.from("leaf"),
      mimeType: "image/jpeg"
    });
    assert(geminiNoKey.status === "uncertain" && geminiNoKey.reason === "GEMINI_API_KEY_NOT_CONFIGURED", "Gemini Adapter: Graceful fallback when key missing");

    // Restore env
    process.env.GEMINI_API_KEY = origGeminiKey;
  }

  console.log("\n=== SUITE 5: MULTILINGUAL RESULT FORMATTING ===");
  {
    // 1. Detected Marathi (Tomato)
    const mockTomatoDetected = {
      status: "detected",
      crop: "टोमॅटो",
      diseaseName: "करपा (Early Blight)",
      confidence: 0.88,
      symptoms: "पानांवर काळे-तपकिरी गोल डाग",
      goodPractices: "रोगट पाने काढून नष्ट करा, पाण्याचा निचरा व्यवस्थित ठेवा"
    };
    const resTomatoMr = formatDiseaseResponse({ result: mockTomatoDetected, lang: "mr" });
    assert(resTomatoMr.includes("टोमॅटो") && !resTomatoMr.includes("सोयाबीन") && resTomatoMr.includes("करपा"), "Marathi formatting renders actual crop (टोमॅटो) without Soybean");

    // 2. Detected Hindi (Cotton)
    const mockCottonDetected = {
      status: "detected",
      crop: "कपास (Cotton)",
      diseaseName: "लीफ कर्ल वायरस (Leaf Curl)",
      confidence: 0.90,
      symptoms: "पत्तियां ऊपर की ओर मुड़ रही हैं",
      goodPractices: "सफेद मक्खी नियंत्रण करें, नीम तेल का छिड़काव करें"
    };
    const resCottonHi = formatDiseaseResponse({ result: mockCottonDetected, lang: "hi" });
    assert(resCottonHi.includes("कपास") && !resCottonHi.includes("सोयाबीन") && resCottonHi.includes("फसल रोग निदान"), "Hindi formatting renders actual crop (कपास)");

    // 3. Healthy Crop Confirmation
    const mockHealthy = { status: "healthy", crop: "गहू (Wheat)" };
    const resHealthyMr = formatDiseaseResponse({ result: mockHealthy, lang: "mr" });
    assert(resHealthyMr.includes("गहू") && resHealthyMr.includes("पीक निरोगी दिसत आहे"), "Healthy confirmation shows actual crop (गहू)");

    // 4. Uncertain / Unidentified Fallback
    const mockUncertain = { status: "uncertain", crop: null };
    const resUncertainMr = formatDiseaseResponse({ result: mockUncertain, lang: "mr" });
    assert(resUncertainMr.includes("स्पष्ट छायाचित्र आवश्यक आहे") && !resUncertainMr.includes("सोयाबीन"), "Uncertain fallback does NOT assume or mention Soybean");

    const resUncertainHi = formatDiseaseResponse({ result: mockUncertain, lang: "hi" });
    assert(resUncertainHi.includes("सटीक रोग निदान के लिए फसल की साफ और स्पष्ट तस्वीर आवश्यक है"), "Hindi uncertain fallback prompt");
  }

  console.log("\n=== SUITE 6: END-TO-END IMAGE MESSAGE ROUTING ===");
  {
    const incomingImageMsg = {
      from: "919876543210",
      type: "image",
      image: {
        id: "media_img_001",
        caption: "पानांवर डाग पडले आहेत",
        mime_type: "image/jpeg"
      }
    };

    const e2eResult = await processIncomingMessage(incomingImageMsg);
    assert(e2eResult.type === "image", "Message type is 'image'");
    assert(e2eResult.intent === "disease", "Intent categorized as 'disease'");
    assert(e2eResult.lang === "mr", "Detected caption language as Marathi ('mr')");
    assert(e2eResult.replyText.includes("क्रॉपकॅश"), "Reply text generated cleanly");
  }

  // Restore token
  process.env.ACCESS_TOKEN = originalToken;

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
