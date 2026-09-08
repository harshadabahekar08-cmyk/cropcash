/**
 * Unit & Integration Tests for PDKV Agricultural Knowledge Base & Crop Advisory Service
 */

const {
  PDKV_SOURCE_INFO,
  PDKV_KNOWLEDGE,
  resolvePdkvCropKey,
  getPdkvCropKnowledge,
  getPdkvFertilizerGuidance,
  getPdkvIpmGuidance
} = require("../data/pdkvKnowledgeBase");

const {
  detectCultivationTopic,
  formatCropAdvisoryResponse,
  getCropAdvisoryResponse
} = require("../services/cropAdvisoryService");

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

  console.log("=== SUITE 1: PDKV KNOWLEDGE BASE PROVENANCE & COVERAGE ===");
  {
    assert(PDKV_SOURCE_INFO.organization.includes("Dr. Panjabrao Deshmukh Krishi Vidyapeeth"), "Verified PDKV organization name");
    assert(PDKV_SOURCE_INFO.publications.some(p => p.includes("सोयाबीन लागवड व तंत्रज्ञान")), "Contains official monograph publication");
    assert(PDKV_SOURCE_INFO.publications.some(p => p.includes("कृषिसंवाद २०२४")), "Contains Krishi Samvad 2024 publication");

    // Verified Crops
    assert(Boolean(PDKV_KNOWLEDGE.Soyabean), "Contains verified Soyabean knowledge");
    assert(Boolean(PDKV_KNOWLEDGE.Cotton), "Contains verified Cotton knowledge");
    assert(Boolean(PDKV_KNOWLEDGE.Pigeonpea), "Contains verified Pigeonpea / Tur knowledge");
    assert(Boolean(PDKV_KNOWLEDGE.Gram), "Contains verified Gram / Chickpea knowledge");
    assert(Boolean(PDKV_KNOWLEDGE.Wheat), "Contains verified Wheat knowledge");
  }

  console.log("\n=== SUITE 2: PDKV CROP DETAILS & VARIETIES ===");
  {
    // Soybean Varieties & Agronomics
    const sb = getPdkvCropKnowledge("सोयाबीन");
    assert(sb !== null, "Resolves Devanagari crop alias 'सोयाबीन' -> Soyabean");
    assert(sb.varieties.items.some(v => v.name.includes("PDKV Amba")), "Contains PDKV Amba (AMS 100-39)");
    assert(sb.varieties.items.some(v => v.name.includes("PDKV Poorva")), "Contains PDKV Poorva");
    assert(sb.varieties.items.some(v => v.name.includes("PDKV Yellow Gold")), "Contains PDKV Yellow Gold");
    assert(sb.varieties.items.some(v => v.name.includes("Phule Sangam") && v.descriptionMr.includes("मफुकृवि राहुरी")), "Phule Sangam (KDS-726) attributed to MPKV Rahuri in PDKV package");
    assert(sb.fertilizer.basalMr.includes("30:60:30 NPK"), "Soybean basal NPK primary benchmark is 30:60:30");
    assert(sb.sowing.rainfallThresholdMr.includes("७५ ते १०० मि.मी."), "Verified 75-100 mm rainfall threshold");
    assert(sb.sowing.depthMr.includes("३ ते ५ सें.मी."), "Verified 3-5 cm sowing depth");
    assert(sb.seedTreatment.methodNameMr.includes("FIR"), "Verified FIR seed treatment protocol");
    assert(sb.weedManagement.preEmergenceMr.includes("डायक्लोसुलम"), "Verified Diclosulam pre-emergence weedicide");
    assert(sb.harvesting.storageMoistureMr.includes("९ ते १०%"), "Verified 9-10% storage moisture");

    // Cotton
    const ct = getPdkvCropKnowledge("कापूस");
    assert(ct.varieties.items.some(v => v.name.includes("Suvarna Shubhra")), "Contains Cotton variety Suvarna Shubhra");
    assert(ct.fertilizer.micronutrientsMr.includes("PDKV लिक्विड मायक्रो ग्रेड XI"), "Contains PDKV Liquid Micro Grade XI for Cotton");

    // Pigeonpea (Tur)
    const tur = getPdkvCropKnowledge("तूर");
    assert(tur.varieties.items.some(v => v.name.includes("PDKV Ashlesha")), "Contains Tur variety PDKV Ashlesha");
    assert(tur.fertilizer.micronutrientsMr.includes("PDKV लिक्विड मायक्रो ग्रेड X"), "Contains PDKV Liquid Micro Grade X for Tur");

    // Gram (Harbhara)
    const chana = getPdkvCropKnowledge("हरभरा");
    assert(chana.varieties.items.some(v => v.name.includes("PDKV Kanchan")), "Contains Gram variety PDKV Kanchan");

    // Wheat
    const wheat = getPdkvCropKnowledge("गहू");
    assert(wheat.varieties.items.some(v => v.name.includes("AKW-1071")), "Contains Wheat variety AKW-1071");
  }

  console.log("\n=== SUITE 3: TOPIC DETECTION ===");
  {
    assert(detectCultivationTopic("सोयाबीनचे कोणते वाण चांगले आहे?") === "varieties", "Detect topic: varieties (वाण)");
    assert(detectCultivationTopic("पेरणीचे अंतर किती ठेवावे?") === "sowing", "Detect topic: sowing (अंतर)");
    assert(detectCultivationTopic("सोयाबीनला बीजप्रक्रिया कशी करावी?") === "seed_treatment", "Detect topic: seed_treatment (बीजप्रक्रिया)");
    assert(detectCultivationTopic("तणनाशक कोणते फवारावे?") === "weed", "Detect topic: weed (तणनाशक)");
    assert(detectCultivationTopic("काढणी व साठवणूक कशी करावी?") === "harvesting", "Detect topic: harvesting (काढणी)");
  }

  console.log("\n=== SUITE 4: MISSING CROP PROMPTS ===");
  {
    const rNoCropMr = await getCropAdvisoryResponse("पेरणीचे अंतर सांगा", "mr");
    assert(rNoCropMr.includes("पिकाचे नाव") && rNoCropMr.includes("लागवड सल्ला"), "Marathi missing crop prompt");

    const rNoCropHi = await getCropAdvisoryResponse("बुवाई की दूरी बताओ", "hi");
    assert(rNoCropHi.includes("फसल का नाम") && rNoCropHi.includes("सलाह"), "Hindi missing crop prompt");

    const rNoCropEn = await getCropAdvisoryResponse("What is the seed rate?", "en");
    assert(rNoCropEn.includes("crop name") && rNoCropEn.includes("Cultivation"), "English missing crop prompt");
  }

  console.log("\n=== SUITE 5: CROP ADVISORY MULTILINGUAL FORMATTING ===");
  {
    // Marathi Varieties Response
    const rVarMr = await getCropAdvisoryResponse("सोयाबीनचे सुधारित वाण कोणते?", "mr");
    assert(rVarMr.includes("पंदेकृवि शिफारसित सोयाबीन वाण"), "Marathi heading with PDKV attribution");
    assert(rVarMr.includes("PDKV Amba") && rVarMr.includes("AMS 100-39"), "Embeds PDKV Amba details");
    assert(rVarMr.includes("डॉ. पंजाबराव देशमुख कृषी विद्यापीठ"), "Embeds official PDKV organization name");

    // Marathi Sowing Response
    const rSowMr = await getCropAdvisoryResponse("सोयाबीन पेरणी अंतर आणि वेळ", "mr");
    assert(rSowMr.includes("पेरणी व अंतर शिफारस"), "Marathi sowing heading");
    assert(rSowMr.includes("७५ ते १०० मि.मी.") && rSowMr.includes("४५ × ५"), "Embeds verified rainfall threshold and spacing");

    // Marathi Seed Treatment (FIR)
    const rStMr = await getCropAdvisoryResponse("सोयाबीन बीजप्रक्रिया कशी करावी?", "mr");
    assert(rStMr.includes("FIR पद्धत"), "Embeds FIR protocol");
    assert(rStMr.includes("ट्रायकोडर्मा") && rStMr.includes("थायामेथोक्साम") && rStMr.includes("रायझोबियम"), "Embeds all 3 FIR components");

    // English Cotton Advisory
    const rCotEn = await getCropAdvisoryResponse("Cotton recommended varieties", "en");
    assert(rCotEn.includes("PDKV Recommended Cotton Varieties"), "English Cotton heading");
    assert(rCotEn.includes("Suvarna Shubhra"), "Contains Cotton variety Suvarna Shubhra");

    // Hindi Pigeonpea (Tur) Sowing
    const rTurHi = await getCropAdvisoryResponse("अरहर / तूर की उन्नत किस्में", "hi");
    assert(rTurHi.includes("PDKV अनुशंसित") && rTurHi.includes("किस्में"), "Hindi Tur heading");
    assert(rTurHi.includes("PDKV Ashlesha"), "Contains PDKV Ashlesha variety");
  }

  console.log("\n=== SUITE 6: END-TO-END WEBHOOK INTEGRATION ===");
  {
    const msg = {
      from: "919876543210",
      type: "text",
      text: { body: "सोयाबीनचे कोणते वाण पेरावे?" }
    };
    const e2e = await processIncomingMessage(msg);
    assert(e2e.type === "text", "Message type is text");
    assert(e2e.intent === "cultivation", "Intent recognized as cultivation");
    assert(e2e.lang === "mr", "Language recognized as Marathi");
    assert(e2e.replyText.includes("पंदेकृवि") && e2e.replyText.includes("PDKV Amba"), "Reply includes PDKV verified variety advice");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
