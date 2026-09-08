const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const crypto = require("crypto");
const { processIncomingMessage } = require("./services/responseHandler");
const { isValidIncomingMessage } = require("./services/safetyValidator");

const app = express();

function verifyMetaSignature(req) {
  const appSecret = process.env.APP_SECRET?.trim();
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
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    console.error("Signature verification error:", err);
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
  res.status(200).json({
    status: "ok",
    service: "CropCash Backend",
    timestamp: new Date().toISOString()
  });
});

// WhatsApp Webhook Verification
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp Messages
app.post("/webhook", async (req, res) => {
  if (!verifyMetaSignature(req)) {
    console.error("Invalid Meta webhook signature.");
    return res.sendStatus(403);
  }

  console.log("WhatsApp message received:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message =
      value?.messages?.[0] ||
      req.body?.messages?.[0] ||
      (req.body?.type || req.body?.text ? req.body : null);

    console.log("MESSAGE OBJECT:", message);

    if (!isValidIncomingMessage(message)) {
      return res.sendStatus(200);
    }

    // Sender's WhatsApp number to reply back to the SAME sender
    const from = message.from || value?.contacts?.[0]?.wa_id || req.body?.from;
    const messageType = message.type || "text";
    console.log(`Processing message from ${from} of type: ${messageType}`);

    if (!from) {
      console.error("Missing sender 'from' phone number on incoming message.");
      return res.sendStatus(200);
    }

    const phoneNumberId =
      value?.metadata?.phone_number_id ||
      process.env.PHONE_NUMBER_ID?.trim();
    const accessToken = process.env.ACCESS_TOKEN?.trim();
    const apiVersion = process.env.GRAPH_API_VERSION || "v21.0";

    if (!phoneNumberId || !accessToken) {
      console.error(
        "Missing WhatsApp PHONE_NUMBER_ID or ACCESS_TOKEN in environment."
      );
      return res.sendStatus(200);
    }

    // Process incoming message through language & intent pipeline
    const { replyText, lang, type, intent } = await processIncomingMessage(message);
    console.log(
      `Generated reply [type=${type}, lang=${lang}, intent=${intent || "N/A"}]:`
    );
    console.log(replyText);

    // Send reply back to the SAME sender using "to: from"
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: replyText,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error (Status " + response.status + "):", JSON.stringify(data, null, 2));
    } else {
      console.log("WhatsApp API reply sent successfully (Status " + response.status + "):");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error processing WhatsApp message:", error);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CropCash server running on port ${PORT}`);
});