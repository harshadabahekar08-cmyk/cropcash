/**
 * CropCash Safety & Validation Layer
 * Protects farmers from invalid, unsafe, or corrupted responses.
 * Enforces WhatsApp platform constraints and acts as a strict guardrail
 * between AI pipelines and outgoing WhatsApp messages.
 */

const MAX_WHATSAPP_TEXT_LENGTH = 4000; // WhatsApp hard limit is 4096

/**
 * Validate and sanitize outgoing message text before sending to WhatsApp API
 * @param {string} text - Raw outgoing message
 * @param {'en' | 'hi' | 'mr' | 'hinglish'} [lang='en'] - Fallback language if text is invalid
 * @returns {string} Safe, sanitized message text
 */
function validateAndSanitizeResponse(text, lang = "en") {
  const fallbackMessages = {
    en: "Namaste! Welcome to CropCash. How can I assist you with your farming and crop queries today?",
    hi: "नमस्ते! क्रॉपकैश (CropCash) में आपका स्वागत है। आज मैं आपकी खेती और फसल संबंधी क्या मदद कर सकता हूँ?",
    mr: "नमस्कार! क्रॉपकॅश (CropCash) मध्ये आपले स्वागत आहे. आज मी आपल्या शेती आणि पिकांसंबंधी काय मदत करू शकतो?",
    hinglish: "Namaste! CropCash me aapka swagat hai. Aaj aapki kheti aur fasal se judi kya madad kar sakta hu?"
  };

  if (!text || typeof text !== "string") {
    return fallbackMessages[lang] || fallbackMessages.en;
  }

  let sanitized = text
    .replace(/\u0000/g, "") // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove unprintable control characters
    .trim();

  // Strip accidental prompt leaks or raw token indicators
  sanitized = sanitized
    .replace(/^(system|assistant|user):\s*/i, "")
    .replace(/<\|.*?\|>/g, "")
    .replace(/\[INST\].*?\[\/INST\]/gs, "")
    .trim();

  if (sanitized.length === 0) {
    return fallbackMessages[lang] || fallbackMessages.en;
  }

  // Enforce WhatsApp message length limit safely
  if (sanitized.length > MAX_WHATSAPP_TEXT_LENGTH) {
    let truncated = sanitized.slice(0, MAX_WHATSAPP_TEXT_LENGTH);
    const lastPunctuation = Math.max(
      truncated.lastIndexOf("।"),
      truncated.lastIndexOf("."),
      truncated.lastIndexOf("\n")
    );

    if (lastPunctuation > MAX_WHATSAPP_TEXT_LENGTH * 0.8) {
      truncated = truncated.slice(0, lastPunctuation + 1);
    } else {
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > 0) {
        truncated = truncated.slice(0, lastSpace) + "...";
      } else {
        truncated = truncated.slice(0, MAX_WHATSAPP_TEXT_LENGTH - 3) + "...";
      }
    }

    sanitized = truncated;
  }

  return sanitized;
}

/**
 * Validates incoming WhatsApp webhook message payload
 * @param {object} message - WhatsApp message object
 * @returns {boolean}
 */
function isValidIncomingMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }
  if (message.from !== undefined && typeof message.from !== "string") {
    return false;
  }
  const hasType = typeof message.type === "string";
  const hasPayload = Boolean(
    message.text ||
    message.image ||
    message.audio ||
    message.voice ||
    message.interactive ||
    message.document
  );
  if (!hasType && !hasPayload) {
    return false;
  }
  return true;
}

module.exports = {
  validateAndSanitizeResponse,
  isValidIncomingMessage,
  MAX_WHATSAPP_TEXT_LENGTH,
};
