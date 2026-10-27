const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Load .env from backend/.env, root .env, or Render Secret Files (/etc/secrets/.env)
[
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
  "/etc/secrets/.env"
].forEach((envPath) => {
  try {
    if (fs.existsSync(envPath)) {
      require("dotenv").config({ path: envPath });
    }
  } catch (err) {
    // Ignore inaccessible paths
  }
});

const { processIncomingMessage } = require("./services/responseHandler");
const { isValidIncomingMessage } = require("./services/safetyValidator");

const app = express();

/**
 * Safely resolves an environment variable by checking multiple aliases and case-insensitivity
 * @param {...string} keys - Candidate environment variable keys
 * @returns {string} Sanitized string value (without surrounding quotes or whitespace)
 */
function getEnvSafe(...keys) {
  for (const k of keys) {
    if (process.env[k] && typeof process.env[k] === "string" && process.env[k].trim()) {
      return process.env[k].trim().replace(/^["']|["']$/g, "");
    }
    const lowerKey = k.toLowerCase();
    const match = Object.keys(process.env).find((envKey) => envKey.toLowerCase() === lowerKey);
    if (match && process.env[match] && typeof process.env[match] === "string" && process.env[match].trim()) {
      return process.env[match].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

// Normalize aliases into standard keys on process.env so all sub-services have them
const standardKeyAliases = {
  VERIFY_TOKEN: ["WHATSAPP_VERIFY_TOKEN", "META_VERIFY_TOKEN", "WEBHOOK_VERIFY_TOKEN"],
  ACCESS_TOKEN: ["WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN", "GRAPH_API_TOKEN", "WHATSAPP_TOKEN"],
  PHONE_NUMBER_ID: ["WHATSAPP_PHONE_NUMBER_ID", "META_PHONE_NUMBER_ID", "PHONE_ID"],
  APP_SECRET: ["META_APP_SECRET", "WHATSAPP_APP_SECRET"],
  DATA_GOV_IN_API_KEY: ["DATA_GOV_KEY", "AGMARKNET_API_KEY", "MANDI_API_KEY"],
  GEMINI_API_KEY: ["GOOGLE_API_KEY", "GEMINI_KEY"]
};

for (const [standardKey, aliases] of Object.entries(standardKeyAliases)) {
  const resolved = getEnvSafe(standardKey, ...aliases);
  if (resolved && !process.env[standardKey]) {
    process.env[standardKey] = resolved;
  }
}

function verifyMetaSignature(req) {
  const appSecret = getEnvSafe("APP_SECRET", "META_APP_SECRET", "WHATSAPP_APP_SECRET");
  const signature = req.headers["x-hub-signature-256"];

  // If no APP_SECRET is configured, permit request
  if (!appSecret) {
    return true;
  }

  // If signature header is not sent (e.g., local tests), permit request
  if (!signature) {
    return true;
  }

  if (!req.rawBody) {
    return true;
  }

  try {
    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", appSecret)
        .update(req.rawBody)
        .digest("hex");

    if (signature.length !== expectedSignature.length) {
      console.error(`[Webhook Security Mismatch] Signature length: ${signature.length} vs Expected: ${expectedSignature.length}`);
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error(`[Webhook Security Mismatch] Signature does not match expected HMAC for configured APP_SECRET.`);
    }

    return isValid;
  } catch (err) {
    console.error("Signature verification error:", err?.message || err);
    return false;
  }
}

app.use(cors());

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Home
app.get("/", (req, res) => {
  res.send("CropCash Backend is running!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  const verifyToken = getEnvSafe("VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN", "META_VERIFY_TOKEN", "WEBHOOK_VERIFY_TOKEN");
  const accessToken = getEnvSafe("ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN", "GRAPH_API_TOKEN", "WHATSAPP_TOKEN");
  const phoneNumberId = getEnvSafe("PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID", "META_PHONE_NUMBER_ID", "PHONE_ID");
  const appSecret = getEnvSafe("APP_SECRET", "META_APP_SECRET", "WHATSAPP_APP_SECRET");
  const dataGovKey = getEnvSafe("DATA_GOV_IN_API_KEY", "DATA_GOV_KEY", "AGMARKNET_API_KEY", "MANDI_API_KEY");
  const geminiKey = getEnvSafe("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY");

  const systemKeys = new Set([
    "PATH", "NODE_VERSION", "YARN_VERSION", "HOME", "USER", "HOSTNAME",
    "PWD", "SHLVL", "_", "NODE_ENV", "PORT", "RENDER", "RENDER_SERVICE_ID",
    "RENDER_SERVICE_NAME", "RENDER_SERVICE_TYPE", "RENDER_INSTANCE_ID",
    "RENDER_GIT_COMMIT", "RENDER_GIT_BRANCH", "RENDER_GIT_REPO_SLUG",
    "IS_PULL_REQUEST"
  ]);
  const userConfiguredKeys = Object.keys(process.env).filter(k => !systemKeys.has(k) && !k.startsWith("npm_"));

  res.status(200).json({
    status: "ok",
    service: "CropCash Backend",
    deployedCommit: process.env.RENDER_GIT_COMMIT || "8abb6cd",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      hasVerifyToken: Boolean(verifyToken),
      hasAccessToken: Boolean(accessToken),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasAppSecret: Boolean(appSecret),
      hasDataGovKey: Boolean(dataGovKey),
      hasGeminiKey: Boolean(geminiKey),
      verifyTokenLength: verifyToken ? verifyToken.length : 0,
      accessTokenLength: accessToken ? accessToken.length : 0,
      phoneNumberIdLength: phoneNumberId ? phoneNumberId.length : 0,
      detectedVariableKeys: userConfiguredKeys,
      secretFileExists: {
        backendEnv: fs.existsSync(path.join(__dirname, ".env")),
        rootEnv: fs.existsSync(path.join(__dirname, "..", ".env")),
        renderSecretEnv: fs.existsSync("/etc/secrets/.env")
      }
    }
  });
});

// WhatsApp Webhook Verification
app.get("/webhook", (req, res) => {
  const expectedToken = getEnvSafe("VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN", "META_VERIFY_TOKEN", "WEBHOOK_VERIFY_TOKEN");

  const mode = req.query["hub.mode"];
  const receivedToken = (req.query["hub.verify_token"] || "").trim().replace(/^["']|["']$/g, "");
  const challenge = req.query["hub.challenge"];

  console.log(`[Webhook Verification] Mode: ${mode} | Token Received: ${receivedToken ? "YES" : "NO"} (len: ${receivedToken.length}) | Expected Token Configured: ${expectedToken ? "YES" : "NO"} (len: ${expectedToken.length})`);

  if (mode === "subscribe" && receivedToken && receivedToken === expectedToken) {
    console.log("✅ Webhook verified successfully with Meta challenge!");
    return res.status(200).send(challenge);
  } else {
    console.error(`❌ Webhook verification failed: Token mismatch (Received len ${receivedToken.length} vs Expected len ${expectedToken.length}) or invalid mode (${mode}).`);
    return res.sendStatus(403);
  }
});

// ============================================================================
// DEDUPLICATION & PRIVACY HELPERS
// ============================================================================

// In-memory deduplication cache for WhatsApp message IDs (TTL: 10 minutes)
// Entry: { state: 'processing' | 'completed', timestamp: number }
const processedMessageIds = new Map();
const DEDUP_TTL_MS = 10 * 60 * 1000;

function cleanupStaleMessageIds() {
  const now = Date.now();
  for (const [id, entry] of processedMessageIds.entries()) {
    if (now - entry.timestamp > DEDUP_TTL_MS) {
      processedMessageIds.delete(id);
    }
  }
}

/**
 * Attempts to acquire processing lock for messageId.
 * Returns true if acquired (caller must process), false if already processing or completed.
 */
function acquireMessageLock(messageId) {
  if (!messageId) return true;
  cleanupStaleMessageIds();
  const existing = processedMessageIds.get(messageId);
  if (existing) {
    return false;
  }
  processedMessageIds.set(messageId, { state: "processing", timestamp: Date.now() });
  return true;
}

function markMessageCompleted(messageId) {
  if (!messageId) return;
  processedMessageIds.set(messageId, { state: "completed", timestamp: Date.now() });
}

function releaseMessageLock(messageId) {
  if (!messageId) return;
  processedMessageIds.delete(messageId);
}

function maskPhoneNumber(phone) {
  if (!phone) return "unknown";
  const str = String(phone).trim();
  if (str.length <= 4) return "****";
  return str.slice(0, 4) + "*".repeat(Math.max(0, str.length - 8)) + str.slice(-4);
}

function maskIdentifier(id) {
  if (!id) return "N/A";
  const str = String(id).trim();
  if (str.length <= 4) return "****";
  return str.slice(0, 4) + "*".repeat(Math.max(0, str.length - 8)) + str.slice(-4);
}

function sanitizeMetaError(errorObj) {
  if (!errorObj) return { message: "Unknown error" };
  const err = errorObj.error || errorObj;
  const rawMsg = String(err.message || "Unknown error");
  const sanitizedMsg = rawMsg
    .replace(/EA[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
    .replace(/sha256=[a-f0-9]+/gi, "[REDACTED_SIG]");
  return {
    message: sanitizedMsg,
    type: err.type || undefined,
    code: err.code || undefined,
    error_subcode: err.error_subcode || undefined,
    fbtrace_id: err.fbtrace_id || undefined
  };
}

// ============================================================================
// OUTBOUND WHATSAPP SEND HELPER WITH BOUNDED TIMEOUT & RETRY STRATEGY
// ============================================================================
const OUTBOUND_TIMEOUT_MS = 10000;

async function sendWhatsAppReply({
  phoneNumberId,
  accessToken,
  apiVersion = "v21.0",
  to,
  replyText,
  fetchFn = fetch
}) {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: replyText }
  });

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  const executeSend = async () => {
    let timer;
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), OUTBOUND_TIMEOUT_MS);

    try {
      const response = await fetchFn(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timer);

      let responseData = null;
      try {
        responseData = await response.json();
      } catch (parseErr) {
        responseData = { message: "Could not parse JSON response" };
      }

      if (!response.ok) {
        const sanitized = sanitizeMetaError(responseData);
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: sanitized,
          isTransient: response.status >= 500
        };
      }

      return {
        ok: true,
        status: response.status,
        messageId: responseData?.messages?.[0]?.id || null
      };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === "AbortError" || err.code === "ABORT_ERR";
      return {
        ok: false,
        status: 0,
        statusText: isTimeout ? "Request Timeout" : "Network Error",
        error: { message: isTimeout ? `Outbound request timed out after ${OUTBOUND_TIMEOUT_MS}ms` : err.message },
        isTimeout,
        isTransient: !isTimeout // Network errors may be transient, timeouts may have reached Meta
      };
    }
  };

  let result = await executeSend();

  // Retry at most once only for transient server errors (HTTP 5xx), NOT on timeouts or 4xx client errors
  if (!result.ok && result.isTransient && !result.isTimeout) {
    console.warn(`[WhatsApp API] Transient server failure (HTTP ${result.status}). Retrying once after 1s...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    result = await executeSend();
  }

  return result;
}

// ============================================================================
// ASYNC WEBHOOK PAYLOAD PROCESSOR
// ============================================================================
async function processSingleIncomingMessage(message, containerValue, customFetch) {
  const messageType = message?.type || (message?.text ? "text" : "unknown");

  if (!message || !isValidIncomingMessage(message)) {
    console.warn(`[Webhook Warning] Rejected incoming message of type "${messageType}": does not contain valid text, interactive payload, or supported media.`);
    return { status: "rejected_invalid_message", type: messageType };
  }

  const messageId = message.id || null;

  // Deduplicate message ID to prevent duplicate replies from network retries
  if (messageId && !acquireMessageLock(messageId)) {
    console.log(`[Duplicate Webhook] Skipping duplicate or currently processing message ID: ${messageId}`);
    return { status: "duplicate_skipped", messageId };
  }

  let from = null;
  let phoneNumberId = null;
  let accessToken = null;
  const apiVersion = (process.env.GRAPH_API_VERSION || "v21.0").trim().replace(/^["']|["']$/g, "");

  try {
    const rawFrom = message.from || containerValue?.contacts?.[0]?.wa_id || containerValue?.from;
    from = rawFrom ? String(rawFrom).replace(/[^0-9]/g, "") : null;

    const messageText =
      message.text?.body ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      message.button?.text ||
      "";

    console.log(`[Webhook Received] Sender: ${maskPhoneNumber(from)} | Type: ${messageType} | Length: ${messageText.length} chars`);

    if (!from) {
      console.error("❌ Configuration error: Missing sender phone number ('from'). Cannot reply.");
      releaseMessageLock(messageId);
      return { status: "error_missing_from" };
    }

    phoneNumberId = (
      containerValue?.metadata?.phone_number_id ||
      getEnvSafe("PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID", "META_PHONE_NUMBER_ID", "PHONE_ID")
    ).trim().replace(/^["']|["']$/g, "");

    accessToken = getEnvSafe("ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN", "GRAPH_API_TOKEN", "WHATSAPP_TOKEN");

    if (!phoneNumberId || !accessToken) {
      if (!phoneNumberId) {
        console.error("❌ Configuration missing: PHONE_NUMBER_ID is not configured in environment or webhook metadata.");
      }
      if (!accessToken) {
        console.error("❌ Configuration missing: ACCESS_TOKEN is not configured in environment.");
      }
      releaseMessageLock(messageId);
      return { status: "error_missing_credentials" };
    }

    // Process Message through CropCash AI & Decision Pipeline
    const { replyText, lang, type, intent } = await processIncomingMessage(message, from);
    console.log(`[Response Generated] Language: ${lang} | Intent: ${intent || "N/A"} | Length: ${replyText.length} chars`);

    // Send Reply to WhatsApp Cloud API
    console.log(`[WhatsApp API Request] Dispatching reply to ${maskPhoneNumber(from)} via Phone ID: ${maskIdentifier(phoneNumberId)}...`);
    const sendResult = await sendWhatsAppReply({
      phoneNumberId,
      accessToken,
      apiVersion,
      to: from,
      replyText,
      fetchFn: customFetch
    });

    if (!sendResult.ok) {
      console.error(`[WhatsApp API Error] HTTP ${sendResult.status} ${sendResult.statusText}:`, JSON.stringify(sendResult.error));
      if (sendResult.error?.code === 131047) {
        console.warn("⚠️ Meta Error 131047: 24-hour customer service window is closed.");
      } else if (sendResult.error?.code === 131030) {
        console.warn("⚠️ Meta Error 131030: Recipient phone number is not registered in Meta Developer Dashboard 'To' list.");
      } else if (sendResult.error?.code === 190) {
        console.warn("⚠️ Meta Error 190: Access token is invalid or expired.");
      }

      // Outbound reply failed! Release lock so subsequent valid retry can succeed
      releaseMessageLock(messageId);
      return { status: "outbound_failed", error: sendResult.error, httpStatus: sendResult.status };
    }

    // Outbound reply succeeded! Permanently mark completed
    markMessageCompleted(messageId);
    console.log(`[WhatsApp API Success] HTTP ${sendResult.status} | Sent Message ID: ${sendResult.messageId || "N/A"}`);
    return { status: "success", messageId: sendResult.messageId };

  } catch (error) {
    console.error("❌ Error processing WhatsApp message:", error?.message || error);
    releaseMessageLock(messageId);

    // Attempt graceful fallback notice to user if sender and credentials exist
    const envPhone = getEnvSafe("PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID", "META_PHONE_NUMBER_ID", "PHONE_ID");
    const envToken = getEnvSafe("ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN", "META_ACCESS_TOKEN", "GRAPH_API_TOKEN", "WHATSAPP_TOKEN");
    if (from && (phoneNumberId || envPhone) && (accessToken || envToken)) {
      try {
        const fallbackPhoneId = phoneNumberId || envPhone;
        const fallbackToken = accessToken || envToken;
        await sendWhatsAppReply({
          phoneNumberId: fallbackPhoneId,
          accessToken: fallbackToken,
          apiVersion,
          to: from,
          replyText: "🌾 क्षमस्व, तांत्रिक कारणास्तव माहिती मिळण्यात अडचण येत आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा किंवा दुसरे पीक/बाजार समिती विचारा. / We are experiencing a temporary issue retrieving data. Please try again shortly.",
          fetchFn: customFetch
        });
      } catch (fallbackErr) {
        console.error("❌ Failed to dispatch fallback error notice to user:", fallbackErr?.message || fallbackErr);
      }
    }
    return { status: "exception_caught", error: error?.message || error };
  }
}

async function handleIncomingWebhookPayload(body, options = {}) {
  const customFetch = options.fetchFn || fetch;
  const entries = Array.isArray(body?.entry) ? body.entry : body?.entry ? [body.entry] : [];

  if (entries.length === 0 && !body?.type && !body?.text && !body?.messages) {
    console.warn("[Webhook Warning] Empty webhook payload received with no entries.");
    return { status: "empty_payload" };
  }

  let lastResult = { status: "no_messages_or_statuses" };

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : entry?.changes ? [entry.changes] : [];

    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;

      // 1. Process Messages FIRST
      const messages = Array.isArray(value.messages) ? value.messages : value.messages ? [value.messages] : [];
      if (messages.length > 0) {
        for (const message of messages) {
          lastResult = await processSingleIncomingMessage(message, value, customFetch);
        }
        continue;
      }

      // 2. Process Status Updates
      if (value.statuses && value.statuses.length > 0) {
        const statusObj = value.statuses[0];
        const statusRecipient = maskPhoneNumber(statusObj.recipient_id || statusObj.wa_id);
        console.log(`[WhatsApp Status Update] ${statusObj.status?.toUpperCase()} | Recipient: ${statusRecipient}`);
        if (statusObj.status === "failed" && statusObj.errors) {
          console.error(`[WhatsApp Status Error]:`, JSON.stringify(sanitizeMetaError(statusObj.errors[0] || statusObj.errors)));
        }
        lastResult = { status: "status_update_handled" };
      }
    }
  }

  // Fallback for flat simulated testing payloads (e.g. { type: 'text', text: { body: '...' }, from: '...' })
  if (lastResult.status === "no_messages_or_statuses" && (body?.type || body?.text || body?.messages)) {
    const rawMsg = body?.messages?.[0] || body;
    lastResult = await processSingleIncomingMessage(rawMsg, body, customFetch);
  }

  return lastResult;
}

// ============================================================================
// WHATSAPP WEBHOOK ROUTE
// ============================================================================
app.post("/webhook", async (req, res) => {
  const timestamp = new Date().toISOString();

  if (!verifyMetaSignature(req)) {
    console.error(`[Webhook Security] Invalid Meta webhook signature at ${timestamp}`);
    if (process.env.NODE_ENV === "production") {
      return res.sendStatus(403);
    }
    console.warn(`[Webhook Security Warning] Non-fatal signature mismatch in development mode.`);
  }

  // 1. Acknowledge webhook immediately to Meta (prevents webhook timeouts & retry storms)
  res.sendStatus(200);

  // 2. Process message asynchronously in background
  handleIncomingWebhookPayload(req.body).catch((err) => {
    console.error("❌ Unexpected background processing failure:", err?.message || err);
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CropCash server running on port ${PORT}`);
  });
}

module.exports = {
  app,
  handleIncomingWebhookPayload,
  sendWhatsAppReply,
  acquireMessageLock,
  markMessageCompleted,
  releaseMessageLock,
  isDuplicateMessage: (id) => !acquireMessageLock(id),
  processedMessageIds,
  maskPhoneNumber,
  sanitizeMetaError
};