/**
 * CropCash Conversational State & Context Management Service
 * Maintains active multi-turn session slots per WhatsApp user phone number.
 * Enables seamless context memory across turns for crop, location, quantity, and topic.
 */

const { extractMandiEntities, DISTRICT_MAP, LOCATION_DISPLAY_NAMES, CROP_MAP } = require("./mandiPriceService");
const { extractQuantity, extractFarmerVillage } = require("./transportService");

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour session TTL
const userSessions = new Map();

/**
 * Retrieves or initializes the conversational session for a given phone number/user ID
 * @param {string} userId
 * @returns {object} Active session object
 */
function getSession(userId) {
  const cleanId = userId ? String(userId).replace(/[^0-9]/g, "") : "default_user";
  let session = userSessions.get(cleanId);

  if (!session || (Date.now() - session.updatedAt > SESSION_TTL_MS)) {
    session = {
      userId: cleanId,
      crop: null,
      quantity: null,
      village: null,
      district: null,
      mandi: null,
      lastIntent: null,
      lastSubTopic: null,
      waitingFor: null,
      lastPromptType: null,
      lastLanguage: "en",
      selectedLanguage: null,
      activeFeature: null,
      step: 0,
      previousStep: 0,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    userSessions.set(cleanId, session);
  }

  return session;
}

/**
 * Updates properties on a user's session
 * @param {string} userId
 * @param {object} updates
 * @returns {object} Updated session
 */
function updateSession(userId, updates = {}) {
  const session = getSession(userId);
  Object.assign(session, updates, { updatedAt: Date.now() });
  return session;
}

/**
 * Clears/resets the session for a user
 * @param {string} userId
 */
function resetSession(userId) {
  const cleanId = userId ? String(userId).replace(/[^0-9]/g, "") : "default_user";
  userSessions.delete(cleanId);
}

/**
 * Recognizes affirmative responses in English, Hindi, Marathi, and Hinglish
 * @param {string} text
 * @returns {boolean}
 */
function isAffirmation(text) {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim().toLowerCase();
  const exactOnlyWords = ["batao", "sanga", "बताओ", "सांगा", "bata do", "saang", "bataiye"];
  if (exactOnlyWords.includes(clean)) return true;

  const words = [
    "yes", "haan", "ha", "haa", "han", "ho", "hoy", "sure", "ok", "okay",
    "theek hai", "thik hai", "barobar", "chaleel", "sahi hai",
    "हाँ", "हा", "होय", "हो", "ठीक है", "ठीक आहे", "बरोबर", "अवश्य", "ज़रूर", "जरूर"
  ];
  return words.some(w => clean === w || clean.startsWith(w + " ") || clean.endsWith(" " + w));
}

/**
 * Recognizes reset/restart intent
 * @param {string} text
 * @returns {boolean}
 */
function isResetRequest(text) {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim().toLowerCase();
  const resetWords = [
    "start", "restart", "reset", "shuru", "suru", "new", "clear",
    "सुरू", "शुरू", "पुन्हा", "नया", "रिसेट"
  ];
  return resetWords.includes(clean);
}

/**
 * Resolves entities by combining incoming text with session memory
 * @param {string} userId - User phone number or identifier
 * @param {string} incomingText - Incoming message text
 * @returns {object} Resolved contextual entities and flags
 */
function resolveContextualEntities(userId, incomingText) {
  const session = getSession(userId);
  const text = (incomingText || "").trim();
  const cleanLower = text.toLowerCase().replace(/[.,!?]+/g, "").trim();

  const { crop: directCrop, district: directDistrict } = extractMandiEntities(text);
  const directQuantity = extractQuantity(text);
  const directVillage = extractFarmerVillage(text);

  // 1. Identify Standalone Location if not extracted as direct district/village
  let standaloneLocation = null;
  if (!directDistrict && !directVillage) {
    for (const d of DISTRICT_MAP) {
      if (d.aliases.some(a => a.toLowerCase() === cleanLower)) {
        standaloneLocation = d.standardName;
        break;
      }
    }
    if (!standaloneLocation) {
      for (const [key, val] of Object.entries(LOCATION_DISPLAY_NAMES)) {
        if (key.toLowerCase() === cleanLower) {
          standaloneLocation = val.en;
          break;
        }
      }
    }
  }

  // 2. Identify Standalone Crop
  let standaloneCrop = null;
  if (!directCrop) {
    for (const c of CROP_MAP) {
      if (c.aliases.some(a => a.toLowerCase() === cleanLower)) {
        standaloneCrop = c;
        break;
      }
    }
  }

  const isAffirm = isAffirmation(text);
  const isReset = isResetRequest(text);

  // Check if message is a generic rate request ("rates", "bhav", "price", "rate", etc.)
  const rateKeywords = ["rates", "rate", "bhav", "price", "prices", "bajarbhav", "दाम", "दर", "भाव", "बाजारभाव", "कीमत"];
  const isRateOnly = rateKeywords.includes(cleanLower) || rateKeywords.some(kw => cleanLower === kw);

  // Check if message is a recommendation/profit question ("kaha bechu", "where to go", "where to sell", etc.)
  const recommendationKeywords = [
    "kaha bechu", "kahan bechu", "kaha bechna", "kuthe viku", "kothe viku",
    "which mandi", "which market", "where to go", "where should i go", "where to sell",
    "where should i sell", "where should we sell", "best mandi", "better mandi",
    "kaha jau", "kaha le jau", "kahan le jau", "kuthe jau", "kothe jau",
    "कुठे विकू", "कहाँ बेचूँ", "कहा बेचू", "कहाँ बेचें", "कुठे नेऊ", "कहा ले जाऊ"
  ];
  const isRecommendationOnly = recommendationKeywords.some(kw => cleanLower.includes(kw));

  // 3. Merge with existing Session Slots
  let resolvedCrop = directCrop || standaloneCrop || session.crop;
  let resolvedQuantity = directQuantity !== null ? directQuantity : session.quantity;
  let resolvedVillage = directVillage || (standaloneLocation ? { standardName: standaloneLocation, key: standaloneLocation.toLowerCase() } : session.village);
  let resolvedDistrict = directDistrict || standaloneLocation || session.district;
  let resolvedMandi = standaloneLocation || directDistrict || session.mandi;

  // 4. Update session state slots if new entities are found
  if (directCrop || standaloneCrop) {
    session.crop = directCrop || standaloneCrop;
  }
  if (directQuantity !== null) {
    session.quantity = directQuantity;
  }
  if (directVillage) {
    session.village = directVillage;
  }
  if (directDistrict) {
    session.district = directDistrict;
    if (!session.village) {
      session.village = { standardName: directDistrict, key: directDistrict.toLowerCase() };
    }
  }
  if (standaloneLocation) {
    session.district = standaloneLocation;
    session.mandi = standaloneLocation;
    session.village = { standardName: standaloneLocation, key: standaloneLocation.toLowerCase() };
  }

  const isContextualFollowUp = Boolean(
    (directQuantity !== null && !directCrop && session.crop) ||
    (standaloneLocation && session.crop) ||
    (directCrop && !directDistrict && session.district) ||
    (isRateOnly && session.crop) ||
    (isRecommendationOnly && session.crop) ||
    (isAffirm && session.lastIntent)
  );

  return {
    session,
    mergedCrop: resolvedCrop,
    mergedQuantity: resolvedQuantity,
    mergedVillage: resolvedVillage,
    mergedDistrict: resolvedDistrict,
    mergedMandi: resolvedMandi,
    isStandaloneLocation: Boolean(standaloneLocation),
    isStandaloneCrop: Boolean(standaloneCrop),
    isStandaloneQuantity: Boolean(directQuantity !== null && !directCrop && !directDistrict && !directVillage),
    isLocationPresent: Boolean(directDistrict || directVillage || standaloneLocation),
    isCropPresent: Boolean(directCrop || standaloneCrop),
    isQuantityPresent: Boolean(directQuantity !== null),
    isRateOnly,
    isRecommendationOnly,
    isAffirmation: isAffirm,
    isReset,
    isContextualFollowUp
  };
}

/**
 * Multilingual Follow-Up Responses for User Affirmations ("Haan", "Yes", "Ho", etc.)
 * Provides next-step guidance based on previous conversational context.
 * @param {object} session
 * @param {string} text
 * @param {'en'|'hi'|'mr'|'hinglish'} lang
 * @returns {string}
 */
function getFollowUpResponse(session, text, lang = "en") {
  const lastIntent = session?.lastIntent;
  const lastSubTopic = session?.lastSubTopic;

  // 1. Follow-up after Government Scheme (e.g. PM-KISAN, MahaDBT)
  if (lastIntent === "scheme" || lastSubTopic === "pm_kisan" || lastSubTopic === "namo_shetkari") {
    const schemeFollowUps = {
      en: `📌 *PM-KISAN & Scheme Action Steps:*\n\n1. *Aadhaar OTP e-KYC:* Visit https://pmkisan.gov.in and click on the 'e-KYC' tab. Enter your Aadhaar number and OTP received on your mobile.\n2. *Biometric e-KYC:* Can also be completed at any Common Service Center (CSC) or Maha e-Seva Kendra.\n3. *Beneficiary Status:* Check installment and land seeding status using your mobile number on https://pmkisan.gov.in.\n4. *MahaDBT Subsidies:* For tractor & drip irrigation subsidy applications, visit https://mahadbt.maharashtra.gov.in.\n\nWould you like to check mandi rates or transport profit for your crop?`,
      hi: `📌 *पीएम-किसान एवं योजना सहायता निर्देश:*\n\n1. *आधार ओटीपी e-KYC:* https://pmkisan.gov.in पर जाएं और 'e-KYC' विकल्प चुनकर आधार नंबर व मोबाइल OTP दर्ज करें।\n2. *बायोमेट्रिक e-KYC:* अपने नजदीकी CSC जनसेवा केंद्र या महा ई-सेवा केंद्र पर जाकर फिंगरप्रिंट द्वारा करा सकते हैं।\n3. *किस्त स्टेटस:* पोर्टल पर 'Know Your Status' में मोबाइल नंबर दर्ज कर अपनी किस्त व लैंड सीडिंग स्थिति जांचें।\n4. *महाडीबीटी सब्सिडी:* ट्रैक्टर एवं ड्रिप सिंचाई अनुदान के लिए https://mahadbt.maharashtra.gov.in पर आवेदन करें।\n\nक्या आप अपनी फसल का मंडी भाव या ढुलाई खर्च देखना चाहते हैं?`,
      mr: `📌 *पीएम-किसान व शासकीय योजना कृती मार्गदर्शन:*\n\n१. *आधार OTP e-KYC:* https://pmkisan.gov.in वर जाऊन 'e-KYC' पर्यायावर क्लिक करा व आधार क्रमांक टाकून मोबाईल OTP द्वारे पूर्ण करा.\n२. *बायोमेट्रिक e-KYC:* नजीकच्या आपले सरकार सेवा केंद्र किंवा CSC केंद्रावर जाऊन बायोमेट्रिक पद्धतीने करा.\n३. *हप्ता स्थिती:* 'Know Your Status' मध्ये मोबाईल नंबर टाकून हप्ता व जमीन नोंदणी (Land Seeding) तपासा.\n४. *महाडीबीटी अनुदान:* ट्रॅक्टर, ठिबक व शेततळे अनुदानासाठी https://mahadbt.maharashtra.gov.in ला भेट द्या.\n\nआपल्याला पिकाचा बाजारभाव किंवा वाहतूक नफा तपासायचा आहे का?`,
      hinglish: `📌 *PM-KISAN & Scheme Action Guide:*\n\n1. *Aadhaar OTP e-KYC:* https://pmkisan.gov.in par 'e-KYC' tab par jakar Aadhaar OTP se complete karein.\n2. *Biometric e-KYC:* CSC ya Maha e-Seva Kendra par jakar fingerprint se e-KYC karwayein.\n3. *Beneficiary Status:* Portal par 'Know Your Status' me installment aur land seeding check karein.\n4. *MahaDBT Subsidy:* Tractor aur drip irrigation subsidies ke liye https://mahadbt.maharashtra.gov.in visit karein.\n\nKya aapko mandi bhav ya transport profit check karna hai?`
    };
    return schemeFollowUps[lang] || schemeFollowUps.en;
  }

  // 2. Follow-up after Transport & Mandi Decision
  if (lastIntent === "transport_decision") {
    const qtyStr = session?.quantity ? `${session.quantity} quintals` : "your harvest";
    const transportFollowUps = {
      en: `🚚 *CropCash Local Transport & Mandi Tips:*\n\n1. *Moisture Check:* Ensure soybean/crop moisture is below 10-12% to prevent deductions during auction.\n2. *Vehicle Booking:* For ${qtyStr}, a local 407 tempo, pickup, or tractor trolley is ideal.\n3. *Mandi Timing:* Reach the APMC gate between 7:30 AM – 9:30 AM for early auction entry.\n4. *Weighbridge:* Always weigh your empty vehicle (tare weight) and loaded vehicle on the official APMC weighbridge.\n\nWould you like to check prices in any other mandi or check government schemes?`,
      hi: `🚚 *क्रॉपकैश लोकल ट्रांसपोर्ट एवं मंडी सुझाव:*\n\n1. *नमी की जांच:* फसल में नमी 10-12% से कम रखें ताकि मंडी में भाव में कटौती न हो।\n2. *वाहन व्यवस्था:* ${session?.quantity ? session.quantity + " क्विंटल" : "फसल"} के लिए पिकअप, आयशर या ट्रैक्टर ट्रॉली का उपयोग करें।\n3. *मंडी समय:* सुबह 8:00 से 9:30 बजे के बीच मंडी गेट पर पहुंचें ताकि बोली (नीलामी) में समय पर प्रवेश मिले।\n4. *धर्मकांटा:* खाली और भरे वाहन का वजन APMC के अधिकृत कांटे पर ही कराएं।\n\nक्या आप किसी अन्य मंडी का भाव या किसान योजनाएं देखना चाहते हैं?`,
      mr: `🚚 *क्रॉपकॅश स्थानिक वाहतूक व बाजार समिती टिप्स:*\n\n१. *ओलावा तपासणी:* पिकातील ओलावा १०-१२% पेक्षा कमी ठेवा जेणेकरून लिलावात दरात कपात होणार नाही.\n२. *गाडी व्यवस्था:* ${session?.quantity ? session.quantity + " क्विंटल" : "माला"}साठी पिकअप, छोटा हत्ती किंवा ट्रॅक्टर ट्रॉलीची निवड करा.\n३. *वेळ:* सकाळी ८:०० ते ९:३० वाजेदरम्यान बाजार समितीच्या गेटवर पोहोचा जेणेकरून लिलावात लवकर नंबर लागेल.\n४. *वजनकाटा:* वाहनाचे रिकामे आणि भरलेले वजन बाजार समितीच्या अधिकृत वजनकाट्यावरच करा.\n\nआपल्याला दुसऱ्या बाजार समितीचा दर किंवा शासकीय योजना पाहायच्या आहेत का?`,
      hinglish: `🚚 *CropCash Local Transport & Mandi Tips:*\n\n1. *Moisture Check:* Fasal me moisture 10-12% se kam rakhein taaki rate cut na ho.\n2. *Vehicle Booking:* ${session?.quantity ? session.quantity + " quintal" : "maal"} ke hisaab se pickup ya tractor trolley book karein.\n3. *Mandi Timing:* Subah 8:00 AM se 9:30 AM tak mandi pahuchein taaki auction me time par entry mile.\n4. *Weighment:* Official APMC weighbridge par hi empty aur loaded weight karwayein.\n\nKya aapko kisi dusri mandi ka rate ya sarkari yojana check karni hai?`
    };
    return transportFollowUps[lang] || transportFollowUps.en;
  }

  // 3. Follow-up after Mandi Price Check
  if (lastIntent === "price") {
    const cropDisplay = session?.crop?.displayName?.[lang] || session?.crop?.displayName?.en || session?.crop?.standardName || "crop";
    const priceFollowUps = {
      en: `🌾 Great! If you are planning to sell your *${cropDisplay}*, please tell me how many *quintals* you have and your *village name* (e.g., '20 quintal from Chikhli'). I will calculate the transport cost and find your most profitable mandi!`,
      hi: `🌾 बहुत बढ़िया! यदि आप *${cropDisplay}* बेचना चाहते हैं, तो कृपया बताएं कि आपके पास *कितने क्विंटल* फसल है और आपका *गांव* कौन सा है (जैसे: '20 क्विंटल चिखली से')। मैं ढुलाई खर्च जोड़कर सबसे ज्यादा मुनाफे वाली मंडी बता दूंगा!`,
      mr: `🌾 उत्तम! आपण जर *${cropDisplay}* विकणार असाल, तर आपल्याकडे *किती क्विंटल* माल आहे आणि आपले *गाव* सांगा (उदा. '२० क्विंटल चिखलीहून'). मी वाहतूक खर्च हिशोब करून सर्वात फायदेशीर बाजार समिती सुचवेन!`,
      hinglish: `🌾 Great! Agar aapko *${cropDisplay}* bechna hai, toh batayein aapke paas *kitne quintal* fasal hai aur aapka *village* kaunsa hai (Jaise: '20 quintal Chikhli se'). Main transport cost ke sath best mandi bata dunga!`
    };
    return priceFollowUps[lang] || priceFollowUps.en;
  }

  // 4. General Affirmation Response
  const generalFollowUps = {
    en: `👍 How can I help you further? You can ask for mandi prices, compare transport costs, or check government schemes.`,
    hi: `👍 मैं आपकी और क्या सहायता कर सकता हूँ? आप मंडी भाव, ढुलाई खर्च तुलना या सरकारी योजनाओं के बारे में पूछ सकते हैं।`,
    mr: `👍 मी आपल्याला आणखी काय मदत करू? आपण बाजारभाव, वाहतूक खर्च तुलना किंवा शासकीय योजनांबद्दल विचारू शकता.`,
    hinglish: `👍 Main aapki aur kya madad kar sakta hoon? Aap mandi bhav, transport profit comparison ya sarkari yojana ke baare me pooch sakte hain.`
  };
  return generalFollowUps[lang] || generalFollowUps.en;
}

module.exports = {
  getSession,
  updateSession,
  resetSession,
  isAffirmation,
  isResetRequest,
  resolveContextualEntities,
  getFollowUpResponse,
  userSessions,
};
