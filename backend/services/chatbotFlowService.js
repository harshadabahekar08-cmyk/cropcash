/**
 * CropCash Interactive Multilingual Chatbot Flow Service
 * Provides WhatsApp Cloud API Interactive Message templates (Lists & Buttons),
 * natural multi-turn conversation step management, and multilingual dialogs
 * in English, Hindi, Marathi, and Hinglish.
 */

const LANGUAGES = {
  en: { code: "en", name: "English", nativeName: "English" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  mr: { code: "mr", name: "Marathi", nativeName: "मराठी" },
  hinglish: { code: "hinglish", name: "Hinglish", nativeName: "Hinglish" }
};

const GREETING_TEXTS = {
  en: "Hello! Welcome to CropCash 🌾\nHow can I help you today?\nPlease select your preferred language.",
  hi: "नमस्ते! CropCash में आपका स्वागत है 🌾\nमैं आपकी क्या मदद कर सकता हूँ?\nकृपया अपनी भाषा चुनें।",
  mr: "नमस्कार! CropCash मध्ये आपले स्वागत आहे 🌾\nमी आपली काय मदत करू शकतो?\nकृपया आपली भाषा निवडा.",
  hinglish: "Namaste! CropCash mein aapka swagat hai 🌾\nMain aapki kya madad kar sakta hoon?\nApni language select kijiye."
};

/**
 * WhatsApp Cloud API Interactive List Message for Language Selection
 * @param {'en'|'hi'|'mr'|'hinglish'} [lang='en']
 * @returns {object} Interactive list payload
 */
function getLanguageSelectionInteractive(lang = "en") {
  const buttonLabels = {
    en: "Select Language",
    hi: "भाषा चुनें",
    mr: "भाषा निवडा",
    hinglish: "Select Language"
  };

  return {
    type: "list",
    header: {
      type: "text",
      text: "CropCash 🌾"
    },
    body: {
      text: GREETING_TEXTS[lang] || GREETING_TEXTS.en
    },
    footer: {
      text: "Digital Mandi Assistant"
    },
    action: {
      button: buttonLabels[lang] || "Select Language",
      sections: [
        {
          title: "Select Language / भाषा",
          rows: [
            { id: "lang_en", title: "English", description: "Use English" },
            { id: "lang_hi", title: "हिंदी", description: "हिंदी में बात करें" },
            { id: "lang_mr", title: "मराठी", description: "मराठीत संवाद साधा" },
            { id: "lang_hinglish", title: "Hinglish", description: "Hinglish me baat karein" }
          ]
        }
      ]
    }
  };
}

const MENU_TEXTS = {
  en: {
    body: "How can I help you today?",
    button: "View Options",
    section: "CropCash Services",
    rows: [
      { id: "menu_mandi_prices", title: "Check Mandi Prices", description: "Live daily APMC rates" },
      { id: "menu_best_mandi", title: "Find Best Mandi", description: "Compare mandis for highest profit" },
      { id: "menu_transport", title: "Calculate Transport", description: "Transport cost & net return" },
      { id: "menu_schemes", title: "Government Schemes", description: "PM-Kisan, MahaDBT, PMFBY" },
      { id: "menu_trend", title: "Crop Price Trend", description: "Market outlook & price forecast" }
    ]
  },
  hi: {
    body: "मैं आपकी क्या मदद कर सकता हूँ?",
    button: "विकल्प देखें",
    section: "क्रॉपकैश सेवाएं",
    rows: [
      { id: "menu_mandi_prices", title: "मंडी भाव देखें", description: "दैनिक लाइव एपीएमसी भाव" },
      { id: "menu_best_mandi", title: "सबसे सही मंडी चुनें", description: "अधिकतम मुनाफे वाली मंडी तुलना" },
      { id: "menu_transport", title: "ढुलाई खर्च और नफा", description: "ट्रांसपोर्ट खर्च और शुद्ध मुनाफा" },
      { id: "menu_schemes", title: "सरकारी योजनाएं", description: "पीएम किसान, महाडीबीटी, फसल बीमा" },
      { id: "menu_trend", title: "भाव रुझान व अनुमान", description: "बाजार में तेजी-मंदी का पूर्वानुमान" }
    ]
  },
  mr: {
    body: "मी आपली काय मदत करू शकतो?",
    button: "पर्याय निवडा",
    section: "क्रॉपकॅश सेवा",
    rows: [
      { id: "menu_mandi_prices", title: "बाजारभाव तपासा", description: "थेट दैनंदिन APMC बाजारभाव" },
      { id: "menu_best_mandi", title: "सर्वात फायदेशीर मंडी", description: "जास्तीत जास्त नफा देणारी बाजार समिती" },
      { id: "menu_transport", title: "वाहतूक खर्च व नफा", description: "भाडे खर्च व निव्वळ नफा हिशोब" },
      { id: "menu_schemes", title: "शासकीय योजना", description: "पीएम-किसान, महाडीबीटी, पीक विमा" },
      { id: "menu_trend", title: "बाजारभाव कल व अंदाज", description: "दरातील तेजी-मंदीचा अंदाज" }
    ]
  },
  hinglish: {
    body: "Main aapki kya madad kar sakta hoon?",
    button: "Options Dekhein",
    section: "CropCash Services",
    rows: [
      { id: "menu_mandi_prices", title: "Check Mandi Prices", description: "Daily live APMC mandi rates" },
      { id: "menu_best_mandi", title: "Find Best Mandi", description: "Highest profit wali mandi compare" },
      { id: "menu_transport", title: "Calculate Transport", description: "Freight cost & net return calculation" },
      { id: "menu_schemes", title: "Government Schemes", description: "PM-Kisan, MahaDBT, PMFBY details" },
      { id: "menu_trend", title: "Price Trend Forecast", description: "Market outlook aur bhav tezi-mandi" }
    ]
  }
};

/**
 * WhatsApp Cloud API Interactive List Message for Main Menu
 * @param {'en'|'hi'|'mr'|'hinglish'} [lang='en']
 * @returns {object} Interactive list payload
 */
function getMainMenuInteractive(lang = "en") {
  const m = MENU_TEXTS[lang] || MENU_TEXTS.en;
  return {
    type: "list",
    header: {
      type: "text",
      text: "CropCash 🌾"
    },
    body: {
      text: m.body
    },
    footer: {
      text: "Select a service below"
    },
    action: {
      button: m.button,
      sections: [
        {
          title: m.section,
          rows: m.rows
        }
      ]
    }
  };
}

const AFTER_REQUEST_TEXTS = {
  en: "Thank you for using CropCash! 🌾\nI hope this information helps you make a better selling decision.\nWould you like help with anything else?",
  hi: "CropCash का उपयोग करने के लिए धन्यवाद! 🌾\nहमें उम्मीद है कि यह जानकारी आपके लिए उपयोगी होगी।\nक्या मैं आपकी किसी और चीज़ में मदद कर सकता हूँ?",
  mr: "CropCash वापरल्याबद्दल धन्यवाद! 🌾\nही माहिती आपल्यासाठी उपयोगी ठरेल अशी आशा आहे.\nआपल्याला आणखी काही मदत हवी आहे का?",
  hinglish: "CropCash use karne ke liye dhanyavaad! 🌾\nUmeed hai ye information aapke kaam aayegi.\nKya main aapki kisi aur cheez mein madad kar sakta hoon?"
};

const AFTER_REQUEST_BUTTONS = {
  en: {
    menu: "Main Menu",
    another: "Ask Another",
    end: "End Chat"
  },
  hi: {
    menu: "मुख्य मेनू",
    another: "अन्य प्रश्न",
    end: "बातचीत समाप्त"
  },
  mr: {
    menu: "मुख्य मेनू",
    another: "दुसरा प्रश्न",
    end: "संवाद संपवा"
  },
  hinglish: {
    menu: "Main Menu",
    another: "Ask Another",
    end: "End Chat"
  }
};

/**
 * WhatsApp Cloud API Interactive Button Message (Follow-up after completed request)
 * @param {'en'|'hi'|'mr'|'hinglish'} [lang='en']
 * @returns {object} Interactive button payload
 */
function getAfterRequestInteractive(lang = "en") {
  const bodyText = AFTER_REQUEST_TEXTS[lang] || AFTER_REQUEST_TEXTS.en;
  const btn = AFTER_REQUEST_BUTTONS[lang] || AFTER_REQUEST_BUTTONS.en;

  return {
    type: "button",
    body: {
      text: bodyText
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: { id: "btn_main_menu", title: btn.menu }
        },
        {
          type: "reply",
          reply: { id: "btn_ask_another", title: btn.another }
        },
        {
          type: "reply",
          reply: { id: "btn_end_chat", title: btn.end }
        }
      ]
    }
  };
}

/**
 * Interactive list message for Government Schemes
 * @param {'en'|'hi'|'mr'|'hinglish'} [lang='en']
 * @returns {object} Interactive list payload
 */
function getSchemesInteractive(lang = "en") {
  const bodies = {
    en: "🏛️ *Key Farmer Government Schemes*\n\nPlease select a scheme below for full eligibility, benefits, and official portal links:",
    hi: "🏛️ *प्रमुख किसान सरकारी योजनाएं*\n\nपात्रता, लाभ और आधिकारिक पोर्टल लिंक देखने के लिए कृपया योजना चुनें:",
    mr: "🏛️ *प्रमुख शेतकरी शासकीय योजना*\n\nपात्रता, लाभ आणि अधिकृत पोर्टल माहितीसाठी कृपया खालील योजना निवडा:",
    hinglish: "🏛️ *Kisan Sarkari Yojana Details*\n\nEligibility, benefits aur official portal links ke liye scheme select karein:"
  };

  const buttonLabels = {
    en: "Select Scheme",
    hi: "योजना चुनें",
    mr: "योजना निवडा",
    hinglish: "Select Scheme"
  };

  const rows = [
    { id: "scheme_pm_kisan", title: "PM-Kisan Samman Nidhi", description: "₹6,000/yr direct income via DBT" },
    { id: "scheme_mahadbt", title: "MahaDBT Farmer Portal", description: "Tractor, drip irrigation subsidy" },
    { id: "scheme_namo", title: "Namo Shetkari Yojana", description: "Additional ₹6,000/yr state support" },
    { id: "scheme_pmfby", title: "PM Fasal Bima (PMFBY)", description: "Crop damage & calamity insurance" },
    { id: "scheme_kcc", title: "Kisan Credit Card (KCC)", description: "Concessional crop loans @ 4%" }
  ];

  return {
    type: "list",
    header: {
      type: "text",
      text: "Government Schemes 🏛️"
    },
    body: {
      text: bodies[lang] || bodies.en
    },
    action: {
      button: buttonLabels[lang] || "Select Scheme",
      sections: [
        {
          title: "Top Farmer Schemes",
          rows
        }
      ]
    }
  };
}

const FEATURE_QUESTIONS = {
  best_mandi: {
    ask_crop: {
      en: "🌾 Which crop do you want to sell?\n\n_Example: Soybean, Cotton, Wheat, Onion, Gram_",
      hi: "🌾 आप कौन सी फसल बेचना चाहते हैं?\n\n_उदाहरण: सोयाबीन, कपास, गेहूं, प्याज, चना_",
      mr: "🌾 आपल्याला कोणते पीक विकायचे आहे?\n\n_उदा: सोयाबीन, कापूस, गहू, कांदा, हरभरा_",
      hinglish: "🌾 Aap kaunsi fasal bechna chahte hain?\n\n_Example: Soybean, Cotton, Gehu, Onion, Chana_"
    },
    ask_quantity: {
      en: "⚖️ How much quantity do you have?\n\n_Example: 20 quintals_",
      hi: "⚖️ आपके पास कितनी मात्रा है?\n\n_उदाहरण: 20 क्विंटल_",
      mr: "⚖️ आपल्याकडे किती क्विंटल माल आहे?\n\n_उदा: २० क्विंटल_",
      hinglish: "⚖️ Aapke paas kitni quantity hai?\n\n_Example: 20 quintals_"
    },
    ask_location: {
      en: "📍 What is your village, town, or location?\n\n_Example: Chikhli, Buldhana, Nagpur, Latur_",
      hi: "📍 आपका गांव, कस्बा या स्थान कौन सा है?\n\n_उदाहरण: चिखली, बुलढाणा, नागपुर, लातूर_",
      mr: "📍 आपले गाव किंवा तालुका कोणता आहे?\n\n_उदा: चिखली, बुलढाणा, नागपूर, लातूर_",
      hinglish: "📍 Aapka village ya location kaunsa hai?\n\n_Example: Chikhli, Buldhana, Nagpur, Latur_"
    }
  },
  mandi_prices: {
    ask_crop: {
      en: "🌾 Which crop's mandi price would you like to check?\n\n_Example: Soybean, Cotton, Wheat, Gram, Onion_",
      hi: "🌾 आप किस फसल का मंडी भाव जानना चाहते हैं?\n\n_उदाहरण: सोयाबीन, कपास, गेहूं, चना, प्याज_",
      mr: "🌾 आपल्याला कोणत्या पिकाचा बाजारभाव पाहायचा आहे?\n\n_उदा: सोयाबीन, कापूस, गहू, हरभरा, कांदा_",
      hinglish: "🌾 Aap kis fasal ka mandi rate dekhna chahte hain?\n\n_Example: Soybean, Cotton, Gehu, Chana_"
    },
    ask_location: {
      en: "📍 Which market, taluka, or district?\n\n_Example: Nagpur, Latur, Buldhana, Akola, Amravati_",
      hi: "📍 कौन सा बाजार, तहसील या जिला?\n\n_उदाहरण: नागपुर, लातूर, बुलढाणा, अकोला, अमरावती_",
      mr: "📍 कोणती बाजार समिती, तालुका किंवा जिल्हा?\n\n_उदा: नागपूर, लातूर, बुलढाणा, अकोला, अमरावती_",
      hinglish: "📍 Kaunsi mandi, taluka ya district?\n\n_Example: Nagpur, Latur, Buldhana, Akola_"
    }
  },
  transport: {
    ask_crop: {
      en: "🌾 Which crop are you transporting?\n\n_Example: Soybean, Cotton, Wheat_",
      hi: "🌾 आप किस फसल की ढुलाई करना चाहते हैं?\n\n_उदाहरण: सोयाबीन, कपास, गेहूं_",
      mr: "🌾 आपण कोणत्या पिकाची वाहतूक करणार आहात?\n\n_उदा: सोयाबीन, कापूस, गहू_",
      hinglish: "🌾 Aap kis fasal ka transport calculate karna chahte hain?\n\n_Example: Soybean, Cotton, Gehu_"
    },
    ask_quantity: {
      en: "⚖️ How many quintals do you have to transport?\n\n_Example: 20 quintals_",
      hi: "⚖️ आपके पास ढुलाई के लिए कितना क्विंटल माल है?\n\n_उदाहरण: 20 क्विंटल_",
      mr: "⚖️ आपल्याकडे वाहतुकीसाठी किती क्विंटल माल आहे?\n\n_उदा: २० क्विंटल_",
      hinglish: "⚖️ Kitne quintals ka transport calculate karna hai?\n\n_Example: 20 quintals_"
    },
    ask_location: {
      en: "📍 What is your departure village or town?\n\n_Example: Chikhli, Mehkar, Buldhana_",
      hi: "📍 आपका प्रस्थान गांव या कस्बा कौन सा है?\n\n_उदाहरण: चिखली, मेहकर, बुलढाणा_",
      mr: "📍 आपले निघण्याचे गाव किंवा तालुका कोणता आहे?\n\n_उदा: चिखली, मेहकर, बुलढाणा_",
      hinglish: "📍 Aapka starting village ya town kaunsa hai?\n\n_Example: Chikhli, Mehkar, Buldhana_"
    }
  },
  trend: {
    ask_crop: {
      en: "📈 Which crop price trend and market outlook would you like to check?\n\n_Example: Soybean, Cotton, Wheat, Tur_",
      hi: "📈 आप किस फसल के बाजार भाव का रुझान और अनुमान देखना चाहते हैं?\n\n_उदाहरण: सोयाबीन, कपास, गेहूं, तुअर_",
      mr: "📈 आपल्याला कोणत्या पिकाच्या बाजारभावाचा कल व अंदाज पाहायचा आहे?\n\n_उदा: सोयाबीन, कापूस, गहू, तूर_",
      hinglish: "📈 Aap kis crop ka price trend aur market outlook dekhna chahte hain?\n\n_Example: Soybean, Cotton, Gehu, Tur_"
    }
  }
};

const GOODBYE_TEXTS = {
  en: "🌾 *Thank you for chatting with CropCash!*\n\nWishing you a bountiful harvest and maximum profits for your produce.\n\nYou can send *'Hi'* anytime you need help again. Have a great day!",
  hi: "🌾 *CropCash के साथ बातचीत करने के लिए धन्यवाद!*\n\nआपकी फसल अच्छी हो और आपको उपज का सर्वश्रेष्ठ भाव मिले।\n\nजब भी सहायता चाहिए हो, बस *'Hi'* लिखकर भेजें। आपका दिन शुभ हो!",
  mr: "🌾 *CropCash शी संवाद साधल्याबद्दल धन्यवाद!*\n\nआपले पीक उत्तम येवो आणि आपल्या शेतीमालाला जास्तीत जास्त नफा मिळो.\n\nपुन्हा मदतीसाठी कधीही *'Hi'* पाठवा. आपला दिवस आनंदाचा जावो!",
  hinglish: "🌾 *CropCash se baat karne ke liye dhanyavaad!*\n\nWishing you a great harvest aur maximum profit.\n\nKabhi bhi dobara help ke liye *'Hi'* send karein. Have a great day!"
};

const HELP_TEXTS = {
  en: "🌾 *CropCash Help & Navigation Guide*\n\nHere is what I can do for you:\n• *Check Mandi Prices:* Live APMC prices for Soybean, Cotton, Wheat, Onion, etc.\n• *Find Best Mandi:* Compare mandis with transport costs for maximum net return.\n• *Calculate Transport:* Freight cost breakdown and net profit per quintal.\n• *Government Schemes:* PM-Kisan, MahaDBT, PMFBY details & links.\n• *Crop Price Trend:* Market arrivals and price forecast.\n\n*Quick Navigation:*\n• Type *'Menu'* to open the Main Menu\n• Type *'Language'* to change your language\n• Type *'Start'* to restart the conversation\n• Type *'Back'* to go to the previous step\n• Type *'End'* to finish chatting",
  hi: "🌾 *क्रॉपकैश सहायता और मार्गदर्शिका*\n\nमैं आपकी इस प्रकार सहायता कर सकता हूँ:\n• *मंडी भाव देखें:* सोयाबीन, कपास, गेहूं आदि के लाइव भाव।\n• *सबसे सही मंडी चुनें:* ढुलाई खर्च जोड़कर सबसे ज्यादा मुनाफे वाली मंडी।\n• *ढुलाई खर्च और नफा:* वाहन किराया और शुद्ध बचत का हिसाब।\n• *सरकारी योजनाएं:* पीएम किसान, महाडीबीटी, फसल बीमा की जानकारी।\n• *भाव का रुझान:* बाजार का तेजी-मंदी का पूर्वानुमान।\n\n*त्वरित नेविगेशन:*\n• मुख्य मेनू के लिए *'Menu'* लिखें\n• भाषा बदलने के लिए *'Language'* या *'भाषा'* लिखें\n• फिर से शुरू करने के लिए *'Start'* लिखें\n• पिछले सवाल पर जाने के लिए *'Back'* लिखें\n• बातचीत समाप्त करने के लिए *'End'* लिखें",
  mr: "🌾 *क्रॉपकॅश मदत व मार्गदर्शन*\n\nमी आपल्याला खालीलप्रमाणे मदत करू शकतो:\n• *बाजारभाव तपासा:* सोयाबीन, कापूस, गहू, कांदा इत्यादींचे थेट दर.\n• *सर्वात फायदेशीर मंडी:* वाहतूक खर्च वजा जाता सर्वाधिक नफा देणारी बाजार समिती.\n• *वाहतूक खर्च व नफा:* गाडी भाडे व प्रत्यक्ष शिल्लक नफा.\n• *शासकीय योजना:* पीएम-किसान, महाडीबीटी, पीक विमा माहिती.\n• *बाजारभाव कल व अंदाज:* बाजारातील तेजी-मंदीचा कल.\n\n*नेव्हिगेशन पर्याय:*\n• मुख्य मेनूसाठी *'Menu'* लिहा\n• भाषा बदलण्यासाठी *'Language'* किंवा *'भाषा'* लिहा\n• नव्याने सुरू करण्यासाठी *'Start'* लिहा\n• मागील पायरीसाठी *'Back'* लिहा\n• संवाद थांबवण्यासाठी *'End'* लिहा",
  hinglish: "🌾 *CropCash Help Guide*\n\nMain aapki aise madad kar sakta hoon:\n• *Check Mandi Prices:* Soybean, Cotton, Gehu ke live APMC rates.\n• *Find Best Mandi:* Transport cost minus karke highest profit wali mandi.\n• *Calculate Transport:* Vehicle freight aur net return calculation.\n• *Government Schemes:* PM-Kisan, MahaDBT, PMFBY updates & portal links.\n• *Price Trend:* Market outlook aur seasonal trend.\n\n*Quick Controls:*\n• Main menu ke liye *'Menu'* type karein\n• Language change ke liye *'Language'* type karein\n• Restart karne ke liye *'Start'* type karein\n• Previous step ke liye *'Back'* type karein\n• Chat end karne ke liye *'End'* type karein"
};

/**
 * Checks if a message is an explicit greeting
 * @param {string} text
 * @returns {boolean}
 */
function isGreetingMessage(text) {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim().toLowerCase();
  const greetings = [
    "hi", "hello", "hey", "hii", "hiii", "helo",
    "namaste", "namaskar", "namaskaram", "pranam", "ram ram", "radhe radhe",
    "नमस्ते", "नमस्कार", "राम राम", "प्रणाम", "जय श्री राम"
  ];
  if (greetings.includes(clean)) return true;
  if (
    clean.includes("explore your farming assistance") ||
    clean.startsWith("hello cropcash") ||
    clean.startsWith("hi cropcash")
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a message is a language selection command or ID
 * @param {string} idOrText
 * @returns {'en'|'hi'|'mr'|'hinglish'|null}
 */
function parseLanguageSelection(idOrText) {
  if (!idOrText || typeof idOrText !== "string") return null;
  const clean = idOrText.trim().toLowerCase();

  if (clean === "lang_en" || clean === "english" || clean === "1") return "en";
  if (clean === "lang_hi" || clean === "हिंदी" || clean === "hindi" || clean === "2") return "hi";
  if (clean === "lang_mr" || clean === "मराठी" || clean === "marathi" || clean === "3") return "mr";
  if (clean === "lang_hinglish" || clean === "hinglish" || clean === "4") return "hinglish";

  return null;
}

/**
 * Checks if a message matches a conversation navigation control
 * @param {string} idOrText
 * @returns {'main_menu'|'back'|'change_language'|'start_again'|'help'|'ask_another'|'end_chat'|null}
 */
function parseNavigationControl(idOrText) {
  if (!idOrText || typeof idOrText !== "string") return null;
  const clean = idOrText.trim().toLowerCase().replace(/[.,!?]+/g, "");

  // 1. Main Menu
  if (
    clean === "btn_main_menu" ||
    clean === "main menu" ||
    clean === "menu" ||
    clean === "mainmenu" ||
    clean === "होम" ||
    clean === "मुख्य मेनू" ||
    clean === "मेनू" ||
    clean === "home"
  ) {
    return "main_menu";
  }

  // 2. Ask Another Question
  if (
    clean === "btn_ask_another" ||
    clean === "ask another" ||
    clean === "another question" ||
    clean === "ask another question" ||
    clean === "अन्य प्रश्न" ||
    clean === "दुसरा प्रश्न" ||
    clean === "aur sawal"
  ) {
    return "ask_another";
  }

  // 3. End Conversation
  if (
    clean === "btn_end_chat" ||
    clean === "end chat" ||
    clean === "end conversation" ||
    clean === "end" ||
    clean === "exit" ||
    clean === "bye" ||
    clean === "goodbye" ||
    clean === "alvida" ||
    clean === "संवाद संपवा" ||
    clean === "बातचीत समाप्त" ||
    clean === "समाप्त" ||
    clean === "थांबवा"
  ) {
    return "end_chat";
  }

  // 4. Back
  if (
    clean === "btn_back" ||
    clean === "back" ||
    clean === "wapas" ||
    clean === "vaapas" ||
    clean === "मागे" ||
    clean === "पीछे" ||
    clean === "मागे जा"
  ) {
    return "back";
  }

  // 5. Change Language
  if (
    clean === "btn_change_language" ||
    clean === "change language" ||
    clean === "language" ||
    clean === "bhasha" ||
    clean === "भाषा" ||
    clean === "भाषा बदला" ||
    clean === "भाषा बदलें"
  ) {
    return "change_language";
  }

  // 6. Start Again / Reset
  if (
    clean === "btn_start_again" ||
    clean === "start again" ||
    clean === "restart" ||
    clean === "reset" ||
    clean === "shuru" ||
    clean === "suru" ||
    clean === "सुरू करा" ||
    clean === "पुन्हा सुरू करा" ||
    clean === "फिर से शुरू" ||
    clean === "सुरू" ||
    clean === "शुरू"
  ) {
    return "start_again";
  }

  // 7. Help
  if (
    clean === "btn_help" ||
    clean === "help" ||
    clean === "madad" ||
    clean === "madat" ||
    clean === "मदत" ||
    clean === "मदद" ||
    clean === "सहायता"
  ) {
    return "help";
  }

  return null;
}

/**
 * Checks if a message is an interactive Main Menu selection
 * @param {string} idOrText
 * @returns {'mandi_prices'|'best_mandi'|'transport'|'schemes'|'trend'|null}
 */
function parseMainMenuSelection(idOrText) {
  if (!idOrText || typeof idOrText !== "string") return null;
  const clean = idOrText.trim().toLowerCase();

  // ID based checks
  if (clean === "menu_mandi_prices") return "mandi_prices";
  if (clean === "menu_best_mandi") return "best_mandi";
  if (clean === "menu_transport") return "transport";
  if (clean === "menu_schemes") return "schemes";
  if (clean === "menu_trend") return "trend";

  // Text title checks
  if (clean.includes("check mandi price") || clean.includes("मंडी भाव देखें") || clean.includes("बाजारभाव तपासा") || clean.includes("mandi rates check")) {
    return "mandi_prices";
  }
  if (clean.includes("find best mandi") || clean.includes("सबसे सही मंडी") || clean.includes("सर्वात फायदेशीर मंडी") || clean.includes("best mandi find")) {
    return "best_mandi";
  }
  if (clean.includes("calculate transport") || clean.includes("ढुलाई खर्च और नफा") || clean.includes("वाहतूक खर्च व नफा") || clean.includes("transport & net return")) {
    return "transport";
  }
  if (clean.includes("government scheme") || clean.includes("सरकारी योजना") || clean.includes("शासकीय योजना") || clean.includes("sarkari yojana")) {
    return "schemes";
  }
  if (clean.includes("price trend") || clean.includes("crop price trend") || clean.includes("भाव रुझान") || clean.includes("बाजारभाव कल") || clean.includes("trend forecast")) {
    return "trend";
  }

  return null;
}

module.exports = {
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
};
