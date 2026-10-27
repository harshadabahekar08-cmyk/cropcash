/**
 * CropCash Mandi Decision & Net-Return Service
 * Calculates:
 *   Gross Sale Value = Mandi Price × Quantity
 *   Estimated Net Return = Gross Sale Value - Estimated Transport Cost
 * Compares nearby candidate mandis (Khamgaon, Chikhli, Malkapur, Mehkar, etc.)
 * and recommends the best mandi maximizing farmer's net profit.
 */

const {
  extractMandiEntities,
  fetchOfficialMandiPrices,
  getLocalizedLocationName,
} = require("./mandiPriceService");

const {
  extractQuantity,
  extractFarmerVillage,
  getDistanceKm,
  calculateTransportCost,
  TRANSPORT_CONFIG
} = require("./transportService");

// Default candidate mandis around Buldhana district prototype
const DEFAULT_CANDIDATE_MANDIS = ["Khamgaon", "Chikhli", "Malkapur"];

/**
 * Checks if a message indicates transport / net-return decision intent
 * @param {string} text
 * @returns {boolean}
 */
function isTransportDecisionIntent(text) {
  if (!text || typeof text !== "string") return false;
  const clean = text.toLowerCase();

  const decisionKeywords = [
    "transport", "bhada", "bhadu", "gadi", "truck", "tempo", "trolley",
    "diesel", "kharch", "kharcha", "antar", "distance", "which mandi",
    "which market", "konta bajar", "konta mandi", "kahan bechu", "kaha bechna",
    "kaha bechu", "kahan bechna", "kuthe viku", "kothe viku", "viku", "bechna",
    "profit", "fayda", "nafa", "net return", "bechna chahiye", "nevu ka",
    "faida", "better mandi", "best mandi", "highest profit", "le jane ka",
    "mere paas", "majhyakade", "majhyajaval", "apne paas", "bechu", "bechna hai",
    "वाहतूक", "भाडे", "खर्च", "गाडी", "ट्रान्सपोर्ट", "अंतर", "नफा", "फायदा",
    "कोणती बाजार समिती", "कुठे विकू", "विकू", "नेऊ का", "कहाँ बेचूँ", "कहा बेचू", "कौन सी मंडी",
    "ज्यादा मुनाफा", "ढुलाई", "किराया", "भाड़ा", "बेचना है", "विकायचे आहे"
  ];

  for (const kw of decisionKeywords) {
    if (/[\u0900-\u097F]/.test(kw)) {
      if (clean.includes(kw)) return true;
    } else {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(clean)) return true;
    }
  }

  // Also if message has a quantity (e.g. "mere paas 20 quintal soybean hai")
  const hasQty = extractQuantity(text) !== null;
  if (hasQty) {
    return true;
  }

  return false;
}

/**
 * Handle transport & net return decision flow
 * @param {string} text - Farmer input text
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} lang - Detected language
 * @param {Function} [fetchFn] - Optional mock fetcher for testing
 * @param {object} [contextOverrides] - Optional context overrides from session memory
 * @returns {Promise<string>}
 */
async function getMandiDecisionResponse(text, lang, fetchFn = fetchOfficialMandiPrices, contextOverrides = {}) {
  const { crop: directCrop, district: directExplicitMandi } = extractMandiEntities(text);
  const directQuantity = extractQuantity(text);
  const directVillage = extractFarmerVillage(text);

  const crop = directCrop || contextOverrides?.crop || null;
  const explicitMandi = directExplicitMandi || contextOverrides?.district || null;
  const quantity = directQuantity !== null ? directQuantity : (contextOverrides?.quantity !== undefined ? contextOverrides.quantity : null);
  const village = directVillage || contextOverrides?.village || null;

  const cropName = crop?.displayName?.[lang] || crop?.displayName?.en || crop?.standardName || (lang === "mr" ? "सोयाबीन" : lang === "hi" ? "सोयाबीन" : "Soybean");
  const cropStandard = crop?.standardName || "Soyabean";

  // 1. Check if Quantity is missing
  if (quantity === null) {
    const qtyPrompts = {
      en: `🌾 *CropCash Transport & Net-Return Desk*\n\nTo calculate your *estimated transport cost* and compare *net profits* across nearby mandis, please tell us *how many quintals* you have.\n\n_Example: 'I have 20 quintal soybean from Chikhli'_`,
      hi: `🌾 *क्रॉपकैश ढुलाई खर्च एवं मंडी निर्णय*\n\nसटीक *ढुलाई खर्च* और *शुद्ध मुनाफा* जानने के लिए, कृपया बताएं कि आपके पास *कितने क्विंटल* फसल है।\n\n_उदाहरण: 'मेरे पास 20 क्विंटल सोयाबीन है, चिखली से कौन सी मंडी बेहतर है?'_`,
      mr: `🌾 *क्रॉपकॅश वाहतूक खर्च व बाजार समिती सल्ला*\n\nअचूक *वाहतूक खर्च* आणि *प्रत्यक्ष नफा* काढण्यासाठी, कृपया आपल्याकडे *किती क्विंटल* पीक आहे ते सांगा.\n\n_उदा. 'माझ्याकडे २० क्विंटल सोयाबीन आहे, चिखलीहून कोणती बाजार समिती फायदेशीर ठरेल?'_`,
      hinglish: `🌾 *CropCash Transport & Net Profit Desk*\n\nTransport cost aur net profit calculate karne ke liye, kripya batayein aapke paas *kitne quintal* fasal hai.\n\n_Example: '20 quintal soyabean Chikhli se bechna hai'_`
    };
    return qtyPrompts[lang] || qtyPrompts.en;
  }

  // 2. Check if Village/Origin Location is missing
  if (village === null) {
    const locPrompts = {
      en: `👍 Got it, you have *${quantity} quintals of ${cropName}*.\n\nPlease mention your *village or town name* (e.g., 'Chikhli', 'Motala', 'Undri') so we can calculate the road distance and transport cost to nearby mandis.`,
      hi: `👍 समझ गया, आपके पास *${quantity} क्विंटल ${cropName}* है।\n\nकृपया अपने *गांव या तहसील का नाम* बताएं (जैसे: 'चिखली', 'मोताळा', 'उंड्री') ताकि हम नजदीकी मंडियों की दूरी और ढुलाई खर्च निकाल सकें।`,
      mr: `👍 समजले, आपल्याकडे *${quantity} क्विंटल ${cropName}* आहे.\n\nकृपया आपल्या *गावाचे किंवा तालुक्याचे नाव* सांगा (उदा. 'चिखली', 'मोताळा', 'उंड्री') जेणेकरून आम्ही अंतर आणि वाहतूक खर्च मोजून योग्य बाजार समिती सुचवू शकू.`,
      hinglish: `👍 Samjh gaya, aapke paas *${quantity} quintal ${cropName}* hai.\n\nKripya apna *village ya location ka naam* batayein (Jaise: 'Chikhli', 'Motala', 'Undri') taaki hum distance aur transport cost calculate kar sakein.`
    };
    return locPrompts[lang] || locPrompts.en;
  }

  // 3. Determine Candidate Mandis to Compare
  let candidateMandis = [...DEFAULT_CANDIDATE_MANDIS];
  if (explicitMandi && !candidateMandis.map(m => m.toLowerCase()).includes(explicitMandi.toLowerCase())) {
    candidateMandis.unshift(explicitMandi);
  }
  // Adjust nearby mandis based on village region
  if (village.key === "motala" || village.key === "rohinkhed" || village.key === "shelgaon" || village.key === "kothali") {
    candidateMandis = ["Malkapur", "Khamgaon", "Buldhana"];
  }

  // 4. Calculate Net Return for Each Mandi
  let stateRecords = [];
  try {
    stateRecords = await fetchFn({ commodity: cropStandard, state: "Maharashtra" });
  } catch (err) {
    console.log("State records pre-fetch skipped:", err?.message || err);
  }

  const mandiResults = await Promise.all(
    candidateMandis.map(async (mandiName) => {
      const dist = getDistanceKm(village.key, mandiName);
      const transportCalc = dist !== null
        ? calculateTransportCost({ distanceKm: dist, quantityQtl: quantity })
        : null;

      let records = [];
      const mandiLower = mandiName.toLowerCase();

      // 1. Check pre-fetched state records first (avoids duplicate network calls & HTTP 429 rate limits)
      if (stateRecords && stateRecords.length > 0) {
        const matched = stateRecords.filter(r => 
          (r.market || "").toLowerCase().includes(mandiLower) ||
          (r.district || "").toLowerCase().includes(mandiLower)
        );
        if (matched.length > 0) {
          records = matched;
        }
      }

      // 2. Only fetch individual district if not found in pre-fetched state records
      if (records.length === 0) {
        try {
          records = await fetchFn({
            commodity: cropStandard,
            district: mandiName
          });
        } catch (fetchErr) {
          console.error(`Error fetching prices for candidate mandi ${mandiName}:`, fetchErr?.message || fetchErr);
          records = [];
        }
      }

      let price = null;
      let modalPrice = null;
      let grossValue = null;
      let netReturn = null;

      if (records && records.length > 0 && records[0].modal_price) {
        modalPrice = parseFloat(records[0].modal_price);
        if (!isNaN(modalPrice) && modalPrice > 0) {
          price = modalPrice;
          grossValue = Math.round(price * quantity);
          if (transportCalc) {
            netReturn = grossValue - transportCalc.estimatedCost;
          }
        }
      }

      return {
        mandiName,
        distanceKm: dist,
        transportCost: transportCalc ? transportCalc.estimatedCost : null,
        perQtlTransport: transportCalc ? transportCalc.perQuintalCost : null,
        price,
        grossValue,
        netReturn,
        hasLivePrice: price !== null
      };
    })
  );

  // 5. Determine Optimal Recommendation
  const validNetReturns = mandiResults.filter(r => r.netReturn !== null);
  let bestMandi = null;
  let runnerUp = null;

  if (validNetReturns.length > 0) {
    validNetReturns.sort((a, b) => b.netReturn - a.netReturn);
    bestMandi = validNetReturns[0];
    if (validNetReturns.length > 1) {
      runnerUp = validNetReturns[1];
    }
  }

  // 6. Format Multilingual WhatsApp Output
  return formatDecisionOutput({
    lang,
    cropName,
    quantity,
    villageName: village.standardName,
    mandiResults,
    bestMandi,
    runnerUp
  });
}

/**
 * Formats the final WhatsApp decision report in the farmer's language
 */
function formatDecisionOutput({ lang, cropName, quantity, villageName, mandiResults, bestMandi, runnerUp }) {
  const profitDiff = (bestMandi && runnerUp) ? (bestMandi.netReturn - runnerUp.netReturn) : 0;
  const displayVillage = getLocalizedLocationName(villageName, lang);

  if (lang === "mr") {
    let text = `🌾 *क्रॉपकॅश बाजार समिती व नफा शिफारस*\n\n`;
    text += `📌 *पीक:* ${cropName} (${quantity} क्विंटल) | 🏡 *ठिकाण:* ${displayVillage}\n\n`;
    text += `📊 *नजीकच्या बाजार समित्यांची तुलना:*\n`;

    for (const r of mandiResults) {
      const displayMandi = getLocalizedLocationName(r.mandiName, "mr");
      text += `\n📍 *${displayMandi} बाजार समिती* (${r.distanceKm !== null ? r.distanceKm + " किमी" : "अंतर उपलब्ध नाही"})\n`;
      if (r.hasLivePrice) {
        text += `• बाजारभाव: ₹${r.price} / क्विंटल\n`;
        const transportStr = r.transportCost !== null ? `₹${r.transportCost.toLocaleString("en-IN")} (~₹${r.perQtlTransport}/क्विंटल)` : "अंतर/वाहतूक उपलब्ध नाही";
        text += `• अंदाजित वाहतूक: ${transportStr}\n`;
        if (r.netReturn !== null) {
          text += `• *अंदाजित निव्वळ नफा (Net Return): ₹${r.netReturn.toLocaleString("en-IN")}*\n`;
        }
      } else {
        text += `• अंदाजित वाहतूक: ₹${r.transportCost ? r.transportCost.toLocaleString("en-IN") : "उपलब्ध नाही"}\n`;
        text += `• _(अधिकृत थेट दर आज उपलब्ध नाही)_\n`;
      }
    }

    if (bestMandi && profitDiff > 0) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "mr");
      text += `\n🏆 *शिफारस (Recommendation):*\n`;
      text += `वाहतूक खर्च वजा जाता, आपल्यासाठी *${displayBest}* बाजार समिती अधिक फायदेशीर दिसते. येथे अंदाजे *₹${profitDiff.toLocaleString("en-IN")} जास्त निव्वळ नफा* मिळू शकतो.\n`;
    } else if (bestMandi) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "mr");
      text += `\n🏆 *शिफारस (Recommendation):*\n`;
      text += `वाहतूक खर्च लक्षात घेता, आपल्यासाठी *${displayBest}* बाजार समिती योग्य निवड दिसते.\n`;
    }

    text += `\nआपल्याला स्थानिक वाहतूक किंवा गाडीच्या माहितीसाठी मदत हवी आहे का?`;
    return text;
  }

  if (lang === "hi") {
    let text = `🌾 *क्रॉपकैश सर्वोत्तम मंडी एवं मुनाफा सलाह*\n\n`;
    text += `📌 *फसल:* ${cropName} (${quantity} क्विंटल) | 🏡 *स्थान:* ${displayVillage}\n\n`;
    text += `📊 *नजदीकी मंडियों का तुलनात्मक विवरण:*\n`;

    for (const r of mandiResults) {
      const displayMandi = getLocalizedLocationName(r.mandiName, "hi");
      text += `\n📍 *${displayMandi} मंडी* (${r.distanceKm !== null ? r.distanceKm + " किमी" : "दूरी उपलब्ध नहीं"})\n`;
      if (r.hasLivePrice) {
        text += `• मंडी भाव: ₹${r.price} / क्विंटल\n`;
        const transportStr = r.transportCost !== null ? `₹${r.transportCost.toLocaleString("en-IN")} (~₹${r.perQtlTransport}/क्विंटल)` : "दूरी/ढुलाई उपलब्ध नहीं";
        text += `• अनुमानित ढुलाई: ${transportStr}\n`;
        if (r.netReturn !== null) {
          text += `• *अनुमानित शुद्ध मुनाफा (Net Return): ₹${r.netReturn.toLocaleString("en-IN")}*\n`;
        }
      } else {
        text += `• अनुमानित ढुलाई: ₹${r.transportCost ? r.transportCost.toLocaleString("en-IN") : "उपलब्ध नहीं"}\n`;
        text += `• _(आधिकारिक लाइव भाव आज उपलब्ध नहीं)_\n`;
      }
    }

    if (bestMandi && profitDiff > 0) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "hi");
      text += `\n🏆 *सलाह (Recommendation):*\n`;
      text += `ढुलाई खर्च घटाने के बाद, आपके लिए *${displayBest}* मंडी सबसे बेहतर विकल्प है। यहाँ लगभग *₹${profitDiff.toLocaleString("en-IN")} अधिक शुद्ध मुनाफा* मिलने की संभावना है।\n`;
    } else if (bestMandi) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "hi");
      text += `\n🏆 *सलाह (Recommendation):*\n`;
      text += `ढुलाई खर्च और भाव के आधार पर *${displayBest}* मंडी उपयुक्त दिखती है।\n`;
    }

    text += `\nक्या आपको लोकल ट्रांसपोर्ट या वाहन व्यवस्था में कोई मदद चाहिए?`;
    return text;
  }

  if (lang === "hinglish") {
    let text = `🌾 *CropCash Mandi Decision & Net Profit*\n\n`;
    text += `📌 *Fasal:* ${cropName} (${quantity} Quintal) | 🏡 *Location:* ${displayVillage}\n\n`;
    text += `📊 *Nearby Mandi Comparison:*\n`;

    for (const r of mandiResults) {
      const displayMandi = getLocalizedLocationName(r.mandiName, "hinglish");
      text += `\n📍 *${displayMandi} Mandi* (${r.distanceKm !== null ? r.distanceKm + " km" : "Distance N/A"})\n`;
      if (r.hasLivePrice) {
        text += `• Market Rate: ₹${r.price} / Quintal\n`;
        const transportStr = r.transportCost !== null ? `₹${r.transportCost.toLocaleString("en-IN")} (~₹${r.perQtlTransport}/qtl)` : "Distance/Transport N/A";
        text += `• Est. Transport: ${transportStr}\n`;
        if (r.netReturn !== null) {
          text += `• *Estimated Net Return: ₹${r.netReturn.toLocaleString("en-IN")}*\n`;
        }
      } else {
        text += `• Est. Transport: ₹${r.transportCost ? r.transportCost.toLocaleString("en-IN") : "N/A"}\n`;
        text += `• _(Official live price not available today)_\n`;
      }
    }

    if (bestMandi && profitDiff > 0) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "hinglish");
      text += `\n🏆 *Recommendation:*\n`;
      text += `Transport cost minus karne ke baad, aapke liye *${displayBest}* mandi better choice hai. Yahan lagbhag *₹${profitDiff.toLocaleString("en-IN")} zyada net profit* mil sakta hai.\n`;
    } else if (bestMandi) {
      const displayBest = getLocalizedLocationName(bestMandi.mandiName, "hinglish");
      text += `\n🏆 *Recommendation:*\n`;
      text += `Transport cost aur rates ke hisaab se *${displayBest}* mandi best option dikhti hai.\n`;
    }

    text += `\nKya aapko local transport arrange karne me madad chahiye?`;
    return text;
  }

  // Default: English
  let text = `🌾 *CropCash Mandi Decision & Net Return*\n\n`;
  text += `📌 *Crop:* ${cropName} (${quantity} Quintals) | 🏡 *Location:* ${displayVillage}\n\n`;
  text += `📊 *Nearby Mandi Comparison:*\n`;

  for (const r of mandiResults) {
    const displayMandi = getLocalizedLocationName(r.mandiName, "en");
    text += `\n📍 *${displayMandi} Mandi* (${r.distanceKm !== null ? r.distanceKm + " km" : "Distance N/A"})\n`;
    if (r.hasLivePrice) {
      text += `• Market Rate: ₹${r.price} / Quintal\n`;
      const transportStr = r.transportCost !== null ? `₹${r.transportCost.toLocaleString("en-IN")} (~₹${r.perQtlTransport}/qtl)` : "Distance/Transport N/A";
      text += `• Est. Transport: ${transportStr}\n`;
      if (r.netReturn !== null) {
        text += `• *Estimated Net Return: ₹${r.netReturn.toLocaleString("en-IN")}*\n`;
      }
    } else {
      text += `• Est. Transport: ₹${r.transportCost ? r.transportCost.toLocaleString("en-IN") : "N/A"}\n`;
      text += `• _(Official live price not available today)_\n`;
    }
  }

  if (bestMandi && profitDiff > 0) {
    const displayBest = getLocalizedLocationName(bestMandi.mandiName, "en");
    text += `\n🏆 *Recommendation:*\n`;
    text += `After deducting transportation, *${displayBest}* yields the highest estimated net return (~*₹${profitDiff.toLocaleString("en-IN")} more net profit* than alternatives).\n`;
  } else if (bestMandi) {
    const displayBest = getLocalizedLocationName(bestMandi.mandiName, "en");
    text += `\n🏆 *Recommendation:*\n`;
    text += `Based on estimated transportation and current rates, *${displayBest}* appears optimal.\n`;
  }

  text += `\nWould you like help with local transport arrangements?`;
  return text;
}

module.exports = {
  getMandiDecisionResponse,
  isTransportDecisionIntent,
  DEFAULT_CANDIDATE_MANDIS,
};
