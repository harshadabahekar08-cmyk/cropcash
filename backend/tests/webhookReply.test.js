/**
 * Verification test for incoming text greeting message
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { isValidIncomingMessage } = require("../services/safetyValidator");
const { processIncomingMessage } = require("../services/responseHandler");

async function testIncomingHiMessage() {
  console.log("=== TESTING INCOMING MESSAGE: { type: 'text', text: { body: 'Hi' } } ===");

  const incomingMessage = {
    type: "text",
    text: {
      body: "Hi"
    }
  };

  // 1. Validation check
  const isValid = isValidIncomingMessage(incomingMessage);
  console.log(`1. isValidIncomingMessage result: ${isValid}`);
  if (!isValid) {
    console.error("FAIL: isValidIncomingMessage rejected valid message!");
    process.exit(1);
  }

  // 2. Process message
  const result = await processIncomingMessage(incomingMessage);
  console.log("2. processIncomingMessage result:");
  console.log(`   - Language: ${result.lang}`);
  console.log(`   - Intent: ${result.intent}`);
  console.log(`   - Type: ${result.type}`);
  console.log(`   - ReplyText Length: ${result.replyText?.length} characters`);
  console.log("----------------------------------------");
  console.log("Generated Reply:\n" + result.replyText);
  console.log("----------------------------------------");

  // Assertions
  if (result.lang !== "en") {
    console.error(`FAIL: Expected lang 'en', got '${result.lang}'`);
    process.exit(1);
  }
  if (result.intent !== "greeting") {
    console.error(`FAIL: Expected intent 'greeting', got '${result.intent}'`);
    process.exit(1);
  }
  if (!result.replyText || !result.replyText.includes("Welcome to CropCash")) {
    console.error("FAIL: replyText does not contain expected greeting template!");
    process.exit(1);
  }

  console.log("\nALL CHECKS PASSED SUCCESSFULLY!");
}

testIncomingHiMessage().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
