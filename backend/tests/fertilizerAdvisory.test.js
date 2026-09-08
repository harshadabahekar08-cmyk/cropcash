/**
 * Unit & Integration Tests for Fertilizer & Nutrient Advisory Service
 */

const {
  extractFertilizerEntities,
  formatFertilizerResponse,
  getFertilizerAdvisoryResponse,
  GROWTH_STAGES,
  NUTRIENT_SYMPTOMS
} = require("../services/fertilizerAdvisoryService");

const { processIncomingMessage } = require("../services/responseHandler");

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

  console.log("=== SUITE 1: FERTILIZER ENTITY EXTRACTION ===");
  {
    const e1 = extractFertilizerEntities("माझ्या सोयाबीनला फुलधारणेवेळी कोणते खत द्यावे?");
    assert(e1.crop?.standardName === "Soyabean", "Extract Marathi crop: सोयाबीन -> Soyabean");
    assert(e1.stage?.key === "flowering", "Extract Marathi stage: फुलधारणेवेळी -> flowering");

    const e2 = extractFertilizerEntities("Cotton vegetative stage fertilizer schedule");
    assert(e2.crop?.standardName === "Cotton", "Extract English crop: Cotton");
    assert(e2.stage?.key === "vegetative", "Extract English stage: vegetative");

    const e3 = extractFertilizerEntities("गेहूं की बुवाई के समय कौन सा खाद डालें?");
    assert(e3.crop?.standardName === "Wheat", "Extract Hindi crop: गेहूं -> Wheat");
    assert(e3.stage?.key === "sowing_basal", "Extract Hindi stage: बुवाई -> sowing_basal");

    const e4 = extractFertilizerEntities("सोयाबीनची पाने पिवळी पडत आहेत, काय खत देऊ?");
    assert(e4.crop?.standardName === "Soyabean", "Extract crop with symptom");
    assert(e4.symptom?.key === "nitrogen", "Extract symptom: पाने पिवळी -> nitrogen");

    const e5 = extractFertilizerEntities("What is the exact dose of DAP per acre for soybean?");
    assert(e5.crop?.standardName === "Soyabean", "Extract crop from exact dose query");
    assert(e5.isExactDoseRequested === true, "Detected exact dose request per acre");
  }

  console.log("\n=== SUITE 2: MISSING CROP PROMPTS ===");
  {
    const rNoCropMr = await getFertilizerAdvisoryResponse("खत सांगा कोणते द्यावे?", "mr");
    assert(rNoCropMr.includes("पिकाचे नाव") && rNoCropMr.includes("पोषण व्यवस्थापन"), "Marathi missing crop prompt");

    const rNoCropHi = await getFertilizerAdvisoryResponse("मेरी फसल के लिए कौन सा खाद चाहिए?", "hi");
    assert(rNoCropHi.includes("फसल का नाम") && rNoCropHi.includes("उर्वरक"), "Hindi missing crop prompt");

    const rNoCropEn = await getFertilizerAdvisoryResponse("Which fertilizer should I use?", "en");
    assert(rNoCropEn.includes("crop name") && rNoCropEn.includes("Fertilizer"), "English missing crop prompt");
  }

  console.log("\n=== SUITE 3: STAGE-SPECIFIC & GENERAL SCHEDULE ADVISORY ===");
  {
    // Stage specified (Soybean Flowering)
    const rStageMr = await getFertilizerAdvisoryResponse("सोयाबीन फुलधारणा खत सांगा", "mr");
    assert(rStageMr.includes("सोयाबीन") && rStageMr.includes("फुलधारणा") && rStageMr.includes("०:५२:३४"), "Marathi stage-specific flowering guidance");

    // Stage omitted (General Stage-Wise Overview)
    const rAllStagesEn = await getFertilizerAdvisoryResponse("What fertilizer is needed for soybean?", "en");
    assert(rAllStagesEn.includes("Basal Stage") && rAllStagesEn.includes("Growth Stage") && rAllStagesEn.includes("Flowering Stage"), "English complete stage-wise overview when stage omitted");

    // Hindi Cotton Fertilizer Schedule
    const rCottonHi = await getFertilizerAdvisoryResponse("कपास के लिए खाद का बताओ", "hi");
    assert(rCottonHi.includes("कपास") && rCottonHi.includes("10:26:26") && rCottonHi.includes("Soil Health Card"), "Hindi Cotton fertilizer schedule with Soil Health Card note");
  }

  console.log("\n=== SUITE 4: NUTRIENT SYMPTOM & SAFETY DISCLAIMER ===");
  {
    const rSymptomMr = await getFertilizerAdvisoryResponse("सोयाबीनची पाने पिवळी पडत आहेत, काय खत देऊ?", "mr");
    assert(rSymptomMr.includes("नत्र (Nitrogen)") && rSymptomMr.includes("संभाव्य निरीक्षण") && rSymptomMr.includes("Soil Health Card"), "Marathi visual symptom indication with non-confirmed disclaimer");

    const rSymptomEn = await getFertilizerAdvisoryResponse("Burnt leaf edges on cotton plant", "en");
    assert(rSymptomEn.includes("Potassium") && rSymptomEn.includes("possible indication") && rSymptomEn.includes("laboratory-confirmed"), "English symptom indication with strict agronomic safety disclaimer");
  }

  console.log("\n=== SUITE 5: EXACT DOSE DISCLAIMER ENFORCEMENT ===");
  {
    const rDoseMr = await getFertilizerAdvisoryResponse("सोयाबीनला एकरी किती किलो खत द्यावे?", "mr");
    assert(rDoseMr.includes("एकरी अचूक प्रमाणाबाबत") && rDoseMr.includes("माती परीक्षण"), "Marathi exact dose disclaimer requiring soil testing");

    const rDoseHi = await getFertilizerAdvisoryResponse("गेहूं में प्रति एकड़ कितना डालना चाहिए?", "hi");
    assert(rDoseHi.includes("सटीक मात्रा") && rDoseHi.includes("मिट्टी की जांच"), "Hindi exact dose disclaimer requiring soil testing");
  }

  console.log("\n=== SUITE 6: END-TO-END WEBHOOK INTEGRATION ===");
  {
    const msg = {
      from: "919876543210",
      type: "text",
      text: { body: "सोयाबीनसाठी कोणते खत योग्य आहे?" }
    };
    const e2e = await processIncomingMessage(msg);
    assert(e2e.type === "text", "Message type text");
    assert(e2e.intent === "fertilizer", "Intent recognized as fertilizer");
    assert(e2e.lang === "mr", "Language recognized as Marathi");
    assert(e2e.replyText.includes("खत व पोषण सल्ला"), "End-to-end webhook returns fertilizer guidance");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
