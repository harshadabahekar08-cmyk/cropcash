/**
 * Unit & Integration Tests for OpenAgriNet / MahaVISTAAR Advisory Adapter
 */

const { fetchOpenAgriNetAdvisory } = require("../services/openAgriNetAdapter");
const { getFertilizerAdvisoryResponse } = require("../services/fertilizerAdvisoryService");

// Mock Fetchers
const mockOanSuccessFetcher = async (url, options) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      context: {
        domain: "agriculture:advisory",
        action: "on_search"
      },
      message: {
        catalog: {
          "bpp/providers": [
            {
              id: "vnmkv_parbhani",
              descriptor: {
                name: "VNMKV Parbhani (Vasantrao Naik Marathwada Krishi Vidyapeeth)",
                short_desc: "State Agriculture University Official Package of Practices"
              },
              items: [
                {
                  id: "soybean_pop_2024",
                  descriptor: {
                    name: "Soybean PoP Nutrition",
                    long_desc: "• पेरणीच्या वेळी: २० किलो नत्र, ६० किलो स्फुरद, ४० किलो पालाश + २० किलो गंधक (सल्फर) प्रति हेक्टरी द्यावे. रायझोबियम व पीएसबी जिवाणू संवर्धनाची बीजप्रक्रिया अनिवार्य.",
                    code: "VNMKV-AGRI-POP-SOY-2024"
                  }
                }
              ]
            }
          ]
        }
      }
    })
  };
};

const mockOanEmptyCatalogFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    message: {
      catalog: {
        "bpp/providers": []
      }
    }
  })
});

const mockOanMalformedFetcher = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    corrupted_key: "invalid"
  })
});

const mockOanHttp500Fetcher = async () => ({
  ok: false,
  status: 500,
  json: async () => ({ error: { message: "Internal server error" } })
});

const mockOanTimeoutFetcher = async () => {
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

  const originalUrl = process.env.OPEN_AGRI_NET_URL;
  const originalKey = process.env.OPEN_AGRI_NET_API_KEY;

  console.log("=== SUITE 1: OPENAGRINET ADAPTER SUCCESS & PROVENANCE ===");
  {
    process.env.OPEN_AGRI_NET_URL = "https://mock.openagrinet.org/api/v1";

    const res = await fetchOpenAgriNetAdvisory({
      crop: "Soyabean",
      stage: "sowing_basal",
      lang: "mr",
      fetchFn: mockOanSuccessFetcher
    });

    assert(res.success === true, "Successful OAN provider response");
    assert(res.isSourceBacked === true, "Marked as source-backed");
    assert(res.source.includes("VNMKV Parbhani"), "Extracted official university source name");
    assert(res.provenance?.citation === "VNMKV-AGRI-POP-SOY-2024", "Extracted provenance citation code");
    assert(res.advisory.includes("२० किलो नत्र, ६० किलो स्फुरद"), "Extracted official advisory text");
  }

  console.log("\n=== SUITE 2: ERROR & FALLBACK HANDLING (NO FABRICATED SOURCE) ===");
  {
    // 1. Unconfigured URL
    delete process.env.OPEN_AGRI_NET_URL;
    const resNoUrl = await fetchOpenAgriNetAdvisory({ crop: "Soyabean" });
    assert(resNoUrl.success === false && resNoUrl.isSourceBacked === false, "Graceful fallback when OAN URL unconfigured");
    assert(resNoUrl.source === null, "Does not fabricate source when URL missing");

    process.env.OPEN_AGRI_NET_URL = "https://mock.openagrinet.org/api/v1";

    // 2. Empty Catalog
    const resEmpty = await fetchOpenAgriNetAdvisory({ crop: "Soyabean", fetchFn: mockOanEmptyCatalogFetcher });
    assert(resEmpty.success === false && resEmpty.isSourceBacked === false, "Handles empty catalog gracefully");
    assert(resEmpty.source === null, "Does not fabricate source on empty catalog");

    // 3. Malformed JSON
    const resMalformed = await fetchOpenAgriNetAdvisory({ crop: "Soyabean", fetchFn: mockOanMalformedFetcher });
    assert(resMalformed.success === false && resMalformed.isSourceBacked === false, "Handles malformed JSON safely");

    // 4. HTTP 500
    const resHttpErr = await fetchOpenAgriNetAdvisory({ crop: "Soyabean", fetchFn: mockOanHttp500Fetcher });
    assert(resHttpErr.success === false && resHttpErr.errorCode === "HTTP_500", "Handles HTTP error safely");

    // 5. Network Timeout
    const resTimeout = await fetchOpenAgriNetAdvisory({ crop: "Soyabean", fetchFn: mockOanTimeoutFetcher });
    assert(resTimeout.success === false && resTimeout.errorCode === "TIMEOUT", "Handles network timeout safely");
  }

  console.log("\n=== SUITE 3: FERTILIZER SERVICE INTEGRATION WITH OAN ===");
  {
    process.env.OPEN_AGRI_NET_URL = "https://mock.openagrinet.org/api/v1";

    // A. When OAN is available & returns university PoP
    const rWithOan = await getFertilizerAdvisoryResponse("सोयाबीन पेरणी खत सांगा", "mr", mockOanSuccessFetcher);
    assert(rWithOan.includes("अधिकृत खत व पोषण सल्ला"), "Displays official advisory heading");
    assert(rWithOan.includes("VNMKV Parbhani"), "Displays official university source name");
    assert(rWithOan.includes("२० किलो नत्र, ६० किलो स्फुरद"), "Embeds official PoP recommendation");

    // B. When OAN is unavailable (Fallback to General Guidance)
    delete process.env.OPEN_AGRI_NET_URL;
    const rWithoutOan = await getFertilizerAdvisoryResponse("सोयाबीन पेरणी खत सांगा", "mr");
    assert(rWithoutOan.includes("General Guidance"), "Falls back cleanly to General Guidance");
    assert(!rWithoutOan.includes("VNMKV"), "Does NOT fabricate official source when OAN offline");
    assert(rWithoutOan.includes("डीएपी किंवा २०:२०:०:१३"), "Provides baseline general guidance");
  }

  // Restore env
  process.env.OPEN_AGRI_NET_URL = originalUrl;
  process.env.OPEN_AGRI_NET_API_KEY = originalKey;

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round(passed/total*100)}%)`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
