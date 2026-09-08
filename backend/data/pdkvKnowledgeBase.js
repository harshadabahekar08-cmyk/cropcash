/**
 * CropCash PDKV Agricultural Knowledge Base
 * Verified source-backed agronomic package of practices from:
 * 1. “सोयाबीन लागवड व तंत्रज्ञान” — Dr. Panjabrao Deshmukh Krishi Vidyapeeth (PDKV), Akola
 * 2. “कृषी संवादिनी / कृषिसंवाद २०२४” — Dr. Panjabrao Deshmukh Krishi Vidyapeeth (PDKV), Akola
 * 3. PDKV / KVK Buldhana Extension Bulletins
 * 
 * Strict Provenance: Every record stores source organization, publication title, and exact agronomic recommendations.
 */

const PDKV_SOURCE_INFO = {
  organization: "Dr. Panjabrao Deshmukh Krishi Vidyapeeth (PDKV), Akola",
  organizationMr: "डॉ. पंजाबराव देशमुख कृषी विद्यापीठ (पंदेकृवि), अकोला",
  organizationHi: "डॉ. पंजाबराव देशमुख कृषि विद्यापीठ (PDKV), अकोला",
  publications: [
    "सोयाबीन लागवड व तंत्रज्ञान (PDKV Akola)",
    "कृषी संवादिनी / कृषिसंवाद २०२४ (PDKV Akola)"
  ]
};

const PDKV_KNOWLEDGE = {
  Soyabean: {
    cropName: { en: "Soybean", mr: "सोयाबीन", hi: "सोयाबीन", hinglish: "Soybean" },
    source: PDKV_SOURCE_INFO,
    varieties: {
      title: { en: "PDKV Recommended Soybean Varieties", mr: "पंदेकृवि शिफारसित सोयाबीन वाण", hi: "PDKV अनुशंसित सोयाबीन किस्में", hinglish: "PDKV Soybean Varieties" },
      items: [
        {
          name: "PDKV Amba (AMS 100-39)",
          descriptionMr: "कमी कालावधीत (९५-१०० दिवस) येणारे, उच्च उत्पादन क्षमता असलेले वाण. खोडमाशी व चक्रीभुंगा किडीस मध्यम प्रतिकारक.",
          descriptionEn: "High-yielding variety maturing in 95-100 days; moderately resistant to stem fly and girdle beetle.",
          durationDays: "95-100"
        },
        {
          name: "PDKV Poorva (AMS-MB-5-19)",
          descriptionMr: "विदर्भाच्या हवामानासाठी अत्यंत उपयुक्त, टपोरे दाणे व अधिक उत्पादन देणारे सुधारित वाण.",
          descriptionEn: "Bold-seeded, high-yielding variety specifically suited for Vidarbha agro-climatic conditions.",
          durationDays: "95-100"
        },
        {
          name: "PDKV Yellow Gold (AMS 1001)",
          descriptionMr: "बुलढाणा व अमरावती विभागातील भारी जमिनीसाठी अत्यंत योग्य व तेल उत्पादनासाठी उत्तम.",
          descriptionEn: "Ideal for heavy soils of Buldhana & Amravati divisions with superior oil content.",
          durationDays: "98-102"
        },
        {
          name: "TAMS-38 & Suvarna Soya",
          descriptionMr: "दुहेरी पीक पद्धतीसाठी उत्तम व बीजोत्पादनासाठी उत्कृष्ट वाण.",
          descriptionEn: "Ideal for double cropping systems and certified seed production.",
          durationDays: "95-100"
        },
        {
          name: "Phule Sangam (KDS-726) & JS-335 / JS-9305",
          descriptionMr: "फुले संगम (KDS-726 हे मफुकृवि राहुरीचे वाण असून पंदेकृविने विदर्भासाठी शिफारसित केले आहे) तांबेरा प्रतिकारक व खात्रीशीर उत्पादन देणारे वाण.",
          descriptionEn: "Phule Sangam (KDS-726 bred by MPKV Rahuri, recommended in PDKV package for Vidarbha) - rust-tolerant high-yielding variety.",
          durationDays: "100-105"
        }
      ]
    },
    sowing: {
      rainfallThresholdMr: "पेरणीपूर्वी जमिनीत किमान ७५ ते १०० मि.मी. पावसाची नोंद झाल्यानंतरच ओल तपासून पेरणी करावी.",
      rainfallThresholdEn: "Sow only after receiving at least 75-100 mm of cumulative rainfall and ensuring sufficient soil moisture profile.",
      optimalTimeMr: "१५ जून ते १५ जुलै दरम्यान (वेळेवर पेरणीने खोडमाशीचा प्रादुर्भाव कमी राहतो).",
      optimalTimeEn: "15th June to 15th July (Timely sowing minimizes initial stem fly incidence).",
      spacingMr: "भारी जमीन: ४५ × ५ सें.मी.; मध्यम जमीन: ३० × १० सें.मी.; टोकण/रुंद वरंबा (BBF): ४५ × ३० सें.मी.",
      spacingEn: "Heavy soil: 45 x 5 cm; Medium soil: 30 x 10 cm; Broad Bed Furrow (BBF): 45 x 30 cm.",
      seedRateMr: "मध्यम दाणे: ६५ ते ७० किलो/हेक्टर (२६-२८ किलो/एकर); टपोरे दाणे: ७५ किलो/हेक्टर (३० किलो/एकर); BBF पद्धतीत २०% बियाणे बचत.",
      seedRateEn: "Medium seed: 65-70 kg/ha (26-28 kg/acre); Bold seed: 75 kg/ha (30 kg/acre); BBF method saves ~20% seed.",
      depthMr: "बियाणे ३ ते ५ सें.मी. पेक्षा जास्त खोल जाणार नाही याची काळजी घ्यावी.",
      depthEn: "Sowing depth should strictly not exceed 3 to 5 cm for optimal germination."
    },
    seedTreatment: {
      methodNameMr: "FIR पद्धत (बुरशीनाशक ➔ कीटकनाशक ➔ जिवाणू संवर्धन)",
      methodNameEn: "FIR Protocol (Fungicide ➔ Insecticide ➔ Rhizobium Biofertilizer)",
      stepsMr: [
        "१. बुरशीनाशक (Fungicide): ट्रायकोडर्मा व्हिरीडी ५ ग्रॅम प्रति किलो किंवा थायरम ३ ग्रॅम + कार्बेन्डाझिम १ ग्रॅम प्रति किलो बियाणे.",
        "२. कीटकनाशक (Insecticide): खोडमाशी व चक्रीभुंगा नियंत्रणासाठी थायामेथोक्साम ३० एफ.एस. (Thiamethoxam 30 FS) १० मि.लि. प्रति किलो बियाणे.",
        "३. जिवाणू खते (Rhizobium + PSB): सावलीत सुकवल्यानंतर रायझोबियम जापोनिकम २५ ग्रॅम + पीएसबी (PSB) २५ ग्रॅम प्रति किलो बियाण्यास चोळावे."
      ],
      stepsEn: [
        "1. Fungicide: Trichoderma viride @ 5g/kg OR Thiram 3g + Carbendazim 1g per kg seed for root-rot/collar-rot prevention.",
        "2. Insecticide: Thiamethoxam 30 FS @ 10 ml/kg seed for early stem fly and sucking pest protection.",
        "3. Biofertilizers: Rhizobium japonicum @ 25g/kg + PSB @ 25g/kg seed after drying in shade."
      ]
    },
    fertilizer: {
      basalMr: "३० किलो नत्र, ६० किलो स्फुरद, ३० किलो पालाश (30:60:30 NPK) + २० किलो गंधक (सल्फर) प्रति हेक्टरी पेरणीच्या वेळी जमिनीत द्यावे (स्फुरद स्थिरीकरण करणाऱ्या विशिष्ट भारी काळ्या जमिनीसाठी ३०:७५:३० NPK शिफारस आहे). गंधकामुळे दाण्यांतील तेलाचे व प्रथिनांचे प्रमाण वाढते.",
      basalEn: "30 kg N, 60 kg P2O5, 30 kg K2O (30:60:30 NPK benchmark) + 20 kg Sulphur per hectare at sowing (30:75:30 NPK recommended specifically for P-fixing heavy black soils). Sulphur is essential for oil and protein synthesis.",
      micronutrientsMr: "झिंकची कमतरता असल्यास २५ किलो झिंक सल्फेट प्रति हेक्टरी पेरणीवेळी जमिनीत द्यावे किंवा पंदेकृवि लिक्विड मायक्रो ग्रेडची फवारणी करावी.",
      micronutrientsEn: "Apply Zinc Sulphate @ 25 kg/ha at sowing for Zinc-deficient soils or use PDKV Liquid Micronutrient sprays.",
      stageFoliarMr: [
        "• शाकीय वाढीची अवस्था (३०-३५ दिवस): १९:१९:१९ विद्राव्य खत (१०-१५ ग्रॅम/लिटर) फवारणी.",
        "• फुलधारणा अवस्था (४५-५० दिवस): ०:५२:३४ (१०-१५ ग्रॅम/लिटर) + बोरॉन (१ ग्रॅम/लिटर) फवारणी.",
        "• शेंगा भरण्याची अवस्था (६०-७० दिवस): ००:००:५० किंवा १३:००:४५ (१०-१५ ग्रॅम/लिटर) फवारणी."
      ],
      stageFoliarEn: [
        "• Vegetative Stage (30-35 Days): 19:19:19 water-soluble foliar spray @ 10-15 g/L.",
        "• Flowering Stage (45-50 Days): 0:52:34 @ 10-15 g/L + Boron @ 1 g/L to minimize flower drop.",
        "• Pod Filling Stage (60-70 Days): 00:00:50 OR 13:00:45 @ 10-15 g/L for bold grain development."
      ]
    },
    weedManagement: {
      preEmergenceMr: "पेरणीनंतर ४८ तासांच्या आत डायक्लोसुलम ८४ डब्ल्यूडीजी (Diclosulam 84 WDG) ३० ग्रॅम प्रति हेक्टरी किंवा पेंडीमेथॅलीन ३० ईसी ३.३ लिटर प्रति हेक्टरी ५०० लिटर पाण्यातून फवारावे.",
      preEmergenceEn: "Pre-emergence within 48 hours: Diclosulam 84 WDG @ 30 g/ha OR Pendimethalin 30 EC @ 3.3 L/ha in 500 L water.",
      postEmergenceMr: "पेरणीनंतर १५ ते २० दिवसांनी: इमाझेथापायर १० एसएल (Imazethapyr 10 SL) १ लिटर प्रति हेक्टरी तण २ ते ३ पानांवर असताना फवारावे.",
      postEmergenceEn: "Post-emergence at 15-20 days: Imazethapyr 10 SL @ 1.0 L/ha when weeds are at 2-3 leaf stage."
    },
    ipm: {
      stemFlyMr: "खोडमाशी (Stem Fly): बियाण्यास थायामेथोक्साम ३० एफ.एस. (१० मि.लि./किलो) प्रक्रिया. प्रादुर्भाव दिसल्यास ५% निंबोळी अर्क किंवा क्लोरँट्रानिलीप्रोल १८.५ एस.सी. (३ मि.लि./१० लिटर) फवारणी.",
      girdleBeetleMr: "चक्रीभुंगा (Girdle Beetle): किडीने बाधित झालेल्या फांद्या/चकत्या तोडून नष्ट कराव्यात. प्रादुर्भाव वाढल्यास प्रोफेनोफॉस ५० ई.सी. (२० मि.लि./१० लिटर) फवारणी.",
      semilooperMr: "पाने खाणाऱ्या अळ्या (Semilooper / Spodoptera): नोमुरिया रिलेई (Nomuraea rileyi) जैविक बुरशी ५० ग्रॅम/१० लिटर किंवा इमामेक्टिन बेन्झोएट ५ एस.जी. (४ ग्रॅम/१० लिटर).",
      rustMr: "तांबेरा (Soybean Rust): पानांवर तांबूस ठिपके दिसताच हेक्साकोनाझोल ५ ई.सी. (१० मि.लि./१० लिटर) किंवा प्रोपीकोनाझोल २५ ई.सी. (१० मि.लि./१० लिटर) फवारणी.",
      charcoalRotMr: "चारकोल रॉट / खोडकूज: जमिनीतील पाण्याचा निचरा योग्य ठेवावा, ट्रायकोडर्मा २.५ किलो प्रति हेक्टरी शेणखतातून जमिनीत मिसळावे."
    },
    harvesting: {
      podMoistureMr: "पाने पिवळी पडून गळल्यानंतर व शेंगांचा रंग तपकिरी/काळपट झाल्यानंतर काढणी करावी. मळणीवेळी दाण्यांतील ओलावा १३-१५% असावा व मळणी यंत्राचा वेग ३५०-४०० आरपीएम असावा.",
      podMoistureEn: "Harvest when leaves turn yellow and drop; threshing moisture should be 13-15% with thresher drum speed 350-400 RPM.",
      storageMoistureMr: "बियाणे साठवणुकीसाठी दाण्यातील ओलावा ९ ते १०% पेक्षा जास्त नसावा.",
      storageMoistureEn: "For safe seed storage, grain moisture must not exceed 9-10%."
    }
  },

  Cotton: {
    cropName: { en: "Cotton", mr: "कापूस", hi: "कपास", hinglish: "Cotton" },
    source: PDKV_SOURCE_INFO,
    varieties: {
      title: { en: "PDKV Recommended Cotton Varieties", mr: "पंदेकृवि शिफारसित कापूस वाण", hi: "PDKV अनुशंसित कपास किस्में", hinglish: "PDKV Cotton Varieties" },
      items: [
        { name: "Suvarna Shubhra", descriptionMr: "विदर्भातील मध्यम ते भारी जमिनीसाठी अधिक उत्पादन देणारे सरळ वाण.", descriptionEn: "High-yielding straight variety for Vidarbha medium-heavy soils." },
        { name: "PKV Rajat & AKH-081", descriptionMr: "कमी कालावधीत येणारे, रस शोषणाऱ्या किडींना सहनशील वाण.", descriptionEn: "Early-maturing, sucking-pest tolerant straight varieties." },
        { name: "Suraj & Phule Anmol", descriptionMr: "लांब धाग्याचा कापूस व उच्च जिनिंग टक्केवारी असलेले सुधारित वाण.", descriptionEn: "Long-staple cotton with superior ginning outturn." }
      ]
    },
    fertilizer: {
      basalMr: "१००:५०:५० किलो नत्र, स्फुरद व पालाश प्रति हेक्टरी (किंवा कोरडवाहूसाठी ६०:३०:३० NPK). पेरणीवेळी संपूर्ण स्फुरद, पालाश व १/३ नत्र द्यावे. मॅग्नेशियम सल्फेट १० किलो/एकर बेसलमध्ये द्यावे.",
      basalEn: "100:50:50 kg/ha NPK (or 60:30:30 for rainfed). Full P, K and 1/3 N at sowing + Magnesium Sulphate @ 10 kg/acre.",
      micronutrientsMr: "PDKV लिक्विड मायक्रो ग्रेड XI (लोह २.५%, झिंक ५%, बोरॉन ०.५%) ची फवारणी पाते व फुलधारणेवेळी करावी.",
      micronutrientsEn: "Apply PDKV Liquid Micro Grade XI (Fe 2.5%, Zn 5.0%, B 0.5%) during squaring and flowering.",
      stageFoliarMr: [
        "• पाते लागताना (४०-४५ दिवस): १९:१९:१९ विद्राव्य खत (१०-१५ ग्रॅम/लिटर) + युरिया २% फवारणी.",
        "• फुल व बोंड लागताना (६०-७५ दिवस): ०:५२:३४ (१० ग्रॅम/लिटर) + बोरॉन (१ ग्रॅम/लिटर) फवारणी पातेगळ रोखण्यासाठी.",
        "• बोंड विकास व लाल्या रोखण्यासाठी: ००:००:५० (१० ग्रॅम/लिटर) + १% मॅग्नेशियम सल्फेट फवारणी."
      ],
      stageFoliarEn: [
        "• Squaring (40-45 Days): 19:19:19 @ 10-15 g/L + 2% Urea spray.",
        "• Flowering & Boll Setting (60-75 Days): 0:52:34 @ 10 g/L + Boron @ 1 g/L to minimize boll shedding.",
        "• Boll Development: 00:00:50 @ 10 g/L + 1% Magnesium Sulphate spray to prevent leaf reddening (Lalya)."
      ]
    },
    ipm: {
      suckingPestMr: "रस शोषक किडी (मावा, तुडतुडे, पांढरी माशी): ५% निंबोळी अर्क किंवा व्हर्टिसिलियम लेकॅनी ५० ग्रॅम/१० लिटर. प्रादुर्भाव वाढल्यास फ्लोनिकॅमिड ५० डब्ल्यूजी (४ ग्रॅम/१० लिटर).",
      pinkBollwormMr: "गुलाबी बोंडअळी (Pink Bollworm): कामगंध सापळे (Pheromone Traps) ५ प्रति एकर लावावेत. प्रादुर्भाव दिसल्यास प्रोफेनोफॉस + सायपरमेथ्रीन किंवा क्लोरँट्रानिलीप्रोल फवारणी.",
      lalyaMr: "लाल्या रोग (Leaf Reddening): नत्र, पालाश व मॅग्नेशियमच्या कमतरतेमुळे पाने लाल पडतात. उपाय: १% मॅग्नेशियम सल्फेट + २% डीएपी ची १०-१५ दिवसांच्या अंतराने २ फवारण्या."
    }
  },

  Pigeonpea: {
    cropName: { en: "Pigeonpea / Tur", mr: "तूर", hi: "अरहर / तूर", hinglish: "Tur (Pigeonpea)" },
    source: PDKV_SOURCE_INFO,
    varieties: {
      title: { en: "PDKV Recommended Pigeonpea (Tur) Varieties", mr: "पंदेकृवि शिफारसित तूर वाण", hi: "PDKV अनुशंसित अरहर किस्में", hinglish: "PDKV Tur Varieties" },
      items: [
        { name: "PDKV Ashlesha (2023)", descriptionMr: "पावसाळी व बागायती परिस्थितीसाठी अत्यंत योग्य, मर व वांझ रोगास मध्यम प्रतिकारक्षम, अधिक उत्पादन देणारे नवीन वाण.", descriptionEn: "New high-yielding variety (2023) tolerant to wilt and sterility mosaic." },
        { name: "PKV-Tara (TAT-9629)", descriptionMr: "विदर्भासाठी अत्यंत लोकप्रिय, मध्यम जाड दाणे व पाण्याचा ताण सहन करणारे वाण.", descriptionEn: "Widely grown drought-tolerant bold-seeded variety for Vidarbha." },
        { name: "AKT-8811 & T-Vishakha-1", descriptionMr: "कमी ते मध्यम कालावधीत येणारे, आंतरपीक पद्धतीसाठी (सोयाबीन + तूर) अत्यंत योग्य वाण.", descriptionEn: "Medium-duration varieties ideal for Soybean + Tur intercropping systems." }
      ]
    },
    fertilizer: {
      basalMr: "२५ किलो नत्र, ५० किलो स्फुरद (किंवा ४६ किलो SSP) प्रति हेक्टरी + ५ टन शेणखत पेरणीवेळी द्यावे. ट्रायकोडर्मा व पीएसबी जिवाणू खतांची बीजप्रक्रिया करावी.",
      basalEn: "25 kg N, 50 kg P2O5 (or 46 kg SSP) per hectare + 5 tons FYM at sowing + Trichoderma & PSB seed treatment.",
      micronutrientsMr: "PDKV लिक्विड मायक्रो ग्रेड X (लोह २.५%, झिंक ५%, बोरॉन ०.५%, मॉलिब्डेनम ०.१%) फवारणी करावी.",
      micronutrientsEn: "Apply PDKV Liquid Micro Grade X (Fe 2.5%, Zn 5.0%, B 0.5%, Mo 0.1%) for pulse nutrition.",
      stageFoliarMr: [
        "• कळी लागण्याच्या वेळी: ०:५२:३४ (१०-१५ ग्रॅम/लिटर) + बोरॉन (१ ग्रॅम/लिटर) फवारणी.",
        "• शेंगा भरताना: ००:००:५० (१०-१५ ग्रॅम/लिटर) किंवा १३:००:४५ फवारणी दाण्यांच्या टपोरेपणासाठी."
      ],
      stageFoliarEn: [
        "• Bud Initiation: 0:52:34 @ 10-15 g/L + Boron @ 1 g/L spray.",
        "• Pod Development: 00:00:50 @ 10-15 g/L for bold grain size."
      ]
    },
    ipm: {
      podBorerMr: "शेंगपोखरणारी अळी (Helicoverpa): ५% निंबोळी अर्क किंवा एचएएनपीव्ही (HaNPV) २५० एलई किंवा इमामेक्टिन बेन्झोएट (४ ग्रॅम/१० लिटर).",
      wiltMr: "मर रोग (Wilt): बियाण्यास ट्रायकोडर्मा ५ ग्रॅम/किलो प्रक्रिया. पीक फेरपालट करावी."
    }
  },

  Gram: {
    cropName: { en: "Gram / Chickpea", mr: "हरभरा", hi: "चना", hinglish: "Chana / Gram" },
    source: PDKV_SOURCE_INFO,
    varieties: {
      title: { en: "PDKV Recommended Gram (Chickpea) Varieties", mr: "पंदेकृवि शिफारसित हरभरा वाण", hi: "PDKV अनुशंसित चना किस्में", hinglish: "PDKV Gram Varieties" },
      items: [
        { name: "PDKV Kanchan (AKG-70)", descriptionMr: "विदर्भातील कोरडवाहू व बागायतीसाठी अधिक उत्पादन देणारे देशी वाण.", descriptionEn: "High-yielding Desi chickpea variety for Vidarbha rainfed & irrigated conditions." },
        { name: "JAKI-9218 & Digvijay", descriptionMr: "महाराष्ट्रात सर्वाधिक लोकप्रिय, मर रोगास प्रतिकारक व टपोरे दाणे असलेले वाण.", descriptionEn: "Most popular wilt-resistant bold grain chickpea varieties." },
        { name: "PKV Harita & PKV Kabuli-2", descriptionMr: "काबुली हरभरा उत्पादनासाठी विद्यापीठाने विकसित केलेले उच्च प्रतीचे वाण.", descriptionEn: "Superior Kabuli chickpea varieties developed by PDKV." }
      ]
    },
    fertilizer: {
      basalMr: "२० किलो नत्र, ४० किलो स्फुरद प्रति हेक्टरी पेरणीवेळी द्यावे. रायझोबियम व पीएसबी जिवाणू खतांची बीजप्रक्रिया अनिवार्य.",
      basalEn: "20 kg N, 40 kg P2O5 per hectare at sowing + Rhizobium & PSB seed treatment.",
      micronutrientsMr: "PDKV लिक्विड मायक्रो ग्रेड II कडधान्यांसाठी शिफारसित आहे.",
      micronutrientsEn: "PDKV Liquid Micro Grade II is specifically recommended for pulses.",
      stageFoliarMr: [
        "• फांद्या फुटताना (३०-३५ दिवस): १९:१९:१९ (१०-१५ ग्रॅम/लिटर) फवारणी.",
        "• घाटे भरताना (५५-६० दिवस): ०:५२:३४ किंवा ००:००:५० फवारणी."
      ],
      stageFoliarEn: [
        "• Branching Stage (30-35 Days): 19:19:19 @ 10-15 g/L spray.",
        "• Pod Filling Stage (55-60 Days): 0:52:34 OR 00:00:50 spray."
      ]
    },
    ipm: {
      podBorerMr: "घाटे अळी (Pod Borer): शेतात इंग्रजी 'T' आकाराचे पक्षी थांबे (५० प्रति हेक्टर) उभारावेत. कामगंध सापळे ५/एकर. जैविक नियंत्रण: निंबोळी अर्क ५% किंवा एचएएनपीव्ही किंवा क्लोरँट्रानिलीप्रोल (३ मि.लि./१० लिटर)."
    }
  },

  Wheat: {
    cropName: { en: "Wheat", mr: "गहू", hi: "गेहूं", hinglish: "Wheat" },
    source: PDKV_SOURCE_INFO,
    varieties: {
      title: { en: "PDKV Recommended Wheat Varieties", mr: "पंदेकृवि शिफारसित गहू वाण", hi: "PDKV अनुशंसित गेहूं किस्में", hinglish: "PDKV Wheat Varieties" },
      items: [
        { name: "AKW-1071 (Purna)", descriptionMr: "वेळेवर पेरणीसाठी उत्तम, तांबेरा रोगास प्रतिकारक, टपोरे व चमकदार दाणे.", descriptionEn: "Ideal for timely sowing; rust-resistant with bold and lustrous grains." },
        { name: "PDKV Sardar (NTS 1524)", descriptionMr: "विदर्भातील बागायती क्षेत्रासाठी अधिक उत्पादन देणारे नवीन सुधारित वाण.", descriptionEn: "High-yielding irrigated wheat variety developed for Vidarbha." },
        { name: "AKW-381 & GW-496", descriptionMr: "चपातीसाठी उत्तम गुणवत्ता व खात्रीशीर उत्पादन देणारे वाण.", descriptionEn: "Superior chapati making quality and stable yields." }
      ]
    },
    fertilizer: {
      basalMr: "१२० किलो नत्र, ६० किलो स्फुरद, ४० किलो पालाश प्रति हेक्टरी. पेरणीवेळी संपूर्ण स्फुरद, पालाश व अर्धे नत्र द्यावे. उर्वरित अर्धे नत्र २१ दिवसांनी पहिल्या पाण्याच्या वेळी द्यावे. झिंक सल्फेट २५ किलो/हेक्टर जमिनीत द्यावे.",
      basalEn: "120:60:40 kg/ha NPK. Full P, K and 1/2 N at sowing; remaining 1/2 N at 1st irrigation (21 days) + Zinc Sulphate @ 25 kg/ha.",
      stageFoliarMr: [
        "• मुकुट मुळे फुटताना (२१ दिवस): पहिल्या पाण्यानंतर युरियाचा हप्ता + १९:१९:१९ फवारणी.",
        "• ओंबी बाहेर पडताना (५०-५५ दिवस): ०:५२:३४ (१० ग्रॅम/लिटर) फवारणी.",
        "• दाणे भरताना (७०-७५ दिवस): ००:००:५० (१० ग्रॅम/लिटर) फवारणी दाण्यांच्या वजनासाठी."
      ],
      stageFoliarEn: [
        "• Crown Root Initiation (21 Days): 1st irrigation + top-dress Urea + 19:19:19 spray.",
        "• Booting / Heading (50-55 Days): 0:52:34 @ 10 g/L spray.",
        "• Grain Filling (70-75 Days): 00:00:50 @ 10 g/L spray for bold grain weight."
      ]
    }
  }
};

// Aliases to resolve canonical crop keys
const PDKV_CROP_ALIAS_MAP = {
  soyabean: "Soyabean",
  soybean: "Soyabean",
  soya: "Soyabean",
  सोयाबीन: "Soyabean",
  cotton: "Cotton",
  kapas: "Cotton",
  kapus: "Cotton",
  कापूस: "Cotton",
  कपास: "Cotton",
  pigeonpea: "Pigeonpea",
  "arhar (tur/red gram)": "Pigeonpea",
  "pigeon pea": "Pigeonpea",
  tur: "Pigeonpea",
  toor: "Pigeonpea",
  arhar: "Pigeonpea",
  तूर: "Pigeonpea",
  अरहर: "Pigeonpea",
  gram: "Gram",
  "gram (chana)": "Gram",
  chana: "Gram",
  chickpea: "Gram",
  हरभरा: "Gram",
  चना: "Gram",
  wheat: "Wheat",
  gehu: "Wheat",
  gehun: "Wheat",
  gahu: "Wheat",
  गहू: "Wheat",
  गेहूं: "Wheat"
};

/**
 * Resolves standard PDKV crop key
 * @param {string} cropStr 
 * @returns {string|null} Canonical PDKV crop key
 */
function resolvePdkvCropKey(cropStr) {
  if (!cropStr || typeof cropStr !== "string") return null;
  const clean = cropStr.trim().toLowerCase();
  return PDKV_CROP_ALIAS_MAP[clean] || (PDKV_KNOWLEDGE[cropStr] ? cropStr : null);
}

/**
 * Retrieves verified PDKV crop knowledge
 * @param {string} cropStr - Crop name or alias
 * @returns {object|null} Structured PDKV knowledge record
 */
function getPdkvCropKnowledge(cropStr) {
  const key = resolvePdkvCropKey(cropStr);
  return key ? PDKV_KNOWLEDGE[key] : null;
}

/**
 * Retrieves verified PDKV fertilizer & nutrient recommendations
 * @param {string} cropStr - Crop name
 * @param {string} [stageKey] - Growth stage key
 * @returns {object|null}
 */
function getPdkvFertilizerGuidance(cropStr, stageKey = "all") {
  const cropData = getPdkvCropKnowledge(cropStr);
  if (!cropData || !cropData.fertilizer) return null;

  return {
    source: PDKV_SOURCE_INFO,
    crop: cropData.cropName,
    fertilizer: cropData.fertilizer,
    stage: stageKey
  };
}

/**
 * Retrieves verified PDKV IPM pest & disease management recommendations
 * @param {string} cropStr - Crop name
 * @returns {object|null}
 */
function getPdkvIpmGuidance(cropStr) {
  const cropData = getPdkvCropKnowledge(cropStr);
  if (!cropData || !cropData.ipm) return null;

  return {
    source: PDKV_SOURCE_INFO,
    crop: cropData.cropName,
    ipm: cropData.ipm
  };
}

module.exports = {
  PDKV_SOURCE_INFO,
  PDKV_KNOWLEDGE,
  PDKV_CROP_ALIAS_MAP,
  resolvePdkvCropKey,
  getPdkvCropKnowledge,
  getPdkvFertilizerGuidance,
  getPdkvIpmGuidance,
};
