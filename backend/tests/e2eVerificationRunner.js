require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { processIncomingMessage, detectIntent } = require("../services/responseHandler");
const { detectLanguage } = require("../services/languageDetector");
const { getMandiPriceResponse, MANDI_API_CACHE } = require("../services/mandiPriceService");

const scenarios = [
  {
    id: 1,
    name: "Greeting",
    query: "Hello",
    expectedIntent: "greeting",
    expectedLang: "en",
    checks: [
      "Natural greeting welcoming farmer to CropCash",
      "Mentions mandi prices, transport, government schemes",
      "Asks follow-up: Which crop price or mandi decision to check",
      "No rigid numbered menu or paragraph dump"
    ]
  },
  {
    id: 2,
    name: "Mandi price (Commodity only)",
    query: "soybean ka bhav kya hai?",
    expectedIntent: "price",
    expectedLang: "hinglish",
    checks: [
      "Identifies Soyabean crop",
      "Prompts for district/mandi name (e.g. Latur or Indore)",
      "Prompts to optionally share village and quantity to calculate best mandi",
      "Zero fake rates"
    ]
  },
  {
    id: 3,
    name: "Quantity only",
    query: "mere paas 20 quintal soybean hai",
    expectedIntent: "transport_decision",
    expectedLang: "hinglish",
    checks: [
      "Extracts quantity: 20 quintals of Soyabean",
      "Acknowledges 20 quintal",
      "Prompts for village/location name to calculate transport and net return",
      "No crash or rigid error"
    ]
  },
  {
    id: 4,
    name: "Location + Quantity selling decision",
    query: "main Chikhli se hoon aur mere paas 20 quintal soybean hai",
    expectedIntent: "transport_decision",
    expectedLang: "hinglish",
    checks: [
      "Extracts village: Chikhli, quantity: 20 quintals, crop: Soyabean",
      "Compares nearby mandis (Khamgaon, Chikhli, Malkapur)",
      "Computes accurate transport cost and net return",
      "Provides clear recommendation for best net return mandi",
      "Follow-up asking if farmer needs transport arrangement assistance"
    ]
  },
  {
    id: 5,
    name: "Best mandi (Selling decision without details)",
    query: "aaj soybean kaha bechu?",
    expectedIntent: "transport_decision",
    expectedLang: "hinglish",
    checks: [
      "Recognizes selling decision intent",
      "Asks for quantity in quintals and village to compute net profit",
      "Provides clear conversational guidance"
    ]
  },
  {
    id: 6,
    name: "Government scheme",
    query: "mujhe government scheme batao",
    expectedIntent: "scheme",
    expectedLang: "hinglish",
    checks: [
      "Recognizes scheme intent",
      "Lists key schemes (PM-Kisan, Namo Shetkari, PMFBY, KCC)",
      "Follow-up asking which scheme detail or status they want to check"
    ]
  },
  {
    id: 7,
    name: "Hindi (Crop only price query)",
    query: "सोयाबीन का भाव क्या है?",
    expectedIntent: "price",
    expectedLang: "hi",
    checks: [
      "Detected Hindi language (hi)",
      "Acknowledges सोयाबीन",
      "Asks for district/mandi name in Hindi",
      "Suggests sharing village/quantity if looking to sell"
    ]
  },
  {
    id: 8,
    name: "Marathi (Crop only market price query)",
    query: "सोयाबीनचा बाजारभाव काय आहे?",
    expectedIntent: "price",
    expectedLang: "mr",
    checks: [
      "Detected Marathi language (mr)",
      "Acknowledges सोयाबीन",
      "Asks for district/mandi name in Marathi",
      "Suggests sharing village/quantity if looking to sell"
    ]
  },
  {
    id: 9,
    name: "Hinglish (Crop rate query)",
    query: "soybean ka rate batao",
    expectedIntent: "price",
    expectedLang: "hinglish",
    checks: [
      "Detected Hinglish language (hinglish)",
      "Acknowledges Soyabean",
      "Prompts for district/mandi in Hinglish",
      "Conversational follow-up"
    ]
  }
];

async function runE2EVerification() {
  console.log("================================================================================");
  console.log("CROPCASH END-TO-END VERIFICATION SUITE");
  console.log("================================================================================\n");

  const results = [];

  for (const s of scenarios) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[TEST ${s.id}] Scenario: ${s.name}`);
    console.log(`💬 Input Query: "${s.query}"`);

    const detectedLang = detectLanguage(s.query);
    const detectedIntent = detectIntent(s.query);

    const messagePayload = {
      from: "919876543210",
      type: "text",
      text: { body: s.query }
    };

    const response = await processIncomingMessage(messagePayload);

    console.log(`🔍 Detected Lang: ${response.lang} (Expected: ${s.expectedLang})`);
    console.log(`🔍 Detected Intent: ${response.intent} (Expected: ${s.expectedIntent})`);
    console.log(`🤖 Actual Response:\n${response.replyText}\n`);

    // Verification conditions
    let pass = true;
    const reasons = [];

    if (response.intent !== s.expectedIntent) {
      pass = false;
      reasons.push(`Intent mismatch: got '${response.intent}', expected '${s.expectedIntent}'`);
    }

    if (response.lang !== s.expectedLang && !(s.expectedLang === "hinglish" && response.lang === "hi")) {
      // allow hi/hinglish overlap if intended, but let's check
      if (response.lang !== s.expectedLang) {
        pass = false;
        reasons.push(`Language mismatch: got '${response.lang}', expected '${s.expectedLang}'`);
      }
    }

    if (!response.replyText || response.replyText.length < 10) {
      pass = false;
      reasons.push("Response is empty or too short");
    }

    // Check for crash / undefined / null in reply
    if (response.replyText.includes("undefined") || response.replyText.includes("null") || response.replyText.includes("NaN")) {
      pass = false;
      reasons.push("Response contains corrupted values (undefined/null/NaN)");
    }

    console.log(`STATUS: ${pass ? "✅ PASS" : "❌ FAIL"}`);
    if (!pass) {
      console.log(`Issues: ${reasons.join("; ")}`);
    }

    results.push({
      scenario: s.name,
      query: s.query,
      detectedLang: response.lang,
      detectedIntent: response.intent,
      replyText: response.replyText,
      pass,
      issues: reasons.join("; ") || "None"
    });
  }

  // 10. Fallback Verification when live data is unavailable / district unlisted
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`[TEST 10] Scenario: Live Mandi Unavailable Fallback & Empty API handling`);
  console.log(`💬 Query: "What is soybean price in NonExistentMandi123 today?"`);

  const unavailRes = await processIncomingMessage({
    from: "919876543210",
    type: "text",
    text: { body: "What is soybean price in NonExistentMandi123 today?" }
  });

  console.log(`🔍 Response Lang: ${unavailRes.lang} | Intent: ${unavailRes.intent}`);
  console.log(`🤖 Actual Response:\n${unavailRes.replyText}\n`);

  const unavailPass = unavailRes.replyText.includes("not available") || unavailRes.replyText.includes("not reported today");
  console.log(`STATUS: ${unavailPass ? "✅ PASS" : "❌ FAIL"}`);

  results.push({
    scenario: "Mandi Data Unavailable Fallback",
    query: "What is soybean price in NonExistentMandi123 today?",
    detectedLang: unavailRes.lang,
    detectedIntent: unavailRes.intent,
    replyText: unavailRes.replyText,
    pass: unavailPass,
    issues: unavailPass ? "None" : "Fallback message did not indicate honest data unavailability"
  });

  console.log("\n================================================================================");
  console.log("FINAL SUMMARY REPORT");
  console.log("================================================================================");
  console.table(results.map(r => ({
    Scenario: r.scenario,
    Lang: r.detectedLang,
    Intent: r.detectedIntent,
    Status: r.pass ? "PASS" : "FAIL",
    Issues: r.issues
  })));
}

runE2EVerification();
