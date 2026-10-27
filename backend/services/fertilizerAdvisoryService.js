/**
 * CropCash Fertilizer & Nutrient Advisory Service
 * Provides crop-specific, stage-wise, and evidence-based nutrient advisory.
 * Integrates with OpenAgriNet / MahaVISTAAR for official university-backed PoP
 * and falls back to general agronomic baselines when official sources are unavailable.
 * Strictly distinguishes possible visual indicators from confirmed laboratory deficiency
 * and prioritizes Soil Health Card testing for exact field-level dosages.
 */

const { detectLanguage } = require("./languageDetector");
const { extractMandiEntities, CROP_MAP } = require("./mandiPriceService");
const { fetchOpenAgriNetAdvisory } = require("./openAgriNetAdapter");
const { getPdkvFertilizerGuidance } = require("../data/pdkvKnowledgeBase");

// Growth Stage Definitions & Multilingual Patterns
const GROWTH_STAGES = [
  {
    key: "sowing_basal",
    name: { en: "Sowing / Basal Stage", mr: "पेरणी / लागवड वेळ (Basal Dose)", hi: "बुवाई / बेसल अवस्था", hinglish: "Sowing / Basal Stage" },
    patterns: [
      "sowing", "basal", "planting", "starter", "bed preparation", "at the time of sowing",
      "पेरणी", "लागवड", "पेरणीच्या वेळी", "पेरणीवेळी", "बियाणांसोबत", "पेरणीसाठी",
      "बुवाई", "बोनी", "बुवाई के समय", "रोपाई", "शुरुआती"
    ]
  },
  {
    key: "vegetative",
    name: { en: "Vegetative / Growth Stage (20-35 Days)", mr: "शाकीय वाढीची अवस्था (२०-३५ दिवस)", hi: "वानस्पतिक वृद्धि अवस्था (20-35 दिन)", hinglish: "Vegetative / Growth Stage" },
    patterns: [
      "vegetative", "growth", "growing", "branching", "tillering", "20 days", "30 days", "35 days",
      "वाढ", "शाकीय वाढ", "फांद्या", "२० दिवस", "३० दिवस", "२५ दिवस", "३५ दिवस", "वाढीच्या",
      "वृद्धि", "बढ़वार", "कल्ले", "20 दिन", "30 दिन", "शाखाएं"
    ]
  },
  {
    key: "flowering",
    name: { en: "Flowering / Bloom Stage", mr: "फुलधारणा अवस्था (Flowering)", hi: "फूल आने की अवस्था (Flowering)", hinglish: "Flowering Stage" },
    patterns: [
      "flowering", "flower", "bloom", "blooming", "bud", "budding", "floral",
      "फुलधारणा", "फुलधारणे", "फुलधारणेवेळी", "फुले", "फुलं", "कळ्या", "फुलण्याच्या", "फुलोरा", "फुलोऱ्यात",
      "फूल", "फूल आना", "पुष्पन", "कलियां", "फूलों"
    ]
  },
  {
    key: "pod_grain_filling",
    name: { en: "Pod / Grain Filling Stage", mr: "शेंगा / दाणे भरणे अवस्था", hi: "दाना / फली भराव अवस्था", hinglish: "Pod / Grain Filling Stage" },
    patterns: [
      "pod", "grain", "filling", "pod formation", "grain development", "boll development", "milking",
      "शेंगा", "दाणे", "शेंगा भरणे", "दाणे भरणे", "बोंड भरणे", "शेंग धरणे", "शेंगा भरताना", "दाणे भरताना",
      "फली", "दाना", "दाना भराव", "दूधिया अवस्था", "फली विकास", "टिंडे"
    ]
  }
];

// Visual Symptom & Possible Nutrient Indicator Patterns (Strictly Symptoms, not fertilizer names)
const NUTRIENT_SYMPTOMS = [
  {
    key: "nitrogen",
    nutrientName: { en: "Nitrogen (N)", mr: "नत्र (Nitrogen)", hi: "नाइट्रोजन (नत्र)", hinglish: "Nitrogen (N)" },
    patterns: [
      "yellow lower leaves", "yellow leaves", "pale leaves", "light green leaves", "yellowing",
      "पाने पिवळी", "पिवळी पाने", "पिवळे पडणे", "पिवळेपणा", "खालची पाने पिवळी", "फिकट हिरवी पाने",
      "पत्तियां पीली", "पीली पत्तियां", "पीलापन", "निचली पत्तियां पीली"
    ],
    visualIndication: {
      en: "Yellowing of older/lower leaves starting from the leaf tip (possible visual indication of Nitrogen deficiency).",
      mr: "खालच्या जुन्या पानांवर टोकाकडून पिवळेपणा येणे (नत्राची / Nitrogen संभाव्य कमतरता लक्षण).",
      hi: "पुरानी या निचली पत्तियों का नोक से पीला पड़ना (नाइट्रोजन की संभावित कमी का लक्षण)।",
      hinglish: "Neeche ki purani leaves me peela-pan aana (Nitrogen ki possible deficiency indication)."
    },
    generalGuidance: {
      en: "Consider balanced Urea top-dressing or foliar spray of 19:19:19 (10-15 g/L water) after assessing soil moisture.",
      mr: "जमिनीतील ओलावा तपासून योग्य प्रमाणात युरिया किंवा १९:१९:१९ विद्राव्य खताची फवारणी (१०-१५ ग्रॅम/लिटर) करता येईल.",
      hi: "खेत में नमी होने पर यूरिया की संतुलित मात्रा या 19:19:19 घुलनशील खाद का छिड़काव (10-15 ग्राम/लीटर) किया जा सकता है।",
      hinglish: "Moisture check karke urea ki balanced dose ya 19:19:19 soluble fertilizer spray (10-15 g/L) kar sakte hain."
    }
  },
  {
    key: "phosphorus",
    nutrientName: { en: "Phosphorus (P)", mr: "स्फुरद (Phosphorus)", hi: "फास्फोरस (स्फुरद)", hinglish: "Phosphorus (P)" },
    patterns: [
      "purple leaves", "purplish leaves", "stunted root", "purpling",
      "जांभळट पाने", "जांभळी पाने", "मुळांची वाढ खुंटणे",
      "बैंगनी पत्तियां", "जड़ों की कमजोर वृद्धि"
    ],
    visualIndication: {
      en: "Purplish-bronze tint on leaves or stunted root establishment (possible visual indication of Phosphorus deficiency).",
      mr: "पानांवर जांभळट-तपकिरी छटा किंवा मुळांची वाढ खुंटणे (स्फुरदाची / Phosphorus संभाव्य कमतरता लक्षण).",
      hi: "पत्तियों पर बैंगनी रंग की चमक या जड़ों का धीमा विकास (फास्फोरस की संभावित कमी का लक्षण)।",
      hinglish: "Leaves par purplish tint ya roots ki slow growth (Phosphorus ki possible deficiency indication)."
    },
    generalGuidance: {
      en: "Phosphorus is best applied at basal sowing (DAP/SSP). For standing crops, 12:61:00 or 0:52:34 foliar sprays help root/flower growth.",
      mr: "स्फुरद शक्यतो पेरणीवेळी (DAP/SSP) देणे फायदेशीर ठरते. उभ्या पिकासाठी १२:६१:०० किंवा ०:५२:३४ ची फवारणी उपयुक्त ठरू शकते.",
      hi: "फास्फोरस बुवाई के समय (DAP/SSP) देना श्रेष्ठ है। खड़ी फसल में 12:61:00 या 0:52:34 का पर्णीय छिड़काव उपयोगी होता है।",
      hinglish: "Phosphorus sowing ke time (DAP/SSP) dena best hota hai. Khadi fasal me 12:61:00 ya 0:52:34 spray use kar sakte hain."
    }
  },
  {
    key: "potassium",
    nutrientName: { en: "Potassium / Potash (K)", mr: "पालाश (Potash)", hi: "पोटाश (पालाश)", hinglish: "Potash (K)" },
    patterns: [
      "burnt leaf edges", "burnt edges", "marginal scorch", "scorched leaves", "leaf edges drying",
      "पानांच्या कडा जळणे", "कडा वाळणे", "पानांच्या कडा करपणे",
      "पत्तियों के किनारे जलना", "किनारों का सूखना", "पत्तियों का झुलसना"
    ],
    visualIndication: {
      en: "Browning or marginal scorching along leaf edges (possible visual indication of Potassium deficiency).",
      mr: "पानांच्या कडा जळल्यासारख्या तपकिरी होणे (पालाशची / Potash संभाव्य कमतरता लक्षण).",
      hi: "पत्तियों के किनारों का झुलसना या भूरा होना (पोटाश की संभावित कमी का लक्षण)।",
      hinglish: "Leaves ke borders/edges par dry-burn dikhna (Potash ki possible deficiency indication)."
    },
    generalGuidance: {
      en: "Ensure MOP/SOP at basal or 00:00:50 / 13:00:45 foliar spray during pod/fruit filling to improve crop resilience.",
      mr: "पेरणीवेळी पोटॅश किंवा दाणे/शेंगा भरण्याच्या वेळी ००:००:५० किंवा १३:००:४५ ची फवारणी दाण्यांचे वजन व चमक वाढवण्यास मदत करते.",
      hi: "बुवाई पर पोटाश (MOP) या दाना/फल भराव के समय 00:00:50 या 13:00:45 का छिड़काव दाने की चमक और वजन बढ़ाता है।",
      hinglish: "Sowing par MOP ya pod/grain filling ke time 00:00:50 ya 13:00:45 spray use karein quality ke liye."
    }
  },
  {
    key: "zinc_iron",
    nutrientName: { en: "Micronutrients (Zinc / Iron)", mr: "सूक्ष्म अन्नद्रव्ये (झिंक / फेरस)", hi: "सूक्ष्म पोषक तत्व (जिंक / आयरन)", hinglish: "Micronutrients (Zinc / Iron)" },
    patterns: [
      "interveinal chlorosis", "yellow between veins", "veins green leaf yellow",
      "शिरा हिरव्या पान पिवळे", "शिरा हिरव्या", "पानाच्या शिरांमधील पिवळेपणा",
      "नसों के बीच पीलापन", "नसें हरी पत्तियां पीली"
    ],
    visualIndication: {
      en: "Yellowing between leaf veins while veins remain green (possible visual indication of Zinc or Iron chlorosis).",
      mr: "पानांच्या मुख्य शिरा हिरव्या राहून मधील भाग पिवळा पडणे (झिंक किंवा फेरसची संभाव्य सूक्ष्म अन्नद्रव्य कमतरता).",
      hi: "पत्तियों की नसें हरी रहना और बीच का भाग पीला पड़ना (जिंक या आयरन की संभावित सूक्ष्म पोषक कमी)।",
      hinglish: "Veins green rehna aur beech me yellow chlorosis dikhna (Zinc ya Iron ki possible micronutrient deficiency)."
    },
    generalGuidance: {
      en: "Apply chelated Zinc (EDTA Zinc 12% @ 1-1.5 g/L) or grade micronutrient spray in calm weather.",
      mr: "चिलेटेड झिंक (Chelated Zinc १२% @ १ ते १.५ ग्रॅम/लिटर) किंवा मान्यताप्राप्त ग्रेड-२ सूक्ष्म अन्नद्रव्यांची फवारणी करावी.",
      hi: "चिलेटेड जिंक (Chelated Zinc 12% @ 1-1.5 ग्राम/लीटर) या ग्रेड-2 सूक्ष्म पोषक तत्वों का पर्णीय छिड़काव करें।",
      hinglish: "Chelated Zinc 12% (1-1.5 g/L) ya Grade-2 micronutrient foliar spray apply karein."
    }
  }
];

// Baseline Crop Stage-Wise Nutrient Guidance (General Agronomic Benchmarks)
const CROP_NUTRIENT_GUIDELINES = {
  Soyabean: {
    cropName: { en: "Soybean", mr: "सोयाबीन", hi: "सोयाबीन", hinglish: "Soybean" },
    generalSchedules: {
      sowing_basal: {
        en: "• *Basal Stage:* DAP (or 20:20:0:13) + Potash (MOP) + Biofertilizers (Rhizobium & PSB culture seed treatment). Sulphur (20 kg/ha) is critical for oil content.",
        mr: "• *पेरणी वेळ (Basal Dose):* डीएपी किंवा २०:२०:०:१३ + पोटॅश (MOP) + सल्फर (गंधक २० किलो/हेक्टर). पेरणीपूर्वी रायझोबियम व पीएसबी जिवाणू संवर्धनाची बीजप्रक्रिया आवर्जून करावी.",
        hi: "• *बुवाई के समय (बेसल डोज):* डीएपी या 20:20:0:13 + पोटाश (MOP) + सल्फर (20 किग्रा/हेक्टेयर)। राइजोबियम व पीएसबी कल्चर से बीज उपचार अवश्य करें।",
        hinglish: "• *Basal / Sowing:* DAP ya 20:20:0:13 + Potash + Sulphur (20 kg/ha). Sowing se pehle Rhizobium & PSB seed treatment zaroor karein."
      },
      vegetative: {
        en: "• *Growth Stage (25-35 Days):* Foliar spray of water-soluble 19:19:19 (10-15 g/L) to support branching and uniform green canopy.",
        mr: "• *शाकीय वाढीची अवस्था (२५-३५ दिवस):* १९:१९:१९ विद्राव्य खत (१०-१५ ग्रॅम/लिटर) फवारणी, ज्यामुळे झाडांची निरोगी वाढ आणि फांद्यांची संख्या वाढते.",
        hi: "• *वृद्धि अवस्था (25-35 दिन):* 19:19:19 घुलनशील खाद (10-15 ग्राम/लीटर) का छिड़काव अच्छी शाखाओं और वानस्पतिक बढ़वार के लिए।",
        hinglish: "• *Vegetative (25-35 Days):* 19:19:19 soluble fertilizer spray (10-15 g/L) for healthy branching and growth."
      },
      flowering: {
        en: "• *Flowering Stage:* Foliar spray of 0:52:34 (MKP) or 12:61:00 + Boron (1 g/L) to minimize flower drop and enhance fruit set.",
        mr: "• *फुलधारणा अवस्था:* ०:५२:३४ (१० ग्रॅम/लिटर) + बोरॉन (१ ग्रॅम/लिटर) ची फवारणी, ज्यामुळे फुलांची गळ थांबून फुलधारणा चांगली होते.",
        hi: "• *फूल आने पर:* 0:52:34 (10 ग्राम/लीटर) + बोरॉन (1 ग्राम/लीटर) का छिड़काव फूल झड़ने से रोकने और अधिक फूल-फली के लिए।",
        hinglish: "• *Flowering:* 0:52:34 (10 g/L) + Boron (1 g/L) spray karein taaki phool kam girein."
      },
      pod_grain_filling: {
        en: "• *Pod Formation Stage:* Foliar spray of 00:00:50 (Potassium Sulphate) or 13:00:45 (Potassium Nitrate) for uniform, bold grain development.",
        mr: "• *शेंगा भरण्याची अवस्था:* ००:००:५० (१०-१५ ग्रॅम/लिटर) किंवा १३:००:४५ ची फवारणी दाण्यांचा टपोरेपणा व वजन वाढवण्यासाठी फायदेशीर ठरते.",
        hi: "• *फली भराव अवस्था:* 00:00:50 (10-15 ग्राम/लीटर) या 13:00:45 का छिड़काव दानों के वजन और गुणवत्ता के लिए।",
        hinglish: "• *Pod Filling:* 00:00:50 ya 13:00:45 spray karein daano ki chamak aur weight badhane ke liye."
      }
    }
  },
  Cotton: {
    cropName: { en: "Cotton", mr: "कापूस", hi: "कपास", hinglish: "Cotton (Kapas)" },
    generalSchedules: {
      sowing_basal: {
        en: "• *Basal Stage:* Balanced NPK 10:26:26 or DAP + MOP + Magnesium Sulphate (10 kg/acre) during field preparation/sowing.",
        mr: "• *लागवड वेळ:* १०:२६:२६ किंवा डीएपी + पोटॅश + मॅग्नेशियम सल्फेट (१० किलो/एकर) लागवडीच्या वेळी जमिनीत देणे.",
        hi: "• *बुवाई/रोपाई:* 10:26:26 या डीएपी + पोटाश + मैग्नीशियम सल्फेट (10 किग्रा/एकड़) बेसल डोज के रूप में दें।",
        hinglish: "• *Basal:* 10:26:26 ya DAP + Potash + Magnesium Sulphate sowing ke time dein."
      },
      vegetative: {
        en: "• *Squaring & Vegetative (30-45 Days):* Split Urea application (25-30 kg/acre) + 19:19:19 spray for vigorous boll-bearing branches.",
        mr: "• *शाकीय वाढ व पाते लागणे (३०-४५ दिवस):* युरियाचा पहिला हप्ता (२५-३० किलो/एकर) + १९:१९:१९ विद्राव्य खत फवारणी.",
        hi: "• *वृद्धि व कलियां (30-45 दिन):* यूरिया की पहली स्प्लिट डोज (25-30 किग्रा/एकड़) + 19:19:19 का पर्णीय छिड़काव।",
        hinglish: "• *Vegetative (30-45 Days):* Urea split dose + 19:19:19 spray healthy growth ke liye."
      },
      flowering: {
        en: "• *Flowering & Boll Setting:* 0:52:34 or 13:0:45 + Boron (1 g/L) spray to prevent flower bud and boll shedding.",
        mr: "• *फुल व बोंड धारणा अवस्था:* ०:५२:३४ किंवा १३:०:४५ + बोरॉन (१ ग्रॅम/लिटर) फवारणी, पाते व बोंडगळ रोखण्यासाठी.",
        hi: "• *फूल व टिंडे बनते समय:* 0:52:34 या 13:0:45 + बोरॉन छिड़काव फूल व कलियों को झड़ने से बचाने के लिए।",
        hinglish: "• *Flowering & Boll Setting:* 0:52:34 ya 13:0:45 + Boron spray karein flower/boll drop control ke liye."
      },
      pod_grain_filling: {
        en: "• *Boll Development:* 00:00:50 foliar spray + 1% Magnesium Sulphate spray to prevent leaf reddening (Lalya) and optimize lint quality.",
        mr: "• *बोंड विकास अवस्था:* ००:००:५० (१० ग्रॅम/लिटर) + मॅग्नेशियम सल्फेट (लाल पडणे रोखण्यासाठी) फवारणी, कापसाची प्रत सुधारण्यासाठी.",
        hi: "• *टिंडे पकते समय:* 00:00:50 + मैग्नीशियम सल्फेट छिड़काव (पत्तियों को लाल होने से बचाने व कपास की गुणवत्ता के लिए)।",
        hinglish: "• *Boll Maturity:* 00:00:50 + Magnesium Sulphate spray karein lalya rokne aur quality ke liye."
      }
    }
  },
  Wheat: {
    cropName: { en: "Wheat", mr: "गहू", hi: "गेहूं", hinglish: "Wheat (Gehu)" },
    generalSchedules: {
      sowing_basal: {
        en: "• *Basal Stage:* DAP (or 12:32:16) + MOP + Zinc Sulphate (10 kg/acre) applied at sowing.",
        mr: "• *पेरणी वेळ:* १२:३२:१६ किंवा डीएपी + पोटॅश + झिंक सल्फेट (१० किलो/एकर) पेरणीच्या वेळी देणे.",
        hi: "• *बुवाई के समय:* 12:32:16 या डीएपी + पोटाश + जिंक सल्फेट (10 किग्रा/एकड़) बेसल डोज में दें।",
        hinglish: "• *Basal / Sowing:* 12:32:16 ya DAP + MOP + Zinc Sulphate at sowing."
      },
      vegetative: {
        en: "• *Crown Root & Tillering (21-45 Days):* Top-dress Urea after first irrigation (CRI stage) + 19:19:19 foliar spray.",
        mr: "• *मुकुट मुळे व फुटवे फुटणे (२१-४५ दिवस):* पहिल्या पाण्यानंतर युरियाचा पहिला हप्ता + १९:१९:१९ फवारणी.",
        hi: "• *कल्ले फूटते समय (21-45 दिन):* पहली सिंचाई के बाद यूरिया की पहली खुराक + 19:19:19 का छिड़काव।",
        hinglish: "• *Tillering Stage:* First irrigation ke baad Urea top-dressing + 19:19:19 spray."
      },
      flowering: {
        en: "• *Booting / Earhead Emergence:* 0:52:34 (10 g/L) spray for healthy spike development.",
        mr: "• *कोंब व ओंबी बाहेर पडणे (Booting Stage):* ०:५२:३४ ची फवारणी ओंब्यांची लांबी व दाण्यांची संख्या वाढवण्यासाठी.",
        hi: "• *बाली निकलते समय:* 0:52:34 (10 ग्राम/लीटर) का छिड़काव बालियों की लंबाई और दानों की संख्या बढ़ाने के लिए।",
        hinglish: "• *Booting / Heading:* 0:52:34 spray for healthy spikelets."
      },
      pod_grain_filling: {
        en: "• *Milking & Dough Stage:* 00:00:50 (10 g/L) foliar spray for bold, heavy grain luster.",
        mr: "• *दाणे भरणे अवस्था:* ००:००:५० (१० ग्रॅम/लिटर) फवारणी दाण्यांचे वजन व चमक वाढवण्यासाठी.",
        hi: "• *दाना भराव अवस्था:* 00:00:50 (10 ग्राम/लीटर) का छिड़काव चमकदार और भारी दानों के लिए।",
        hinglish: "• *Grain Filling:* 00:00:50 spray bold aur heavy grains ke liye."
      }
    }
  }
};

/**
 * Escapes regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts crop, growth stage, nutrient symptoms, and exact dose inquiry from text
 * @param {string} text 
 * @returns {object} Extracted entities
 */
function extractFertilizerEntities(text) {
  if (!text || typeof text !== "string") {
    return { crop: null, stage: null, symptom: null, isExactDoseRequested: false };
  }

  const clean = text.toLowerCase();

  // 1. Extract Crop
  const { crop } = extractMandiEntities(text);

  // 2. Extract Growth Stage
  let matchedStage = null;
  for (const stg of GROWTH_STAGES) {
    for (const pat of stg.patterns) {
      if (/[\u0900-\u097F]/.test(pat)) {
        if (clean.includes(pat)) {
          matchedStage = stg;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(pat)}\\b`, "i");
        if (regex.test(clean)) {
          matchedStage = stg;
          break;
        }
      }
    }
    if (matchedStage) break;
  }

  // 3. Extract Nutrient Symptoms / Deficiencies (Visual symptoms only)
  let matchedSymptom = null;
  for (const sym of NUTRIENT_SYMPTOMS) {
    for (const pat of sym.patterns) {
      if (/[\u0900-\u097F]/.test(pat)) {
        if (clean.includes(pat)) {
          matchedSymptom = sym;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(pat)}\\b`, "i");
        if (regex.test(clean)) {
          matchedSymptom = sym;
          break;
        }
      }
    }
    if (matchedSymptom) break;
  }

  // 4. Check for Exact Dose Request
  const exactDosePatterns = [
    "exact dose", "how much per acre", "per acre", "dosage", "quantity", "kg per acre",
    "किती द्यावे", "प्रमाण सांगा", "डोस सांगा", "एकरी प्रमाण", "किती किलो", "किती खत द्यावे",
    "कितना डालना चाहिए", "मात्रा बताओ", "प्रति एकड़", "कितना किलो"
  ];
  let isExactDoseRequested = false;
  for (const pat of exactDosePatterns) {
    if (clean.includes(pat)) {
      isExactDoseRequested = true;
      break;
    }
  }

  return {
    crop,
    stage: matchedStage,
    symptom: matchedSymptom,
    isExactDoseRequested
  };
}

/**
 * Format Multilingual Farmer-Friendly Fertilizer Advisory
 * @param {object} params
 * @param {object|null} params.crop - Crop entity
 * @param {object|null} params.stage - Growth stage entity
 * @param {object|null} params.symptom - Visual symptom entity
 * @param {boolean} params.isExactDoseRequested - Whether farmer asked for exact dose
 * @param {object|null} [params.oanResult=null] - OpenAgriNet / SAU source-backed result
 * @param {'en'|'hi'|'mr'|'hinglish'} params.lang - Target language
 * @returns {string} Safe WhatsApp formatted response
 */
function formatFertilizerResponse({ crop, stage, symptom, isExactDoseRequested, oanResult = null, lang = "en" }) {
  const cropStandard = crop?.standardName || "General";
  const cropDisplay = crop?.displayName?.[lang] || crop?.displayName?.en || crop?.standardName || (lang === "mr" ? "पीक" : lang === "hi" ? "फसल" : "Crop");
  const guidelines = CROP_NUTRIENT_GUIDELINES[cropStandard] || null;

  // 1. Missing Crop Prompt
  if (!crop) {
    const missingCropPrompts = {
      mr: `🧪 *क्रॉपकॅश खत व पोषण व्यवस्थापन कक्ष*\n\nआपण खत व पोषणासंबंधी प्रश्न विचारला आहे. योग्य मार्गदर्शन करण्यासाठी, कृपया आपल्या *पिकाचे नाव* सांगा (उदा. 'सोयाबीन', 'कापूस', 'गहू', 'तूर', 'कांदा').\n\n_टीप: पिकाची सध्याची वाढीची अवस्था (पेरणी / वाढ / फुलधारणा) सांगितल्यास अधिक अचूक सल्ला देणे शक्य होईल._`,
      hi: `🧪 *क्रॉपकैश उर्वरक एवं पोषण सलाहकार*\n\nआपने खाद/उर्वरक के संबंध में प्रश्न पूछा है। सही मार्गदर्शन के लिए कृपया अपनी *फसल का नाम* बताएं (जैसे: 'सोयाबीन', 'कपास', 'गेहूं', 'चना', 'टमाटर')।\n\n_सुझाव: फसल की वर्तमान अवस्था (बुवाई / बढ़वार / फूल आने का समय) भी बताएं।_`,
      hinglish: `🧪 *CropCash Fertilizer Desk*\n\nAapne fertilizer ke baare me pucha hai. Sahi guidance ke liye kripya apni *fasal/crop ka naam* batayein (Jaise: 'Soyabean', 'Cotton', 'Wheat', 'Chana').\n\n_Tip: Crop ki current growth stage (Sowing / Growth / Flowering) bhi batayein._`,
      en: `🧪 *CropCash Fertilizer & Nutrition Desk*\n\nTo provide tailored nutrient guidance, please mention your *crop name* (e.g., 'Soybean', 'Cotton', 'Wheat', 'Gram', 'Tomato').\n\n_Tip: Mentioning your crop's current growth stage (Sowing / Vegetative / Flowering) helps provide more specific advice._`
    };
    return missingCropPrompts[lang] || missingCropPrompts.en;
  }

  // Exact Dosage Disclaimer Note
  let dosageNote = "";
  if (isExactDoseRequested) {
    const doseDisclaimers = {
      mr: `\n\n⚖️ *एकरी अचूक प्रमाणाबाबत (Soil Testing Note):*\nअचूक रासायनिक खतांचे प्रमाण हे जमिनीचा प्रकार (काळी/हलकी), माती परीक्षण अहवाल आणि पाण्याच्या उपलब्धतेवर अवलंबून असते. अंदाजे रासायनिक खते टाकण्याऐवजी माती परीक्षणानुसार (Soil Health Card) डोस ठरवावा.`,
      hi: `\n\n⚖️ *प्रति एकड़ सटीक मात्रा संबंधी नोट:*\nखेत की सटीक रासायनिक मात्रा मिट्टी की जांच रिपोर्ट (Soil Health Card), मिट्टी के प्रकार और सिंचाई पर निर्भर करती है। अंधाधुंध खाद डालने से बचें और मिट्टी की जांच अनुसार मात्रा दें।`,
      hinglish: `\n\n⚖️ *Per Acre Exact Dosage Note:*\nExact chemical fertilizer dose soil type, soil test report (Soil Health Card) aur irrigation par depend karta hai. Soil testing ke hisaab se hi exact dose daalein.`,
      en: `\n\n⚖️ *Field-Level Dosage Note:*\nExact chemical fertilizer quantities depend on your soil test report (Soil Health Card), soil texture, and irrigation. Avoid indiscriminate application without a soil test.`
    };
    dosageNote = doseDisclaimers[lang] || doseDisclaimers.en;
  }

  // 2. Visual Symptom Indication (Clearly non-confirmed disclaimer)
  if (symptom) {
    const symptomTitle = symptom.nutrientName?.[lang] || symptom.nutrientName?.en;
    const visualText = symptom.visualIndication?.[lang] || symptom.visualIndication?.en;
    const adviceText = symptom.generalGuidance?.[lang] || symptom.generalGuidance?.en;

    const symptomTemplates = {
      mr: `🧪 *क्रॉपकॅश अन्नद्रव्य लक्षण विश्लेषण*\n\n📌 *पीक:* ${cropDisplay}\n🔍 *संभाव्य लक्षण:* ${symptomTitle}\n\n👁️ *प्राथमिक निरीक्षण:*\n${visualText}\n\n🌱 *सामान्य व्यवस्थापन सल्ला (General Guidance):*\n${adviceText}${dosageNote}\n\n⚠️ *महत्त्वाची कृषी सूचना:* हे केवळ बाह्य लक्षणांवर आधारित संभाव्य निरीक्षण आहे, प्रयोगशाळा चाचणी नाही. अचूक रासायनिक खत प्रमाणासाठी आपल्या *जमीन आरोग्य पत्रिका (Soil Health Card)* किंवा स्थानिक कृषी तज्ज्ञांचा सल्ला घ्यावा.`,
      hi: `🧪 *क्रॉपकैश पोषक तत्व लक्षण विश्लेषण*\n\n📌 *फसल:* ${cropDisplay}\n🔍 *संभावित लक्षण:* ${symptomTitle}\n\n👁️ *प्राथमिक अवलोकन:*\n${visualText}\n\n🌱 *सामान्य प्रबंधन सुझाव (General Guidance):*\n${adviceText}${dosageNote}\n\n⚠️ *महत्वपूर्ण कृषि सलाह:* यह केवल दृश्य लक्षणों पर आधारित संभाव्य संकेत है, प्रयोगशाला परीक्षण नहीं। सटीक रासायनिक खाद मात्रा के लिए *मृदा स्वास्थ्य कार्ड (Soil Health Card)* या नजदीकी कृषि विशेषज्ञ की सलाह लें।`,
      hinglish: `🧪 *CropCash Nutrient Analysis*\n\n📌 *Fasal:* ${cropDisplay}\n🔍 *Possible Symptom:* ${symptomTitle}\n\n👁️ *Visual Indication:*\n${visualText}\n\n🌱 *General Management Tip:*\n${adviceText}${dosageNote}\n\n⚠️ *Important Notice:* Ye sirf visual symptoms par based possible indication hai. Exact fertilizer dosage ke liye *Soil Health Card* testing zaroori hai.`,
      en: `🧪 *CropCash Nutrient Symptom Advisory*\n\n📌 *Crop:* ${cropDisplay}\n🔍 *Possible Indication:* ${symptomTitle}\n\n👁️ *Visual Observation:*\n${visualText}\n\n🌱 *General Agronomic Guidance:*\n${adviceText}${dosageNote}\n\n⚠️ *Agronomic Disclaimer:* Visual symptoms are a possible indication, not a laboratory-confirmed deficiency. For precise field-level dosing, refer to your *Soil Health Card* test results.`
    };
    return symptomTemplates[lang] || symptomTemplates.en;
  }

  // 3. Official Source-Backed Guidance (if returned by OpenAgriNet)
  if (oanResult?.isSourceBacked && oanResult.source && oanResult.advisory) {
    const sourceTitle = oanResult.source;
    const advisoryText = oanResult.advisory;

    const sourceTemplates = {
      mr: `🏛️ *क्रॉपकॅश अधिकृत खत व पोषण सल्ला*\n\n📌 *पीक:* ${cropDisplay}${stage ? `\n🌱 *अवस्था:* ${stage.name[lang] || stage.name.mr}` : ""}\n📋 *अधिकृत स्रोत (Source):* ${sourceTitle}\n\n📊 *विद्यापीठ शिफारस (Official Advisory):*\n${advisoryText}${dosageNote}\n\n⚠️ *टीप:* ही शिफारस अधिकृत कृषी विद्यापीठ / सरकारी पॅकेज ऑफ प्रॅक्टिसेस (PoP) वर आधारित आहे. शेतातील माती परीक्षण अहवालानुसार (Soil Health Card) वापर करावा.`,
      hi: `🏛️ *क्रॉपकैश आधिकारिक उर्वरक एवं पोषण सलाह*\n\n📌 *फसल:* ${cropDisplay}${stage ? `\n🌱 *अवस्था:* ${stage.name[lang] || stage.name.hi}` : ""}\n📋 *आधिकारिक स्रोत (Source):* ${sourceTitle}\n\n📊 *विश्वविद्यालय अनुशंसा (Official Advisory):*\n${advisoryText}${dosageNote}\n\n⚠️ *नोट:* यह अनुशंसा आधिकारिक कृषि विश्वविद्यालय / सरकारी पैकेज ऑफ प्रैक्टिसेस (PoP) पर आधारित है। मृदा स्वास्थ्य कार्ड अनुसार मात्रा समायोजित करें।`,
      hinglish: `🏛️ *CropCash Official Fertilizer Advisory*\n\n📌 *Fasal:* ${cropDisplay}${stage ? `\n🌱 *Stage:* ${stage.name[lang] || stage.name.hinglish}` : ""}\n📋 *Official Source:* ${sourceTitle}\n\n📊 *Recommended PoP Schedule:*\n${advisoryText}${dosageNote}\n\n⚠️ *Note:* Ye advisory official University Package of Practices (PoP) par based hai. Soil Health Card test follow karein.`,
      en: `🏛️ *CropCash Official Fertilizer & Nutrient Advisory*\n\n📌 *Crop:* ${cropDisplay}${stage ? `\n🌱 *Stage:* ${stage.name[lang] || stage.name.en}` : ""}\n📋 *Official Source:* ${sourceTitle}\n\n📊 *Official University Advisory:*\n${advisoryText}${dosageNote}\n\n⚠️ *Note:* This recommendation is sourced from official Agricultural University Package of Practices (PoP). Calibrate with your Soil Health Card.`
    };
    return sourceTemplates[lang] || sourceTemplates.en;
  }

  // 4. General Agronomic Guidance Fallback (When OpenAgriNet is offline or unconfigured)
  let scheduleContent = "";

  if (stage && guidelines?.generalSchedules?.[stage.key]) {
    scheduleContent = guidelines.generalSchedules[stage.key][lang] || guidelines.generalSchedules[stage.key].en;
  } else if (guidelines) {
    // Provide full stage-wise general overview
    const sched = guidelines.generalSchedules;
    scheduleContent = [
      sched.sowing_basal?.[lang] || sched.sowing_basal?.en,
      sched.vegetative?.[lang] || sched.vegetative?.en,
      sched.flowering?.[lang] || sched.flowering?.en,
      sched.pod_grain_filling?.[lang] || sched.pod_grain_filling?.en
    ].filter(Boolean).join("\n\n");
  } else {
    // Generic fallback for crops not in dedicated guidelines
    const genericStageMap = {
      mr: `• *पेरणीवेळी (Basal):* सेंद्रिय शेणखत + डीएपी किंवा एनपीके खतांचा संतुलित वापर.\n• *वाढीच्या काळात (Vegetative):* आवश्यकतेनुसार युरियाचा पहिला हप्ता किंवा १९:१९:१९ ची फवारणी.\n• *फुलधारणा व फळधारणा:* ०:५२:३४ किंवा ००:००:५० विद्राव्य खतांची फवारणी.`,
      hi: `• *बुवाई पर (बेसल):* सड़ा हुआ गोबर खाद + डीएपी/एनपीके का संतुलित प्रयोग।\n• *वृद्धि के समय:* आवश्यकतानुसार यूरिया या 19:19:19 का पर्णीय छिड़काव।\n• *फूल व फल बनते समय:* 0:52:34 या 00:00:50 घुलनशील खाद का छिड़काव।`,
      hinglish: `• *Basal / Sowing:* Organic manure + DAP/NPK balanced dose.\n• *Growth Stage:* Need-based Urea or 19:19:19 foliar spray.\n• *Flowering & Fruit:* 0:52:34 ya 00:00:50 spray.`,
      en: `• *Basal / Sowing:* Well-decomposed farmyard manure + balanced DAP/NPK base.\n• *Vegetative Stage:* Nitrogen top-dressing or 19:19:19 foliar spray.\n• *Flowering & Fruit:* 0:52:34 or 00:00:50 foliar nutrition.`
    };
    scheduleContent = genericStageMap[lang] || genericStageMap.en;
  }

  const mainTemplates = {
    mr: `🧪 *क्रॉपकॅश खत व पोषण सल्ला (General Guidance)*\n\n📌 *पीक:* ${cropDisplay}${stage ? `\n🌱 *अवस्था:* ${stage.name[lang] || stage.name.mr}` : ""}\n\n📊 *सामान्य टप्प्याटप्प्याचे खत व्यवस्थापन:*\n${scheduleContent}${dosageNote}\n\n⚠️ *टीप:* हे सामान्य कृषी मार्गदर्शन आहे. आपल्या शेतातील माती परीक्षणानुसार (Soil Health Card) खतांची मात्रा निश्चित करावी.`,
    hi: `🧪 *क्रॉपकैश उर्वरक एवं पोषण सलाह (General Guidance)*\n\n📌 *फसल:* ${cropDisplay}${stage ? `\n🌱 *अवस्था:* ${stage.name[lang] || stage.name.hi}` : ""}\n\n📊 *सामान्य चरणबद्ध पोषण प्रबंधन:*\n${scheduleContent}${dosageNote}\n\n⚠️ *नोट:* यह सामान्य कृषि मार्गदर्शन है। सटीक खुराक के लिए अपने खेत की मिट्टी जांच (Soil Health Card) के अनुसार प्रबंधन करें।`,
    hinglish: `🧪 *CropCash Fertilizer Guidance*\n\n📌 *Fasal:* ${cropDisplay}${stage ? `\n🌱 *Stage:* ${stage.name[lang] || stage.name.hinglish}` : ""}\n\n📊 *Stage-Wise General Schedule:*\n${scheduleContent}${dosageNote}\n\n⚠️ *Disclaimer:* Ye general agronomic guidance hai. Exact dosing ke liye Soil Health Card test results follow karein.`,
    en: `🧪 *CropCash Fertilizer & Nutrient Advisory (General Guidance)*\n\n📌 *Crop:* ${cropDisplay}${stage ? `\n🌱 *Stage:* ${stage.name[lang] || stage.name.en}` : ""}\n\n📊 *Recommended Stage-Wise Schedule:*\n${scheduleContent}${dosageNote}\n\n⚠️ *Disclaimer:* This represents general agronomic benchmarks. Calibrate exact quantities against your Soil Health Card laboratory test.`
  };

  return mainTemplates[lang] || mainTemplates.en;
}

/**
 * Handle incoming fertilizer & nutrient queries
 * @param {string} text - Farmer's input text
 * @param {'en'|'hi'|'mr'|'hinglish'} lang - Detected language
 * @param {Function} [fetchFn=fetch] - Injected fetcher for testing
 * @param {object} [contextOverrides] - Optional context overrides from session memory
 * @returns {Promise<string>}
 */
async function getFertilizerAdvisoryResponse(text, lang = "en", fetchFn = fetch, contextOverrides = {}) {
  const entities = extractFertilizerEntities(text);
  if (!entities.crop && contextOverrides?.crop) {
    entities.crop = contextOverrides.crop;
  }

  let oanResult = null;
  if (entities.crop && !entities.symptom) {
    // Query OpenAgriNet / MahaVISTAAR for official university PoP
    oanResult = await fetchOpenAgriNetAdvisory({
      crop: entities.crop.standardName,
      stage: entities.stage?.key || "all",
      lang,
      fetchFn
    });
  }

  return formatFertilizerResponse({
    ...entities,
    oanResult,
    lang
  });
}

module.exports = {
  extractFertilizerEntities,
  formatFertilizerResponse,
  getFertilizerAdvisoryResponse,
  GROWTH_STAGES,
  NUTRIENT_SYMPTOMS,
  CROP_NUTRIENT_GUIDELINES,
};
