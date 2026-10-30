/**
 * Test Suite: Complete Interactive, Multilingual WhatsApp Chatbot Flow
 * Verifies:
 *   1. Greeting ("Hi", "Hello", "Namaste") -> Welcome & Clickable Language Options
 *   2. Language Selection -> Persistence across all turns
 *   3. Main Interactive Menu -> 5 clickable services (Mandi Prices, Best Mandi, Transport, Schemes, Trend)
 *   4. Feature-Specific Conversation -> Step-by-step question flow (Crop -> Qty -> Location)
 *   5. After-Request Polite Closing + 3 Clickable Action Buttons (Main Menu, Ask Another, End)
 *   6. Navigation Controls (Main Menu, Back, Change Language, Start Again, Help, End Chat)
 */

const assert = require("assert");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { processIncomingMessage } = require("../services/responseHandler");
const { getSession, resetSession } = require("../services/conversationStateService");
const { MANDI_API_CACHE } = require("../services/mandiPriceService");

// Seed test cache so mandi lookups succeed quickly
MANDI_API_CACHE.set("Soyabean|Buldhana|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4750", min_price: "4500", max_price: "4850", market: "Buldhana", district: "Buldhana", state: "Maharashtra", arrival_date: "30/10/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Chikhli|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4600", min_price: "4400", max_price: "4650", market: "Chikhli", district: "Buldhana", state: "Maharashtra", arrival_date: "30/10/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Khamgaon|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4800", min_price: "4600", max_price: "4900", market: "Khamgaon", district: "Buldhana", state: "Maharashtra", arrival_date: "30/10/2026" }]
});
MANDI_API_CACHE.set("Soyabean|Malkapur|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Soyabean", modal_price: "4700", min_price: "4500", max_price: "4750", market: "Malkapur", district: "Buldhana", state: "Maharashtra", arrival_date: "30/10/2026" }]
});

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(` PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(` FAIL  ${name}`);
    console.error(err);
  }
}

async function runTests() {
  console.log("\n=== SUITE 1: GREETING & CLICKABLE LANGUAGE SELECTION ===");
  const testUser = "919988776655_" + Date.now();
  resetSession(testUser);

  await test("1. Sending 'Hi' triggers welcome greeting with language list options", async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: "Hi" } });
    assert.strictEqual(res.intent, "greeting");
    assert.strictEqual(res.type, "interactive");
    assert.ok(res.replyText.includes("Welcome to CropCash 🌾"));
    assert.ok(res.replyText.includes("Please select your preferred language"));
    assert.ok(res.interactive);
    assert.strictEqual(res.interactive.type, "list");
    const rows = res.interactive.action.sections[0].rows;
    assert.strictEqual(rows.length, 4);
    assert.strictEqual(rows[0].id, "lang_en");
    assert.strictEqual(rows[1].id, "lang_hi");
    assert.strictEqual(rows[2].id, "lang_mr");
    assert.strictEqual(rows[3].id, "lang_hinglish");
  });

  await test("2. Sending 'नमस्ते' (Namaste) also triggers greeting", async () => {
    const res = await processIncomingMessage({ from: testUser + "_hi", text: { body: "नमस्ते" } });
    assert.strictEqual(res.intent, "greeting");
    assert.strictEqual(res.type, "interactive");
    assert.ok(res.interactive.type === "list");
  });

  console.log("\n=== SUITE 2: LANGUAGE SELECTION & MAIN INTERACTIVE MENU ===");

  await test("3. Clicking 'मराठी' (lang_mr) sets language and shows Marathi Main Menu", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { list_reply: { id: "lang_mr", title: "मराठी" } }
    });

    assert.strictEqual(res.lang, "mr");
    assert.strictEqual(res.type, "interactive");
    assert.ok(res.replyText.includes("मी आपली काय मदत करू शकतो?"));
    assert.ok(res.interactive);
    assert.strictEqual(res.interactive.type, "list");

    const rows = res.interactive.action.sections[0].rows;
    assert.strictEqual(rows.length, 5);
    assert.strictEqual(rows[0].id, "menu_mandi_prices");
    assert.strictEqual(rows[1].id, "menu_best_mandi");
    assert.strictEqual(rows[2].id, "menu_transport");
    assert.strictEqual(rows[3].id, "menu_schemes");
    assert.strictEqual(rows[4].id, "menu_trend");

    // Verify session remembers Marathi
    const session = getSession(testUser);
    assert.strictEqual(session.selectedLanguage, "mr");
  });

  console.log("\n=== SUITE 3: FEATURE-SPECIFIC CONVERSATION (STEP-BY-STEP) ===");

  await test("4. Turn 1: Clicking 'Find Best Mandi' asks for crop in Marathi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { list_reply: { id: "menu_best_mandi", title: "सर्वात फायदेशीर मंडी" } }
    });

    assert.strictEqual(res.lang, "mr");
    assert.ok(res.replyText.includes("आपल्याला कोणते पीक विकायचे आहे?"));
    const session = getSession(testUser);
    assert.strictEqual(session.activeFeature, "best_mandi");
    assert.strictEqual(session.step, 1);
  });

  await test("5. Turn 2: Farmer says 'Soybean' -> Bot asks for quantity in Marathi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      text: { body: "Soybean" }
    });

    assert.strictEqual(res.lang, "mr");
    assert.ok(res.replyText.includes("आपल्याकडे किती क्विंटल माल आहे?"));
    const session = getSession(testUser);
    assert.strictEqual(session.crop?.standardName, "Soyabean");
    assert.strictEqual(session.step, 2);
  });

  await test("6. Turn 3: Farmer says '20 quintals' -> Bot asks for location in Marathi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      text: { body: "20 quintals" }
    });

    assert.strictEqual(res.lang, "mr");
    assert.ok(res.replyText.includes("आपले गाव किंवा तालुका कोणता आहे?"));
    const session = getSession(testUser);
    assert.strictEqual(session.quantity, 20);
    assert.strictEqual(session.step, 3);
  });

  await test("7. Turn 4: Farmer says 'Chikhli' -> Bot provides best mandi comparison + follow-up buttons", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      text: { body: "Chikhli" }
    });

    assert.strictEqual(res.lang, "mr");
    assert.ok(res.replyText.includes("चिखली") || res.replyText.includes("खामगाव") || res.replyText.includes("नफा"));

    // Verify follow-up polite message and interactive buttons
    assert.ok(res.followUpInteractive);
    assert.strictEqual(res.followUpInteractive.type, "button");
    assert.ok(res.followUpInteractive.body.text.includes("CropCash वापरल्याबद्दल धन्यवाद! 🌾"));
    assert.ok(res.followUpInteractive.body.text.includes("ही माहिती आपल्यासाठी उपयोगी ठरेल अशी आशा आहे"));
    assert.ok(res.followUpInteractive.body.text.includes("आपल्याला आणखी काही मदत हवी आहे का?"));

    const buttons = res.followUpInteractive.action.buttons;
    assert.strictEqual(buttons.length, 3);
    assert.strictEqual(buttons[0].reply.id, "btn_main_menu");
    assert.strictEqual(buttons[1].reply.id, "btn_ask_another");
    assert.strictEqual(buttons[2].reply.id, "btn_end_chat");

    // Session feature should be reset to idle
    const session = getSession(testUser);
    assert.strictEqual(session.activeFeature, null);
    assert.strictEqual(session.step, 0);
  });

  console.log("\n=== SUITE 4: CONVERSATION CONTROLS ===");

  await test("8. Clicking 'Main Menu' returns the Main Menu in selected language", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { button_reply: { id: "btn_main_menu", title: "मुख्य मेनू" } }
    });

    assert.strictEqual(res.lang, "mr");
    assert.strictEqual(res.type, "interactive");
    assert.ok(res.replyText.includes("मी आपली काय मदत करू शकतो?"));
    assert.strictEqual(res.interactive.type, "list");
  });

  await test("9. Typing 'Help' returns comprehensive guidance and navigation in Marathi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      text: { body: "help" }
    });

    assert.strictEqual(res.lang, "mr");
    assert.ok(res.replyText.includes("क्रॉपकॅश मदत व मार्गदर्शन"));
    assert.ok(res.followUpInteractive);
  });

  await test("10. Back button navigates to previous step", async () => {
    // Start Best Mandi
    await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { list_reply: { id: "menu_best_mandi", title: "Find Best Mandi" } }
    });
    // Give crop
    await processIncomingMessage({
      from: testUser,
      text: { body: "Soybean" }
    });
    let session = getSession(testUser);
    assert.strictEqual(session.step, 2);

    // Click Back
    const backRes = await processIncomingMessage({
      from: testUser,
      text: { body: "back" }
    });
    session = getSession(testUser);
    assert.strictEqual(session.step, 1);
    assert.ok(backRes.replyText.includes("आपल्याला कोणते पीक विकायचे आहे?"));
  });

  await test("11. Clicking 'Change Language' shows language options in Marathi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      text: { body: "change language" }
    });

    assert.strictEqual(res.lang, "mr");
    assert.strictEqual(res.type, "interactive");
    assert.strictEqual(res.interactive.type, "list");
  });

  await test("12. Switching to Hindi ('lang_hi') persists Hindi across future turns", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { list_reply: { id: "lang_hi", title: "हिंदी" } }
    });

    assert.strictEqual(res.lang, "hi");
    assert.ok(res.replyText.includes("मैं आपकी क्या मदद कर सकता हूँ?"));

    // Check government schemes in Hindi
    const schemeRes = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { list_reply: { id: "menu_schemes", title: "सरकारी योजनाएं" } }
    });
    assert.strictEqual(schemeRes.lang, "hi");
    assert.strictEqual(schemeRes.interactive.type, "list");
  });

  await test("13. Clicking 'End Conversation' gives warm polite goodbye in Hindi", async () => {
    const res = await processIncomingMessage({
      from: testUser,
      type: "interactive",
      interactive: { button_reply: { id: "btn_end_chat", title: "बातचीत समाप्त" } }
    });

    assert.strictEqual(res.lang, "hi");
    assert.ok(res.replyText.includes("CropCash के साथ बातचीत करने के लिए धन्यवाद!"));
    assert.ok(res.replyText.includes("आपकी फसल अच्छी हो"));
  });

  console.log("\n========================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
