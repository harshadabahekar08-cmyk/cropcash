/**
 * CropCash Language Detection Service
 * Detects farmer message language:
 * - 'mr': Marathi (Devanagari script with Marathi specific markers/words)
 * - 'hi': Hindi (Devanagari script with Hindi specific markers/words)
 * - 'hinglish': Mixed Hindi-English written in Latin script
 * - 'en': English (default for standard Latin script)
 */

// Marathi-exclusive characters / phonemes in Unicode Devanagari
const MARATHI_CHARS_REGEX = /[\u0933\u0931\u0934]/; // ळ (Lla), ऱ (Rra), ऴ

// Distinctive Marathi words / verbal markers (in Devanagari)
const MARATHI_WORDS = new Set([
  "आहे", "आहेत", "नाही", "नाहीत", "नमस्कार", "शेतकरी", "पीक", "पिके",
  "बाजारभाव", "बाजार", "भाव", "खत", "खते", "पाणी", "माहिती", "सांगा",
  "करा", "करावे", "कसे", "काय", "किती", "मला", "माझे", "माझ्या", "माझा",
  "आम्ही", "करतो", "झाले", "झाली", "पाहिजे", "कधी", "कसा", "कोणते",
  "कोणता", "बियाणे", "हवामान", "पाऊस", "कापूस", "सोयाबीन", "तूर", "ऊस",
  "कांदा", "रोग", "कीड", "फवारणी", "अनुदान", "कर्ज", "योजना", "मदत",
  "लातूर", "चिखली", "खामगाव", "बुलढाणा", "अकोला", "नागपूर", "पुणे",
  "नाशिक", "सातारा", "सांगली", "सोलापूर", "कोल्हापूर", "जळगाव", "अहमदनगर",
  "वाशीम", "यवतमाळ", "हिंगोली", "परभणी", "नांदेड", "बीड", "उस्मानाबाद",
  "धाराशिव", "संभाजीनगर", "मोताळा", "शेगाव", "मलकापूर", "मेहकर", "नांदुरा",
  "२०", "क्विंटल", "दर"
]);

// Distinctive Hindi words / verbal markers (in Devanagari)
const HINDI_WORDS = new Set([
  "है", "हैं", "नहीं", "नमस्ते", "नमस्कार", "किसान", "फसल", "फसलें",
  "मंडी", "भाव", "दाम", "खाद", "पानी", "जानकारी", "बताओ", "बताइए",
  "कैसे", "क्या", "कितना", "कितने", "मुझे", "मेरा", "मेरी", "मेरे",
  "हम", "करता", "करते", "करती", "होगा", "होगी", "चाहिए", "कब", "कैसा",
  "कौनसा", "कौनसी", "बीज", "मौसम", "बारिश", "गेहूं", "धान", "चना",
  "कपास", "सोयाबीन", "गन्ना", "प्याज", "बीमारी", "कीड़े", "छिड़काव",
  "अनुदान", "ऋण", "कर्ज", "योजना", "मदद",
  "इंदौर", "भोपाल", "उज्जैन", "जबलपुर", "ग्वालियर", "जयपुर", "कोटा",
  "कानपुर", "लखनऊ", "आगरा", "प्रयागराज", "बनारस", "वाराणसी"
]);

// Distinctive Hinglish words & Hindi functional particles in Latin script
const HINGLISH_STRONG_WORDS = new Set([
  "namaste", "pranam", "kisan", "fasal", "mandi", "bhav", "daam",
  "khad", "pani", "madad", "batao", "bataiye", "kaisa", "kaise", "kaisi",
  "kitna", "kitne", "kitni", "mera", "meri", "mere", "mujhe", "chahiye",
  "krishi", "kheti", "gehu", "gehun", "dhan", "chana", "pyaj", "tamatar",
  "aalu", "soya", "soyabean", "soybean", "kapas", "ganna", "rog", "bimari", "keeda",
  "keede", "dawai", "upchar", "chidkaw", "fawarni", "yojana", "yojna", "karj", "rin",
  "kcc", "kab", "kya", "kyu", "kyun", "kaunsa", "hoga", "hogi", "hai",
  "hain", "nahi", "nahin", "theek", "shuru", "karo", "kare", "bhejo",
  "shetkari", "bajarbhav", "pik", "ka", "ki", "ke", "me", "mein", "se", "ko", "par", "pe",
  "aur", "bhi", "lag", "gaya", "gayi", "aaj", "kaha", "kahan", "bechu", "bechna",
  "paas", "hoon", "aap", "gaon", "gaav", "kuthe", "viku", "bhada", "bhadu",
  "sarkari", "subsidy", "subsidies", "anudan", "mahadbt", "dbt", "kisan"
]);

// Standard English words / functional markers
const ENGLISH_WORDS = new Set([
  "the", "is", "are", "am", "what", "where", "when", "which", "who", "how",
  "why", "do", "does", "did", "have", "has", "had", "can", "could", "will",
  "would", "should", "please", "tell", "give", "check", "apply", "today",
  "yesterday", "tomorrow", "price", "market", "fertilizer", "disease", "spray",
  "weather", "farmer", "agriculture", "status", "about", "from", "with",
  "for", "and", "you", "your", "my", "our", "their", "hello", "help"
]);

/**
 * Detect language of incoming text
 * @param {string} text 
 * @returns {'en' | 'hi' | 'mr' | 'hinglish'}
 */
function detectLanguage(text) {
  if (!text || typeof text !== "string") {
    return "en";
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return "en";
  }

  // Check for Devanagari script presence (\u0900 to \u097F)
  const devanagariMatches = cleanText.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;
  const isDevanagari = devanagariCount > 0 && devanagariCount >= cleanText.length * 0.2;

  if (isDevanagari) {
    // 1. Check for Marathi-exclusive characters (ळ, ऱ)
    if (MARATHI_CHARS_REGEX.test(cleanText)) {
      return "mr";
    }

    // 2. Tokenize Devanagari words and compare Marathi vs Hindi markers
    const words = cleanText.split(/[\s,।?!;:"'()\[\]{}]+/).filter(Boolean);
    let marathiScore = 0;
    let hindiScore = 0;

    for (const word of words) {
      if (MARATHI_WORDS.has(word)) {
        marathiScore += 2;
      }
      if (HINDI_WORDS.has(word)) {
        hindiScore += 2;
      }
    }

    if (marathiScore > hindiScore) {
      return "mr";
    }
    if (hindiScore > marathiScore) {
      return "hi";
    }

    // Default Devanagari fallback: Hindi
    return "hi";
  }

  // Latin Script: Differentiate Hinglish vs English
  const latinTokens = cleanText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let hinglishScore = 0;
  let englishScore = 0;

  for (const token of latinTokens) {
    if (HINGLISH_STRONG_WORDS.has(token)) {
      hinglishScore++;
    }
    if (ENGLISH_WORDS.has(token)) {
      englishScore++;
    }
  }

  // If text contains strong Hinglish markers and outscores English
  if (hinglishScore >= 2 && hinglishScore >= englishScore * 0.5) {
    return "hinglish";
  }
  if (hinglishScore === 1 && englishScore === 0) {
    return "hinglish";
  }

  return "en";
}

module.exports = {
  detectLanguage,
};
