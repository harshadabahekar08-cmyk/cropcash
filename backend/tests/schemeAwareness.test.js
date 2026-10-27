/**
 * Test Suite for Government Scheme Awareness Service
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { processIncomingMessage, detectIntent } = require("../services/responseHandler");
const { identifySchemeTopic, getSchemeResponse } = require("../services/schemeService");
const { MANDI_API_CACHE } = require("../services/mandiPriceService");

// Seed test cache for mandi queries
MANDI_API_CACHE.set("Soyabean|Khamgaon|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4800", min_price: "4600", max_price: "4900", market: "Khamgaon", district: "Buldhana", state: "Maharashtra", arrival_date: "14/09/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Chikhli|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4600", min_price: "4400", max_price: "4650", market: "Chikhli", district: "Buldhana", state: "Maharashtra", arrival_date: "14/09/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Malkapur|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4700", min_price: "4500", max_price: "4750", market: "Malkapur", district: "Buldhana", state: "Maharashtra", arrival_date: "14/09/2026" }]
});

const testQueries = [
  {
    name: "Query 1: 'PM Kisan'",
    query: "PM Kisan",
    expectedIntent: "scheme",
    expectedTopic: "pm_kisan",
    requiredStrings: ["PM-KISAN", "6,000", "pmkisan.gov.in"]
  },
  {
    name: "Query 2: 'MahaDBT'",
    query: "MahaDBT",
    expectedIntent: "scheme",
    expectedTopic: "mahadbt",
    requiredStrings: ["MahaDBT", "mahadbt.maharashtra.gov.in"]
  },
  {
    name: "Query 3: 'government scheme'",
    query: "government scheme",
    expectedIntent: "scheme",
    expectedTopic: "general",
    requiredStrings: ["PM-KISAN", "MahaDBT", "pmkisan.gov.in", "mahadbt.maharashtra.gov.in"]
  },
  {
    name: "Query 4: 'farmer yojana'",
    query: "farmer yojana",
    expectedIntent: "scheme",
    expectedTopic: "general",
    requiredStrings: ["PM-KISAN", "MahaDBT"]
  },
  {
    name: "Query 5: 'sarkari yojana batao'",
    query: "sarkari yojana batao",
    expectedIntent: "scheme",
    expectedTopic: "general",
    requiredStrings: ["PM-KISAN", "MahaDBT", "pmkisan.gov.in", "mahadbt.maharashtra.gov.in"]
  },
  {
    name: "Query 6: 'kisan ke liye subsidy hai kya'",
    query: "kisan ke liye subsidy hai kya",
    expectedIntent: "scheme",
    expectedTopic: "subsidy",
    requiredStrings: ["mahadbt.maharashtra.gov.in"]
  },
  {
    name: "Query 7: Existing Mandi Decision Query",
    query: "20 quintal soybean from Chikhli",
    expectedIntent: "transport_decision",
    requiredStrings: ["Khamgaon", "Chikhli", "Net Return"]
  },
  {
    name: "Query 8: Marathi MahaDBT Query",
    query: "महाडीबीटी योजना काय आहे?",
    expectedIntent: "scheme",
    expectedTopic: "mahadbt",
    requiredStrings: ["महाडीबीटी", "mahadbt.maharashtra.gov.in"]
  }
];

async function runSchemeTests() {
  console.log("================================================================================");
  console.log("CROPCASH GOVERNMENT SCHEME AWARENESS & REGRESSION TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  for (const t of testQueries) {
    total++;
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`📌 [${t.name}]`);
    console.log(`💬 Input Text: "${t.query}"`);

    const intent = detectIntent(t.query);
    const res = await processIncomingMessage({
      from: "919876543210",
      type: "text",
      text: { body: t.query }
    });

    console.log(`🏷️ Detected Intent: ${res.intent} (Expected: ${t.expectedIntent})`);
    console.log(`🌐 Detected Lang: ${res.lang}`);
    console.log(`🤖 Reply:\n${res.replyText}\n`);

    let isPass = true;
    const errors = [];

    if (res.intent !== t.expectedIntent) {
      isPass = false;
      errors.push(`Intent mismatch: got '${res.intent}', expected '${t.expectedIntent}'`);
    }

    for (const req of t.requiredStrings) {
      if (!res.replyText.toLowerCase().includes(req.toLowerCase())) {
        isPass = false;
        errors.push(`Missing required substring: "${req}"`);
      }
    }

    if (isPass) {
      passed++;
      console.log(`STATUS: ✅ PASS`);
    } else {
      console.log(`STATUS: ❌ FAIL - Issues: ${errors.join("; ")}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`SCHEME TEST SUMMARY: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runSchemeTests();
