/**
 * Unit Tests for Local Transport Cost & Mandi Net-Return Decision Service
 */

const {
  extractQuantity,
  extractFarmerVillage,
  getDistanceKm,
  calculateTransportCost,
} = require("../services/transportService");

const {
  getMandiDecisionResponse,
  isTransportDecisionIntent
} = require("../services/mandiDecisionService");

const {
  getLocalizedLocationName,
  formatMandiPriceResponse
} = require("../services/mandiPriceService");

const { processIncomingMessage } = require("../services/responseHandler");

// Mock price data for testing
const MOCK_PRICES = {
  "Khamgaon": [{ commodity: "Soyabean", modal_price: "4800", market: "Khamgaon", district: "Buldhana", state: "Maharashtra" }],
  "Chikhli": [{ commodity: "Soyabean", modal_price: "4600", market: "Chikhli", district: "Buldhana", state: "Maharashtra" }],
  "Malkapur": [{ commodity: "Soyabean", modal_price: "4700", market: "Malkapur", district: "Buldhana", state: "Maharashtra" }],
  "Buldhana": [{ commodity: "Soyabean", modal_price: "4550", market: "Buldhana", district: "Buldhana", state: "Maharashtra" }]
};

const mockFetcher = async ({ district }) => {
  return MOCK_PRICES[district] || [];
};

const mockFetcherEmpty = async () => [];

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

  console.log("=== SUITE 1: QUANTITY EXTRACTION ===");
  {
    assert(extractQuantity("I have 20 quintal soybean") === 20, "Extract: 20 quintal");
    assert(extractQuantity("20 qtl kapas") === 20, "Extract: 20 qtl");
    assert(extractQuantity("माझ्याकडे २० क्विंटल सोयाबीन आहे") === 20, "Extract Devanagari numerals: २० क्विंटल");
    assert(extractQuantity("50 bori gehu") === 25, "Extract bags: 50 bori -> 25 quintals");
    assert(extractQuantity("2 ton soybean") === 20, "Extract tons: 2 ton -> 20 quintals");
    assert(extractQuantity("Which mandi is better for soybean?") === null, "Null when quantity is omitted");
  }

  console.log("\n=== SUITE 2: VILLAGE / LOCATION EXTRACTION ===");
  {
    assert(extractFarmerVillage("I am from Chikhli")?.key === "chikhli", "Extract English: Chikhli");
    assert(extractFarmerVillage("उंड्री गावातून 20 क्विंटल")?.key === "undri", "Extract Marathi: उंड्री");
    assert(extractFarmerVillage("मोताळा से खामगांव")?.key === "motala", "Extract Hindi: मोताळा");
    assert(extractFarmerVillage("Rohinkhed se Malkapur")?.key === "rohinkhed", "Extract Hinglish: Rohinkhed");
    assert(extractFarmerVillage("I have 20 quintals") === null, "Null when village is omitted");
  }

  console.log("\n=== SUITE 3: DISTANCE & TRANSPORT CALCULATION ===");
  {
    const d1 = getDistanceKm("chikhli", "khamgaon");
    assert(d1 === 45, "Distance Chikhli -> Khamgaon = 45 km");

    const d2 = getDistanceKm("motala", "malkapur");
    assert(d2 === 28, "Distance Motala -> Malkapur = 28 km");

    // 20 quintals, 45 km: 400 + (45 * 3.5 * 20) = 400 + 3150 = 3550
    const cost = calculateTransportCost({ distanceKm: 45, quantityQtl: 20 });
    assert(cost.estimatedCost === 3550, "Transport Cost Formula: 400 + (45 * 3.5 * 20) = ₹3,550");
    assert(cost.perQuintalCost === 177.5, "Per Quintal Cost = ₹177.5/qtl");
    assert(cost.isEstimate === true, "Marked as estimate");
  }

  console.log("\n=== SUITE 4: MISSING QUANTITY & LOCATION PROMPTS ===");
  {
    const rNoQty = await getMandiDecisionResponse("Which mandi is better for soybean from Chikhli?", "en", mockFetcher);
    assert(rNoQty.includes("how many quintals") && rNoQty.includes("CropCash Transport"), "Prompt missing quantity in English");

    const rNoLoc = await getMandiDecisionResponse("I have 20 quintal soybean. Which mandi is better?", "en", mockFetcher);
    assert(rNoLoc.includes("village or town name") && rNoLoc.includes("20 quintals"), "Prompt missing location in English");

    const rNoQtyMr = await getMandiDecisionResponse("चिखलीहून कोणती बाजार समिती फायदेशीर ठरेल?", "mr", mockFetcher);
    assert(rNoQtyMr.includes("किती क्विंटल") && rNoQtyMr.includes("वाहतूक खर्च"), "Prompt missing quantity in Marathi");

    const rNoLocMr = await getMandiDecisionResponse("माझ्याकडे २० क्विंटल सोयाबीन आहे, कुठे विकू?", "mr", mockFetcher);
    assert(rNoLocMr.includes("गावाचे किंवा तालुक्याचे नाव"), "Prompt missing location in Marathi");
  }

  console.log("\n=== SUITE 5: NET-RETURN CALCULATION & MANDI COMPARISON ===");
  {
    // Chikhli (20 qtl):
    // - Khamgaon: Price ₹4800, Gross = ₹96,000, Dist = 45km, Transport = ₹3,550, Net = ₹92,450
    // - Chikhli: Price ₹4600, Gross = ₹92,000, Dist = 4km, Transport = 400 + (4*3.5*20) = ₹680, Net = ₹91,320
    // Khamgaon gives ₹1,130 higher net profit!
    const resEn = await getMandiDecisionResponse("I have 20 quintal soybean in Chikhli. Which mandi is better?", "en", mockFetcher);
    assert(resEn.includes("Khamgaon") && resEn.includes("₹92,450") && resEn.includes("Recommendation"), "English Net Return Decision Comparison");

    const resMr = await getMandiDecisionResponse("माझ्याकडे २० क्विंटल सोयाबीन आहे चिखलीत, कुठे विकू?", "mr", mockFetcher);
    assert(resMr.includes("खामगाव") && resMr.includes("चिखली") && resMr.includes("शिफारस"), "Marathi Net Return with Localized Names (खामगाव, चिखली)");

    const resHi = await getMandiDecisionResponse("चिखली से 20 क्विंटल सोयाबीन कहाँ बेचूँ?", "hi", mockFetcher);
    assert(resHi.includes("सलाह") && resHi.includes("खामगांव"), "Hindi Net Return Decision Comparison");

    const resHinglish = await getMandiDecisionResponse("20 quintal soyabean Chikhli se kahan bechu?", "hinglish", mockFetcher);
    assert(resHinglish.includes("Recommendation") && resHinglish.includes("Khamgaon"), "Hinglish Net Return Decision Comparison");
  }

  console.log("\n=== SUITE 6: LOCALIZED VILLAGE & MANDI DISPLAY NAMES ===");
  {
    assert(getLocalizedLocationName("Chikhli", "mr") === "चिखली", "Localize Chikhli -> चिखली (Marathi)");
    assert(getLocalizedLocationName("Khamgaon", "mr") === "खामगाव", "Localize Khamgaon -> खामगाव (Marathi)");
    assert(getLocalizedLocationName("Malkapur", "mr") === "मलकापूर", "Localize Malkapur -> मलकापूर (Marathi)");
    assert(getLocalizedLocationName("Motala", "mr") === "मोताळा", "Localize Motala -> मोताळा (Marathi)");
    assert(getLocalizedLocationName("Latur", "mr") === "लातूर", "Localize Latur -> लातूर (Marathi)");
    assert(getLocalizedLocationName("Nagpur", "mr") === "नागपूर", "Localize Nagpur -> नागपूर (Marathi)");
    assert(getLocalizedLocationName("Buldhana", "mr") === "बुलढाणा", "Localize Buldhana -> बुलढाणा (Marathi)");
    assert(getLocalizedLocationName("Undri", "mr") === "उंड्री", "Localize Undri -> उंड्री (Marathi)");

    assert(getLocalizedLocationName("Khamgaon", "hi") === "खामगांव", "Localize Khamgaon -> खामगांव (Hindi)");
    assert(getLocalizedLocationName("Chikhli", "en") === "Chikhli", "Keep English: Chikhli (English)");
    assert(getLocalizedLocationName("UnknownMandiXYZ", "mr") === "UnknownMandiXYZ", "Do not mangle unknown location");
  }

  console.log("\n=== SUITE 7: UNAVAILABLE MANDI PRICE HANDLING ===");
  {
    const resUnavail = await getMandiDecisionResponse("I have 20 quintal soybean in Chikhli. Which mandi is better?", "en", mockFetcherEmpty);
    assert(resUnavail.includes("Official live price not available today") && !resUnavail.includes("₹92,450"), "Truthful fallback when official prices unavailable");
  }

  console.log("\n=== SUITE 8: INTENT DETECTION & END-TO-END PIPELINE ===");
  {
    assert(isTransportDecisionIntent("20 quintal soybean Khamgaon le jane ka transport kitna lagega?") === true, "Intent: Transport cost query");
    assert(isTransportDecisionIntent("Majhyakade 20 quintal soyabean aahe, Khamgaon la nevu ka?") === true, "Intent: Marathi decision query");
    assert(isTransportDecisionIntent("What is the soybean price in Nagpur today?") === false, "Pure price query not confused with transport decision");

    const msg = {
      from: "919876543210",
      type: "text",
      text: { body: "I have 20 quintal soybean in Chikhli. Which mandi is better?" }
    };
    const e2e = await processIncomingMessage(msg);
    assert(e2e.intent === "transport_decision" && e2e.replyText.includes("CropCash Mandi Decision"), "End-to-end webhook routing to transport_decision");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
