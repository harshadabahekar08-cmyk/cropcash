/**
 * CropCash OpenAgriNet / MahaVISTAAR Adapter
 * Interfaces with the OpenAgriNet (OAN) / Beckn Agriculture Advisory Infrastructure.
 * Retrieves verified State Agricultural University (SAU) and Government PoP (Package of Practices)
 * with strict source attribution and provenance tracking.
 */

const OPEN_AGRI_NET_TIMEOUT_MS = 5000;

/**
 * Queries OpenAgriNet / MahaVISTAAR for official crop nutrient & agricultural advisory
 * @param {object} params
 * @param {string} params.crop - Standard crop name (e.g. 'Soyabean', 'Cotton', 'Wheat')
 * @param {string} [params.stage] - Growth stage key (e.g. 'sowing_basal', 'vegetative', 'flowering')
 * @param {string} [params.district] - Optional district for regional university localization
 * @param {'en'|'hi'|'mr'|'hinglish'} [params.lang='en'] - Target language
 * @param {Function} [params.fetchFn=fetch] - Injected fetch function for testing
 * @returns {Promise<{ success: boolean, isSourceBacked: boolean, source: string|null, provenance: object|null, advisory: string|null, errorCode?: string }>}
 */
async function fetchOpenAgriNetAdvisory({ crop, stage = "all", district = "Maharashtra", lang = "en", fetchFn = fetch }) {
  const baseUrl = process.env.OPEN_AGRI_NET_URL?.trim();

  // If no OpenAgriNet URL is configured in environment, safely return unbacked fallback
  if (!baseUrl) {
    return {
      success: false,
      isSourceBacked: false,
      source: null,
      provenance: null,
      advisory: null,
      errorCode: "OAN_NOT_CONFIGURED"
    };
  }

  if (!crop || typeof crop !== "string") {
    return {
      success: false,
      isSourceBacked: false,
      source: null,
      provenance: null,
      advisory: null,
      errorCode: "INVALID_CROP"
    };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/search`;

  // Standard Beckn / OpenAgriNet Search Payload Schema
  const becknPayload = {
    context: {
      domain: "agriculture:advisory",
      action: "search",
      version: "2.0.0",
      bap_id: "cropcash.in",
      bap_uri: "https://cropcash.in/oan",
      location: {
        country: "IND",
        state: "Maharashtra",
        city: district
      },
      timestamp: new Date().toISOString()
    },
    message: {
      intent: {
        item: {
          descriptor: {
            name: crop
          }
        },
        tags: [
          {
            descriptor: { name: "domain_type" },
            value: "nutrient_fertilizer"
          },
          {
            descriptor: { name: "growth_stage" },
            value: stage
          },
          {
            descriptor: { name: "language" },
            value: lang
          }
        ]
      }
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPEN_AGRI_NET_TIMEOUT_MS);

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "CropCash-OAN-Client/1.0"
    };

    // Include auth token only if configured in environment (never log token)
    if (process.env.OPEN_AGRI_NET_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.OPEN_AGRI_NET_API_KEY.trim()}`;
    }

    const response = await fetchFn(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(becknPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        isSourceBacked: false,
        source: null,
        provenance: null,
        advisory: null,
        errorCode: `HTTP_${response.status}`
      };
    }

    const data = await response.json();

    // Parse Beckn Provider Catalog & Extract Provenance
    const provider = data?.message?.catalog?.["bpp/providers"]?.[0] || data?.message?.providers?.[0];

    if (!provider) {
      return {
        success: false,
        isSourceBacked: false,
        source: null,
        provenance: null,
        advisory: null,
        errorCode: "NO_PROVIDER_DATA"
      };
    }

    const sourceName = provider.descriptor?.name || provider.id || null;
    const providerDesc = provider.descriptor?.short_desc || provider.descriptor?.long_desc || null;
    const firstItem = provider.items?.[0];
    const advisoryText = firstItem?.descriptor?.long_desc || firstItem?.descriptor?.name || null;

    if (!sourceName || !advisoryText) {
      return {
        success: false,
        isSourceBacked: false,
        source: null,
        provenance: null,
        advisory: null,
        errorCode: "INCOMPLETE_ADVISORY"
      };
    }

    return {
      success: true,
      isSourceBacked: true,
      source: sourceName,
      provenance: {
        providerId: provider.id,
        name: sourceName,
        description: providerDesc,
        citation: firstItem.descriptor?.code || provider.id
      },
      advisory: advisoryText
    };
  } catch (error) {
    return {
      success: false,
      isSourceBacked: false,
      source: null,
      provenance: null,
      advisory: null,
      errorCode: error.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR"
    };
  }
}

module.exports = {
  fetchOpenAgriNetAdvisory,
  OPEN_AGRI_NET_TIMEOUT_MS,
};
