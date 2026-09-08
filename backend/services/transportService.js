/**
 * CropCash Local Transport Cost Service
 * Calculates estimated agricultural transport costs based on village origin,
 * destination mandi, distance, load quantity, and configurable freight rates.
 * Optimized for Buldhana district prototype (Chikhli, Khamgaon, Motala, Malkapur, Mehkar, etc.)
 */

// Configurable Transport Rate Parameters (Can be adjusted or configured via .env)
const TRANSPORT_CONFIG = {
  BASE_FIXED_CHARGE: 400,       // Base vehicle mobilization & mandi gate handling (₹)
  PER_QTL_PER_KM_RATE: 3.5,     // Freight rate per quintal per km (₹)
  MIN_TRIP_CHARGE: 500,         // Minimum trip charge for local short trips (₹)
  DISCLAIMER_LABEL: "Estimated transport cost"
};

// Known Road Distances Matrix (in Kilometers) for Prototype Scope
// Origin Village/Town -> { Destination Mandi: Distance in km }
const DISTANCE_MATRIX = {
  // Chikhli-side Villages
  "chikhli": {
    "chikhli": 4,
    "khamgaon": 45,
    "malkapur": 68,
    "mehkar": 52,
    "shegaon": 55,
    "buldhana": 26,
    "jalgaon jamod": 78,
    "nandura": 62,
    "akola": 95
  },
  "undri": {
    "chikhli": 18,
    "khamgaon": 35,
    "malkapur": 52,
    "mehkar": 62,
    "shegaon": 42,
    "buldhana": 38,
    "jalgaon jamod": 65,
    "nandura": 50,
    "akola": 85
  },
  "amdapur": {
    "chikhli": 15,
    "khamgaon": 32,
    "malkapur": 55,
    "mehkar": 48,
    "shegaon": 38,
    "buldhana": 35,
    "jalgaon jamod": 68,
    "nandura": 52,
    "akola": 82
  },
  "mera": {
    "chikhli": 12,
    "khamgaon": 48,
    "malkapur": 72,
    "mehkar": 42,
    "shegaon": 60,
    "buldhana": 34,
    "jalgaon jamod": 82,
    "nandura": 68,
    "akola": 98
  },
  "kavhala": {
    "chikhli": 8,
    "khamgaon": 42,
    "malkapur": 65,
    "mehkar": 56,
    "shegaon": 52,
    "buldhana": 28,
    "jalgaon jamod": 75,
    "nandura": 60,
    "akola": 92
  },
  "kolara": {
    "chikhli": 22,
    "khamgaon": 40,
    "malkapur": 62,
    "mehkar": 65,
    "shegaon": 48,
    "buldhana": 42,
    "jalgaon jamod": 70,
    "nandura": 58,
    "akola": 88
  },

  // Motala-side Villages
  "motala": {
    "khamgaon": 38,
    "malkapur": 28,
    "chikhli": 42,
    "buldhana": 24,
    "shegaon": 52,
    "nandura": 32,
    "jalgaon jamod": 58,
    "mehkar": 82,
    "akola": 92
  },
  "rohinkhed": {
    "khamgaon": 48,
    "malkapur": 18,
    "chikhli": 55,
    "buldhana": 38,
    "shegaon": 62,
    "nandura": 22,
    "jalgaon jamod": 48,
    "mehkar": 95,
    "akola": 102
  },
  "shelgaon": {
    "khamgaon": 32,
    "malkapur": 34,
    "chikhli": 36,
    "buldhana": 22,
    "shegaon": 45,
    "nandura": 35,
    "jalgaon jamod": 62,
    "mehkar": 78,
    "akola": 88
  },
  "kothali": {
    "khamgaon": 42,
    "malkapur": 22,
    "chikhli": 48,
    "buldhana": 32,
    "shegaon": 55,
    "nandura": 25,
    "jalgaon jamod": 52,
    "mehkar": 88,
    "akola": 96
  },
  "dhamangaon badhe": {
    "khamgaon": 30,
    "malkapur": 38,
    "chikhli": 40,
    "buldhana": 25,
    "shegaon": 42,
    "nandura": 38,
    "jalgaon jamod": 64,
    "mehkar": 80,
    "akola": 84
  },

  // Khamgaon-side & Mandi Centers
  "khamgaon": {
    "khamgaon": 3,
    "shegaon": 18,
    "malkapur": 42,
    "chikhli": 45,
    "nandura": 28,
    "jalgaon jamod": 48,
    "buldhana": 52,
    "mehkar": 75,
    "akola": 55
  },
  "shegaon": {
    "khamgaon": 18,
    "shegaon": 3,
    "malkapur": 52,
    "chikhli": 55,
    "nandura": 38,
    "jalgaon jamod": 42,
    "buldhana": 64,
    "mehkar": 85,
    "akola": 45
  },
  "malkapur": {
    "malkapur": 3,
    "khamgaon": 42,
    "nandura": 22,
    "motala": 28,
    "chikhli": 68,
    "shegaon": 52,
    "jalgaon jamod": 38,
    "buldhana": 45,
    "akola": 95
  },
  "mehkar": {
    "mehkar": 3,
    "chikhli": 52,
    "khamgaon": 75,
    "buldhana": 65,
    "shegaon": 85,
    "malkapur": 105,
    "akola": 105
  },
  "buldhana": {
    "buldhana": 3,
    "chikhli": 26,
    "motala": 24,
    "khamgaon": 52,
    "malkapur": 45,
    "mehkar": 65,
    "shegaon": 64,
    "akola": 100
  }
};

// Village & Town Aliases Map (for entity extraction in multiple languages)
const VILLAGE_MAP = [
  // Chikhli side
  { standardName: "Chikhli", key: "chikhli", aliases: ["chikhli", "चिखली", "चिखलीतून", "चिखलीला", "चिखलीत", "चिखलीहून", "chikhli village"] },
  { standardName: "Undri", key: "undri", aliases: ["undri", "उंड्री", "उंद्री", "उंड्रीतून", "उंड्रीहून", "undri village"] },
  { standardName: "Amdapur", key: "amdapur", aliases: ["amdapur", "आमडापूर", "आंबडापूर", "amdapur village"] },
  { standardName: "Mera", key: "mera", aliases: ["mera", "मेरा", "मेरा बुद्रुक", "mera bk"] },
  { standardName: "Kavhala", key: "kavhala", aliases: ["kavhala", "कव्हाळा", "कव्हाळा बु"] },
  { standardName: "Kolara", key: "kolara", aliases: ["kolara", "कोलारा"] },

  // Motala side
  { standardName: "Motala", key: "motala", aliases: ["motala", "मोताळा", "मोताळ्याहून", "मोताळा तालुका"] },
  { standardName: "Rohinkhed", key: "rohinkhed", aliases: ["rohinkhed", "रोहिणखेड", "रोहिणखेडा"] },
  { standardName: "Shelgaon", key: "shelgaon", aliases: ["shelgaon", "शेलगाव", "शेलगाव बाजार"] },
  { standardName: "Kothali", key: "kothali", aliases: ["kothali", "कोथळी"] },
  { standardName: "Dhamangaon Badhe", key: "dhamangaon badhe", aliases: ["dhamangaon badhe", "dhamangaon", "धामणगाव बढे", "धामणगाव"] },

  // Mandi Towns
  { standardName: "Khamgaon", key: "khamgaon", aliases: ["khamgaon", "खामगाव", "खामगावात", "खामगावला", "खामगावहून", "khamgaon town"] },
  { standardName: "Shegaon", key: "shegaon", aliases: ["shegaon", "शेगाव", "शेगावला"] },
  { standardName: "Malkapur", key: "malkapur", aliases: ["malkapur", "मलकापूर", "मलकापूरला"] },
  { standardName: "Mehkar", key: "mehkar", aliases: ["mehkar", "मेहकर", "मेहकरला"] },
  { standardName: "Buldhana", key: "buldhana", aliases: ["buldhana", "बुलढाणा", "बुलढाण्याहून"] }
];

/**
 * Escapes regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts quantity in quintals from farmer message
 * Supports: '20 quintal', '20 qtl', '20 क्विंटल', '२० क्विंटल', '50 bori', '2 ton', '2 tonnes', '25 quntal'
 * @param {string} text
 * @returns {number|null} Quantity in Quintals
 */
function extractQuantity(text) {
  if (!text || typeof text !== "string") return null;

  // Convert Devanagari numerals to standard digits (०-९ -> 0-9)
  const devanagariDigits = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };
  const normalizedText = text.replace(/[०-९]/g, d => devanagariDigits[d] || d);

  // Pattern 1: Quintals (Devanagari and Latin)
  const qtlRegex = /(\d+(?:\.\d+)?)\s*(?:quintals?\b|quintal\b|qtls?\b|quntals?\b|क्विंटल|क्विंटलचे|क्विंटलचा|कविंटल|क्वि\b)/i;
  const qtlMatch = normalizedText.match(qtlRegex);
  if (qtlMatch) {
    return parseFloat(qtlMatch[1]);
  }

  // Pattern 2: Tons (1 Ton = 10 Quintals)
  const tonRegex = /(\d+(?:\.\d+)?)\s*(?:tonnes?\b|tons?\b|ton\b|टन)/i;
  const tonMatch = normalizedText.match(tonRegex);
  if (tonMatch) {
    return parseFloat(tonMatch[1]) * 10;
  }

  // Pattern 3: Bags / Bori / पोती (Standard bag is ~0.5 Quintal / 50 kg)
  const bagRegex = /(\d+(?:\.\d+)?)\s*(?:bags?\b|bori\b|boris\b|बोरी|पोती|पोते|थैली)/i;
  const bagMatch = normalizedText.match(bagRegex);
  if (bagMatch) {
    return parseFloat(bagMatch[1]) * 0.5;
  }

  // Pattern 4: Standalone number before crop name or transport context (e.g., "I have 20 soybean", "20 khamgaon le jane ka")
  const looseRegex = /\b(\d+(?:\.\d+)?)\s*(?:soybean|soyabean|kapas|wheat|chana|gehu|सोयाबीन|कापूस|गहू|हरभरा|खामगाव|चिखली)/i;
  const looseMatch = normalizedText.match(looseRegex);
  if (looseMatch && parseFloat(looseMatch[1]) > 0 && parseFloat(looseMatch[1]) <= 1000) {
    return parseFloat(looseMatch[1]);
  }

  return null;
}

/**
 * Extracts farmer origin village/location from text
 * @param {string} text
 * @returns {{ standardName: string, key: string } | null}
 */
function extractFarmerVillage(text) {
  if (!text || typeof text !== "string") return null;
  const clean = text.toLowerCase();

  for (const village of VILLAGE_MAP) {
    for (const alias of village.aliases) {
      if (/[\u0900-\u097F]/.test(alias)) {
        if (clean.includes(alias)) {
          return { standardName: village.standardName, key: village.key };
        }
      } else {
        const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        if (regex.test(clean)) {
          return { standardName: village.standardName, key: village.key };
        }
      }
    }
  }

  return null;
}

/**
 * Get road distance in kilometers between village and destination mandi
 * @param {string} villageKey - Origin village key
 * @param {string} mandiKey - Destination mandi key
 * @returns {number|null} Distance in km
 */
function getDistanceKm(villageKey, mandiKey) {
  if (!villageKey || !mandiKey) return null;
  const vKey = villageKey.trim().toLowerCase();
  const mKey = mandiKey.trim().toLowerCase();

  if (DISTANCE_MATRIX[vKey] && DISTANCE_MATRIX[vKey][mKey] !== undefined) {
    return DISTANCE_MATRIX[vKey][mKey];
  }

  // Reverse lookup fallback
  if (DISTANCE_MATRIX[mKey] && DISTANCE_MATRIX[mKey][vKey] !== undefined) {
    return DISTANCE_MATRIX[mKey][vKey];
  }

  return null;
}

/**
 * Calculate estimated transport cost
 * Formula: Max(MIN_TRIP_CHARGE, BASE_FIXED_CHARGE + (Distance * RatePerQtlKm * Quantity))
 * @param {object} params
 * @param {number} params.distanceKm - Distance in km
 * @param {number} params.quantityQtl - Quantity in quintals
 * @param {object} [params.customConfig] - Optional override rates
 * @returns {{ estimatedCost: number, distanceKm: number, perQuintalCost: number, isEstimate: boolean }}
 */
function calculateTransportCost({ distanceKm, quantityQtl, customConfig = {} }) {
  const config = { ...TRANSPORT_CONFIG, ...customConfig };

  if (!distanceKm || distanceKm <= 0 || !quantityQtl || quantityQtl <= 0) {
    return {
      estimatedCost: 0,
      distanceKm: distanceKm || 0,
      perQuintalCost: 0,
      isEstimate: true
    };
  }

  // Variable freight: Distance (km) * Rate per Qtl/Km * Quantity (Qtl)
  const variableCost = distanceKm * config.PER_QTL_PER_KM_RATE * quantityQtl;
  const rawCost = config.BASE_FIXED_CHARGE + variableCost;
  const estimatedCost = Math.round(Math.max(config.MIN_TRIP_CHARGE, rawCost));
  const perQuintalCost = Math.round((estimatedCost / quantityQtl) * 10) / 10;

  return {
    estimatedCost,
    distanceKm,
    perQuintalCost,
    isEstimate: true
  };
}

module.exports = {
  extractQuantity,
  extractFarmerVillage,
  getDistanceKm,
  calculateTransportCost,
  TRANSPORT_CONFIG,
  DISTANCE_MATRIX,
  VILLAGE_MAP,
};
