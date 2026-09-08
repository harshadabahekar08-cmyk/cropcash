require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { processIncomingMessage } = require("../services/responseHandler");
const { MANDI_API_CACHE } = require("../services/mandiPriceService");

// Seed test cache for Buldhana & Khamgaon & Chikhli & Malkapur & Nagpur
MANDI_API_CACHE.set("Soyabean|Khamgaon|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4800", min_price: "4600", max_price: "4900", market: "Khamgaon", district: "Buldhana", state: "Maharashtra", arrival_date: "08/09/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Chikhli|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4600", min_price: "4400", max_price: "4650", market: "Chikhli", district: "Buldhana", state: "Maharashtra", arrival_date: "08/09/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Malkapur|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4700", min_price: "4500", max_price: "4750", market: "Malkapur", district: "Buldhana", state: "Maharashtra", arrival_date: "08/09/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Nagpur|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "5500", min_price: "5200", max_price: "5600", market: "Nagpur", district: "Nagpur", state: "Maharashtra", arrival_date: "08/09/2026" }]
});

const scenarios = [
  { name: "Scenario 1: Crop Only Price Inquiry", query: "soybean ka bhav?" },
  { name: "Scenario 2: Crop + District Price Inquiry", query: "Nagpur me soybean ka rate kya hai?" },
  { name: "Scenario 3: Quantity Only", query: "mere paas 20 quintal soybean hai" },
  { name: "Scenario 4: Location + Quantity Selling Decision", query: "main Chikhli se hoon, 20 quintal soybean hai" },
  { name: "Scenario 5: Selling Decision Question", query: "aaj soybean kaha bechu?" },
  { name: "Scenario 6: Government Scheme Inquiry", query: "scheme batao" },
  { name: "Scenario 7: Conversational Greeting", query: "hello" },
  { name: "Scenario 8: Unclear / General Message", query: "kya chal raha hai" },
  { name: "Scenario 9: Marathi Decision Inquiry", query: "माझ्याकडे २० क्विंटल सोयाबीन आहे, चिखलीहून कुठे विकू?" }
];

async function runVerification() {
  console.log("================================================================================");
  console.log("CROPCASH CONVERSATIONAL WHATSAPP RESPONSE VERIFICATION");
  console.log("================================================================================\n");

  for (const s of scenarios) {
    console.log(`📌 [${s.name}]`);
    console.log(`💬 User Query: "${s.query}"`);
    const res = await processIncomingMessage({
      from: "919876543210",
      type: "text",
      text: { body: s.query }
    });
    console.log(`🏷️ Detected Lang: ${res.lang} | Intent: ${res.intent}`);
    console.log(`🤖 CropCash Reply:\n${res.replyText}\n`);
    console.log("--------------------------------------------------------------------------------\n");
  }
}

runVerification();
