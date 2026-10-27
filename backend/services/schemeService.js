/**
 * CropCash Government Scheme Awareness Service
 * Provides structured, verified, and honest information on key central and state farmer schemes:
 *   1. PM-KISAN (Pradhan Mantri Kisan Samman Nidhi - Govt of India)
 *   2. MahaDBT Farmer Schemes (Maharashtra State Agriculture Portal)
 *   3. Namo Shetkari Maha Samman Nidhi Yojana (Maharashtra)
 *   4. PM Fasal Bima Yojana (PMFBY - Crop Insurance)
 *   5. Kisan Credit Card (KCC - Concessional Crop Loan)
 *
 * Emphasizes official portal references (pmkisan.gov.in & mahadbt.maharashtra.gov.in)
 * and clearly states that eligibility & applications must be processed through official portals.
 */

/**
 * Identify specific scheme sub-topic from text
 * @param {string} text
 * @returns {'pm_kisan' | 'namo_shetkari' | 'pmfby' | 'kcc' | 'mahadbt' | 'subsidy' | 'alert' | 'general'}
 */
function identifySchemeTopic(text) {
  if (!text || typeof text !== "string") return "general";
  const clean = text.toLowerCase();

  // Namo Shetkari
  if (
    clean.includes("namo shetkari") ||
    clean.includes("नमो शेतकरी") ||
    clean.includes("namo kisan")
  ) {
    return "namo_shetkari";
  }

  // PM-KISAN
  if (
    clean.includes("pm kisan") ||
    clean.includes("pm-kisan") ||
    clean.includes("pmkisan") ||
    clean.includes("पीएम किसान") ||
    clean.includes("samman nidhi") ||
    clean.includes("सम्मान निधि") ||
    clean.includes("सन्मान निधी")
  ) {
    return "pm_kisan";
  }

  // PMFBY / Crop Insurance
  if (
    clean.includes("pmfby") ||
    clean.includes("fasal bima") ||
    clean.includes("crop insurance") ||
    clean.includes("pik vima") ||
    clean.includes("पीक विमा") ||
    clean.includes("फसल बीमा") ||
    clean.includes("विमा") ||
    clean.includes("बीमा")
  ) {
    return "pmfby";
  }

  // Kisan Credit Card / Loan
  if (
    clean.includes("kcc") ||
    clean.includes("kisan credit card") ||
    clean.includes("credit card") ||
    clean.includes("crop loan") ||
    clean.includes("karj") ||
    clean.includes("rin") ||
    clean.includes("किसान क्रेडिट कार्ड") ||
    clean.includes("पीक कर्ज") ||
    clean.includes("कृषि ऋण")
  ) {
    return "kcc";
  }

  // MahaDBT Portal
  if (
    clean.includes("mahadbt") ||
    clean.includes("maha dbt") ||
    clean.includes("maha-dbt") ||
    clean.includes("महाडीबीटी") ||
    clean.includes("महा डीबीटी") ||
    clean.includes("dbt portal")
  ) {
    return "mahadbt";
  }

  // Subsidies / Farm Implements / Drip / Solar
  if (
    clean.includes("subsidy") ||
    clean.includes("subsidies") ||
    clean.includes("anudan") ||
    clean.includes("सब्सिडी") ||
    clean.includes("अनुदान") ||
    clean.includes("tractor") ||
    clean.includes("drip") ||
    clean.includes("sprinkler") ||
    clean.includes("thibak") ||
    clean.includes("ठिबक") ||
    clean.includes("shet tale") ||
    clean.includes("शेततळे") ||
    clean.includes("kusum") ||
    clean.includes("कुसुम")
  ) {
    return "subsidy";
  }

  // Alerts / Updates / Deadlines
  if (
    clean.includes("alert") ||
    clean.includes("alerts") ||
    clean.includes("update") ||
    clean.includes("updates") ||
    clean.includes("deadline") ||
    clean.includes("last date") ||
    clean.includes("मुदत") ||
    clean.includes("तारीख") ||
    clean.includes("अलर्ट") ||
    clean.includes("अपडेट")
  ) {
    return "alert";
  }

  return "general";
}

/**
 * Multilingual Scheme Content
 */
const SCHEME_RESPONSES = {
  // 1. General Overview of Central & Maharashtra Schemes
  general: {
    en: `🏛️ *Farmer Government Schemes Overview*

Here are the key government schemes and official platforms for farmers:

1. 🇮🇳 *PM-KISAN (Govt of India):*
   • ₹6,000/year direct bank transfer in 3 installments of ₹2,000 for landholding farmers.
   • Official Portal: https://pmkisan.gov.in

2. 🌾 *MahaDBT Farmer Portal (Maharashtra State):*
   • Maharashtra's single-window platform for agriculture subsidies:
     - *Farm Mechanization:* Subsidies on tractors, rotavators, and implements.
     - *Micro-Irrigation (PMKSY):* Drip & sprinkler irrigation subsidy (up to 75%–80%).
     - *Horticulture & Farm Ponds:* Fruit orchards, shade nets, and farm ponds.
   • Official Portal: https://mahadbt.maharashtra.gov.in

3. 🚩 *Namo Shetkari Yojana (Maharashtra):*
   • Additional ₹6,000/year state assistance for PM-KISAN beneficiaries in Maharashtra (Total ₹12,000/year).

4. 🛡️ *PM Fasal Bima Yojana (PMFBY):*
   • Crop insurance against weather risk and natural calamities (₹1 token premium in Maharashtra).
   • Official Portal: https://pmfby.gov.in

5. 💳 *Kisan Credit Card (KCC):*
   • Concessional farm credit up to ₹3 Lakh @ 4% effective interest rate upon prompt repayment.

⚠️ _Note: This is scheme awareness info. Eligibility, e-KYC, and applications must be completed on official portals._

Which specific scheme (PM-KISAN, MahaDBT subsidies, or PMFBY) would you like more details on?`,

    hi: `🏛️ *प्रमुख किसान सरकारी योजनाएं (Scheme Awareness)*

किसानों के लिए प्रमुख केंद्रीय एवं महाराष्ट्र राज्य सरकारी योजनाएं:

1. 🇮🇳 *पीएम-किसान सम्मान निधि (भारत सरकार):*
   • पात्र भूमिधारक किसानों को ₹6,000 प्रति वर्ष (₹2,000 की 3 किस्तों में सीधे बैंक खाते में DBT)।
   • आधिकारिक पोर्टल: https://pmkisan.gov.in

2. 🌾 *महाडीबीटी किसान पोर्टल (MahaDBT - महाराष्ट्र शासन):*
   • महाराष्ट्र का एकीकृत ऑनलाइन पोर्टल जहां विभिन्न कृषि सब्सिडी के लिए आवेदन किया जाता है:
     - *कृषि यांत्रिकीकरण:* ट्रैक्टर, रोटावेटर व कृषि यंत्रों पर 40%–50% तक अनुदान।
     - *सूक्ष्म सिंचाई (PMKSY):* ड्रिप (टपक) एवं स्प्रिंकलर (फव्वारा) सिंचाई पर 75%–80% तक सब्सिडी।
     - *फलोत्पादन व शेततळे:* बागवानी, शेडनेट और खेत तालाब योजना।
   • आधिकारिक पोर्टल: https://mahadbt.maharashtra.gov.in

3. 🚩 *नमो शेतकरी महासन्मान निधि योजना (महाराष्ट्र):*
   • महाराष्ट्र के पीएम-किसान लाभार्थियों को राज्य सरकार की ओर से अतिरिक्त ₹6,000/वर्ष (कुल ₹12,000/वर्ष)।

4. 🛡️ *प्रधानमंत्री फसल बीमा योजना (PMFBY):*
   • प्राकृतिक आपदा व मौसम जोखिम से फसल सुरक्षा (महाराष्ट्र में ₹1 टोकन प्रीमियम पर)।
   • आधिकारिक पोर्टल: https://pmfby.gov.in

5. 💳 *किसान क्रेडिट कार्ड (KCC):*
   • समय पर भुगतान पर मात्र 4% सस्ती ब्याज दर पर ₹3 लाख तक का कृषि ऋण।

⚠️ _सूचना: यह केवल योजना मार्गदर्शन है। पात्रता, e-KYC और आवेदन आधिकारिक सरकारी पोर्टल पर ही करें।_

आप किस विशेष योजना (पीएम-किसान, महाडीबीटी सब्सिडी या फसल बीमा) की जानकारी चाहते हैं?`,

    mr: `🏛️ *शेतकरी शासकीय योजना व महाडीबीटी माहिती*

शेतकऱ्यांसाठी केंद्र व महाराष्ट्र शासनाच्या प्रमुख योजनांची अधिकृत माहिती:

१. 🇮🇳 *पीएम-किसान सन्मान निधी (भारत सरकार):*
   • पात्र शेतकरी कुटुंबांना वार्षिक ₹६,००० (₹२,००० चे ३ हप्ते थेट बँक खात्यात DBT द्वारे).
   • अधिकृत संकेतस्थळ: https://pmkisan.gov.in

२. 🌾 *महाडीबीटी शेतकरी पोर्टल (MahaDBT - महाराष्ट्र शासन):*
   • महाराष्ट्र शासनाचे कृषी योजनांसाठीचे 'एकल अर्ज' (Single Application) पोर्टल:
     - *कृषी यांत्रिकीकरण:* ट्रॅक्टर, पॉवर टिलर, रोटाव्हेटर व औजारांवर ५०% पर्यंत अनुदान.
     - *सूक्ष्म सिंचन (PMKSY):* ठिबक व तुषार सिंचनासाठी अल्प/अत्यल्प भूधारकांना ७५% ते ८०% पर्यंत अनुदान.
     - *फळबाग व शेततळे:* भाऊसाहेब फुंडकर फळबाग लागवड, शेडनेट, पॉलीहाऊस व शेततळे.
   • अधिकृत संकेतस्थळ: https://mahadbt.maharashtra.gov.in

३. 🚩 *नमो शेतकरी महासन्मान निधी योजना (महाराष्ट्र):*
   • महाराष्ट्रातील पीएम-किसान लाभार्थ्यांना राज्य शासनाकडून अतिरिक्त ₹६,०००/वर्ष (एकूण ₹१२,०००/वर्ष).

४. 🛡️ *प्रधानमंत्री पीक विमा योजना (PMFBY):*
   • नैसर्गिक आपत्ती व हवामान नुकसानीपासून पीक संरक्षण (महाराष्ट्रात केवळ ₹१ टोकन दरात).
   • अधिकृत संकेतस्थळ: https://pmfby.gov.in

५. 💳 *किसान क्रेडिट कार्ड (KCC):*
   • नियमित परतफेडीवर केवळ ४% सवलतीच्या व्याजदरात ₹३ लाखांपर्यंत पीक कर्ज.

⚠️ _टीप: ही केवळ योजनांची मार्गदर्शक माहिती आहे. पात्रता, e-KYC व अर्ज अधिकृत पोर्टलवरच करा._

आपल्याला यापैकी कोणत्या योजनेची (उदा. पीएम-किसान, महाडीबीटी ट्रॅक्टर/ठिबक अनुदान) सविस्तर माहिती हवी आहे?`,

    hinglish: `🏛️ *Kisan Sarkari Yojana & MahaDBT Alerts*

Kisan ke liye important Central & Maharashtra Government schemes:

1. 🇮🇳 *PM-KISAN Samman Nidhi (Govt of India):*
   • Eligible landholder farmers ko ₹6,000/year (3 installments of ₹2,000 directly via DBT).
   • Official Portal: https://pmkisan.gov.in

2. 🌾 *MahaDBT Farmer Portal (Maharashtra Govt):*
   • Maharashtra ka single-window portal jahan agriculture subsidies ke liye apply hota hai:
     - *Farm Mechanization:* Tractor, rotavator aur implements par subsidy.
     - *Micro-Irrigation (PMKSY):* Drip (thibak) aur sprinkler sets par 75%–80% subsidy.
     - *Horticulture & Farm Ponds:* Falbag lagwad, shade net aur shet tale.
   • Official Portal: https://mahadbt.maharashtra.gov.in

3. 🚩 *Namo Shetkari Yojana (Maharashtra):*
   • Maharashtra ke PM-Kisan beneficiaries ko extra ₹6,000/year (Total ₹12,000/year).

4. 🛡️ *PM Fasal Bima Yojana (PMFBY):*
   • Natural disaster aur weather damage se crop insurance (₹1 token premium in Maharashtra).
   • Official Portal: https://pmfby.gov.in

5. 💳 *Kisan Credit Card (KCC):*
   • Timely repayment par sirf 4% interest rate par ₹3 Lakh tak ka crop loan.

⚠️ _Note: Ye scheme awareness information hai. Eligibility, e-KYC aur online application official portals par hi check karein._

Aapko kis yojana (PM-Kisan, MahaDBT subsidy ya Crop Insurance) ke baare me specific jaankari chahiye?`
  },

  // 2. Specific PM-KISAN Information
  pm_kisan: {
    en: `🏛️ *PM-KISAN Samman Nidhi Scheme*

• *Authority:* Ministry of Agriculture & Farmers Welfare, Government of India
• *Financial Benefit:* ₹6,000 per year (transferred in 3 equal installments of ₹2,000 directly via DBT into Aadhaar-seeded bank accounts).
• *Maharashtra Beneficiaries:* Also eligible for *Namo Shetkari Yojana* (additional ₹6,000/year from Maharashtra State Govt, totaling ₹12,000/year).

📌 *Key Eligibility & Requirements:*
1. Must be a landholding farmer family with cultivable land in land records.
2. Mandatory Aadhaar e-KYC completed on the portal.
3. Bank account must be Aadhaar-seeded and active.
4. Land details must be mapped in the state revenue records.

🔗 *Official Portal:* https://pmkisan.gov.in
_(Use the official portal for New Farmer Registration, e-KYC, and Beneficiary Status check)._

Would you like information on how to complete e-KYC or check MahaDBT state subsidies?`,

    hi: `🏛️ *पीएम-किसान सम्मान निधि योजना (PM-KISAN)*

• *प्रदाता:* कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार
• *वित्तीय सहायता:* ₹6,000 प्रति वर्ष (₹2,000 की 3 समान किस्तों में सीधे आधार-सीडेड बैंक खाते में DBT द्वारा)।
• *महाराष्ट्र के किसान:* नमो शेतकरी योजना के तहत ₹6,000/वर्ष अतिरिक्त प्राप्त करते हैं (कुल ₹12,000/वर्ष)।

📌 *प्रमुख पात्रता एवं आवश्यकताएं:*
1. भू-अभिलेख में नाम दर्ज पात्र किसान परिवार।
2. आधिकारिक पोर्टल पर आधार e-KYC अनिवार्य।
3. बैंक खाता आधार से लिंक (Aadhaar Seeded DBT Enabled) होना आवश्यक।
4. भूमि विवरण (Land Seeding) का सत्यापन।

🔗 *आधिकारिक पोर्टल:* https://pmkisan.gov.in
_(नया किसान पंजीकरण, e-KYC और किस्त स्टेटस केवल आधिकारिक पोर्टल पर देखें)।_

क्या आप e-KYC प्रक्रिया या महाराष्ट्र महाडीबीटी (MahaDBT) योजनाओं की जानकारी चाहते हैं?`,

    mr: `🏛️ *पीएम-किसान सन्मान निधी योजना (PM-KISAN)*

• *प्रदाता:* कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार
• *आर्थिक लाभ:* वार्षिक ₹६,००० (₹२,००० चे ३ समान हप्ते थेट आधार-संलग्न बँक खात्यात DBT द्वारे जमा).
• *महाराष्ट्र शेतकरी लाभ:* 'नमो शेतकरी महासन्मान निधी' अंतर्गत अतिरिक्त ₹६,०००/वर्ष (एकूण ₹१२,०००/वर्ष).

📌 *महत्त्वाच्या अटी व आवश्यकता:*
१. महसूल नोंदीत (७/१२) शेतजमीन नावावर असणारे पात्र शेतकरी कुटुंब.
२. पोर्टलवर आधार e-KYC पूर्ण असणे बंधनकारक.
३. बँक खाते आधार लिंक (DBT Enabled) व सक्रिय असणे आवश्यक.
४. जमिनीची नोंद (Land Seeding) झालेली असावी.

🔗 *अधिकृत संकेतस्थळ:* https://pmkisan.gov.in
_(नवीन शेतकरी नोंदणी, e-KYC व हप्त्याची स्थिती अधिकृत पोर्टलवर तपासा)._

आपल्याला e-KYC प्रक्रियेबद्दल किंवा महाडीबीटी (MahaDBT) अनुदानाबद्दल अधिक माहिती हवी आहे का?`,

    hinglish: `🏛️ *PM-KISAN Samman Nidhi Scheme*

• *Authority:* Government of India (Ministry of Agriculture)
• *Financial Benefit:* ₹6,000 per year (3 installments of ₹2,000 directly via DBT).
• *Maharashtra Farmers:* Namo Shetkari Yojana ke sath extra ₹6,000/year (Total ₹12,000/year).

📌 *Key Requirements:*
1. Landholding farmer family with valid land records.
2. Aadhaar e-KYC mandatory on official portal.
3. Bank account Aadhaar-seeded & DBT active.
4. Land details verification (Land Seeding).

🔗 *Official Portal:* https://pmkisan.gov.in
_(New Registration, e-KYC aur Beneficiary Status ke liye official portal use karein)._

Kya aapko e-KYC ya MahaDBT state subsidies ki jaankari chahiye?`
  },

  // 3. Specific MahaDBT Portal & Subsidy Information
  // 3. Namo Shetkari Mahasanman Nidhi Yojana
  namo_shetkari: {
    en: `🚩 *Namo Shetkari Mahasanman Nidhi Yojana (Govt of Maharashtra)*

• *Authority:* Department of Agriculture, Government of Maharashtra
• *Financial Benefit:* ₹6,000 per year provided by Maharashtra State in 3 installments of ₹2,000 directly via DBT.
• *Combined Support:* Given on top of PM-KISAN, providing a total of **₹12,000 per year** to eligible Maharashtra farmers.

👥 *Who May Be Eligible:*
• Farmers in Maharashtra who are approved and verified active beneficiaries under the central PM-KISAN scheme.

📄 *Required Verification:*
1. Active PM-KISAN Beneficiary ID
2. Aadhaar-seeded DBT active bank account
3. Verified 7/12 land mapping in Maharashtra revenue records

🔗 *Official Portals:* https://mahadbt.maharashtra.gov.in | https://pmkisan.gov.in

Would you like to check details on crop insurance (PMFBY) or MahaDBT farm subsidies?`,

    hi: `🚩 *नमो शेतकरी महासन्मान निधि योजना (महाराष्ट्र शासन)*

• *प्रदाता:* कृषि विभाग, महाराष्ट्र शासन
• *वित्तीय सहायता:* ₹6,000 प्रति वर्ष (₹2,000 की 3 किस्तों में सीधे बैंक खाते में)।
• *संयुक्त लाभ:* पीएम-किसान के ₹6,000 के अतिरिक्त, यानी महाराष्ट्र के पात्र किसानों को कुल **₹12,000 प्रति वर्ष**।

👥 *कौन पात्र हो सकते हैं:*
• महाराष्ट्र के वे किसान जो केंद्र सरकार की पीएम-किसान योजना में स्वीकृत एवं सत्यापित लाभार्थी हैं।

📄 *आवश्यक आवश्यकताएं:*
1. पीएम-किसान पंजीकरण एवं e-KYC सक्रिय होना
2. आधार लिंक बैंक खाता
3. 7/12 व भू-अभिलेख सत्यापन

🔗 *आधिकारिक पोर्टल:* https://mahadbt.maharashtra.gov.in | https://pmkisan.gov.in

क्या आप फसल बीमा (PMFBY) या महाडीबीटी कृषि यंत्र सब्सिडी की जानकारी चाहते हैं?`,

    mr: `🚩 *नमो शेतकरी महासन्मान निधी योजना (महाराष्ट्र शासन)*

• *प्रदाता:* कृषी विभाग, महाराष्ट्र शासन
• *आर्थिक लाभ:* वार्षिक ₹६,००० (₹२,००० चे ३ हप्ते थेट बँक खात्यात).
• *एकत्रित लाभ:* केंद्र शासनाच्या पीएम-किसान योजनेच्या ₹६,००० व्यतिरिक्त, म्हणजेच महाराष्ट्रातील पात्र शेतकऱ्यांना एकूण **वार्षिक ₹१२,०००**.

👥 *कोण पात्र ठरू शकतात:*
• महाराष्ट्रातील शेतकरी जे केंद्र शासनाच्या पीएम-किसान योजनेत मंजूर व सक्रिय लाभार्थी आहेत.

📄 *आवश्यक बाबी:*
१. सक्रिय पीएम-किसान नोंदणी व e-KYC
२. आधार संलग्न बँक खाते
३. ७/१२ महसूल नोंदणी पडताळणी

🔗 *अधिकृत संकेतस्थळ:* https://mahadbt.maharashtra.gov.in | https://pmkisan.gov.in

आपल्याला पीक विमा (PMFBY) किंवा महाडीबीटी अनुदानाबद्दल माहिती हवी आहे का?`,

    hinglish: `🚩 *Namo Shetkari Mahasanman Nidhi Yojana (Maharashtra)*

• *Authority:* Government of Maharashtra
• *Financial Support:* ₹6,000 per year (3 installments of ₹2,000 via DBT).
• *Combined Benefit:* PM-KISAN ke ₹6,000 ke sath milakar total **₹12,000/year**.

👥 *Who May Be Eligible:*
• Maharashtra ke farmers jo central PM-KISAN scheme me approved beneficiaries hain.

📄 *Requirements:*
1. Active PM-KISAN registration & e-KYC
2. Aadhaar-seeded bank account
3. 7/12 land record verification

🔗 *Official Portals:* https://mahadbt.maharashtra.gov.in | https://pmkisan.gov.in

Kya aapko crop insurance (PMFBY) ya MahaDBT farm subsidies ki jaankari chahiye?`
  },

  // 4. PM Fasal Bima Yojana (PMFBY)
  pmfby: {
    en: `🛡️ *PM Fasal Bima Yojana (PMFBY - Crop Insurance)*

• *Authority:* Ministry of Agriculture & Farmers Welfare / State Agriculture Dept
• *Protection:* Comprehensive risk insurance covering non-preventable natural risks (dry spells, flood, pest outbreaks, unseasonal rains, and post-harvest losses).
• *Maharashtra Special Token:* Farmers in Maharashtra can enroll at just **₹1 token premium**.

👥 *Who May Be Eligible:*
• All farmers growing notified crops (such as Soybean, Cotton, Tur, Wheat) in notified areas, including owner cultivators and tenant farmers.

📅 *Important Deadlines:*
• Kharif Season Cutoff: Typically July 31
• Rabi Season Cutoff: Typically December 15

📄 *Required Documents:*
1. 7/12 Land Extract & 8-A Record
2. Sowing Certificate / E-Pik Pahani (ई-पीक पाहणी नोंद)
3. Bank Passbook copy (Aadhaar linked)
4. Aadhaar Card

🔗 *Official Portal:* https://pmfby.gov.in

Would you like information on how to report crop loss or check other state schemes?`,

    hi: `🛡️ *प्रधानमंत्री फसल बीमा योजना (PMFBY)*

• *प्रदाता:* कृषि एवं किसान कल्याण मंत्रालय / राज्य कृषि विभाग
• *सुरक्षा:* सूखा, अत्यधिक वर्षा, बाढ़, कीट प्रकोप एवं बेमौसम बारिश से फसल सुरक्षा।
• *महाराष्ट्र विशेष टोकन:* महाराष्ट्र में किसान मात्र **₹1 टोकन प्रीमियम** पर फसल बीमा करा सकते हैं।

👥 *कौन पात्र हो सकते हैं:*
• अधिसूचित क्षेत्रों में अधिसूचित फसलें (सोयाबीन, कपास, तुअर, गेहूं) उगाने वाले सभी भूधारक व काश्तकार किसान।

📅 *महत्वपूर्ण समय-सीमा (Deadlines):*
• खरीफ फसल: सामान्यतः 31 जुलाई तक
• रबी फसल: सामान्यतः 15 दिसंबर तक

📄 *आवश्यक दस्तावेज:*
1. 7/12 खसरा नकल व 8-अ
2. बुवाई प्रमाण पत्र / ई-पीक पाहणी (E-Pik Pahani)
3. आधार कार्ड एवं बैंक पासबुक

🔗 *आधिकारिक पोर्टल:* https://pmfby.gov.in

क्या आप फसल क्षति क्लेम प्रक्रिया या महाडीबीटी योजनाओं की जानकारी चाहते हैं?`,

    mr: `🛡️ *प्रधानमंत्री पीक विमा योजना (PMFBY)*

• *प्रदाता:* कृषी व शेतकरी कल्याण मंत्रालय / महाराष्ट्र शासन कृषी विभाग
• *संरक्षण:* दुष्काळ, अतिवृष्टी, कीड-रोग, अवकाळी पाऊस या नैसर्गिक आपत्तींपासून व्यापक पीक संरक्षण.
• *महाराष्ट्र शासन विशेष सवलत:* महाराष्ट्रातील शेतकऱ्यांसाठी केवळ **₹१ नाममात्र टोकन दरात** पीक विमा उपलब्ध.

👥 *कोण पात्र ठरू शकतात:*
• अधिसूचित क्षेत्रातील अधिसूचित पिके (उदा. सोयाबीन, कापूस, तूर, गहू) घेणारे सर्व शेतकरी.

📅 *महत्त्वाच्या मुदती (Deadlines):*
• खरीप हंगाम: साधारणतः ३१ जुलैपर्यंत
• रब्बी हंगाम: साधारणतः १५ डिसेंबरपर्यंत

📄 *आवश्यक कागदपत्रे:*
१. ७/१२ व ८-अ उतारा
२. ई-पीक पाहणी (E-Pik Pahani) नोंद / पेरणी स्वयंघोषणा
३. बँक पासबुक प्रत (आधार संलग्न)
४. आधार कार्ड

🔗 *अधिकृत संकेतस्थळ:* https://pmfby.gov.in

आपल्याला पीक नुकसान नोंदणी किंवा महाडीबीटी अनुदानाबद्दल माहिती हवी आहे का?`,

    hinglish: `🛡️ *PM Fasal Bima Yojana (PMFBY - Crop Insurance)*

• *Authority:* Ministry of Agriculture & Farmers Welfare
• *Protection:* Drought, flood, pest attack aur unseasonal rain se crop damage cover.
• *Maharashtra Special:* Maharashtra me farmers sirf **₹1 token premium** par insurance apply kar sakte hain.

👥 *Who May Be Eligible:*
• Notified area me notified crops (Soybean, Cotton, Tur, Wheat) grow karne wale sabhi farmers.

📅 *Key Deadlines:*
• Kharif cutoff: Usually July 31
• Rabi cutoff: Usually December 15

📄 *Required Documents:*
1. 7/12 Land Record & 8-A
2. E-Pik Pahani (ई-पीक पाहणी) sowing record
3. Bank passbook copy
4. Aadhaar Card

🔗 *Official Portal:* https://pmfby.gov.in

Kya aapko crop loss claim process ya MahaDBT schemes ke baare me janna hai?`
  },

  // 5. Kisan Credit Card (KCC)
  kcc: {
    en: `💳 *Kisan Credit Card (KCC) Scheme*

• *Authority:* Ministry of Agriculture & Reserve Bank of India (RBI)
• *Financial Support:* Concessional short-term crop loans up to ₹3 Lakh at an effective interest rate of **4% per annum** (upon prompt repayment with 3% prompt repayment subvention).

👥 *Who May Be Eligible:*
• Owner cultivators, tenant farmers, oral lessees, sharecroppers, and allied activity farmers (dairy/fisheries).

📄 *Required Documents:*
1. KCC Application form from local bank branch or CSC
2. 7/12 Land Revenue records & crop sowing declaration
3. Aadhaar Card & PAN Card
4. Passport size photograph

🔗 *Official Information:* Contact your nearest Commercial Bank, RRB, DCCB or visit https://www.myscheme.gov.in/schemes/kcc

Would you like to explore government subsidy schemes or mandi prices?`,

    hi: `💳 *किसान क्रेडिट कार्ड (KCC) योजना*

• *प्रदाता:* कृषि मंत्रालय एवं भारतीय रिज़र्व बैंक (RBI)
• *वित्तीय सहायता:* समय पर भुगतान पर मात्र **4% वार्षिक रियायती ब्याज दर** पर ₹3 लाख तक का कृषि ऋण (3% ब्याज छूट सहायता के साथ)।

👥 *कौन पात्र हो सकते हैं:*
• स्वयं की भूमि पर खेती करने वाले किसान, बटाईदार एवं काश्तकार तथा पशुपालन/डेयरी किसान।

📄 *आवश्यक दस्तावेज:*
1. बैंक शाखा या CSC से KCC आवेदन फॉर्म
2. 7/12 भूमि रिकॉर्ड एवं बुवाई घोषणा
3. आधार कार्ड एवं पैन कार्ड
4. बैंक खाता विवरण

🔗 *आधिकारिक जानकारी:* नजदीकी राष्ट्रीयकृत बैंक, ग्रामीण बैंक या https://www.myscheme.gov.in/schemes/kcc

क्या आप सरकारी सब्सिडी योजनाएं या मंडी भाव देखना चाहते हैं?`,

    mr: `💳 *किसान क्रेडिट कार्ड (KCC) योजना*

• *प्रदाता:* कृषी मंत्रालय व रिझर्व्ह बँक ऑफ इंडिया (RBI)
• *आर्थिक लाभ:* नियमित परतफेडीवर केवळ **४% सवलतीच्या व्याजदरात** ₹३ लाखांपर्यंत अल्पमुदत पीक कर्ज (३% व्याज सवलत अनुदानासह).

👥 *कोण पात्र ठरू शकतात:*
• खातेदार शेतकरी, कुळ शेतकरी, तसेच दुग्धव्यवसाय व पशुपालन करणारे शेतकरी.

📄 *आवश्यक कागदपत्रे:*
१. बँकेतील KCC अर्ज
२. जमिनीचा ७/१२ व ८-अ उतारा आणि पेरणी स्वयंघोषणा
३. आधार कार्ड व पॅन कार्ड
४. बँक खाते माहिती

🔗 *अधिकृत माहिती:* नजीकच्या बँक शाखेत, जिल्हा मध्यवर्ती बँकेत संपर्क साधा किंवा https://www.myscheme.gov.in/schemes/kcc ला भेट द्या.

आपल्याला शासकीय अनुदान किंवा बाजारभाव पाहायचा आहे का?`,

    hinglish: `💳 *Kisan Credit Card (KCC) Scheme*

• *Authority:* Ministry of Agriculture & RBI
• *Financial Support:* Timely repayment par sirf **4% concessional interest rate** par ₹3 Lakh tak ka crop loan.

👥 *Who May Be Eligible:*
• Landowner farmers, tenant farmers aur dairy/animal husbandry farmers.

📄 *Required Documents:*
1. KCC Form from bank / CSC
2. 7/12 Land Record & crop declaration
3. Aadhaar Card & PAN Card
4. Bank details

🔗 *Official Info:* Nearest Bank branch, RRB, DCCB ya https://www.myscheme.gov.in/schemes/kcc

Kya aapko government subsidies ya mandi rates check karne hain?`
  },

  // 6. Specific MahaDBT Portal & Subsidy Information
  mahadbt: {
    en: `🌾 *MahaDBT Farmer Schemes (Government of Maharashtra)*

• *Platform:* MahaDBT (Direct Benefit Transfer) Agricultural Portal
• *Portal URL:* https://mahadbt.maharashtra.gov.in
• *Concept:* One Single Registration to apply for multiple state & central agriculture subsidy schemes.

📌 *Key Schemes Available on MahaDBT:*
1. 🚜 *Farm Mechanization (कृषी यांत्रिकीकरण):*
   • Subsidies on tractors (up to ₹1.25 Lakh for SC/ST/Women/Small farmers, ₹1 Lakh for general), rotavators, power tillers, threshers.
2. 💧 *Micro-Irrigation / PMKSY (ठिबक व तुषार सिंचन):*
   • 75% to 80% subsidy for small & marginal farmers on drip & sprinkler irrigation systems.
3. 🍎 *Horticulture & Protected Cultivation:*
   • Bhausaheb Fundkar Orchard Scheme, shade net houses, plastic mulching, pack houses.
4. 🏞️ *Special Water Schemes:*
   • Farm ponds (शेततळे), community farm ponds, and electric/solar pump assistance.

⚠️ *Application Process on MahaDBT:*
1. Register with Aadhaar on https://mahadbt.maharashtra.gov.in
2. Create Farmer Profile and upload 7/12 & 8-A land extract.
3. Select desired scheme components and submit nominal application fee.
4. Selection is done via transparent online lottery (लॉटरी पद्धत).

Which MahaDBT component (Tractor subsidy, Drip irrigation, or Farm pond) do you want to explore?`,

    hi: `🌾 *महाडीबीटी शेतकरी योजना (MahaDBT - महाराष्ट्र शासन)*

• *प्लेटफॉर्म:* महाडीबीटी (MahaDBT) कृषि पोर्टल
• *आधिकारिक पोर्टल:* https://mahadbt.maharashtra.gov.in
• *मुख्य विशेषता:* एक ही प्रोफाइल पंजीकरण से विभिन्न कृषि सब्सिडी योजनाओं में आवेदन की सुविधा।

📌 *महाडीबीटी पर उपलब्ध प्रमुख सब्सिडी योजनाएं:*
1. 🚜 *कृषि यांत्रिकीकरण योजना:*
   • ट्रैक्टर (₹1 लाख से ₹1.25 लाख तक अनुदान), रोटावेटर, कल्टीवेटर, थ्रेशर व पावर टिलर पर 40%–50% सब्सिडी।
2. 💧 *सूक्ष्म सिंचाई योजना (PMKSY):*
   • ड्रिप (टपक) एवं स्प्रिंकलर (फव्वारा) सिंचाई संयंत्रों पर छोटे व सीमांत किसानों को 75%–80% तक अनुदान।
3. 🍎 *फलोत्पादन व संरक्षित खेती:*
   • भाऊसाहेब फुंडकर फलोत्पादन योजना, शेडनेट हाउस, पॉलीहाउस एवं मल्चिंग पेपर अनुदान।
4. 🏞️ *खेत तालाब एवं सिंचाई स्त्रोत:*
   • मागेल त्याला शेततळे (मांगने पर खेत तालाब), कुआं व सौर/विद्युत पंप सहायता।

⚠️ *आवेदन प्रक्रिया:*
1. https://mahadbt.maharashtra.gov.in पर आधार से पंजीकरण करें।
2. किसान प्रोफाइल बनाकर 7/12 और 8-अ जोड़ें।
3. आवश्यक योजना का चयन कर आवेदन सबमिट करें (चयन ऑनलाइन लॉटरी प्रणाली द्वारा होता है)।

आप किस महाडीबीटी योजना (ट्रैक्टर अनुदान, ड्रिप सिंचाई या खेत तालाब) के बारे में जानना चाहते हैं?`,

    mr: `🌾 *महाडीबीटी शेतकरी योजना (महाराष्ट्र शासन कृषी विभाग)*

• *प्लॅटफॉर्म:* महाडीबीटी (MahaDBT) शेतकरी पोर्टल
• *अधिकृत संकेतस्थळ:* https://mahadbt.maharashtra.gov.in
• *संकल्पना:* 'एक शेतकरी, एक अर्ज' – एकाच नोंदणीवरून विविध कृषी अनुदानांसाठी अर्ज करता येतो.

📌 *महाडीबीटीवरील प्रमुख योजना घटक:*
१. 🚜 *कृषी यांत्रिकीकरण उपअभियान:*
   • ट्रॅक्टर (महिला, अनु. जाती/जमाती व अल्प भूधारकांसाठी ₹१.२५ लाख, सर्वसाधारण ₹१ लाख), रोटाव्हेटर, पॉवर टिलर, मळणी यंत्र यांवर ५०% पर्यंत अनुदान.
२. 💧 *सूक्ष्म सिंचन योजना (PMKSY):*
   • ठिबक व तुषार सिंचनासाठी अल्प/अत्यल्प भूधारकांना ८०% व इतर शेतकऱ्यांना ७५% पर्यंत शासकीय अनुदान.
३. 🍎 *फळबाग व संरक्षित शेती:*
   • भाऊसाहेब फुंडकर फळबाग लागवड योजना, शेडनेट हाऊस, पॉलीहाऊस व प्लॅस्टिक मल्चिंग.
४. 🏞️ *शेततळे व विहीर घटक:*
   • मागेल त्याला शेततळे, अस्तरीकरण, विहीर व सौर कृषी पंप सहाय्य.

⚠️ *अर्ज प्रक्रिया:*
१. https://mahadbt.maharashtra.gov.in वर आधार क्रमांकाने नोंदणी करा.
२. शेतकरी प्रोफाईल पूर्ण करून ७/१२ व ८-अ संलग्न करा.
३. 'घटक निवडा' मध्ये जाऊन हव्या त्या योजनेसाठी नाममात्र शुल्कात अर्ज सादर करा.
४. लाभार्थ्यांची निवड पारदर्शक ऑनलाईन संगणकीय सोडत (लॉटरी) द्वारे होते.

आपल्याला यापैकी कोणत्या घटकासाठी (उदा. ट्रॅक्टर, ठिबक सिंचन की शेततळे) अर्ज करायचा आहे?`,

    hinglish: `🌾 *MahaDBT Farmer Schemes (Maharashtra Government)*

• *Platform:* MahaDBT Agriculture Portal
• *Official Portal:* https://mahadbt.maharashtra.gov.in
• *Concept:* Ek single profile se multiple agriculture subsidy schemes ke liye apply karne ki suvidha.

📌 *Key Schemes on MahaDBT:*
1. 🚜 *Farm Mechanization (Tractor & Implements):*
   • Tractor subsidy (up to ₹1.25 Lakh), rotavator, power tiller aur threshers par 40%–50% subsidy.
2. 💧 *Micro-Irrigation (Drip & Sprinkler):*
   • Small & marginal farmers ke liye drip (thibak) aur sprinkler par 75%–80% subsidy.
3. 🍎 *Horticulture & Shade Net:*
   • Bhausaheb Fundkar Falbag lagwad, shade net house aur mulching paper subsidy.
4. 🏞️ *Farm Ponds (Shet Tale):*
   • Magel Tyala Shet Tale aur solar pump assistance.

⚠️ *Application Process:*
1. Visit https://mahadbt.maharashtra.gov.in and login with Aadhaar.
2. Farmer profile create karke 7/12 & 8-A update karein.
3. Desired scheme component choose karke online apply karein (Selection is via transparent online lottery).

Aapko kis scheme (Tractor subsidy, Drip irrigation ya Shet Tale) ke baare me janna hai?`
  },

  // 7. Subsidy Specific Inquiries
  subsidy: {
    en: `🚜 *Farmer Subsidy & Financial Assistance Highlights*

Government subsidies available for agriculture infrastructure and inputs:

1. 💧 *Micro-Irrigation (Drip & Sprinkler) Subsidy:*
   • 75% to 80% financial assistance for small/marginal farmers under PMKSY.
   • Apply on: https://mahadbt.maharashtra.gov.in

2. 🚜 *Tractor & Farm Implements Subsidy:*
   • 40% to 50% subsidy on tractors, rotavators, power tillers, and sowing equipment via MahaDBT Farm Mechanization component.

3. 🌞 *PM-KUSUM Solar Agricultural Pump Subsidy:*
   • Up to 90% subsidy on standalone off-grid solar water pumps for irrigation.

4. 🏛️ *PM-KISAN & Namo Shetkari Financial Aid:*
   • Direct annual assistance of ₹12,000/year (₹6,000 Central + ₹6,000 Maharashtra State).

⚠️ _All official subsidy applications in Maharashtra are routed through https://mahadbt.maharashtra.gov.in via transparent lottery system._

Which equipment or subsidy (Tractor, Drip irrigation, Solar pump) are you planning to apply for?`,

    hi: `🚜 *कृषि यंत्र, ड्रिप एवं किसान सब्सिडी विवरण*

किसानों के लिए प्रमुख सरकारी सब्सिडी (अनुदान) योजनाएं:

1. 💧 *ड्रिप एवं स्प्रिंकलर सिंचाई सब्सिडी (PMKSY):*
   • छोटे व सीमांत किसानों को ड्रिप (टपक) व फव्वारा संयंत्रों पर 75% से 80% तक अनुदान।
   • आवेदन पोर्टल: https://mahadbt.maharashtra.gov.in

2. 🚜 *ट्रैक्टर एवं कृषि यंत्र अनुदान:*
   • ट्रैक्टर (₹1 लाख से ₹1.25 लाख तक), रोटावेटर, बुवाई यंत्र व थ्रेशर पर 40% से 50% सब्सिडी।

3. 🌞 *पीएम-कुसुम सोलर पंप योजना:*
   • सिंचाई के लिए सोलर कृषि पंप लगाने पर 90% तक सरकारी अनुदान।

4. 🏛️ *पीएम-किसान एवं नमो शेतकरी आर्थिक सहायता:*
   • सीधे बैंक खाते में ₹12,000 प्रति वर्ष (₹6,000 केंद्र सरकार + ₹6,000 महाराष्ट्र शासन)।

⚠️ _महाराष्ट्र में सभी कृषि यंत्र एवं सिंचाई अनुदान के लिए आवेदन केवल https://mahadbt.maharashtra.gov.in पर लॉटरी माध्यम से होते हैं।_

आप किस उपकरण या योजना (ट्रैक्टर, ड्रिप या सोलर पंप) के लिए सब्सिडी जानना चाहते हैं?`,

    mr: `🚜 *कृषी यंत्र, ठिबक व शेतकरी शासकीय अनुदान*

शेतकऱ्यांसाठी उपलब्ध प्रमुख शासकीय अनुदाने:

१. 💧 *ठिबक व तुषार सिंचन अनुदान (PMKSY):*
   • अल्प व अत्यल्प भूधारक शेतकऱ्यांना ठिबक व तुषार संचावर ७५% ते ८०% पर्यंत शासकीय अनुदान.
   • अर्ज संकेतस्थळ: https://mahadbt.maharashtra.gov.in

२. 🚜 *ट्रॅक्टर व कृषी अवजारे अनुदान:*
   • ट्रॅक्टर (₹१ लाख ते ₹१.२५ लाख), रोटाव्हेटर, पेरणी यंत्र, मळणी यंत्र व पॉवर टिलरवर ४०% ते ५०% अनुदान.

३. 🌞 *पीएम-कुसुम सौर कृषी पंप योजना:*
   • शेती सिंचनासाठी सौर कृषी पंपावर ९०% पर्यंत भरीव अनुदान.

४. 🏛️ *पीएम-किसान व नमो शेतकरी योजना:*
   • थेट बँक खात्यात वार्षिक ₹१२,००० (₹६,००० केंद्र शासन + ₹६,००० महाराष्ट्र शासन).

⚠️ _महाराष्ट्रात सर्व कृषी यांत्रिकीकरण व सिंचन अनुदानाचे अर्ज https://mahadbt.maharashtra.gov.in वर ऑनलाईन लॉटरी पद्धतीने होतात._

आपल्याला कोणत्या उपकरणाच्या (उदा. ट्रॅक्टर, ठिबक सिंचन की सौर पंप) अनुदानासाठी माहिती हवी आहे?`,

    hinglish: `🚜 *Farmer Subsidy & Machinery Grants*

Kisan ke liye important government subsidies:

1. 💧 *Micro-Irrigation (Drip & Sprinkler) Subsidy:*
   • Small & marginal farmers ko 75% to 80% subsidy under PMKSY.
   • Apply portal: https://mahadbt.maharashtra.gov.in

2. 🚜 *Tractor & Agricultural Machinery Grant:*
   • Tractor (₹1 Lakh to ₹1.25 Lakh grant), rotavator, power tiller par 40% to 50% subsidy.

3. 🌞 *PM-KUSUM Solar Pump Subsidy:*
   • Solar agriculture pump par up to 90% government subsidy.

4. 🏛️ *PM-KISAN & Namo Shetkari Direct Cash:*
   • Direct bank account me ₹12,000/year (₹6,000 Central + ₹6,000 Maharashtra State).

⚠️ _Maharashtra me sabhi machine aur irrigation subsidies ke application https://mahadbt.maharashtra.gov.in par lottery system se hote hain._

Aap kis component (Tractor, Drip irrigation ya Solar pump) ke subsidy ke baare me janna chahte hain?`
  },

  // 8. Proactive Scheme Alerts & Updates
  alert: {
    en: `🌱 *CropCash Government Scheme Alert*

Key agriculture updates & opportunities that may be relevant for farmers in Maharashtra:

• *MahaDBT Farm Subsidies:* Applications for Drip/Sprinkler Irrigation (up to 80% subsidy) and Farm Mechanization (Tractors/Rotavators) are open on https://mahadbt.maharashtra.gov.in.
• *PM-KISAN & Namo Shetkari:* Direct assistance of ₹12,000/year for landholding farmers with completed e-KYC on https://pmkisan.gov.in.
• *PMFBY Crop Insurance:* Seasonal risk protection available at ₹1 token premium on https://pmfby.gov.in.

_Note: Farmers may be eligible depending on landholding and state criteria. Applications must be completed on official portals._

Would you like me to check the eligibility criteria, required documents, or official application link for any specific scheme?`,

    hi: `🌱 *क्रॉपकैश सरकारी योजना अलर्ट (Scheme Alert)*

किसानों के लिए महत्वपूर्ण सरकारी योजना अपडेट:

• *महाडीबीटी कृषि अनुदान:* ड्रिप/स्प्रिंकलर सिंचाई (80% तक सब्सिडी) एवं ट्रैक्टर/कृषि यंत्रों के लिए https://mahadbt.maharashtra.gov.in पर ऑनलाइन आवेदन जारी हैं।
• *पीएम-किसान एवं नमो शेतकरी:* ई-केवाईसी पूर्ण भूमिधारक किसानों को ₹12,000/वर्ष का सीधा लाभ (https://pmkisan.gov.in)।
• *पीएम फसल बीमा योजना:* प्राकृतिक जोखिम सुरक्षा मात्र ₹1 टोकन प्रीमियम पर (https://pmfby.gov.in)।

_सूचना: लाभ पात्रता एवं नियमों पर निर्भर करते हैं। आवेदन आधिकारिक पोर्टल पर ही करें।_

क्या आप किसी विशेष योजना की पात्रता, आवश्यक दस्तावेज या आधिकारिक लिंक देखना चाहते हैं?`,

    mr: `🌱 *क्रॉपकॅश शासकीय योजना अलर्ट*

शेतकऱ्यांसाठी महत्त्वाचे शासकीय योजना अपडेट:

• *महाडीबीटी कृषी योजना:* ठिबक/तुषार सिंचन (८०% पर्यंत अनुदान) आणि ट्रॅक्टर/अवजारे अनुदानासाठी https://mahadbt.maharashtra.gov.in वर ऑनलाईन अर्ज सुरू आहेत.
• *पीएम-किसान व नमो शेतकरी:* ई-केवायसी पूर्ण असलेल्या शेतकऱ्यांना वार्षिक ₹१२,००० थेट अर्थसहाय्य (https://pmkisan.gov.in).
• *प्रधानमंत्री पीक विमा (PMFBY):* नैसर्गिक आपत्तींपासून पीक संरक्षण केवळ ₹१ टोकन दरात (https://pmfby.gov.in).

_टीप: शेतकरी अधिकृत अटींनुसार पात्र ठरू शकतात. अर्ज अधिकृत पोर्टलवरच करावेत._

आपल्याला कोणत्याही योजनेची पात्रता, आवश्यक कागदपत्रे किंवा अधिकृत संकेतस्थळ जाणून घ्यायचे आहे का?`,

    hinglish: `🌱 *CropCash Sarkari Yojana Alert*

Kisan ke liye important government scheme update:

• *MahaDBT Subsidy:* Drip/Sprinkler irrigation (up to 80%) aur tractor/machinery subsidies ke online application https://mahadbt.maharashtra.gov.in par open hain.
• *PM-KISAN & Namo Shetkari:* e-KYC complete landholder farmers ko ₹12,000/year direct financial support (https://pmkisan.gov.in).
• *PMFBY Fasal Bima:* Weather damage risk protection sirf ₹1 token premium me (https://pmfby.gov.in).

_Note: Benefits official eligibility par depend karte hain. Applications official portals par hi karein._

Kya aap kisi scheme ki eligibility, required documents ya official link dekhna chahte hain?`
  }
};

/**
 * Handle Government Scheme queries with topic extraction & multilingual support
 * @param {string} text - Farmer query text
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} lang - Detected language
 * @returns {string} Safe, formatted scheme response
 */
function getSchemeResponse(text, lang = "en") {
  const topic = identifySchemeTopic(text);
  const topicTemplates = SCHEME_RESPONSES[topic] || SCHEME_RESPONSES.general;
  return topicTemplates[lang] || topicTemplates.en || SCHEME_RESPONSES.general.en;
}

module.exports = {
  getSchemeResponse,
  identifySchemeTopic,
  SCHEME_RESPONSES,
};
