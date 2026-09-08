/**
 * Unit & Integration Tests for Agromet Weather Advisory Service
 */

const {
  extractWeatherLocation,
  fetchAgrometWeatherForecast,
  formatWeatherResponse,
  getWeatherAdvisoryResponse,
  KNOWN_WEATHER_LOCATIONS
} = require("../services/weatherAdvisoryService");

const { processIncomingMessage } = require("../services/responseHandler");

// Mock Fetchers
const mockLiveWeatherFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    message: {
      catalog: {
        "bpp/providers": [
          {
            id: "imd_amfu_buldhana",
            descriptor: {
              name: "IMD Pune / AMFU Buldhana (Gramin Krishi Mausam Sewa)"
            },
            items: [
              {
                id: "buldhana_agromet_bulletin",
                tempMin: "21",
                tempMax: "33",
                rainfallMm: "0",
                rainProbability: "5%",
                condition: "Clear & Sunny (निरभ्र)",
                descriptor: {
                  long_desc: "हवामान कोरडे राहण्याची शक्यता असल्याने पिकात फवारणी व खत व्यवस्थापनाची कामे करता येतील. दुपारच्या उन्हात सिंचन टाळावे."
                }
              }
            ]
          }
        ]
      }
    }
  })
});

const mockFailingWeatherFetcher = async () => ({
  ok: false,
  status: 500,
  json: async () => ({ error: { message: "Weather gateway error" } })
});

const mockTimeoutWeatherFetcher = async () => {
  const error = new Error("Fetch timeout");
  error.name = "AbortError";
  throw error;
};

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      passed++;
      console.log(` PASS  ${testName}`);
    } else {
      console.error(` FAIL  ${testName}`);
    }
  }

  console.log("=== SUITE 1: LOCATION ENTITY EXTRACTION ===");
  {
    assert(extractWeatherLocation("चिखलीतील आजचे हवामान काय आहे?") === "Chikhli", "Extract Marathi: चिखलीतील -> Chikhli");
    assert(extractWeatherLocation("खामगाव मध्ये पाऊस पडेल का?") === "Khamgaon", "Extract Marathi: खामगाव -> Khamgaon");
    assert(extractWeatherLocation("इंदौर का मौसम कैसा रहेगा?") === "Indore", "Extract Hindi: इंदौर -> Indore");
    assert(extractWeatherLocation("Weather forecast for Malkapur today") === "Malkapur", "Extract English: Malkapur");
    assert(extractWeatherLocation("Buldhana rainfall update") === "Buldhana", "Extract English: Buldhana");
    assert(extractWeatherLocation("आज पाऊस येईल का?") === null, "Returns null when location omitted");
  }

  console.log("\n=== SUITE 2: MISSING LOCATION PROMPTS ===");
  {
    const rNoLocMr = await getWeatherAdvisoryResponse("पाऊस कधी पडेल?", "mr");
    assert(rNoLocMr.includes("गावाचे किंवा तालुक्याचे नाव") && rNoLocMr.includes("हवामान व सिंचन सल्ला"), "Marathi missing location prompt");

    const rNoLocHi = await getWeatherAdvisoryResponse("आज मौसम कैसा रहेगा?", "hi");
    assert(rNoLocHi.includes("गांव या तहसील का नाम") && rNoLocHi.includes("मौसम"), "Hindi missing location prompt");

    const rNoLocEn = await getWeatherAdvisoryResponse("Will it rain today?", "en");
    assert(rNoLocEn.includes("village or block/taluka name") && rNoLocEn.includes("Weather"), "English missing location prompt");
  }

  console.log("\n=== SUITE 3: OFFICIAL LIVE AGROMET FORECAST ADVISORY ===");
  {
    const origUrl = process.env.OPEN_AGRI_NET_URL;
    process.env.OPEN_AGRI_NET_URL = "https://mock.openagrinet.org/api/v1";

    const liveRes = await getWeatherAdvisoryResponse("चिखली हवामान अंदाज", "mr", mockLiveWeatherFetcher);
    assert(liveRes.includes("अधिकृत हवामान अंदाज"), "Shows official live weather heading");
    assert(liveRes.includes("चिखली"), "Displays localized Marathi location name");
    assert(liveRes.includes("IMD Pune / AMFU Buldhana"), "Displays verified IMD/AMFU source attribution");
    assert(liveRes.includes("21°C") && liveRes.includes("33°C"), "Embeds verified temperature metrics");
    assert(liveRes.includes("कृषी सल्ला (Agromet Advisory)"), "Embeds official farming weather advisory");

    process.env.OPEN_AGRI_NET_URL = origUrl;
  }

  console.log("\n=== SUITE 4: GENERAL GUIDANCE FALLBACK (ZERO FAKE DATA) ===");
  {
    const origUrl = process.env.OPEN_AGRI_NET_URL;
    const origImdKey = process.env.IMD_API_KEY;
    delete process.env.OPEN_AGRI_NET_URL;
    delete process.env.IMD_API_KEY;

    // Marathi Fallback
    const rFbMr = await getWeatherAdvisoryResponse("खामगाव हवामान सांगा", "mr");
    assert(rFbMr.includes("खामगाव"), "Renders localized Marathi location (खामगाव)");
    assert(rFbMr.includes("थेट (Live) हवामान डेटा सध्या उपलब्ध नाही"), "Explicitly states live data unavailable");
    assert(rFbMr.includes("General Guidance"), "Labels as General Guidance");
    assert(!rFbMr.includes("°C") && !rFbMr.includes("IMD"), "Does NOT fabricate fake temperatures or sources");
    assert(rFbMr.includes("फवारणी नियम"), "Delivers safe agromet spraying rules");

    // Hindi Fallback
    const rFbHi = await getWeatherAdvisoryResponse("इंदौर मौसम बताओ", "hi");
    assert(rFbHi.includes("इंदौर"), "Renders Hindi location (इंदौर)");
    assert(rFbHi.includes("लाइव (Live) मौसम डेटा वर्तमान में उपलब्ध नहीं है"), "Hindi unavailable notice");
    assert(rFbHi.includes("छिड़काव नियम"), "Hindi agromet rules");

    // English Fallback
    const rFbEn = await getWeatherAdvisoryResponse("Weather in Buldhana", "en");
    assert(rFbEn.includes("Buldhana"), "English location (Buldhana)");
    assert(rFbEn.includes("Live weather API data is currently unavailable"), "English unavailable notice");
    assert(rFbEn.includes("Spraying Precaution"), "English agromet rules");

    process.env.OPEN_AGRI_NET_URL = origUrl;
    process.env.IMD_API_KEY = origImdKey;
  }

  console.log("\n=== SUITE 5: ERROR & TIMEOUT HANDLING ===");
  {
    process.env.OPEN_AGRI_NET_URL = "https://mock.openagrinet.org/api/v1";

    const errRes = await fetchAgrometWeatherForecast({ location: "Chikhli", fetchFn: mockFailingWeatherFetcher });
    assert(errRes.isLive === false && errRes.errorCode === "HTTP_500", "Handles HTTP error safely");

    const timeoutRes = await fetchAgrometWeatherForecast({ location: "Chikhli", fetchFn: mockTimeoutWeatherFetcher });
    assert(timeoutRes.isLive === false && timeoutRes.errorCode === "TIMEOUT", "Handles network timeout safely");

    delete process.env.OPEN_AGRI_NET_URL;
  }

  console.log("\n=== SUITE 6: END-TO-END WEBHOOK INTEGRATION ===");
  {
    const msg = {
      from: "919876543210",
      type: "text",
      text: { body: "मोताळा येथे आज पाऊस पडेल का?" }
    };
    const e2e = await processIncomingMessage(msg);
    assert(e2e.type === "text", "Message type is text");
    assert(e2e.intent === "weather", "Intent recognized as weather");
    assert(e2e.lang === "mr", "Language recognized as Marathi");
    assert(e2e.replyText.includes("मोताळा"), "Reply includes localized location मोताळा");
    assert(e2e.replyText.includes("हवामान"), "Reply includes weather guidance");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
