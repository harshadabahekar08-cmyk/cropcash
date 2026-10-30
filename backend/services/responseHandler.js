/**
 * CropCash Response Handler
 * Processes incoming WhatsApp message payloads (Text, Audio, Image)
 * and generates language-aware, safe, and context-specific responses.
 * Integrated with ConversationStateService for multi-turn conversational memory.
 */

const { detectLanguage } = require("./languageDetector");
const { validateAndSanitizeResponse } = require("./safetyValidator");
const { getMandiPriceResponse, extractMandiEntities } = require("./mandiPriceService");
const { getMandiDecisionResponse, isTransportDecisionIntent } = require("./mandiDecisionService");
const { processCropImageMessage } = require("./diseaseDetectorService");
const { getFertilizerAdvisoryResponse } = require("./fertilizerAdvisoryService");
const { getWeatherAdvisoryResponse } = require("./weatherAdvisoryService");
const { getCropAdvisoryResponse } = require("./cropAdvisoryService");
const { getSchemeResponse, identifySchemeTopic } = require("./schemeService");
const { extractQuantity, extractFarmerVillage } = require("./transportService");
const {
  resolveContextualEntities,
  getFollowUpResponse,
  getSession,
  updateSession,
  resetSession,
  isAffirmation,
  isResetRequest
} = require("./conversationStateService");
const {
  LANGUAGES,
  GREETING_TEXTS,
  MENU_TEXTS,
  AFTER_REQUEST_TEXTS,
  AFTER_REQUEST_BUTTONS,
  FEATURE_QUESTIONS,
  GOODBYE_TEXTS,
  HELP_TEXTS,
  getLanguageSelectionInteractive,
  getMainMenuInteractive,
  getAfterRequestInteractive,
  getSchemesInteractive,
  isGreetingMessage,
  parseLanguageSelection,
  parseNavigationControl,
  parseMainMenuSelection
} = require("./chatbotFlowService");

// Agricultural Intent Keywords (Categorized)
const INTENT_KEYWORDS = {
  fertilizer: [
    "fertilizer", "urea", "dap", "potash", "khad", "khat", "npk", "dosage", "dose",
    "micronutrient", "zinc", "sulphur", "boron", "19:19:19", "0:52:34", "12:61:00", "00:00:50",
    "खाद", "खत", "खते", "यूरिया", "डीएपी", "पोटाश", "सेंद्रिय", "सुपर", "नत्र", "स्फुरद", "पालाश", "झिंक"
  ],
  trend: [
    "trend", "outlook", "bhav badhega", "rate badhega", "daam badhega", "kam hoga", "aage bhav",
    "bhav vadhil ka", "bhav kadhi vadhnaar", "tezi", "teji", "mandi aayegi", "bhav ghadnar ka",
    "भाव वाढेल का", "भाव वाढतील का", "दर वाढतील का", "तेजी", "मंदी", "भाव बढ़ेगा क्या", "तेजी आएगी क्या"
  ],
  scheme: [
    "government scheme", "govt scheme", "scheme for farmer", "farmer scheme", "farmer yojana",
    "sarkari yojana", "kisan yojana", "kisan subsidy", "farmer subsidy", "kisan ke liye scheme",
    "kisan ke liye subsidy", "scheme", "schemes", "yojana", "yojna", "loan", "kcc", "subsidy", "subsidies",
    "anudan", "bima", "insurance", "karj", "rin", "pm kisan", "pm-kisan", "pmkisan", "namo shetkari",
    "fasal bima", "pmfby", "kisan samman nidhi", "samman nidhi", "mahadbt", "maha dbt", "maha-dbt", "dbt portal",
    "योजना", "सब्सिडी", "ऋण", "कर्ज", "अनुदान", "विमा", "बीमा", "पीएम किसान", "महाडीबीटी", "महा डीबीटी",
    "नमो शेतकरी", "शेतकरी योजना", "सरकारी योजना", "किसान योजना", "सन्मान निधी", "सम्मान निधि"
  ],
  price: [
    "price", "prices", "rate", "rates", "mandi", "bhav", "daam", "market", "cost", "bajarbhav",
    "भाव", "दाम", "मंडी", "बाजारभाव", "बाजार", "दर", "रेट", "किंमत"
  ],
  disease: [
    "disease", "pest", "leaf", "fungus", "yellow", "curl", "keeda", "keede", "kida",
    "rog", "bimari", "dawai", "spray", "fawarni", "upchar", "kid", "patti", "patte",
    "रोग", "कीड", "बीमारी", "कीड़े", "कीटक", "फवारणी", "छिड़काव", "औषध", "दवा", "पान", "पाने"
  ],
  weather: [
    "weather", "rain", "forecast", "temperature", "sinchai", "barish", "paus",
    "मौसम", "बारिश", "पानी", "सिंचाई", "हवामान", "पाऊस", "सिंचन"
  ],
  cultivation: [
    "variety", "varieties", "hybrid", "sowing", "spacing", "seed rate", "seed treatment",
    "weed", "herbicide", "harvest", "threshing", "cultivation", "lagwad", "biyane",
    "वाण", "जाती", "पेरणी", "लागवड", "अंतर", "बीजप्रक्रिया", "बियाणे", "तण", "तणनाशक", "काढणी", "मळणी",
    "किस्में", "बुवाई", "बीज उपचार", "खरपतवार"
  ],
  greeting: [
    "hi", "hello", "hey", "namaste", "namaskar", "pranam", "shuru", "start", "help",
    "नमस्ते", "नमस्कार", "राम राम", "मदत", "मदद", "सुरू", "शुरू"
  ]
};

/**
 * Escapes special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Categorizes farmer query text into agricultural intent, factoring in session context
 * @param {string} text 
 * @param {object} [context=null] Optional contextual entity resolution object
 * @returns {string} Intent key
 */
function detectIntent(text, context = null) {
  if (!text || typeof text !== "string") {
    return "greeting";
  }

  const clean = text.trim().toLowerCase();

  // 1. Check Reset / Start intent
  if (isResetRequest(text) || context?.isReset) {
    return "greeting";
  }

  // 2. Check Transport & Net-Return Decision intent
  if (isTransportDecisionIntent(text) || context?.isStandaloneQuantity || context?.isRecommendationOnly) {
    return "transport_decision";
  }

  // 3. Check specific agricultural domains in priority order: fertilizer -> trend -> scheme -> price -> disease -> weather -> cultivation -> greeting
  const domains = ["fertilizer", "trend", "scheme", "price", "disease", "weather", "cultivation", "greeting"];

  for (const intent of domains) {
    const keywords = INTENT_KEYWORDS[intent];
    if (!keywords) continue;
    for (const kw of keywords) {
      if (/[\u0900-\u097F]/.test(kw)) {
        if (clean.includes(kw)) {
          return intent;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
        if (regex.test(clean)) {
          return intent;
        }
      }
    }
  }

  // 4. Check Affirmation intent ("Haan", "Yes", "Ho", etc.) when session has an active intent
  if (isAffirmation(text) || context?.isAffirmation) {
    if (context?.session?.lastIntent) {
      return "affirmation";
    }
  }

  // 5. Contextual Fallback Detection:
  // If location is present (direct or standalone, e.g. "Nagpur", "Chikhli", "Buldhana")
  if (context?.isLocationPresent) {
    return "price";
  }

  // If crop is present (direct or standalone, e.g. "Soyabean", "Wheat")
  if (context?.isCropPresent) {
    return "price";
  }

  // If user entered only "rates" / "price" with active crop in session -> Price intent
  if (context?.isRateOnly && (context?.mergedCrop || context?.session?.crop)) {
    return "price";
  }

  return "general";
}

/**
 * Multilingual Conversational Response Templates
 */
const RESPONSES = {
  greeting: {
    en: "🌱 *Welcome to CropCash!*\n\nI am your mandi price and net-profit assistant. I can help you with:\n• Live mandi prices (e.g. *'Soybean price in Nagpur'*)\n• Transport cost & best mandi profit (e.g. *'20 quintal from Chikhli'*)\n• Government scheme updates (e.g. *'PM Kisan'*)\n\nWhich crop price or mandi decision would you like to check today?",
    hi: "🌱 *नमस्ते! मैं क्रॉपकैश (CropCash) हूँ।*\n\nआपका डिजिटल मंडी और मुनाफा सलाहकार। मैं आपकी सहायता कर सकता हूँ:\n• लाइव मंडी भाव (जैसे: *'इंदौर में गेहूं का भाव'*)\n• ढुलाई खर्च और सबसे ज्यादा मुनाफे वाली मंडी (जैसे: *'20 क्विंटल चिखली से'*)\n• सरकारी किसान योजनाएं (जैसे: *'पीएम किसान'*)\n\nआज आप किस फसल का भाव जानना चाहते हैं?",
    mr: "🌱 *नमस्कार! मी क्रॉपकॅश (CropCash) आहे.*\n\nआपला हक्काचा बाजारभाव व नफा मार्गदर्शक. मी आपल्याला मदत करू शकतो:\n• थेट बाजारभाव (उदा. *'लातूर सोयाबीन भाव'*)\n• वाहतूक खर्च आणि सर्वात फायदेशीर बाजार समिती (उदा. *'२० क्विंटल चिखलीहून'*)\n• शासकीय योजना व अनुदान (उदा. *'पीएम किसान'*)\n\nआज आपल्याला कोणत्या पिकाचा बाजारभाव पाहायचा आहे?",
    hinglish: "🌱 *Namaste! Main CropCash hoon.*\n\nAapka mandi aur transport saathi. Main aapko:\n• Live mandi rates (Jaise: *'Soybean rate in Nagpur'*)\n• Transport cost aur best mandi munafa (Jaise: *'20 quintal Chikhli se'*)\n• Sarkari yojana alerts (Jaise: *'PM Kisan'*)\n\nAaj aap kis fasal ka bhav dekhna chahte hain?"
  },

  scheme: {
    en: "🏛️ *Key Farmer Government Schemes*\n\n1. *PM-Kisan Samman Nidhi:* ₹6,000/year (3 installments of ₹2,000 directly via DBT)\n2. *MahaDBT Farmer Portal (Maharashtra):* Subsidies for tractors, drip/sprinkler irrigation & farm ponds\n3. *Namo Shetkari Yojana (Maharashtra):* Additional ₹6,000/year state support\n4. *PM Fasal Bima Yojana (PMFBY):* Weather and crop insurance\n5. *Kisan Credit Card (KCC):* Low-interest farm loans @ 4%\n\nWhich scheme would you like details or official portal links for?",
    hi: "🏛️ *प्रमुख किसान सरकारी योजनाएं*\n\n1. *पीएम-किसान सम्मान निधि:* ₹6,000 प्रति वर्ष (DBT द्वारा 3 किस्तों में)\n2. *महाडीबीटी पोर्टल (महाराष्ट्र):* ट्रैक्टर, ड्रिप/स्प्रिंकलर और शेततळे पर 50% से 80% तक सब्सिडी\n3. *नमो शेतकरी योजना (महाराष्ट्र):* ₹6,000 प्रति वर्ष अतिरिक्त राज्य सहायता\n4. *प्रधानमंत्री फसल बीमा योजना (PMFBY):* फसल बीमा एवं आपदा सुरक्षा\n5. *किसान क्रेडिट कार्ड (KCC):* 4% सस्ती ब्याज दर पर कृषि ऋण\n\nआप किस योजना के बारे में विस्तार से जानना चाहते हैं?",
    mr: "🏛️ *शेतकरी शासकीय योजना माहिती*\n\n१. *पीएम-किसान सन्मान निधी:* वार्षिक ₹६,००० (३ हप्त्यांमध्ये ₹२,००० थेट बँक खात्यात)\n२. *महाडीबीटी शेतकरी पोर्टल (महाराष्ट्र):* ट्रॅक्टर, ठिबक/तुषार सिंचन व शेततळे अनुदाने\n३. *नमो शेतकरी महासन्मान निधी:* महाराष्ट्र शासनाचे अतिरिक्त ₹६,०००/वर्ष\n४. *प्रधानमंत्री पीक विमा योजना (PMFBY):* नैसर्गिक आपत्तींपासून पीक संरक्षण\n५. *किसान क्रेडिट कार्ड (KCC):* केवळ ४% सवलतीच्या व्याजदरात पीक कर्ज\n\nआपल्याला यापैकी कोणत्या योजनेची सविस्तर माहिती हवी आहे?",
    hinglish: "🏛️ *Kisan Sarkari Yojana Alerts*\n\n1. *PM-Kisan Samman Nidhi:* ₹6,000/year (3 installments of ₹2,000 via DBT)\n2. *MahaDBT Farmer Portal (Maharashtra):* Tractor, drip irrigation aur shet tale subsidies\n3. *Namo Shetkari Yojana (Maharashtra):* Additional ₹6,000/year state assistance\n4. *PM Fasal Bima Yojana (PMFBY):* Crop insurance against weather risk\n5. *Kisan Credit Card (KCC):* Low-interest farm loans @ 4%\n\nAapko kis yojana ke baare me specific jaankari chahiye?"
  },

  trend: {
    en: "📈 *Mandi Market Outlook & Trend*\n\nMarket arrivals and prices fluctuate daily based on demand, moisture levels, and terminal market trends.\n\n• For near-term selling, always compare nearby mandis against your transport cost.\n• Prices often vary by ₹100–₹400/quintal across neighboring mandis on the same day.\n\nWhich crop and mandi would you like to compare today?",
    hi: "📈 *मंडी बाजार रुझान (Market Trend)*\n\nफसलों के दैनिक भाव आवक, गुणवत्ता और मांग पर निर्भर करते हैं।\n\n• फसल बेचने से पहले नजदीकी मंडियों के मॉडल भाव और ढुलाई खर्च की तुलना जरूर करें।\n• पास-पास की मंडियों में एक ही दिन भाव में ₹100-₹400/क्विंटल का अंतर हो सकता है।\n\nआप किस फसल और मंडी का भाव देखना चाहते हैं?",
    mr: "📈 *बाजारभाव कल व अंदाज (Market Trend)*\n\nबाजार समितीतील दर हे दैनंदिन आवक, पिकातील ओलावा आणि मागणीनुसार बदलतात.\n\n• माल विकण्यापूर्वी नजीकच्या बाजार समित्यांमधील सरासरी दर आणि वाहतूक खर्चाची तुलना करा.\n• एकाच दिवशी लगतच्या बाजार समित्यांमध्ये प्रति क्विंटल ₹१०० ते ₹४०० चा फरक असू शकतो.\n\nआपल्याला आज कोणत्या पिकाचा आणि बाजार समितीचा दर तपासायचा आहे?",
    hinglish: "📈 *Mandi Market Outlook & Trend*\n\nFasal ke rates daily arrivals, quality aur market demand par depend karte hain.\n\n• Maal bechne se pehle nearby mandis ke rates aur transport cost compare karein.\n• Paas ki mandis me ₹100-₹400/quintal ka difference aa sakta hai.\n\nAap kis fasal aur mandi ka comparative rate check karna chahte hain?"
  },

  disease: {
    en: "🌿 *Crop Health & Pest Advisory*\n\nTo diagnose crop issues:\n1. 📷 Send a clear close-up photo of the affected leaf, stem, or pest.\n2. Describe symptoms (e.g. yellow spots, curling, wilting).\n\nWe will identify the disease and provide organic & management guidance.",
    hi: "🌿 *फसल सुरक्षा एवं कीट-रोग समाधान*\n\nसटीक रोग पहचान के लिए:\n1. 📷 प्रभावित पत्ती, तने या कीट की साफ और नजदीकी फोटो भेजें।\n2. लक्षण बताएं (जैसे पत्तों का पीला पड़ना, सिकुड़ना या धब्बे)।\n\nहम रोग की पहचान कर सही जैविक एवं कृषि प्रबंधन उपचार की सलाह देंगे।",
    mr: "🌿 *पीक संरक्षण व कीड-रोग सल्ला*\n\nपिकाच्या अचूक रोग निदानासाठी:\n1. 📷 बाधित पान, खोड किंवा किडीचा स्पष्ट व जवळचा फोटो पाठवा.\n2. लक्षणे सांगा (उदा. पाने पिवळी पडणे, सुरकुतणे किंवा डाग).\n\nआम्ही रोगाची माहिती घेऊन योग्य जैविक व एकात्मिक व्यवस्थापनाचा सल्ला देऊ.",
    hinglish: "🌿 *Fasal Suraksha & Keeda Upchar*\n\nSahi disease diagnosis ke liye:\n1. 📷 Kharab patti, tana ya pest ki clear photo click karke bhejein.\n2. Symptoms batayein (jaise patte peele hona, sukhna ya daag).\n\nHum bimari identify karke sahi organic aur management guidance denge."
  },

  weather: {
    en: "⛅ *Weather & Irrigation Advisory*\n\nTell us your taluka or village name for local 5-day weather and rainfall forecast.\n\n_Farming Tip: Avoid pesticide spraying if rainfall or strong winds are expected in next 24 hours._",
    hi: "⛅ *मौसम एवं सिंचाई पूर्वानुमान*\n\nअपने गांव या तहसील का नाम बताएं, ताकि हम 5 दिनों के मौसम और वर्षा की सटीक जानकारी दे सकें।\n\n_कृषि सुझाव: यदि अगले 24 घंटों में बारिश की संभावना हो तो कीटनाशक छिड़काव से बचें।_",
    mr: "⛅ *हवामान व सिंचन सल्ला*\n\nस्थानिक ५ दिवसांचा हवामान व पावसाचा अंदाज जाणून घेण्यासाठी आपल्या तालुक्याचे/गावाचे नाव सांगा.\n\n_शेतकरी सल्ला: पुढील २४ तासांत पाऊस किंवा वादळाची शक्यता असल्यास फवारणी टाळावी._",
    hinglish: "⛅ *Mausam & Sinchai Advisory*\n\nApne gav ya tehsil ka naam batayein local 5-day weather aur rain forecast ke liye.\n\n_Kisan Tip: Agar agle 24 ghante me barish ki sambhavna ho toh spray karne se bachein._"
  },

  general: {
    en: "🌾 I didn't quite catch that.\n\nYou can ask me about:\n• Mandi rates (e.g. *'Soybean price in Nagpur'*)\n• Best mandi decision (e.g. *'20 quintals from Chikhli'*)\n• Government schemes (e.g. *'PM Kisan'*)\n\nWhat would you like to check?",
    hi: "🌾 मैं आपका सवाल पूरी तरह समझ नहीं पाया।\n\nआप मुझसे पूछ सकते हैं:\n• मंडी भाव (जैसे: *'इंदौर में गेहूं का भाव'*)\n• सही मंडी सलाह (जैसे: *'20 क्विंटल चिखली से कहाँ बेचूँ?'*)\n• सरकारी योजनाएं (जैसे: *'पीएम किसान योजना'*)\n\nआपको किस विषय में जानकारी चाहिए?",
    mr: "🌾 मला आपला प्रश्न पूर्णपणे समजला नाही.\n\nआपण विचारू शकता:\n• बाजारभाव (उदा. *'लातूर सोयाबीन भाव'*)\n• नफा सल्ला (उदा. *'२० क्विंटल चिखलीहून कुठे विकू?'*)\n• शासकीय योजना (उदा. *'पीएम किसान योजना'*)\n\nआपल्याला कोणती माहिती हवी आहे?",
    hinglish: "🌾 Mujhe aapka sawal poori tarah samajh nahi aaya.\n\nAap mujhse pooch sakte hain:\n• Mandi bhav (Jaise: *'Soybean rate in Nagpur'*)\n• Best mandi decision (Jaise: *'20 quintal Chikhli se kahan bechu?'*)\n• Sarkari yojana (Jaise: *'PM Kisan yojana'*)\n\nAapko kis baare me jaankari chahiye?"
  },

  audio: {
    en: "🎙️ *Voice Message Received*\n\nYour audio message is queued for Speech-to-Text processing. You can also type your query directly in English, Hindi, Marathi, or Hinglish.",
    hi: "🎙️ *वॉयस मैसेज प्राप्त हुआ*\n\nआपका ऑडियो संदेश प्रोसेस किया जा रहा है। आप अपना सवाल हिंदी, मराठी, इंग्लिश या हिंग्लिश में लिखकर भी पूछ सकते हैं।",
    mr: "🎙️ *व्हॉईस मेसेज प्राप्त झाला*\n\nतुमचा ऑडिओ संदेश प्रोसेस केला जात आहे. आपण आपला प्रश्न मराठी, हिंदी, किंवा इंग्लिशमध्ये लिहूनही पाठवू शकता.",
    hinglish: "🎙️ *Voice Message Receive Hua*\n\nAapka audio message process ho raha hai. Aap apna sawal Hinglish, Hindi, Marathi ya English me type karke bhi bhej sakte hain."
  }
};

/**
 * Process any incoming WhatsApp message payload and generate a safe, language-tailored response
 * @param {object} message - WhatsApp webhook message object
 * @param {string} [overrideUserId] - Optional user ID / sender phone number override
 * @returns {Promise<{ replyText: string, lang: string, type: string, intent?: string }>}
 */
async function processIncomingMessage(message, overrideUserId = null) {
  const messageType = message?.type || "unknown";

  // 1. Handle Audio / Voice Notes
  if (messageType === "audio" || messageType === "voice") {
    const defaultLang = "hi";
    const rawReply = RESPONSES.audio[defaultLang] || RESPONSES.audio.en;
    const safeReply = validateAndSanitizeResponse(rawReply, defaultLang);
    return {
      replyText: safeReply,
      lang: defaultLang,
      type: "audio"
    };
  }

  // 2. Handle Images / Crop Photos through Disease Detector Service
  if (messageType === "image") {
    const { replyText, lang } = await processCropImageMessage(message);
    const safeReply = validateAndSanitizeResponse(replyText, lang);
    return {
      replyText: safeReply,
      lang,
      type: "image",
      intent: "disease",
      followUpInteractive: getAfterRequestInteractive(lang)
    };
  }

  // 3. Handle Text & WhatsApp Interactive Messages (Buttons, List Replies)
  if (messageType === "text" || messageType === "interactive" || message?.text?.body || message?.interactive) {
    const textBody = (
      message.text?.body ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      message.button?.text ||
      ""
    ).trim();

    const buttonId = (
      message.interactive?.button_reply?.id ||
      message.interactive?.list_reply?.id ||
      ""
    ).trim();

    const userId = overrideUserId || message.from || message.userId || "default_user";
    const session = getSession(userId);

    // Language determination: If user already selected a language, STRICTLY communicate in that language
    let lang = session.selectedLanguage || detectLanguage(textBody) || session.lastLanguage || "en";

    console.log(`[ResponseHandler] Incoming Text: "${textBody}" | ButtonId: "${buttonId}" | User: ${userId} | Lang: ${lang}`);

    // -------------------------------------------------------------
    // CHECK 1: LANGUAGE SELECTION
    // -------------------------------------------------------------
    const chosenLang = parseLanguageSelection(buttonId || textBody);
    if (chosenLang) {
      session.selectedLanguage = chosenLang;
      session.lastLanguage = chosenLang;
      session.activeFeature = null;
      session.step = 0;
      updateSession(userId, { selectedLanguage: chosenLang, lastLanguage: chosenLang, activeFeature: null, step: 0 });

      const menuInteractive = getMainMenuInteractive(chosenLang);
      const safeReply = validateAndSanitizeResponse(MENU_TEXTS[chosenLang].body, chosenLang);
      return {
        replyText: safeReply,
        lang: chosenLang,
        type: "interactive",
        interactive: menuInteractive,
        intent: "greeting"
      };
    }

    // -------------------------------------------------------------
    // CHECK 2: NAVIGATION CONTROLS (Main Menu, Back, Change Language, Start Again, Help, End Conversation)
    // -------------------------------------------------------------
    const navControl = parseNavigationControl(buttonId || textBody);
    if (navControl) {
      if (navControl === "main_menu" || navControl === "ask_another") {
        session.activeFeature = null;
        session.step = 0;
        updateSession(userId, { activeFeature: null, step: 0 });
        const menuInteractive = getMainMenuInteractive(lang);
        const safeReply = validateAndSanitizeResponse(MENU_TEXTS[lang].body, lang);
        return {
          replyText: safeReply,
          lang,
          type: "interactive",
          interactive: menuInteractive,
          intent: "greeting"
        };
      }

      if (navControl === "change_language") {
        const langInteractive = getLanguageSelectionInteractive(lang);
        const prompt = GREETING_TEXTS[lang] || GREETING_TEXTS.en;
        return {
          replyText: validateAndSanitizeResponse(prompt, lang),
          lang,
          type: "interactive",
          interactive: langInteractive,
          intent: "greeting"
        };
      }

      if (navControl === "start_again") {
        resetSession(userId);
        const langInteractive = getLanguageSelectionInteractive("en");
        return {
          replyText: validateAndSanitizeResponse(GREETING_TEXTS.en, "en"),
          lang: "en",
          type: "interactive",
          interactive: langInteractive,
          intent: "greeting"
        };
      }

      if (navControl === "help") {
        const helpText = HELP_TEXTS[lang] || HELP_TEXTS.en;
        return {
          replyText: validateAndSanitizeResponse(helpText, lang),
          lang,
          type: "text",
          intent: "help",
          followUpInteractive: getMainMenuInteractive(lang)
        };
      }

      if (navControl === "end_chat") {
        session.activeFeature = null;
        session.step = 0;
        updateSession(userId, { activeFeature: null, step: 0 });
        const byeText = GOODBYE_TEXTS[lang] || GOODBYE_TEXTS.en;
        return {
          replyText: validateAndSanitizeResponse(byeText, lang),
          lang,
          type: "text",
          intent: "end"
        };
      }

      if (navControl === "back") {
        if (session.activeFeature && session.step > 1) {
          session.step -= 1;
          const feat = session.activeFeature;
          let questionText = "";
          if (feat === "best_mandi" || feat === "transport") {
            if (session.step === 1) questionText = FEATURE_QUESTIONS[feat].ask_crop[lang];
            if (session.step === 2) questionText = FEATURE_QUESTIONS[feat].ask_quantity[lang];
          } else if (feat === "mandi_prices") {
            if (session.step === 1) questionText = FEATURE_QUESTIONS.mandi_prices.ask_crop[lang];
          }
          return {
            replyText: validateAndSanitizeResponse(questionText, lang),
            lang,
            type: "text"
          };
        } else {
          session.activeFeature = null;
          session.step = 0;
          updateSession(userId, { activeFeature: null, step: 0 });
          return {
            replyText: validateAndSanitizeResponse(MENU_TEXTS[lang].body, lang),
            lang,
            type: "interactive",
            interactive: getMainMenuInteractive(lang),
            intent: "greeting"
          };
        }
      }
    }

    // -------------------------------------------------------------
    // CHECK 3: GREETING (Hi / Hello / Namaste)
    // -------------------------------------------------------------
    if (isGreetingMessage(textBody)) {
      const prompt = GREETING_TEXTS[lang] || GREETING_TEXTS.en;
      const langInteractive = getLanguageSelectionInteractive(lang);
      return {
        replyText: validateAndSanitizeResponse(prompt, lang),
        lang,
        type: "interactive",
        interactive: langInteractive,
        intent: "greeting"
      };
    }

    // -------------------------------------------------------------
    // CHECK 4: MAIN INTERACTIVE MENU SELECTIONS
    // -------------------------------------------------------------
    const menuSelection = parseMainMenuSelection(buttonId || textBody);
    if (menuSelection) {
      if (menuSelection === "best_mandi") {
        session.activeFeature = "best_mandi";
        session.step = 1;
        session.crop = null;
        session.quantity = null;
        session.village = null;
        session.district = null;
        updateSession(userId, { activeFeature: "best_mandi", step: 1, crop: null, quantity: null, village: null, district: null });
        return {
          replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.best_mandi.ask_crop[lang], lang),
          lang,
          type: "text",
          intent: "transport_decision"
        };
      }

      if (menuSelection === "mandi_prices") {
        session.activeFeature = "mandi_prices";
        session.step = 1;
        session.crop = null;
        session.district = null;
        session.village = null;
        updateSession(userId, { activeFeature: "mandi_prices", step: 1, crop: null, district: null, village: null });
        return {
          replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.mandi_prices.ask_crop[lang], lang),
          lang,
          type: "text",
          intent: "price"
        };
      }

      if (menuSelection === "transport") {
        session.activeFeature = "transport";
        session.step = 1;
        session.crop = null;
        session.quantity = null;
        session.village = null;
        session.district = null;
        updateSession(userId, { activeFeature: "transport", step: 1, crop: null, quantity: null, village: null, district: null });
        return {
          replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.transport.ask_crop[lang], lang),
          lang,
          type: "text",
          intent: "transport_decision"
        };
      }

      if (menuSelection === "schemes") {
        session.activeFeature = "schemes";
        updateSession(userId, { activeFeature: "schemes" });
        const schemeOverview = getSchemeResponse(textBody || "government schemes", lang);
        return {
          replyText: validateAndSanitizeResponse(schemeOverview, lang),
          lang,
          type: "interactive",
          interactive: getSchemesInteractive(lang),
          intent: "scheme",
          followUpInteractive: getAfterRequestInteractive(lang)
        };
      }

      if (menuSelection === "trend") {
        session.activeFeature = "trend";
        session.step = 1;
        updateSession(userId, { activeFeature: "trend", step: 1 });
        return {
          replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.trend.ask_crop[lang], lang),
          lang,
          type: "text",
          intent: "trend"
        };
      }
    }

    // -------------------------------------------------------------
    // CHECK 5: ACTIVE FEATURE STEP-BY-STEP CONVERSATION FLOW
    // -------------------------------------------------------------
    if (session.activeFeature) {
      const feat = session.activeFeature;

      // === FEATURE: FIND BEST MANDI or CALCULATE TRANSPORT ===
      if (feat === "best_mandi" || feat === "transport") {
        const { crop: directCrop } = extractMandiEntities(textBody);
        const directQty = extractQuantity(textBody);
        const directVillage = extractFarmerVillage(textBody);
        const { district: directDistrict } = extractMandiEntities(textBody);

        // Turn 1: Asking for crop
        if (session.step === 1) {
          if (directCrop) session.crop = directCrop;
          if (directQty !== null) session.quantity = directQty;
          if (directVillage || directDistrict) {
            session.village = directVillage || { standardName: directDistrict, key: directDistrict.toLowerCase() };
            session.district = directDistrict || session.village?.standardName;
          }

          if (session.crop && session.quantity !== null && (session.village || session.district)) {
            session.activeFeature = null;
            session.step = 0;
            const resText = await getMandiDecisionResponse(textBody, lang, undefined, {
              crop: session.crop,
              quantity: session.quantity,
              village: session.village,
              district: session.district
            });
            return {
              replyText: validateAndSanitizeResponse(resText, lang),
              lang,
              type: "text",
              intent: "transport_decision",
              followUpInteractive: getAfterRequestInteractive(lang)
            };
          }

          if (session.crop) {
            session.step = 2;
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS[feat].ask_quantity[lang], lang),
              lang,
              type: "text"
            };
          } else {
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS[feat].ask_crop[lang], lang),
              lang,
              type: "text"
            };
          }
        }

        // Turn 2: Asking for quantity
        if (session.step === 2) {
          if (directQty !== null) session.quantity = directQty;
          if (directVillage || directDistrict) {
            session.village = directVillage || { standardName: directDistrict, key: directDistrict.toLowerCase() };
            session.district = directDistrict || session.village?.standardName;
          }

          if (session.quantity !== null && (session.village || session.district)) {
            session.activeFeature = null;
            session.step = 0;
            const resText = await getMandiDecisionResponse(textBody, lang, undefined, {
              crop: session.crop,
              quantity: session.quantity,
              village: session.village,
              district: session.district
            });
            return {
              replyText: validateAndSanitizeResponse(resText, lang),
              lang,
              type: "text",
              intent: "transport_decision",
              followUpInteractive: getAfterRequestInteractive(lang)
            };
          }

          if (session.quantity !== null) {
            session.step = 3;
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS[feat].ask_location[lang], lang),
              lang,
              type: "text"
            };
          } else {
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS[feat].ask_quantity[lang], lang),
              lang,
              type: "text"
            };
          }
        }

        // Turn 3: Asking for location
        if (session.step === 3) {
          const villageObj = directVillage || (directDistrict ? { standardName: directDistrict, key: directDistrict.toLowerCase() } : null) || { standardName: textBody, key: textBody.toLowerCase() };
          session.village = villageObj;
          session.district = directDistrict || villageObj.standardName;
          session.activeFeature = null;
          session.step = 0;

          const resText = await getMandiDecisionResponse(textBody, lang, undefined, {
            crop: session.crop,
            quantity: session.quantity,
            village: session.village,
            district: session.district
          });

          return {
            replyText: validateAndSanitizeResponse(resText, lang),
            lang,
            type: "text",
            intent: "transport_decision",
            followUpInteractive: getAfterRequestInteractive(lang)
          };
        }
      }

      // === FEATURE: CHECK MANDI PRICES ===
      if (feat === "mandi_prices") {
        const { crop: directCrop, district: directDistrict } = extractMandiEntities(textBody);

        if (session.step === 1) {
          if (directCrop) session.crop = directCrop;
          if (directDistrict) session.district = directDistrict;

          if (session.crop && session.district) {
            session.activeFeature = null;
            session.step = 0;
            const resText = await getMandiPriceResponse(textBody, lang, undefined, {
              crop: session.crop,
              district: session.district
            });
            return {
              replyText: validateAndSanitizeResponse(resText, lang),
              lang,
              type: "text",
              intent: "price",
              followUpInteractive: getAfterRequestInteractive(lang)
            };
          }

          if (session.crop) {
            session.step = 2;
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.mandi_prices.ask_location[lang], lang),
              lang,
              type: "text"
            };
          } else {
            return {
              replyText: validateAndSanitizeResponse(FEATURE_QUESTIONS.mandi_prices.ask_crop[lang], lang),
              lang,
              type: "text"
            };
          }
        }

        if (session.step === 2) {
          session.district = directDistrict || textBody;
          session.activeFeature = null;
          session.step = 0;
          const resText = await getMandiPriceResponse(textBody, lang, undefined, {
            crop: session.crop,
            district: session.district
          });
          return {
            replyText: validateAndSanitizeResponse(resText, lang),
            lang,
            type: "text",
            intent: "price",
            followUpInteractive: getAfterRequestInteractive(lang)
          };
        }
      }

      // === FEATURE: GOVERNMENT SCHEMES ===
      if (feat === "schemes") {
        session.activeFeature = null;
        session.step = 0;
        const schemeReply = getSchemeResponse(textBody, lang);
        return {
          replyText: validateAndSanitizeResponse(schemeReply, lang),
          lang,
          type: "text",
          intent: "scheme",
          followUpInteractive: getAfterRequestInteractive(lang)
        };
      }

      // === FEATURE: CROP PRICE TREND ===
      if (feat === "trend") {
        session.activeFeature = null;
        session.step = 0;
        const trendReply = RESPONSES.trend[lang] || RESPONSES.trend.en;
        return {
          replyText: validateAndSanitizeResponse(trendReply, lang),
          lang,
          type: "text",
          intent: "trend",
          followUpInteractive: getAfterRequestInteractive(lang)
        };
      }
    }

    // -------------------------------------------------------------
    // CHECK 6: NATURAL LANGUAGE DOMAIN ROUTING
    // -------------------------------------------------------------
    const context = resolveContextualEntities(userId, textBody);
    const intent = detectIntent(textBody, context);

    let rawReply = "";
    let followUpInteractive = undefined;

    // A. If Reset Request
    if (context.isReset) {
      resetSession(userId);
      const langInteractive = getLanguageSelectionInteractive(lang);
      return {
        replyText: validateAndSanitizeResponse(GREETING_TEXTS[lang], lang),
        lang,
        type: "interactive",
        interactive: langInteractive,
        intent: "greeting"
      };
    }
    // B. If Affirmation ("Haan", "Yes", "Ho", etc.)
    else if (intent === "affirmation") {
      rawReply = getFollowUpResponse(context.session, textBody, lang);
      followUpInteractive = getAfterRequestInteractive(lang);
    }
    // C. If intent is Transport / Mandi Net-Return Decision
    else if (intent === "transport_decision") {
      rawReply = await getMandiDecisionResponse(textBody, lang, undefined, {
        crop: context.mergedCrop,
        quantity: context.mergedQuantity,
        village: context.mergedVillage,
        district: context.mergedDistrict
      });
      const isComplete = Boolean(context.mergedCrop && context.mergedQuantity !== null && (context.mergedVillage || context.mergedDistrict));
      if (isComplete) {
        followUpInteractive = getAfterRequestInteractive(lang);
      }
    }
    // D. If intent is Government Scheme Information
    else if (intent === "scheme") {
      rawReply = getSchemeResponse(textBody, lang);
      const topic = identifySchemeTopic(textBody);
      context.session.lastSubTopic = topic;
      followUpInteractive = getAfterRequestInteractive(lang);
    }
    // E. If intent is Fertilizer & Nutrient Advisory
    else if (intent === "fertilizer") {
      rawReply = await getFertilizerAdvisoryResponse(textBody, lang, undefined, {
        crop: context.mergedCrop
      });
      followUpInteractive = getAfterRequestInteractive(lang);
    }
    // F. If intent is Mandi Price
    else if (intent === "price") {
      rawReply = await getMandiPriceResponse(textBody, lang, undefined, {
        crop: context.mergedCrop,
        district: context.mergedDistrict
      });
      const isComplete = Boolean(context.mergedCrop && context.mergedDistrict);
      if (isComplete) {
        followUpInteractive = getAfterRequestInteractive(lang);
      }
    }
    // G. If intent is Agromet Weather Advisory
    else if (intent === "weather") {
      rawReply = await getWeatherAdvisoryResponse(textBody, lang, undefined, {
        location: context.mergedVillage?.standardName || context.mergedDistrict
      });
      followUpInteractive = getAfterRequestInteractive(lang);
    }
    // H. If intent is Crop Cultivation / PDKV PoP Advisory
    else if (intent === "cultivation") {
      rawReply = await getCropAdvisoryResponse(textBody, lang, {
        crop: context.mergedCrop
      });
      followUpInteractive = getAfterRequestInteractive(lang);
    } else {
      const templateGroup = RESPONSES[intent] || RESPONSES.general;
      rawReply = templateGroup[lang] || templateGroup.en || RESPONSES.general.en;
      followUpInteractive = getMainMenuInteractive(lang);
    }

    // Update session tracking state
    context.session.lastIntent = intent;
    context.session.lastLanguage = lang;
    context.session.history.push({
      text: textBody,
      intent,
      timestamp: Date.now()
    });

    const safeReply = validateAndSanitizeResponse(rawReply, lang);

    return {
      replyText: safeReply,
      lang,
      type: "text",
      intent,
      followUpInteractive
    };
  }

  // 4. Fallback for other payload types
  const lang = "en";
  const fallbackText = "🌾 *CropCash Support*\n\nWe received your message. You can send us text queries in English, Hindi, Marathi, or Hinglish, or send photos of your crops and voice notes!";
  return {
    replyText: validateAndSanitizeResponse(fallbackText, lang),
    lang,
    type: messageType
  };
}

module.exports = {
  processIncomingMessage,
  detectIntent,
  RESPONSES,
  INTENT_KEYWORDS,
};

