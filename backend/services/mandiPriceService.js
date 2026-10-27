/**
 * CropCash Live Mandi / Market Price Service
 * Fetches and formats real-time agricultural market prices from official Agmarknet / Data.gov.in API.
 * Handles dynamic entity extraction (crop & district/mandi) in English, Hindi, Marathi, and Hinglish.
 * Implements a robust multi-tier fallback hierarchy:
 *   1. Exact Commodity + District / Market
 *   2. Commodity + State-level APMC records (when specific district has no arrivals today)
 *   3. Commodity + National / Regional APMC records
 *   4. Honest unavailable notice (zero fake data)
 */

const AGMARKNET_ENDPOINT = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
const REQUEST_TIMEOUT_MS = 6000;

// Multilingual Crop Mapping to Standard Agmarknet Commodity Names
const CROP_MAP = [
  {
    standardName: "Soyabean",
    displayName: { en: "Soybean", hi: "सोयाबीन", mr: "सोयाबीन", hinglish: "Soyabean" },
    aliases: [
      "soybean", "soyabean", "soya", "soyabeen", "सोयाबीन", "सोया"
    ]
  },
  {
    standardName: "Cotton",
    displayName: { en: "Cotton", hi: "कपास", mr: "कापूस", hinglish: "Kapas (Cotton)" },
    aliases: [
      "cotton", "kapas", "kapus", "कपास", "कापूस", "कापसाचा", "कापसाचे", "कापसाचे भाव", "रूई"
    ]
  },
  {
    standardName: "Wheat",
    displayName: { en: "Wheat", hi: "गेहूं", mr: "गहू", hinglish: "Gehu (Wheat)" },
    aliases: [
      "wheat", "gehu", "gehun", "gahu", "गेहूं", "गेहू", "गहू", "गव्हाचा", "गव्हाचे"
    ]
  },
  {
    standardName: "Gram",
    displayName: { en: "Gram (Chana)", hi: "चना", mr: "हरभरा (चना)", hinglish: "Chana / Gram" },
    aliases: [
      "gram", "chickpea", "chana", "harbhara", "चना", "चने", "हरभरा", "हरभऱ्याचा", "हरभऱ्याचे"
    ]
  },
  {
    standardName: "Paddy(Dhan)(Common)",
    displayName: { en: "Paddy (Rice)", hi: "धान (चावल)", mr: "भात (धान)", hinglish: "Dhan / Paddy" },
    aliases: [
      "paddy", "rice", "dhan", "chawal", "bhaat", "धान", "चावल", "भात", "तांदूळ"
    ]
  },
  {
    standardName: "Onion",
    displayName: { en: "Onion", hi: "प्याज", mr: "कांदा", hinglish: "Pyaj / Onion" },
    aliases: [
      "onion", "pyaj", "pyaaz", "kanda", "प्याज", "कांदा", "कांद्याचा", "कांद्याचे"
    ]
  },
  {
    standardName: "Tomato",
    displayName: { en: "Tomato", hi: "टमाटर", mr: "टोमॅटो", hinglish: "Tamatar / Tomato" },
    aliases: [
      "tomato", "tamatar", "tomatoe", "टमाटर", "टोमॅटो", "टोमॅटोचा"
    ]
  },
  {
    standardName: "Potato",
    displayName: { en: "Potato", hi: "आलू", mr: "बटाटा", hinglish: "Aalu / Potato" },
    aliases: [
      "potato", "aalu", "aloo", "batata", "आलू", "बटाटा", "बटाट्याचा"
    ]
  },
  {
    standardName: "Mustard",
    displayName: { en: "Mustard", hi: "सरसों", mr: "मोहरी (सरसों)", hinglish: "Sarson (Mustard)" },
    aliases: [
      "mustard", "sarson", "rai", "mohari", "सरसों", "राई", "मोहरी"
    ]
  },
  {
    standardName: "Arhar (Tur/Red Gram)",
    displayName: { en: "Tur / Arhar", hi: "तूर / अरहर", mr: "तूर", hinglish: "Tur / Arhar" },
    aliases: [
      "tur", "arhar", "toor", "pigeon pea", "तूर", "अरहर", "तुरीचा", "तुरीचे"
    ]
  },
  {
    standardName: "Maize",
    displayName: { en: "Maize (Corn)", hi: "मक्का", mr: "मका", hinglish: "Makka / Maize" },
    aliases: [
      "maize", "corn", "makka", "maka", "मक्का", "भुट्टा", "मका", "मक्याचा"
    ]
  },
  {
    standardName: "Sugarcane",
    displayName: { en: "Sugarcane", hi: "गन्ना", mr: "ऊस", hinglish: "Ganna / Sugarcane" },
    aliases: [
      "sugarcane", "ganna", "us", "गन्ना", "ऊस", "उसाचा", "उसाचे"
    ]
  }
];

// Multilingual District & Mandi Mapping
const DISTRICT_MAP = [
  // Maharashtra
  { standardName: "Latur", state: "Maharashtra", aliases: ["latur", "लातूर", "लातूरमध्ये", "लातूरच्या", "latur mandi"] },
  { standardName: "Nagpur", state: "Maharashtra", aliases: ["nagpur", "नागपूर", "नागपूरमध्ये", "नागपूरच्या", "nagpur mandi"] },
  { standardName: "Nashik", state: "Maharashtra", aliases: ["nashik", "nasik", "नाशिक", "नाशिकमध्ये", "नाशिकच्या"] },
  { standardName: "Pune", state: "Maharashtra", aliases: ["pune", "पुणे", "पुण्यात", "पुण्यामध्ये", "pune mandi"] },
  { standardName: "Akola", state: "Maharashtra", aliases: ["akola", "अकोला", "अकोल्यात", "अकोल्याच्या"] },
  { standardName: "Amravati", state: "Maharashtra", aliases: ["amravati", "amarawati", "अमरावती", "अमरावतीत"] },
  { standardName: "Solapur", state: "Maharashtra", aliases: ["solapur", "सोलापूर", "सोलापुरात"] },
  { standardName: "Kolhapur", state: "Maharashtra", aliases: ["kolhapur", "कोल्हापूर", "कोल्हापुरात"] },
  { standardName: "Aurangabad", state: "Maharashtra", aliases: ["aurangabad", "sambhajinagar", "औरंगाबाद", "संभाजीनगर"] },
  { standardName: "Jalna", state: "Maharashtra", aliases: ["jalna", "जालना", "जालन्यात"] },
  { standardName: "Jalgaon", state: "Maharashtra", aliases: ["jalgaon", "जळगाव", "जळगावात"] },
  { standardName: "Ahmednagar", state: "Maharashtra", aliases: ["ahmednagar", "ahilyanagar", "nagar", "अहमदनगर", "अहिल्यानगर"] },
  { standardName: "Yavatmal", state: "Maharashtra", aliases: ["yavatmal", "यवतमाळ"] },
  { standardName: "Nanded", state: "Maharashtra", aliases: ["nanded", "नांदेड"] },
  { standardName: "Buldhana", state: "Maharashtra", aliases: ["buldhana", "buldana", "बुलढाणा", "बुलढाण्यात"] },
  { standardName: "Beed", state: "Maharashtra", aliases: ["beed", "बीड"] },
  { standardName: "Osmanabad", state: "Maharashtra", aliases: ["osmanabad", "dharashiv", "उस्मानाबाद", "धाराशिव"] },
  { standardName: "Wardha", state: "Maharashtra", aliases: ["wardha", "वर्धा"] },
  { standardName: "Sangli", state: "Maharashtra", aliases: ["sangli", "सांगली"] },
  { standardName: "Satara", state: "Maharashtra", aliases: ["satara", "सातारा"] },
  { standardName: "Dhule", state: "Maharashtra", aliases: ["dhule", "धुळे"] },
  { standardName: "Parbhani", state: "Maharashtra", aliases: ["parbhani", "परभणी"] },
  { standardName: "Washim", state: "Maharashtra", aliases: ["washim", "वाशीम"] },
  { standardName: "Hingoli", state: "Maharashtra", aliases: ["hingoli", "हिंगोली"] },
  { standardName: "Chandrapur", state: "Maharashtra", aliases: ["chandrapur", "चंद्रपूर"] },
  { standardName: "Bhandara", state: "Maharashtra", aliases: ["bhandara", "भंडारा"] },
  { standardName: "Gondia", state: "Maharashtra", aliases: ["gondia", "गोंदिया"] },

  // Buldhana & Vidarbha Mandis / Talukas
  { standardName: "Chikhli", state: "Maharashtra", district: "Buldhana", aliases: ["chikhli", "चिखली", "चिखलीत", "चिखलीतील", "chikhali"] },
  { standardName: "Khamgaon", state: "Maharashtra", district: "Buldhana", aliases: ["khamgaon", "खामगाव", "खामगांव", "खामगावात"] },
  { standardName: "Malkapur", state: "Maharashtra", district: "Buldhana", aliases: ["malkapur", "मलकापूर", "मलकापुर"] },
  { standardName: "Mehkar", state: "Maharashtra", district: "Buldhana", aliases: ["mehkar", "mehekar", "मेहकर"] },
  { standardName: "Shegaon", state: "Maharashtra", district: "Buldhana", aliases: ["shegaon", "शेगाव", "शेगांव"] },
  { standardName: "Nandura", state: "Maharashtra", district: "Buldhana", aliases: ["nandura", "नांदुरा"] },
  { standardName: "Motala", state: "Maharashtra", district: "Buldhana", aliases: ["motala", "मोताळा", "मोताला"] },
  { standardName: "Savner", state: "Maharashtra", district: "Nagpur", aliases: ["savner", "saoner", "सावनेर"] },
  { standardName: "Baramati", state: "Maharashtra", district: "Pune", aliases: ["baramati", "बारामती"] },

  // Madhya Pradesh
  { standardName: "Indore", state: "Madhya Pradesh", aliases: ["indore", "इंदौर", "इन्दौर", "indore mandi"] },
  { standardName: "Bhopal", state: "Madhya Pradesh", aliases: ["bhopal", "भोपाल"] },
  { standardName: "Ujjain", state: "Madhya Pradesh", aliases: ["ujjain", "उज्जैन"] },
  { standardName: "Jabalpur", state: "Madhya Pradesh", aliases: ["jabalpur", "जबलपुर"] },
  { standardName: "Gwalior", state: "Madhya Pradesh", aliases: ["gwalior", "ग्वालियर"] },
  { standardName: "Sagar", state: "Madhya Pradesh", aliases: ["sagar", "सागर"] },
  { standardName: "Dewas", state: "Madhya Pradesh", aliases: ["dewas", "देवास"] },
  { standardName: "Ratlam", state: "Madhya Pradesh", aliases: ["ratlam", "रतलाम"] },
  { standardName: "Mandsaur", state: "Madhya Pradesh", aliases: ["mandsaur", "मंदसौर"] },
  { standardName: "Neemuch", state: "Madhya Pradesh", aliases: ["neemuch", "नीमच"] },
  { standardName: "Sehore", state: "Madhya Pradesh", aliases: ["sehore", "सीहोर"] },
  { standardName: "Vidisha", state: "Madhya Pradesh", aliases: ["vidisha", "विदिशा"] },
  { standardName: "Harda", state: "Madhya Pradesh", aliases: ["harda", "हरदा"] },
  { standardName: "Khargone", state: "Madhya Pradesh", aliases: ["khargone", "खरगोन"] },
  { standardName: "Khandwa", state: "Madhya Pradesh", aliases: ["khandwa", "खंडवा"] },

  // Gujarat
  { standardName: "Rajkot", state: "Gujarat", aliases: ["rajkot", "राजकोट"] },
  { standardName: "Surat", state: "Gujarat", aliases: ["surat", "सूरत"] },
  { standardName: "Ahmedabad", state: "Gujarat", aliases: ["ahmedabad", "अहमदाबाद"] },
  { standardName: "Gondal", state: "Gujarat", aliases: ["gondal", "गोंडल"] },
  { standardName: "Unjha", state: "Gujarat", aliases: ["unjha", "उंझा"] },
  { standardName: "Amreli", state: "Gujarat", aliases: ["amreli", "अमरेली"] },

  // Rajasthan
  { standardName: "Kota", state: "Rajasthan", aliases: ["kota", "कोटा"] },
  { standardName: "Jaipur", state: "Rajasthan", aliases: ["jaipur", "जयपुर"] },
  { standardName: "Jodhpur", state: "Rajasthan", aliases: ["jodhpur", "जोधपुर"] },
  { standardName: "Bikaner", state: "Rajasthan", aliases: ["bikaner", "बीकानेर"] },
  { standardName: "Sri Ganganagar", state: "Rajasthan", aliases: ["ganganagar", "sri ganganagar", "गंगानगर"] },
  { standardName: "Baran", state: "Rajasthan", aliases: ["baran", "बारां"] },

  // Uttar Pradesh
  { standardName: "Kanpur", state: "Uttar Pradesh", aliases: ["kanpur", "कानपुर"] },
  { standardName: "Lucknow", state: "Uttar Pradesh", aliases: ["lucknow", "लखनऊ"] },
  { standardName: "Agra", state: "Uttar Pradesh", aliases: ["agra", "आगरा"] },
  { standardName: "Varanasi", state: "Uttar Pradesh", aliases: ["varanasi", "बनारस", "वाराणसी"] },
  { standardName: "Meerut", state: "Uttar Pradesh", aliases: ["meerut", "मेरठ"] },
  { standardName: "Prayagraj", state: "Uttar Pradesh", aliases: ["prayagraj", "allahabad", "प्रयागराज", "इलाहाबाद"] },

  // Punjab & Haryana
  { standardName: "Ludhiana", state: "Punjab", aliases: ["ludhiana", "लुधियाना"] },
  { standardName: "Amritsar", state: "Punjab", aliases: ["amritsar", "अमृतसर"] },
  { standardName: "Karnal", state: "Haryana", aliases: ["karnal", "करनाल"] },
  { standardName: "Hisar", state: "Haryana", aliases: ["hisar", "हिसार"] },
  { standardName: "Sirsa", state: "Haryana", aliases: ["sirsa", "सिरसा"] }
];

// Display Names Mapping for Village, Mandi & District Localized Display
const LOCATION_DISPLAY_NAMES = {
  // Prototype Towns & Villages
  "chikhli": { en: "Chikhli", mr: "चिखली", hi: "चिखली", hinglish: "Chikhli" },
  "khamgaon": { en: "Khamgaon", mr: "खामगाव", hi: "खामगांव", hinglish: "Khamgaon" },
  "malkapur": { en: "Malkapur", mr: "मलकापूर", hi: "मलकापुर", hinglish: "Malkapur" },
  "motala": { en: "Motala", mr: "मोताळा", hi: "मोताला", hinglish: "Motala" },
  "buldhana": { en: "Buldhana", mr: "बुलढाणा", hi: "बुलढाणा", hinglish: "Buldhana" },
  "shegaon": { en: "Shegaon", mr: "शेगाव", hi: "शेगांव", hinglish: "Shegaon" },
  "mehkar": { en: "Mehkar", mr: "मेहकर", hi: "मेहकर", hinglish: "Mehkar" },
  "nandura": { en: "Nandura", mr: "नांदुरा", hi: "नांदूरा", hinglish: "Nandura" },
  "jalgaon jamod": { en: "Jalgaon Jamod", mr: "जळगाव जामोद", hi: "जलगांव जामोद", hinglish: "Jalgaon Jamod" },
  "undri": { en: "Undri", mr: "उंड्री", hi: "उंड्री", hinglish: "Undri" },
  "amdapur": { en: "Amdapur", mr: "आमडापूर", hi: "आमडापुर", hinglish: "Amdapur" },
  "mera": { en: "Mera", mr: "मेरा", hi: "मेरा", hinglish: "Mera" },
  "kavhala": { en: "Kavhala", mr: "कव्हाळा", hi: "कव्हाळा", hinglish: "Kavhala" },
  "kolara": { en: "Kolara", mr: "कोलारा", hi: "कोलारा", hinglish: "Kolara" },
  "rohinkhed": { en: "Rohinkhed", mr: "रोहिणखेड", hi: "रोहिणखेड", hinglish: "Rohinkhed" },
  "shelgaon": { en: "Shelgaon", mr: "शेलगाव", hi: "शेलगांव", hinglish: "Shelgaon" },
  "kothali": { en: "Kothali", mr: "कोथळी", hi: "कोथली", hinglish: "Kothali" },
  "dhamangaon badhe": { en: "Dhamangaon Badhe", mr: "धामणगाव बढे", hi: "धामनगांव बढे", hinglish: "Dhamangaon Badhe" },
  "savner": { en: "Savner", mr: "सावनेर", hi: "सावनेर", hinglish: "Savner" },
  "baramati": { en: "Baramati", mr: "बारामती", hi: "बारामती", hinglish: "Baramati" },

  // Major Mandis & Districts across Maharashtra & India
  "latur": { en: "Latur", mr: "लातूर", hi: "लातूर", hinglish: "Latur" },
  "nagpur": { en: "Nagpur", mr: "नागपूर", hi: "नागपुर", hinglish: "Nagpur" },
  "nashik": { en: "Nashik", mr: "नाशिक", hi: "नासिक", hinglish: "Nashik" },
  "pune": { en: "Pune", mr: "पुणे", hi: "पुणे", hinglish: "Pune" },
  "akola": { en: "Akola", mr: "अकोला", hi: "अकोला", hinglish: "Akola" },
  "amravati": { en: "Amravati", mr: "अमरावती", hi: "अमरावती", hinglish: "Amravati" },
  "solapur": { en: "Solapur", mr: "सोलापूर", hi: "सोलापुर", hinglish: "Solapur" },
  "kolhapur": { en: "Kolhapur", mr: "कोल्हापूर", hi: "कोल्हापुर", hinglish: "Kolhapur" },
  "aurangabad": { en: "Aurangabad", mr: "संभाजीनगर / औरंगाबाद", hi: "औरंगाबाद", hinglish: "Aurangabad" },
  "jalna": { en: "Jalna", mr: "जालना", hi: "जालना", hinglish: "Jalna" },
  "jalgaon": { en: "Jalgaon", mr: "जळगाव", hi: "जलगांव", hinglish: "Jalgaon" },
  "ahmednagar": { en: "Ahmednagar", mr: "अहमदनगर", hi: "अहमदनगर", hinglish: "Ahmednagar" },
  "yavatmal": { en: "Yavatmal", mr: "यवतमाळ", hi: "यवतमाल", hinglish: "Yavatmal" },
  "nanded": { en: "Nanded", mr: "नांदेड", hi: "नांदेड़", hinglish: "Nanded" },
  "beed": { en: "Beed", mr: "बीड", hi: "बीड", hinglish: "Beed" },
  "osmanabad": { en: "Osmanabad", mr: "धाराशिव / उस्मानाबाद", hi: "उस्मानाबाद", hinglish: "Osmanabad" },
  "wardha": { en: "Wardha", mr: "वर्धा", hi: "वर्धा", hinglish: "Wardha" },
  "sangli": { en: "Sangli", mr: "सांगली", hi: "सांगली", hinglish: "Sangli" },
  "satara": { en: "Satara", mr: "सातारा", hi: "सातारा", hinglish: "Satara" },
  "dhule": { en: "Dhule", mr: "धुळे", hi: "धुले", hinglish: "Dhule" },
  "parbhani": { en: "Parbhani", mr: "परभणी", hi: "परभणी", hinglish: "Parbhani" },
  "washim": { en: "Washim", mr: "वाशीम", hi: "वाशिम", hinglish: "Washim" },
  "hingoli": { en: "Hingoli", mr: "हिंगोली", hi: "हिंगोली", hinglish: "Hingoli" },
  "chandrapur": { en: "Chandrapur", mr: "चंद्रपूर", hi: "चंद्रपुर", hinglish: "Chandrapur" },
  "indore": { en: "Indore", mr: "इंदूर", hi: "इंदौर", hinglish: "Indore" },
  "bhopal": { en: "Bhopal", mr: "भोपाळ", hi: "भोपाल", hinglish: "Bhopal" },
  "ujjain": { en: "Ujjain", mr: "उज्जैन", hi: "उज्जैन", hinglish: "Ujjain" },
  "jabalpur": { en: "Jabalpur", mr: "जबलपूर", hi: "जबलपुर", hinglish: "Jabalpur" }
};

/**
 * Get localized display name for a village/mandi/district
 * @param {string} name - Canonical English or raw name
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} [lang='en'] - Target language
 * @returns {string} Localized display string
 */
function getLocalizedLocationName(name, lang = "en") {
  if (!name || typeof name !== "string") return name || "";
  const cleanName = name.replace(/^APMC\s+/i, "").trim();
  const key = cleanName.toLowerCase();
  if (LOCATION_DISPLAY_NAMES[key] && LOCATION_DISPLAY_NAMES[key][lang]) {
    return LOCATION_DISPLAY_NAMES[key][lang];
  }
  return cleanName; // Preserve dynamic names cleanly
}

const LOCATION_STOPWORDS = new Set([
  // Hindi / Hinglish particles & question words
  "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "hai", "hain", "kya", "tha", "rahe",
  "batao", "bataiye", "bata do", "chahiye", "hoga", "hogi", "kitna", "kitne", "kaisa", "kaise",
  // Marathi particles & question words
  "cha", "chi", "che", "chya", "la", "na", "ne", "ni", "madhye", "til", "t", "s", "kay", "kasa",
  "kashi", "kashe", "aahe", "aahet", "sanga", "sang", "dakhva", "bagha", "pahije", "aale",
  // General & English
  "today", "yesterday", "tomorrow", "now", "what", "is", "the", "for", "in", "at", "to", "from",
  "give", "tell", "show", "please", "can", "you", "i", "want", "know", "check", "current", "latest",
  // Commodity & Mandi words
  "bhav", "rate", "rates", "daam", "kimat", "price", "prices", "mandi", "market", "bajar", "bazar", "apmc",
  "aaj", "aajka", "aajke", "aajche", "aajcha", "aajchi", "fasal", "pik", "pika", "pikache"
]);

/**
 * Escapes regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Clean location string by removing prepositions, postpositions, and query words
 * @param {string} raw
 * @returns {string}
 */
function cleanLocationCandidate(raw) {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  
  // Remove common question/intent words
  clean = clean.replace(/^(in|at|from|for|near|me|se|la|madhye|mein|ka|ki|ke|daam|rate|price|bhav|mandi|bajar|market|today|aaj|aajche)\s+/i, "");
  clean = clean.replace(/\s+(in|at|from|for|near|me|se|la|madhye|mein|ka|ki|ke|daam|rate|price|bhav|mandi|bajar|market|today|aaj|aajche)$/i, "");
  clean = clean.replace(/(मध्ये|च्या|तील|चा|चे|ची|ला|त|स|मंडी|बाजार|भाव|दर|रेट|किंमत|आज|आजचा|आजचे)$/u, "");
  clean = clean.replace(/^(मध्ये|च्या|तील|चा|चे|ची|ला|त|स|मंडी|बाजार|भाव|दर|रेट|किंमत|आज|आजचा|आजचे)\s+/u, "");
  clean = clean.replace(/[?.,!/\\-]+/g, "").trim();
  
  return clean;
}

/**
 * Dynamic extraction of crop and district/mandi entities from farmer message
 * Supports hardcoded district map as well as dynamic unmapped locations.
 * @param {string} text - Incoming farmer message
 * @returns {{ crop: object|null, district: string|null, rawLocation: string|null }}
 */
function extractMandiEntities(text) {
  if (!text || typeof text !== "string") {
    return { crop: null, district: null, rawLocation: null };
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Extract Crop
  let matchedCrop = null;
  for (const cropItem of CROP_MAP) {
    for (const alias of cropItem.aliases) {
      if (/[\u0900-\u097F]/.test(alias)) {
        if (lowerText.includes(alias.toLowerCase())) {
          matchedCrop = cropItem;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        if (regex.test(lowerText)) {
          matchedCrop = cropItem;
          break;
        }
      }
    }
    if (matchedCrop) break;
  }

  // 2. Extract District / Mandi from known DISTRICT_MAP and LOCATION_DISPLAY_NAMES
  let matchedDistrict = null;
  for (const distItem of DISTRICT_MAP) {
    for (const alias of distItem.aliases) {
      if (/[\u0900-\u097F]/.test(alias)) {
        if (lowerText.includes(alias.toLowerCase())) {
          matchedDistrict = distItem.standardName;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        if (regex.test(lowerText)) {
          matchedDistrict = distItem.standardName;
          break;
        }
      }
    }
    if (matchedDistrict) break;
  }

  // Check known location display names keys if not matched yet
  if (!matchedDistrict) {
    for (const [key, val] of Object.entries(LOCATION_DISPLAY_NAMES)) {
      const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, "i");
      if (regex.test(lowerText)) {
        matchedDistrict = val.en;
        break;
      }
    }
  }

  // 3. Dynamic Location Extraction if not in static list
  let dynamicLocation = null;
  if (!matchedDistrict) {
    // English/Hinglish patterns: "in <Location>", "<Location> mandi", "<Location> market", "<Location> me", "<Location> se"
    const enPatterns = [
      /\b(?:in|at|near|for|around|from)\s+([A-Za-z0-9\u0900-\u097F]{2,25})\b/i,
      /\b([A-Za-z0-9\u0900-\u097F]{2,25})\s+(?:mandi|market|bazar|bajar|apmc|madhye|til|chya)\b/i,
      /\b([A-Za-z0-9\u0900-\u097F]{3,25})\s+(?:me|mein|se|la)\s+(?:price|rate|bhav|daam|rates)\b/i,
      /\b([A-Za-z0-9\u0900-\u097F]{3,25})\s+(?:price|rate|bhav|daam|rates)\b/i
    ];

    for (const pat of enPatterns) {
      const match = cleanText.match(pat);
      if (match && match[1]) {
        const candidate = cleanLocationCandidate(match[1]);
        const candLower = candidate.toLowerCase();
        // Ensure candidate is not a crop name or stopword
        const isCrop = CROP_MAP.some(c => c.aliases.some(a => a.toLowerCase() === candLower));
        const isStopword = LOCATION_STOPWORDS.has(candLower);
        
        if (candidate.length >= 2 && !isCrop && !isStopword) {
          dynamicLocation = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          matchedDistrict = dynamicLocation;
          break;
        }
      }
    }
  }

  return {
    crop: matchedCrop,
    district: matchedDistrict,
    rawLocation: matchedDistrict
  };
}

// In-memory cache for Agmarknet API records (TTL: 15 minutes) to protect against rate limits (HTTP 429)
const MANDI_API_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetch Mandi / Market prices from Data.gov.in / Agmarknet API
 * Never logs or exposes API key.
 * @param {{ commodity?: string, district?: string, market?: string, state?: string, limit?: number }} params
 * @returns {Promise<Array<object>>}
 */
async function fetchOfficialMandiPrices({ commodity, district, market, state, limit = 100 }) {
  const apiKey = process.env.DATA_GOV_IN_API_KEY?.trim() || process.env.AGMARKNET_API_KEY?.trim();

  if (!apiKey) {
    console.log("No DATA_GOV_IN_API_KEY found in environment. Mandi live fetch skipped.");
    return [];
  }

  // Check in-memory cache first to eliminate duplicate/burst API calls
  const cacheKey = `${commodity || ""}|${district || ""}|${market || ""}|${state || ""}|${limit}`;
  const cached = MANDI_API_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`⚡ [Cache Hit] Returning ${cached.data.length} cached Mandi records for key: [${cacheKey}]`);
    return cached.data;
  }

  try {
    const url = new URL(AGMARKNET_ENDPOINT);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));

    if (commodity) {
      url.searchParams.set("filters[commodity]", commodity);
    }
    if (district) {
      url.searchParams.set("filters[district]", district);
    }
    if (market) {
      url.searchParams.set("filters[market]", market);
    }
    if (state) {
      url.searchParams.set("filters[state]", state);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    clearTimeout(timeoutId);

    // Safe logging without exposing API key
    const safeUrl = url.toString().replace(apiKey, "HIDDEN_KEY");
    console.log(`🔎 Mandi API Request [HTTP ${response.status}]:`, safeUrl);

    if (!response.ok) {
      console.error(`Data.gov.in API error: HTTP ${response.status} ${response.statusText}`);
      if (response.status === 429) {
        // Cache empty result for 60 seconds to prevent burst stalls during active rate-limits
        MANDI_API_CACHE.set(cacheKey, {
          timestamp: Date.now() - (CACHE_TTL_MS - 60000), // expires in 60s
          data: []
        });
      }
      return [];
    }

    const data = await response.json();
    const records = data.records || [];

    console.log("📦 Mandi API Response Summary:", {
      status: response.status,
      count: data.count,
      total: data.total,
      records: records.length,
      firstRecord: records[0] ? {
        state: records[0].state,
        district: records[0].district,
        market: records[0].market,
        commodity: records[0].commodity,
        arrival_date: records[0].arrival_date,
        modal_price: records[0].modal_price,
        min_price: records[0].min_price,
        max_price: records[0].max_price
      } : null
    });

    // Store in cache
    MANDI_API_CACHE.set(cacheKey, {
      timestamp: Date.now(),
      data: records
    });

    return records;
  } catch (error) {
    console.error("Mandi API fetch error:", error.message || error);
    return [];
  }
}

/**
 * Clean and format APMC Market Name
 * @param {string} rawMarket
 * @returns {string}
 */
function cleanMarketName(rawMarket) {
  if (!rawMarket || typeof rawMarket !== "string") return "";
  return rawMarket.trim();
}

/**
 * Format records into language-specific WhatsApp response
 * Supports direct district/market matches as well as state-level / nearby fallback records.
 * @param {object} params
 * @param {Array<object>} params.records - Raw Agmarknet records
 * @param {object} params.crop - Crop object
 * @param {string} params.district - Requested District/Location name
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} params.lang - Language code
 * @param {'direct' | 'state' | 'national' | 'unavailable'} [params.fallbackType='direct'] - Source scope
 * @param {string} [params.stateName] - State name for fallback
 * @returns {string}
 */
function formatMandiPriceResponse({ records, crop, district, lang, fallbackType = "direct", stateName = "Maharashtra" }) {
  const cropLabel = crop?.displayName?.[lang] || crop?.displayName?.en || crop?.standardName || "Crop";
  const displayDistrict = getLocalizedLocationName(district, lang);

  // 1. Completely Unavailable Response (No records in exact district, state, or national)
  if (!records || records.length === 0 || fallbackType === "unavailable") {
    const fallbackUnavailable = {
      en: `🌾 *${cropLabel} Price Update*\n\n📍 *District / Mandi:* ${displayDistrict}\n\n⚠️ *Live Data Status:*\nOfficial market arrivals data is currently not available for this commodity in ${displayDistrict} today.\n\n_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._\n\nWould you like to check rates for another nearby mandi or crop?`,
      hi: `🌾 *${cropLabel} मंडी भाव*\n\n📍 *जिला / मंडी:* ${displayDistrict}\n\n⚠️ *लाइव डेटा स्थिति:*\nआज ${displayDistrict} मंडी में इस फसल के लिए आधिकारिक आवक और भाव का डेटा अभी उपलब्ध नहीं है।\n\n_डेटा स्रोत: एग्मार्कनेट (Agmarknet) / कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार_\n\nक्या आप किसी नजदीकी जिले या दूसरी फसल का भाव देखना चाहते हैं?`,
      mr: `🌾 *${cropLabel} बाजारभाव*\n\n📍 *जिल्हा / बाजार समिती:* ${displayDistrict}\n\n⚠️ *थेट डेटा स्थिती:*\nआज ${displayDistrict} बाजार समितीमध्ये या पिकासाठी अधिकृत आवक व दराचा डेटा सध्या उपलब्ध नाही.\n\n_माहिती स्रोत: ॲगमार्कनेट (Agmarknet) / कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार_\n\nआपल्याला जवळच्या दुसऱ्या बाजार समितीचा किंवा दुसऱ्या पिकाचा भाव पाहायचा आहे का?`,
      hinglish: `🌾 *${cropLabel} Mandi Rate Update*\n\n📍 *District / Mandi:* ${displayDistrict}\n\n⚠️ *Live Data Status:*\n${displayDistrict} mandi me aaj is fasal ke live arrivals aur rate data filhal official records me available nahi hai.\n\n_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._\n\nKya aap kisi nearby district ya dusri fasal ka rate dekhna chahte hain?`
    };
    return fallbackUnavailable[lang] || fallbackUnavailable.en;
  }

  // 2. Direct Match Response (Exact district or market has live records)
  if (fallbackType === "direct") {
    const record = records[0];
    const rawMandiName = cleanMarketName(record.market || district);
    const displayMandiName = getLocalizedLocationName(rawMandiName, lang);
    const displayRecordDistrict = getLocalizedLocationName(record.district || district, lang);
    const localizedState = lang === "mr" ? "महाराष्ट्र" : lang === "hi" ? "महाराष्ट्र" : (record.state || "Maharashtra");
    const arrivalDate = record.arrival_date || "Today";
    const minPrice = record.min_price || "N/A";
    const maxPrice = record.max_price || "N/A";
    const modalPrice = record.modal_price || "N/A";

    // If multiple mandis exist in this district, list additional mandis
    let additionalMandisSection = "";
    if (records.length > 1) {
      const otherRecords = records.slice(1, 3);
      if (lang === "mr") {
        additionalMandisSection = `\n\n📊 *जिल्ह्यातील इतर बाजार समित्या:*\n` + otherRecords.map(r => `• *${getLocalizedLocationName(cleanMarketName(r.market), "mr")}:* सरासरी ₹${r.modal_price} (किमान ₹${r.min_price} - कमाल ₹${r.max_price})`).join("\n");
      } else if (lang === "hi") {
        additionalMandisSection = `\n\n📊 *जिले की अन्य मंडियां:*\n` + otherRecords.map(r => `• *${getLocalizedLocationName(cleanMarketName(r.market), "hi")}:* मॉडल ₹${r.modal_price} (न्यूनतम ₹${r.min_price} - अधिकतम ₹${r.max_price})`).join("\n");
      } else if (lang === "hinglish") {
        additionalMandisSection = `\n\n📊 *District ki Other Mandis:*\n` + otherRecords.map(r => `• *${cleanMarketName(r.market)}:* Modal ₹${r.modal_price} (Min ₹${r.min_price} - Max ₹${r.max_price})`).join("\n");
      } else {
        additionalMandisSection = `\n\n📊 *Other Mandis in District:*\n` + otherRecords.map(r => `• *${cleanMarketName(r.market)}:* Modal ₹${r.modal_price} (Min ₹${r.min_price} - Max ₹${r.max_price})`).join("\n");
      }
    }

    const templates = {
      en: `🌾 *Live Mandi / Market Price*

📌 *Crop:* ${cropLabel} (${record.commodity || crop.standardName})
📍 *APMC Market:* ${displayMandiName}
🏛️ *District / State:* ${displayRecordDistrict}, ${record.state || "India"}
📅 *Date:* ${arrivalDate}

💰 *Price Rates (₹ / Quintal):*
• *Modal Rate (Avg):* ₹${modalPrice}
• *Minimum Rate:* ₹${minPrice}
• *Maximum Rate:* ₹${maxPrice}${additionalMandisSection}

_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._

How many quintals do you have to sell and which village are you from? I can calculate transport costs and find your most profitable mandi.`,

      hi: `🌾 *दैनिक मंडी भाव (Live Mandi Price)*

📌 *फसल:* ${cropLabel} (${record.commodity || crop.standardName})
📍 *कृषि उपज मंडी:* ${displayMandiName}
🏛️ *जिला / राज्य:* ${displayRecordDistrict}, ${localizedState}
📅 *दिनांक:* ${arrivalDate}

💰 *बाजार भाव (रुपये / क्विंटल):*
• *मॉडल भाव (औसत):* ₹${modalPrice} / क्विंटल
• *न्यूनतम भाव:* ₹${minPrice} / क्विंटल
• *अधिकतम भाव:* ₹${maxPrice} / क्विंटल${additionalMandisSection}

_डेटा स्रोत: एग्मार्कनेट (Agmarknet) / कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार_

आपके पास कितना ${cropLabel} है और आप किस गांव से हैं? मैं ढुलाई खर्च जोड़कर सबसे ज्यादा मुनाफे वाली मंडी बता दूंगा।`,

      mr: `🌾 *थेट बाजारभाव (Live APMC Market Price)*

📌 *पीक:* ${cropLabel} (${record.commodity || crop.standardName})
📍 *बाजार समिती (APMC):* ${displayMandiName}
🏛️ *जिल्हा / राज्य:* ${displayRecordDistrict}, ${localizedState}
📅 *दिनांक:* ${arrivalDate}

💰 *बाजारभाव (रुपये / क्विंटल):*
• *सरासरी (मॉडेल) दर:* ₹${modalPrice} / क्विंटल
• *किमान (कमीतकमी) दर:* ₹${minPrice} / क्विंटल
• *कमाल (जास्तीत जास्त) दर:* ₹${maxPrice} / क्विंटल${additionalMandisSection}

_माहिती स्रोत: ॲगमार्कनेट (Agmarknet) / कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार_

तुमच्याकडे किती ${cropLabel} आहे आणि तुमचं गाव कोणतं? मी वाहतूक खर्च हिशोब करून सर्वात फायदेशीर बाजार समिती सुचवेन.`,

      hinglish: `🌾 *Live Mandi Rate Update*

📌 *Fasal:* ${cropLabel} (${record.commodity || crop.standardName})
📍 *Mandi (APMC):* ${displayMandiName}
🏛️ *District / State:* ${displayRecordDistrict}, ${record.state || "India"}
📅 *Date:* ${arrivalDate}

💰 *Bhav / Rate (₹ / Quintal):*
• *Modal Rate (Average):* ₹${modalPrice} / Quintal
• *Minimum Rate:* ₹${minPrice} / Quintal
• *Maximum Rate:* ₹${maxPrice} / Quintal${additionalMandisSection}

_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._

Aap batao kitna ${cropLabel} bechna hai aur aap kis gaon se ho? Main transport cost ke saath bata dunga ki kaunsi mandi better rahegi.`
    };

    return templates[lang] || templates.en;
  }

  // 3. State / Regional Fallback Response (When requested district has no direct arrivals today)
  const topRecords = records.slice(0, 4);
  const arrivalDate = topRecords[0]?.arrival_date || "Today";
  const localizedState = lang === "mr" ? "महाराष्ट्र" : lang === "hi" ? "महाराष्ट्र" : (stateName || "State");

  if (lang === "mr") {
    let out = `🌾 *बाजारभाव माहिती व राज्यस्तरीय थेट दर*\n\n`;
    out += `📌 *पीक:* ${cropLabel} (${crop.standardName})\n`;
    out += `📍 *विचारलेले ठिकाण:* ${displayDistrict}\n`;
    out += `ℹ️ *स्थिती:* आज ${displayDistrict} बाजार समितीत थेट आवक नोंद झालेली नाही.\n\n`;
    out += `📊 *${localizedState}ातील प्रमुख बाजार समित्यांचे थेट भाव:*\n`;
    for (const r of topRecords) {
      const mandi = getLocalizedLocationName(cleanMarketName(r.market), "mr");
      const dist = getLocalizedLocationName(r.district, "mr");
      out += `• *${mandi} (${dist}):* सरासरी ₹${r.modal_price} / क्विंटल (किमान ₹${r.min_price} - कमाल ₹${r.max_price})\n`;
    }
    out += `\n📅 *दिनांक:* ${arrivalDate}\n_माहिती स्रोत: ॲगमार्कनेट (Agmarknet) / कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार_\n\n`;
    out += `तुमचं गाव आणि प्रमाण सांगा, मी वाहतूक खर्च हिशोब करून नजीकची सर्वात फायदेशीर बाजार समिती सुचवेन.`;
    return out;
  }

  if (lang === "hi") {
    let out = `🌾 *मंडी भाव जानकारी व राज्यस्तरीय लाइव दर*\n\n`;
    out += `📌 *फसल:* ${cropLabel} (${crop.standardName})\n`;
    out += `📍 *पूछा गया स्थान:* ${displayDistrict}\n`;
    out += `ℹ️ *स्थिति:* आज ${displayDistrict} मंडी में सीधे आवक का डेटा दर्ज नहीं है।\n\n`;
    out += `📊 *${localizedState} की प्रमुख मंडियों के लाइव भाव:*\n`;
    for (const r of topRecords) {
      const mandi = getLocalizedLocationName(cleanMarketName(r.market), "hi");
      const dist = getLocalizedLocationName(r.district, "hi");
      out += `• *${mandi} (${dist}):* मॉडल ₹${r.modal_price} / क्विंटल (न्यूनतम ₹${r.min_price} - अधिकतम ₹${r.max_price})\n`;
    }
    out += `\n📅 *दिनांक:* ${arrivalDate}\n_डेटा स्रोत: एग्मार्कनेट (Agmarknet) / कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार_\n\n`;
    out += `अपना गांव और फसल की मात्रा बताएं, ताकि मैं ढुलाई खर्च जोड़कर सही मंडी बता सकूं।`;
    return out;
  }

  if (lang === "hinglish") {
    let out = `🌾 *Mandi Rate & State Update*\n\n`;
    out += `📌 *Fasal:* ${cropLabel} (${crop.standardName})\n`;
    out += `📍 *Requested Location:* ${displayDistrict}\n`;
    out += `ℹ️ *Status:* Aaj ${displayDistrict} mandi me direct arrivals record nahi hue hain.\n\n`;
    out += `📊 *${stateName} Mandi Live Rates:*\n`;
    for (const r of topRecords) {
      const mandi = cleanMarketName(r.market);
      out += `• *${mandi} (${r.district}):* Modal ₹${r.modal_price} / Qtl (Min ₹${r.min_price} - Max ₹${r.max_price})\n`;
    }
    out += `\n📅 *Date:* ${arrivalDate}\n_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._\n\n`;
    out += `Apna village aur quantity batayein, main transport cost calculate karke best mandi bata dunga.`;
    return out;
  }

  // Default: English
  let out = `🌾 *Mandi Price & Regional Market Rates*\n\n`;
  out += `📌 *Crop:* ${cropLabel} (${crop.standardName})\n`;
  out += `📍 *Requested Location:* ${displayDistrict}\n`;
  out += `ℹ️ *Market Status:* Direct arrivals for ${displayDistrict} are not reported today on Agmarknet.\n\n`;
  out += `📊 *Live Mandi Rates in ${stateName}:*\n`;
  for (const r of topRecords) {
    const mandi = cleanMarketName(r.market);
    out += `• *${mandi} (${r.district}):* Modal ₹${r.modal_price} / Qtl (Min ₹${r.min_price} - Max ₹${r.max_price})\n`;
  }
  out += `\n📅 *Date:* ${arrivalDate}\n_Source: Agmarknet / Ministry of Agriculture & Farmers Welfare, Govt of India._\n\n`;
  out += `Tell me your village name and quantity, and I can calculate which nearby market gives you the highest net return.`;
  return out;
}

/**
 * Handle price intent with robust multi-tier fallback hierarchy
 * @param {string} text - Farmer's input text
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} lang - Detected language
 * @param {Function} [fetchFn] - Optional mock fetcher for testing
 * @param {object} [contextOverrides] - Optional context overrides from session memory
 * @returns {Promise<string>}
 */
async function getMandiPriceResponse(text, lang, fetchFn = fetchOfficialMandiPrices, contextOverrides = {}) {
  const extracted = extractMandiEntities(text);
  const crop = extracted.crop || contextOverrides?.crop || null;
  const district = extracted.district || contextOverrides?.district || null;

  console.log(`[MandiPriceService] Entry | Text: "${text}" | Lang: ${lang}`);
  console.log(`[MandiPriceService] Resolved Entities: Crop=${crop?.standardName || "NONE"} | District=${district || "NONE"}`);

  // Case 1: Both crop and district identified
  if (crop && district) {
    const targetDistrict = district.trim();
    
    // Find metadata for location if mapped
    const matchedDistObj = DISTRICT_MAP.find(d => 
      d.standardName.toLowerCase() === targetDistrict.toLowerCase() || 
      d.aliases?.some(a => a.toLowerCase() === targetDistrict.toLowerCase())
    );
    const parentDistrict = matchedDistObj?.district;
    const targetState = matchedDistObj?.state || "Maharashtra";

    try {
      // Tier 1a: Try exact commodity + district filter
      console.log(`[MandiPriceService] Tier 1a: Fetching commodity=${crop.standardName}, district=${targetDistrict}`);
      let directRecords = await fetchFn({
        commodity: crop.standardName,
        district: targetDistrict
      });

      // Tier 1b: If 0 records, try exact commodity + market filter
      if (!directRecords || directRecords.length === 0) {
        console.log(`[MandiPriceService] Tier 1b: Fetching commodity=${crop.standardName}, market=${targetDistrict}`);
        directRecords = await fetchFn({
          commodity: crop.standardName,
          market: targetDistrict
        });
      }

      // Tier 1c: If 0 records and location has known parent district, try parent district
      if ((!directRecords || directRecords.length === 0) && parentDistrict && parentDistrict.toLowerCase() !== targetDistrict.toLowerCase()) {
        console.log(`[MandiPriceService] Tier 1c: Fetching commodity=${crop.standardName}, parentDistrict=${parentDistrict}`);
        directRecords = await fetchFn({
          commodity: crop.standardName,
          district: parentDistrict
        });
      }

      if (directRecords && directRecords.length > 0) {
        console.log(`[MandiPriceService] Tier 1 Success: Found ${directRecords.length} direct match records. Formatting direct response.`);
        return formatMandiPriceResponse({
          records: directRecords,
          crop,
          district: targetDistrict,
          lang,
          fallbackType: "direct",
          stateName: targetState
        });
      }

      // Tier 2: Try commodity in state with in-memory matching for market/district names
      console.log(`[MandiPriceService] Tier 2: Fetching commodity=${crop.standardName}, state=${targetState}`);
      const stateRecords = await fetchFn({
        commodity: crop.standardName,
        state: targetState
      });

      if (stateRecords && stateRecords.length > 0) {
        // In-memory filter: Check if any record matches the requested location in market or district field
        const targetLower = targetDistrict.toLowerCase();
        const matchedMarketRecords = stateRecords.filter(r => {
          const marketLower = (r.market || "").toLowerCase();
          const distLower = (r.district || "").toLowerCase();
          return marketLower.includes(targetLower) || distLower.includes(targetLower);
        });

        if (matchedMarketRecords.length > 0) {
          console.log(`[MandiPriceService] Tier 2 In-Memory Match: Found ${matchedMarketRecords.length} records. Formatting direct response.`);
          return formatMandiPriceResponse({
            records: matchedMarketRecords,
            crop,
            district: targetDistrict,
            lang,
            fallbackType: "direct",
            stateName: targetState
          });
        }

        // If location not directly reported in state, deliver state-level APMC fallback
        console.log(`[MandiPriceService] Tier 2 State Fallback: Returning ${stateRecords.length} state-level APMC records.`);
        return formatMandiPriceResponse({
          records: stateRecords,
          crop,
          district: targetDistrict,
          lang,
          fallbackType: "state",
          stateName: targetState
        });
      }

      // Tier 3: Try national records across all states for this commodity
      console.log(`[MandiPriceService] Tier 3: Fetching national commodity=${crop.standardName}`);
      const nationalRecords = await fetchFn({
        commodity: crop.standardName
      });

      if (nationalRecords && nationalRecords.length > 0) {
        console.log(`[MandiPriceService] Tier 3 National Fallback: Returning ${nationalRecords.length} national records.`);
        return formatMandiPriceResponse({
          records: nationalRecords,
          crop,
          district: targetDistrict,
          lang,
          fallbackType: "national",
          stateName: "All India"
        });
      }
    } catch (fetchErr) {
      console.error("[MandiPriceService] Execution error:", fetchErr.message || fetchErr);
    }

    // Tier 4: Honest Unavailable Response (No records anywhere)
    console.log(`[MandiPriceService] Tier 4: No records available. Formatting unavailable notice.`);
    return formatMandiPriceResponse({
      records: [],
      crop,
      district: targetDistrict,
      lang,
      fallbackType: "unavailable"
    });
  }

  // Case 2: Crop identified, but district/mandi is missing
  if (crop && !district) {
    const cropName = crop.displayName?.[lang] || crop.displayName?.en || crop.standardName;
    const askDistrictPrompts = {
      en: `🌾 *CropCash Mandi Price Desk*\n\nYou asked for *${cropName}* prices.\n\nPlease mention your *district or mandi name* (e.g., '${cropName} price in Nagpur' or 'Latur'). If you are planning to sell, you can also share your village and quantity!`,
      hi: `🌾 *क्रॉपकैश मंडी भाव सेवा*\n\nआपने *${cropName}* का भाव पूछा है।\n\nकृपया अपने *जिले या मंडी का नाम* बताएं (जैसे: '${cropName} भाव इंदौर' या 'नागपुर')। यदि फसल बेचनी है तो अपना गांव और मात्रा भी बता सकते हैं!`,
      mr: `🌾 *क्रॉपकॅश बाजारभाव कक्ष*\n\nआपण *${cropName}*चा बाजारभाव विचारला आहे.\n\nकृपया आपल्या *जिल्ह्याचे किंवा बाजार समितीचे नाव* सांगा (उदा. '${cropName} भाव लातूर' किंवा 'अकोला'). माल विकायचा असल्यास गाव आणि प्रमाणही सांगू शकता!`,
      hinglish: `🌾 *CropCash Mandi Rates*\n\nAapne *${cropName}* ka rate pucha hai.\n\nKripya apna *district ya mandi ka naam* batayein (Jaise: '${cropName} rate Latur' ya 'Indore'). Agar bechna hai toh gaon aur quantity bhi bata sakte hain!`
    };
    return askDistrictPrompts[lang] || askDistrictPrompts.en;
  }

  // Case 3: District identified, but crop is missing
  if (!crop && district) {
    const displayDistrict = getLocalizedLocationName(district, lang);
    const askCropPrompts = {
      en: `🌾 *CropCash Mandi Price Desk*\n\nYou mentioned *${displayDistrict}*.\n\nPlease specify which *crop or commodity* you want the price for (e.g. 'Soybean', 'Cotton', 'Wheat', 'Chana').`,
      hi: `🌾 *क्रॉपकैश मंडी भाव सेवा*\n\nआपने *${displayDistrict}* मंडी का नाम बताया है।\n\nकृपया बताएं कि आप किस *फसल* का भाव जानना चाहते हैं (जैसे: 'सोयाबीन', 'कपास', 'गेहूं', 'चना')?`,
      mr: `🌾 *क्रॉपकॅश बाजारभाव कक्ष*\n\nआपण *${displayDistrict}* बाजार समितीचा उल्लेख केला आहे.\n\nकृपया आपल्याला कोणत्या *पिकाचा* बाजारभाव पाहायचा आहे ते सांगा (उदा. 'सोयाबीन', 'कापूस', 'गहू', 'हरभरा')?`,
      hinglish: `🌾 *CropCash Mandi Desk*\n\nAapne *${displayDistrict}* mention kiya hai.\n\nKripya batayein aapko kis *crop/fasal* ka rate dekhna hai (Jaise: 'Soyabean', 'Kapas', 'Gehu', 'Chana')?`
    };
    return askCropPrompts[lang] || askCropPrompts.en;
  }

  // Case 4: General Mandi Inquiry (both crop and district missing)
  const generalMandiPrompts = {
    en: "🌾 *Mandi & Market Price Desk*\n\nPlease specify your *crop* and *district/mandi name* (e.g. 'Soybean price in Nagpur' or 'Wheat price in Indore').\n\nWe provide real-time mandi arrivals, modal prices, and minimum/maximum rates across APMC mandis.",
    hi: "🌾 *मंडी भाव एवं बाजार दर सेवा*\n\nकृपया अपनी *फसल* और *जिले/मंडी का नाम* बताएं (जैसे: 'इंदौर में गेहूं का भाव' या 'नागपुर में सोयाबीन का रेट')।\n\nहम आपको नजदीकी कृषि उपज मंडियों के न्यूनतम, अधिकतम और मॉडल भाव की सटीक जानकारी देंगे।",
    mr: "🌾 *बाजारभाव व कृषी उत्पन्न बाजार समिती (APMC) दर*\n\nकृपया आपल्या *पिकाचे नाव* आणि *जिल्हा/बाजार समिती* सांगा (उदा. 'लातूर बाजारभाव सोयाबीन' किंवा 'अकोला कापूस दर').\n\nआम्ही आपल्याला चालू आवक, किमान, कमाल आणि सरासरी बाजारभावाची माहिती देऊ.",
    hinglish: "🌾 *Mandi Bhav & Market Rates*\n\nKripya apni *fasal* aur *district/mandi ka naam* batayein (Jaise: 'Latur me soyabean rate' ya 'Indore me gehu bhav').\n\nHum aapko APMC mandi ke daily arrivals aur current model rates batayenge."
  };
  return generalMandiPrompts[lang] || generalMandiPrompts.en;
}

module.exports = {
  extractMandiEntities,
  fetchOfficialMandiPrices,
  formatMandiPriceResponse,
  getMandiPriceResponse,
  getLocalizedLocationName,
  cleanMarketName,
  LOCATION_DISPLAY_NAMES,
  CROP_MAP,
  DISTRICT_MAP,
  AGMARKNET_ENDPOINT,
  MANDI_API_CACHE,
};

