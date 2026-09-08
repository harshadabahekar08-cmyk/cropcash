/**
 * End-to-End Simulation of server.js Webhook Flow with Meta WhatsApp Cloud API
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { isValidIncomingMessage } = require("../services/safetyValidator");
const { processIncomingMessage } = require("../services/responseHandler");

function maskIdentifier(id) {
  if (!id) return "N/A";
  const str = String(id).trim();
  if (str.length <= 4) return "****";
  return str.slice(0, 4) + "*".repeat(Math.max(0, str.length - 8)) + str.slice(-4);
}

async function simulateWebhookFlow() {
  console.log("\n========================================================");
  console.log("[Stage 1: Webhook Reception]");
  const incomingMessage = {
    type: "text",
    text: {
      body: "Hi"
    }
  };
  console.log("Incoming Message Payload:", JSON.stringify(incomingMessage, null, 2));

  // Stage 2: isValidIncomingMessage
  console.log("\n[Stage 2: isValidIncomingMessage]");
  const isValid = isValidIncomingMessage(incomingMessage);
  console.log(`Validation result: ${isValid ? "PASSED" : "FAILED"}`);
  if (!isValid) {
    console.error("Pipeline stopped at isValidIncomingMessage");
    process.exit(1);
  }

  // Stage 3: processIncomingMessage
  console.log("\n[Stage 3: processIncomingMessage]");
  const from = incomingMessage.from || undefined;
  const messageType = incomingMessage.type || "text";
  console.log(`Processing message from: ${maskIdentifier(from)} | type: ${messageType}`);

  // Stage 4: Response Generation
  console.log("\n[Stage 4: Response Generation]");
  const { replyText, lang, type, intent } = await processIncomingMessage(incomingMessage);
  console.log(`Language Detected: ${lang}`);
  console.log(`Intent Detected: ${intent || "N/A"}`);
  console.log(`Generated replyText:\n${replyText}`);

  // Stage 5: Configuration Check
  console.log("\n[Stage 5: Configuration Check]");
  const phoneNumberId = process.env.PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.ACCESS_TOKEN?.trim();
  const apiVersion = process.env.GRAPH_API_VERSION || "v21.0";

  console.log(`API Version: ${apiVersion}`);
  console.log(`Phone Number ID: ${maskIdentifier(phoneNumberId)}`);
  console.log(`Access Token Configured: ${Boolean(accessToken)} (Length: ${accessToken ? accessToken.length : 0})`);

  if (!phoneNumberId || !accessToken) {
    console.error("Missing WhatsApp PHONE_NUMBER_ID or ACCESS_TOKEN in environment.");
    process.exit(1);
  }

  // Stage 6: WhatsApp Graph API Request
  console.log("\n[Stage 6: WhatsApp Graph API Request]");
  console.log(`Endpoint: https://graph.facebook.com/${apiVersion}/${maskIdentifier(phoneNumberId)}/messages`);
  console.log(`API Version: ${apiVersion}`);
  console.log(`Phone Number ID: ${maskIdentifier(phoneNumberId)}`);
  console.log(`Recipient Number: ${maskIdentifier(from)}`);

  const requestBody = {
    messaging_product: "whatsapp",
    type: "text",
    text: {
      body: replyText,
    },
  };
  if (from) {
    requestBody.to = from;
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  // Stage 7: Meta API Response
  console.log("\n[Stage 7: Meta API Response]");
  console.log(`HTTP Status: ${response.status} ${response.statusText}`);
  const data = await response.json();
  console.log("Response JSON:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    console.error("[Meta REJECTED the message]");
    console.error(`Error Code: ${data?.error?.code}`);
    console.error(`Error Message: ${data?.error?.message}`);
  } else {
    console.log("[Meta ACCEPTED the message]");
  }

  // Stage 8: Delivery Stage
  console.log("\n[Stage 8: Delivery Stage]");
  if (response.ok) {
    const messageId = data?.messages?.[0]?.id;
    const recipientWaId = data?.contacts?.[0]?.wa_id || from;
    console.log(`Message accepted by Meta for delivery. Message ID: ${messageId} | Recipient: ${maskIdentifier(recipientWaId)}`);
  } else {
    console.warn(`Delivery not initiated: Meta rejected message request with status ${response.status}. Reason: ${data?.error?.message}`);
  }
  console.log("========================================================\n");
}

simulateWebhookFlow().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
