/**
 * Comprehensive Unit Tests for Mandi Price Service & Multilingual WhatsApp Intent Routing
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const {
  extractMandiEntities,
  formatMandiPriceResponse,
  getMandiPriceResponse,
  fetchOfficialMandiPrices,
  getLocalizedLocationName,
  cleanMarketName,
  MANDI_API_CACHE
} = require("../services/mandiPriceService");
const { processIncomingMessage } = require("../services/responseHandler");

// Mock Agmarknet API records for testing
const MOCK_NAGPUR_RECORDS = [
  {
    state: "Maharashtra",
    district: "Nagpur",
    market: "APMC Nagpur ",
    commodity: "Soyabean",
    variety: "Other",
    grade: "Local",
    arrival_date: "08/09/2026",
    min_price: "5200",
    max_price: "5600",
    modal_price: "5500"
  },
  {
    state: "Maharashtra",
    district: "Nagpur",
    market: "APMC Savner ",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5876",
    max_price: "5876",
    modal_price: "5876"
  }
];

const MOCK_BULDHANA_RECORDS = [
  {
    state: "Maharashtra",
    district: "Buldhana",
    market: "APMC Mehekar ",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5500",
    max_price: "6025",
    modal_price: "5850"
  },
  {
    state: "Maharashtra",
    district: "Buldhana",
    market: "APMC Khamgaon ",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5650",
    max_price: "6250",
    modal_price: "5950"
  }
];

const MOCK_MAHARASHTRA_STATE_RECORDS = [
  {
    state: "Maharashtra",
    district: "Wardha",
    market: "APMC Wardha ",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5850",
    max_price: "5850",
    modal_price: "5850"
  },
  {
    state: "Maharashtra",
    district: "Pune",
    market: "APMC Baramati ",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5600",
    max_price: "5600",
    modal_price: "5600"
  }
];

const MOCK_NATIONAL_RECORDS = [
  {
    state: "Madhya Pradesh",
    district: "Indore",
    market: "Indore APMC",
    commodity: "Soyabean",
    variety: "Yellow",
    grade: "FAQ",
    arrival_date: "08/09/2026",
    min_price: "5400",
    max_price: "5700",
    modal_price: "5600"
  }
];

// Smart Mock API Fetcher function
const createSmartMockFetcher = (customDatabase = {}) => {
  return async ({ commodity, district, market, state }) => {
    if (district && district.toLowerCase() === "nagpur") return MOCK_NAGPUR_RECORDS;
    if (district && district.toLowerCase() === "buldhana") return MOCK_BULDHANA_RECORDS;
    if (market && market.toLowerCase() === "savner") return [MOCK_NAGPUR_RECORDS[1]];
    if (market && market.toLowerCase() === "khamgaon") return [MOCK_BULDHANA_RECORDS[1]];
    if (state && state.toLowerCase() === "maharashtra") return MOCK_MAHARASHTRA_STATE_RECORDS;
    if (!district && !market && !state && commodity) return MOCK_NATIONAL_RECORDS;
    if (district && customDatabase[district]) return customDatabase[district];
    return [];
  };
};

const mockFetcherEmpty = async () => [];
const mockFetcherError = async () => { throw new Error("Network timeout"); };

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

  console.log("=== SUITE 1: ENTITY EXTRACTION ===");
  {
    const e1 = extractMandiEntities("What is the soybean price in Nagpur today?");
    assert(e1.crop?.standardName === "Soyabean" && e1.district === "Nagpur", "Extract English: Soybean in Nagpur");

    const e2 = extractMandiEntities("लातूर बाजार समितीमध्ये आज सोयाबीनचा बाजारभाव काय आहे?");
    assert(e2.crop?.standardName === "Soyabean" && e2.district === "Latur", "Extract Marathi: लातूर + सोयाबीन");

    const e3 = extractMandiEntities("इंदौर मंडी में आज गेहूं का भाव क्या है?");
    assert(e3.crop?.standardName === "Wheat" && e3.district === "Indore", "Extract Hindi: इंदौर + गेहूं");

    const e4 = extractMandiEntities("Latur me kapas ka rate kya hai?");
    assert(e4.crop?.standardName === "Cotton" && e4.district === "Latur", "Extract Hinglish: Latur + Kapas");

    const e5 = extractMandiEntities("कापूस भाव");
    assert(e5.crop?.standardName === "Cotton" && e5.district === null, "Extract Marathi Crop Only: कापूस");

    const e6 = extractMandiEntities("What is soybean price in Buldhana?");
    assert(e6.crop?.standardName === "Soyabean" && e6.district === "Buldhana", "Extract: Buldhana + Soyabean");

    const e7 = extractMandiEntities("चिखली सोयाबीन भाव");
    assert(e7.crop?.standardName === "Soyabean" && e7.district === "Chikhli", "Extract Marathi taluka: Chikhli");

    const e8 = extractMandiEntities("Wheat price in Katol today");
    assert(e8.crop?.standardName === "Wheat" && e8.district === "Katol", "Dynamic extraction: unmapped Katol town");
  }

  console.log("\n=== SUITE 2: MISSING ENTITY PROMPTS ===");
  {
    const r1 = await getMandiPriceResponse("What is the soybean price today?", "en", createSmartMockFetcher());
    assert(r1.includes("district or mandi name") && r1.includes("Soybean"), "Prompt for missing district in English");

    const r2 = await getMandiPriceResponse("सोयाबीन भाव सांगा", "mr", createSmartMockFetcher());
    assert(r2.includes("जिल्ह्याचे किंवा बाजार समितीचे नाव") && r2.includes("सोयाबीन"), "Prompt for missing district in Marathi");

    const r3 = await getMandiPriceResponse("गेहूं का भाव क्या है?", "hi", createSmartMockFetcher());
    assert(r3.includes("जिले या मंडी का नाम") && r3.includes("गेहूं"), "Prompt for missing district in Hindi");

    const r4 = await getMandiPriceResponse("Kapas ka rate kya hai?", "hinglish", createSmartMockFetcher());
    assert(r4.includes("district ya mandi ka naam") && r4.includes("Kapas"), "Prompt for missing district in Hinglish");

    const r5 = await getMandiPriceResponse("नागपूर भाव", "mr", createSmartMockFetcher());
    assert(r5.includes("कोणत्या पिकाचा") || r5.includes("नागपूर"), "Prompt for missing crop when district provided");
  }

  console.log("\n=== SUITE 3: EXACT COMMODITY & DISTRICT LIVE PRICE FORMATTING ===");
  {
    const fetcher = createSmartMockFetcher();

    // 1. Nagpur + Soyabean
    const rNagpur = await getMandiPriceResponse("What is the soybean price in Nagpur today?", "en", fetcher);
    assert(rNagpur.includes("5500") && rNagpur.includes("5200") && rNagpur.includes("5600") && rNagpur.includes("Nagpur") && rNagpur.includes("Agmarknet"), "Format Nagpur Soybean direct rates (Modal: 5500, Min: 5200, Max: 5600)");
    assert(rNagpur.includes("Savner") && rNagpur.includes("5876"), "Includes other APMC Savner in Nagpur district");

    // 2. Buldhana + Soyabean (Marathi)
    const rBuldhanaMr = await getMandiPriceResponse("बुलढाणा सोयाबीन भाव", "mr", fetcher);
    assert(rBuldhanaMr.includes("बुलढाणा") && rBuldhanaMr.includes("५८५०") || rBuldhanaMr.includes("5850") && rBuldhanaMr.includes("ॲगमार्कनेट"), "Format Buldhana Soybean in Marathi");
    assert(rBuldhanaMr.includes("खामगाव") || rBuldhanaMr.includes("Khamgaon"), "Includes other Buldhana mandis in Marathi");

    // 3. Savner + Soyabean (Hindi)
    const rSavnerHi = await getMandiPriceResponse("सावनेर में सोयाबीन का भाव", "hi", fetcher);
    assert(rSavnerHi.includes("सावनेर") && rSavnerHi.includes("5876") && rSavnerHi.includes("एग्मार्कनेट"), "Format Savner market direct lookup in Hindi");
  }

  console.log("\n=== SUITE 4: MULTI-TIER FALLBACK HIERARCHY ===");
  {
    const fetcher = createSmartMockFetcher();

    // 1. Chikhli (Taluka with parent district Buldhana)
    const rChikhli = await getMandiPriceResponse("Chikhli me soyabean rate", "hinglish", fetcher);
    assert(rChikhli.includes("Buldhana") && rChikhli.includes("5850") && rChikhli.includes("Agmarknet"), "Chikhli falls back to parent district Buldhana live data");

    // 2. District with no live arrivals today -> Falls back to State APMC live records
    const rAkola = await getMandiPriceResponse("Akola soybean price", "en", fetcher);
    assert(rAkola.includes("Direct arrivals for Akola are not reported today") && rAkola.includes("Live Mandi Rates in Maharashtra") && rAkola.includes("Wardha") && rAkola.includes("5850"), "Akola falls back cleanly to Maharashtra state live APMC rates");

    // 3. Marathi State fallback
    const rAkolaMr = await getMandiPriceResponse("अकोला सोयाबीन भाव", "mr", fetcher);
    assert(rAkolaMr.includes("अकोला बाजार समितीत थेट आवक नोंद झालेली नाही") && rAkolaMr.includes("थेट भाव"), "Marathi state-level fallback notice");

    // 4. National Fallback (When state has 0 records, but other states have records)
    const nationalOnlyFetcher = async ({ state, district, market, commodity }) => {
      if (state || district || market) return [];
      if (commodity) return MOCK_NATIONAL_RECORDS;
      return [];
    };
    const rNational = await getMandiPriceResponse("Wheat price in Jaipur", "en", nationalOnlyFetcher);
    assert(rNational.includes("Indore APMC") && rNational.includes("5600"), "National fallback delivers available national APMC rates");
  }

  console.log("\n=== SUITE 5: HONEST UNAVAILABLE DATA & ERROR HANDLING ===");
  {
    // Completely empty API response
    const rUnavailable = await getMandiPriceResponse("Soybean price in Latur", "en", mockFetcherEmpty);
    assert(rUnavailable.includes("not available") && !rUnavailable.includes("₹4620"), "Honest unavailable fallback without fake price");

    // API network failure/error
    const rError = await getMandiPriceResponse("Soybean price in Latur", "en", mockFetcherError);
    assert(rError.includes("not available"), "Graceful fallback on API error/timeout");
  }

  console.log("\n=== SUITE 6: END-TO-END WEBHOOK INTEGRATION ===");
  {
    // Seed in-memory cache to guarantee deterministic test execution without external rate-limiting
    MANDI_API_CACHE.set("Soyabean|Nagpur|||100", { timestamp: Date.now(), data: MOCK_NAGPUR_RECORDS });
    MANDI_API_CACHE.set("Soyabean|Buldhana|||100", { timestamp: Date.now(), data: MOCK_BULDHANA_RECORDS });

    const msg1 = {
      from: "919876543210",
      type: "text",
      text: { body: "What is the soybean price in Nagpur today?" }
    };
    const res1 = await processIncomingMessage(msg1);
    assert(res1.type === "text" && res1.lang === "en" && res1.intent === "price", "End-to-end processIncomingMessage price routing");
    assert(res1.replyText.includes("Nagpur") && res1.replyText.includes("₹5500"), "End-to-end WhatsApp reply contains real Nagpur modal price ₹5500");

    const msg2 = {
      from: "919876543210",
      type: "text",
      text: { body: "बुलढाणा बाजार समितीमध्ये सोयाबीनचा भाव काय आहे?" }
    };
    const res2 = await processIncomingMessage(msg2);
    assert(res2.lang === "mr" && res2.intent === "price", "End-to-end Marathi mandi query routing");
    assert(res2.replyText.includes("बुलढाणा") && res2.replyText.includes("₹5850"), "End-to-end Marathi WhatsApp reply contains real Buldhana modal price ₹5850");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

