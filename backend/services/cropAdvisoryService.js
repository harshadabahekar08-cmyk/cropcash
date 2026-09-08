/**
 * CropCash Crop Cultivation Advisory Service
 * Delivers comprehensive, source-backed crop package of practices (PoP)
 * using the PDKV Agricultural Knowledge Base.
 */

const { detectLanguage } = require("./languageDetector");
const { extractMandiEntities } = require("./mandiPriceService");
const { getPdkvCropKnowledge, resolvePdkvCropKey } = require("../data/pdkvKnowledgeBase");

// Cultivation Topic Keywords
const TOPIC_PATTERNS = {
  varieties: [
    "variety", "varieties", "hybrid", "seeds", "seed name", "types",
    "वाण", "जाती", "बियाणे वाण", "सुधारित वाण", "किस्में", "किस्म", "प्रजातियां"
  ],
  sowing: [
    "sowing", "spacing", "distance", "sowing time", "planting", "depth", "rainfall",
    "पेरणी", "लागवड", "अंतर", "पेरणीची वेळ", "पेरणीचे अंतर", "बुवाई", "बोनी", "दूरी", "बुवाई का समय"
  ],
  seed_treatment: [
    "seed treatment", "treatment", "fir", "fungicide", "rhizobium", "trichoderma",
    "बीजप्रक्रिया", "बीज प्रक्रिया", "बीज उपचार", "एफआयआर"
  ],
  weed: [
    "weed", "herbicide", "weedicide", "grass",
    "तण", "तणनाशक", "तण व्यवस्थापन", "खरपतवार", "घास"
  ],
  harvesting: [
    "harvest", "harvesting", "threshing", "storage", "yield", "moisture",
    "काढणी", "मळणी", "साठवणूक", "ओलावा", "कटाई", "मड़ाई", "भंडारण"
  ]
};

/**
 * Detects specific cultivation topic from text
 * @param {string} text 
 * @returns {string} Topic key
 */
function detectCultivationTopic(text) {
  if (!text || typeof text !== "string") return "general_package";
  const clean = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
    for (const kw of keywords) {
      if (clean.includes(kw)) {
        return topic;
      }
    }
  }

  return "general_package";
}

/**
 * Formats multilingual crop cultivation advisory response
 * @param {object} params
 * @param {object|null} params.cropData - PDKV Crop data record
 * @param {string} params.topic - Detected topic
 * @param {'en'|'hi'|'mr'|'hinglish'} params.lang - Target language
 * @returns {string} Formatted response
 */
function formatCropAdvisoryResponse({ cropData, topic, lang = "mr" }) {
  if (!cropData) {
    const missingPrompts = {
      mr: `🌾 *क्रॉपकॅश पीक लागवड सल्ला कक्ष*\n\nआपण पीक लागवड तंत्रज्ञानाविषयी विचारले आहे. कृपया आपल्या *पिकाचे नाव* सांगा (उदा. 'सोयाबीन वाण', 'कापूस लागवड', 'तूर पेरणी अंतर', 'हरभरा बीजप्रक्रिया').`,
      hi: `🌾 *क्रॉपकैश फसल उत्पादन सलाह कक्ष*\n\nसटीक कृषि मार्गदर्शन के लिए कृपया अपनी *फसल का नाम* बताएं (जैसे: 'सोयाबीन किस्में', 'कपास बुवाई', 'अरहर दूरी', 'चना बीज उपचार')।`,
      hinglish: `🌾 *CropCash Cultivation Advisory*\n\nCrop cultivation guidance ke liye kripya apni *crop ka naam* batayein (e.g. 'Soybean varieties', 'Cotton sowing distance', 'Gram seed treatment').`,
      en: `🌾 *CropCash Crop Cultivation Desk*\n\nPlease specify your *crop name* for official cultivation guidance (e.g., 'Soybean varieties', 'Cotton sowing spacing', 'Gram seed treatment').`
    };
    return missingPrompts[lang] || missingPrompts.en;
  }

  const cropName = cropData.cropName[lang] || cropData.cropName.mr;
  const sourceName = cropData.source.organizationMr || cropData.source.organization;
  const pubTitle = cropData.source.publications[0];

  // 1. Specific Topic: Varieties
  if (topic === "varieties" && cropData.varieties) {
    const varList = cropData.varieties.items.map(v => `• *${v.name}:* ${lang === "en" ? v.descriptionEn : v.descriptionMr}`).join("\n");
    const templates = {
      mr: `🌱 *पंदेकृवि शिफारसित ${cropName} वाण*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n📖 *संदर्भ:* ${pubTitle}\n\n${varList}\n\n⚠️ *टीप:* बियाणे खरेदी करताना अधिकृत महाबीज किंवा विद्यापीठाच्या केंद्रावरूनच खरेदी करावी.`,
      hi: `🌱 *PDKV अनुशंसित ${cropName} किस्में*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n📖 *संदर्भ:* ${pubTitle}\n\n${varList}\n\n⚠️ *नोट:* प्रमाणित बीज ही आधिकारिक केंद्र से खरीदें।`,
      hinglish: `🌱 *PDKV Recommended ${cropName} Varieties*\n\n📋 *Official Source:* ${cropData.source.organization}\n📖 *Publication:* ${pubTitle}\n\n${varList}\n\n⚠️ *Tip:* Certified seed authorized centers se hi purchase karein.`,
      en: `🌱 *PDKV Recommended ${cropName} Varieties*\n\n📋 *Official Source:* ${cropData.source.organization}\n📖 *Publication:* ${pubTitle}\n\n${varList}\n\n⚠️ *Note:* Purchase certified seeds from authorized university or state seed outlets.`
    };
    return templates[lang] || templates.en;
  }

  // 2. Specific Topic: Sowing & Spacing
  if (topic === "sowing" && cropData.sowing) {
    const sw = cropData.sowing;
    const templates = {
      mr: `🚜 *पंदेकृवि ${cropName} पेरणी व अंतर शिफारस*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n\n🌧️ *पाऊस प्रमाण:* ${sw.rainfallThresholdMr}\n📅 *पेरणीची वेळ:* ${sw.optimalTimeMr}\n📏 *पेरणी अंतर:* ${sw.spacingMr}\n⚖️ *बियाणे प्रमाण:* ${sw.seedRateMr}\n⬇️ *पेरणी खोली:* ${sw.depthMr}\n\n⚠️ *महत्त्वाची सूचना:* ७५-१०० मिमी पाऊस झाल्याशिवाय घाईघाईत कोरड्यात पेरणी करू नये.`,
      hi: `🚜 *PDKV ${cropName} बुवाई एवं दूरी अनुशंसा*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n\n🌧️ *वर्षा मानक:* ${sw.rainfallThresholdMr}\n📅 *बुवाई का समय:* ${sw.optimalTimeMr}\n📏 *बुवाई दूरी:* ${sw.spacingMr}\n⚖️ *बीज दर:* ${sw.seedRateMr}\n⬇️ *बुवाई गहराई:* ${sw.depthMr}`,
      hinglish: `🚜 *PDKV ${cropName} Sowing & Spacing Guide*\n\n📋 *Source:* ${cropData.source.organization}\n\n🌧️ *Rainfall Condition:* ${sw.rainfallThresholdEn}\n📅 *Time:* ${sw.optimalTimeEn}\n📏 *Spacing:* ${sw.spacingEn}\n⚖️ *Seed Rate:* ${sw.seedRateEn}\n⬇️ *Depth:* ${sw.depthEn}`,
      en: `🚜 *PDKV ${cropName} Sowing & Spacing Guidelines*\n\n📋 *Official Source:* ${cropData.source.organization}\n\n🌧️ *Rainfall Requirement:* ${sw.rainfallThresholdEn}\n📅 *Optimal Window:* ${sw.optimalTimeEn}\n📏 *Plant Spacing:* ${sw.spacingEn}\n⚖️ *Seed Rate:* ${sw.seedRateEn}\n⬇️ *Sowing Depth:* ${sw.depthEn}`
    };
    return templates[lang] || templates.en;
  }

  // 3. Specific Topic: Seed Treatment (FIR)
  if (topic === "seed_treatment" && cropData.seedTreatment) {
    const st = cropData.seedTreatment;
    const steps = (lang === "en" ? st.stepsEn : st.stepsMr).join("\n");
    const templates = {
      mr: `🛡️ *पंदेकृवि ${cropName} बीजप्रक्रिया (${st.methodNameMr})*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n\n${steps}\n\n⚠️ *टीप:* आधी बुरशीनाशक, नंतर कीटकनाशक आणि सर्वात शेवटी जिवाणू खतांची प्रक्रिया सावलीत करावी.`,
      hi: `🛡️ *PDKV ${cropName} बीज उपचार (${st.methodNameMr})*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n\n${steps}\n\n⚠️ *नोट:* पहले फफूंदनाशक, फिर कीटनाशक और अंत में राइजोबियम/पीएसबी कल्चर लगाएं।`,
      hinglish: `🛡️ *PDKV ${cropName} Seed Treatment (FIR Method)*\n\n📋 *Source:* ${cropData.source.organization}\n\n${steps}\n\n⚠️ *Rule:* Follow Fungicide ➔ Insecticide ➔ Rhizobium order in shade.`,
      en: `🛡️ *PDKV ${cropName} Seed Treatment (FIR Protocol)*\n\n📋 *Official Source:* ${cropData.source.organization}\n\n${steps}\n\n⚠️ *Protocol:* Always apply Fungicide first, Insecticide second, and Biofertilizer last in shade.`
    };
    return templates[lang] || templates.en;
  }

  // 4. Specific Topic: Weed Management
  if (topic === "weed" && cropData.weedManagement) {
    const wm = cropData.weedManagement;
    const templates = {
      mr: `🌿 *पंदेकृवि ${cropName} तण व्यवस्थापन शिफारस*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n\n१. *उगवणीपूर्वी (Pre-emergence):*\n${wm.preEmergenceMr}\n\n२. *उगवणीनंतर (Post-emergence):*\n${wm.postEmergenceMr}\n\n⚠️ *टीप:* तणनाशक फवारताना जमिनीत पुरेसा ओलावा असणे आवश्यक आहे. फ्लॅट फॅन नोझलचा वापर करावा.`,
      hi: `🌿 *PDKV ${cropName} खरपतवार प्रबंधन*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n\n1. *उगने से पहले (Pre-emergence):*\n${wm.preEmergenceMr}\n\n2. *उगने के बाद (Post-emergence):*\n${wm.postEmergenceMr}`,
      hinglish: `🌿 *PDKV ${cropName} Weed Management*\n\n📋 *Source:* ${cropData.source.organization}\n\n1. *Pre-emergence:* ${wm.preEmergenceEn}\n\n2. *Post-emergence:* ${wm.postEmergenceEn}`,
      en: `🌿 *PDKV ${cropName} Weed Management Guidelines*\n\n📋 *Official Source:* ${cropData.source.organization}\n\n1. *Pre-emergence (within 48h):*\n${wm.preEmergenceEn}\n\n2. *Post-emergence (15-20 days):*\n${wm.postEmergenceEn}`
    };
    return templates[lang] || templates.en;
  }

  // 5. Specific Topic: Harvesting & Storage
  if (topic === "harvesting" && cropData.harvesting) {
    const hv = cropData.harvesting;
    const templates = {
      mr: `🌾 *पंदेकृवि ${cropName} काढणी व साठवणूक तंत्रज्ञान*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n\n🚜 *काढणी व मळणी:* ${hv.podMoistureMr}\n\n📦 *सुरक्षित साठवणूक:* ${hv.storageMoistureMr}`,
      hi: `🌾 *PDKV ${cropName} कटाई एवं भंडारण*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n\n🚜 *कटाई व मड़ाई:* ${hv.podMoistureMr}\n\n📦 *सुरक्षित भंडारण:* ${hv.storageMoistureMr}`,
      hinglish: `🌾 *PDKV ${cropName} Harvesting & Storage*\n\n📋 *Source:* ${cropData.source.organization}\n\n🚜 *Harvesting:* ${hv.podMoistureEn}\n\n📦 *Safe Storage:* ${hv.storageMoistureEn}`,
      en: `🌾 *PDKV ${cropName} Harvesting & Post-Harvest Guidelines*\n\n📋 *Official Source:* ${cropData.source.organization}\n\n🚜 *Harvesting & Threshing:* ${hv.podMoistureEn}\n\n📦 *Safe Storage:* ${hv.storageMoistureEn}`
    };
    return templates[lang] || templates.en;
  }

  // 6. Comprehensive Overview (General Package)
  const varSummary = cropData.varieties?.items?.slice(0, 3).map(v => v.name).join(", ") || "";
  const spacingSummary = cropData.sowing?.spacingMr || "";
  const fertSummary = cropData.fertilizer?.basalMr || "";

  const templates = {
    mr: `🌾 *पंदेकृवि ${cropName} सुधारित लागवड तंत्रज्ञान*\n\n📋 *अधिकृत स्रोत:* ${sourceName}\n📖 *संदर्भ:* ${pubTitle}\n\n🌱 *प्रमुख वाण:* ${varSummary}\n📏 *पेरणी अंतर:* ${spacingSummary}\n🧪 *खत व्यवस्थापन:* ${fertSummary}\n\n_अधिक तपशिलासाठी 'वाण', 'पेरणी', 'बीजप्रक्रिया', 'खत' किंवा 'तण व्यवस्थापन' विचारू शकता!_`,
    hi: `🌾 *PDKV ${cropName} उन्नत खेती तकनीक*\n\n📋 *आधिकारिक स्रोत:* ${cropData.source.organizationHi}\n\n🌱 *प्रमुख किस्में:* ${varSummary}\n📏 *बुवाई दूरी:* ${spacingSummary}\n🧪 *खाद प्रबंधन:* ${fertSummary}\n\n_विस्तृत जानकारी के लिए 'किस्में', 'बुवाई', 'बीज उपचार' या 'खाद' पूछें!_`,
    hinglish: `🌾 *PDKV ${cropName} Cultivation Guide*\n\n📋 *Official Source:* ${cropData.source.organization}\n\n🌱 *Key Varieties:* ${varSummary}\n📏 *Spacing:* ${cropData.sowing?.spacingEn || spacingSummary}\n🧪 *Fertilizer:* ${cropData.fertilizer?.basalEn || fertSummary}`,
    en: `🌾 *PDKV ${cropName} Official Package of Practices*\n\n📋 *Official Source:* ${cropData.source.organization}\n📖 *Reference:* ${pubTitle}\n\n🌱 *Key Varieties:* ${varSummary}\n📏 *Recommended Spacing:* ${cropData.sowing?.spacingEn || spacingSummary}\n🧪 *Basal Fertilizer:* ${cropData.fertilizer?.basalEn || fertSummary}\n\n_Type specific queries like 'varieties', 'sowing', 'seed treatment', or 'weed control' for detailed guidance._`
  };

  return templates[lang] || templates.en;
}

/**
 * Handles incoming crop cultivation queries
 * @param {string} text - User query
 * @param {'en'|'hi'|'mr'|'hinglish'} lang - Detected language
 * @returns {Promise<string>}
 */
async function getCropAdvisoryResponse(text, lang = "mr") {
  const { crop } = extractMandiEntities(text);
  const topic = detectCultivationTopic(text);

  let cropData = null;
  if (crop) {
    cropData = getPdkvCropKnowledge(crop.standardName);
  }

  return formatCropAdvisoryResponse({
    cropData,
    topic,
    lang
  });
}

module.exports = {
  detectCultivationTopic,
  formatCropAdvisoryResponse,
  getCropAdvisoryResponse,
  TOPIC_PATTERNS,
};
