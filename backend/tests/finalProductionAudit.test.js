/**
 * FINAL PRODUCTION READINESS AUDIT SUITE
 * Comprehensive verification of:
 *   1. Webhook extraction (list_reply.id, button_reply.id, plain text)
 *   2. WhatsApp Cloud API payload structure validation for all interactive messages
 *   3. Per-user isolated language persistence
 *   4. Service routing for all 5 main menu options
 *   5. Dual message delivery (Result text + Polite follow-up buttons)
 *   6. API error resilience & status codes
 *   7. Privacy redaction & no secrets in logs
 */

const assert = require("assert");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const {
  processIncomingMessage
} = require("../services/responseHandler");
const {
  getSession,
  resetSession,
  userSessions
} = require("../services/conversationStateService");
const {
  getLanguageSelectionInteractive,
  getMainMenuInteractive,
  getAfterRequestInteractive,
  getSchemesInteractive
} = require("../services/chatbotFlowService");
const {
  handleIncomingWebhookPayload,
  sendWhatsAppReply,
  maskPhoneNumber,
  sanitizeMetaError
} = require("../server");
const { MANDI_API_CACHE } = require("../services/mandiPriceService");

// Seed test cache
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
MANDI_API_CACHE.set("Cotton|Akola|||100", {
  timestamp: Date.now(),
  data: [{ commodity: "Cotton", modal_price: "7200", min_price: "6900", max_price: "7400", market: "Akola", district: "Akola", state: "Maharashtra", arrival_date: "30/10/2026" }]
});

let passed = 0;
let total = 0;

async function auditCheck(title, fn) {
  total++;
  try {
    await fn();
    console.log(` ✅ PASS: ${title}`);
    passed++;
  } catch (err) {
    console.error(` ❌ FAIL: ${title}`);
    console.error(err);
  }
}

async function runAudit() {
  console.log("================================================================================");
  console.log("CROPCASH FINAL PRODUCTION READINESS AUDIT");
  console.log("================================================================================\n");

  // --------------------------------------------------------------------------
  // AUDIT ITEM 1: WEBHOOK PAYLOAD EXTRACTION
  // --------------------------------------------------------------------------
  console.log("--- AUDIT SECTION 1: WEBHOOK PAYLOAD EXTRACTION ---");

  await auditCheck("Extracts interactive.list_reply.id and routes language", async () => {
    const userA = "919000000001";
    resetSession(userA);

    const payload = {
      type: "interactive",
      from: userA,
      interactive: {
        type: "list_reply",
        list_reply: { id: "lang_mr", title: "मराठी", description: "मराठीत संवाद साधा" }
      }
    };

    const res = await processIncomingMessage(payload);
    assert.strictEqual(res.lang, "mr");
    const session = getSession(userA);
    assert.strictEqual(session.selectedLanguage, "mr");
  });

  await auditCheck("Extracts interactive.button_reply.id and routes control action", async () => {
    const userA = "919000000001";
    const payload = {
      type: "interactive",
      from: userA,
      interactive: {
        type: "button_reply",
        button_reply: { id: "btn_main_menu", title: "मुख्य मेनू" }
      }
    };

    const res = await processIncomingMessage(payload);
    assert.strictEqual(res.type, "interactive");
    assert.strictEqual(res.interactive?.type, "list");
    assert.strictEqual(res.lang, "mr");
  });

  await auditCheck("Extracts normal plain text messages", async () => {
    const userB = "919000000002";
    resetSession(userB);

    const payload = {
      type: "text",
      from: userB,
      text: { body: "Hello" }
    };

    const res = await processIncomingMessage(payload);
    assert.strictEqual(res.intent, "greeting");
    assert.strictEqual(res.interactive?.type, "list");
  });

  // --------------------------------------------------------------------------
  // AUDIT ITEM 2: INTERACTIVE MESSAGE PAYLOAD STRUCTURE CONSTRAINTS
  // --------------------------------------------------------------------------
  console.log("\n--- AUDIT SECTION 2: WHATSAPP CLOUD API PAYLOAD COMPLIANCE ---");

  await auditCheck("Language selection interactive list conforms to WhatsApp Cloud API specs", async () => {
    ["en", "hi", "mr", "hinglish"].forEach((lang) => {
      const p = getLanguageSelectionInteractive(lang);
      assert.strictEqual(p.type, "list");
      assert.ok(p.body.text && p.body.text.length <= 1024, "Body text <= 1024 chars");
      assert.ok(p.action.button && p.action.button.length <= 20, "Action button <= 20 chars");
      assert.strictEqual(p.action.sections[0].rows.length, 4, "Must have exactly 4 language rows");
      p.action.sections[0].rows.forEach((r) => {
        assert.ok(r.id.length <= 200, "Row ID <= 200 chars");
        assert.ok(r.title.length <= 24, "Row title <= 24 chars");
        assert.ok(r.description.length <= 72, "Row desc <= 72 chars");
      });
    });
  });

  await auditCheck("Main menu interactive list conforms to WhatsApp Cloud API specs", async () => {
    ["en", "hi", "mr", "hinglish"].forEach((lang) => {
      const p = getMainMenuInteractive(lang);
      assert.strictEqual(p.type, "list");
      assert.ok(p.body.text && p.body.text.length <= 1024, "Body text <= 1024 chars");
      assert.ok(p.action.button && p.action.button.length <= 20, "Action button <= 20 chars");
      assert.strictEqual(p.action.sections[0].rows.length, 5, "Must have 5 services");
      p.action.sections[0].rows.forEach((r) => {
        assert.ok(r.title.length <= 24, `Row title '${r.title}' <= 24 chars`);
        assert.ok(r.description.length <= 72, `Row desc '${r.description}' <= 72 chars`);
      });
    });
  });

  await auditCheck("Post-request interactive buttons conform to WhatsApp Cloud API specs", async () => {
    ["en", "hi", "mr", "hinglish"].forEach((lang) => {
      const p = getAfterRequestInteractive(lang);
      assert.strictEqual(p.type, "button");
      assert.ok(p.body.text && p.body.text.length <= 1024, "Body text <= 1024 chars");
      assert.ok(p.action.buttons.length <= 3, "Max 3 quick reply buttons");
      p.action.buttons.forEach((b) => {
        assert.strictEqual(b.type, "reply");
        assert.ok(b.reply.title.length <= 20, `Button title '${b.reply.title}' <= 20 chars`);
      });
    });
  });

  // --------------------------------------------------------------------------
  // AUDIT ITEM 3: PER-USER ISOLATED LANGUAGE PERSISTENCE
  // --------------------------------------------------------------------------
  console.log("\n--- AUDIT SECTION 3: MULTI-USER ISOLATED LANGUAGE PERSISTENCE ---");

  await auditCheck("Farmer 1 (Marathi) and Farmer 2 (Hindi) maintain isolated languages", async () => {
    const user1 = "919111111111";
    const user2 = "919222222222";
    resetSession(user1);
    resetSession(user2);

    // User 1 selects Marathi
    await processIncomingMessage({ from: user1, type: "interactive", interactive: { list_reply: { id: "lang_mr", title: "मराठी" } } });
    // User 2 selects Hindi
    await processIncomingMessage({ from: user2, type: "interactive", interactive: { list_reply: { id: "lang_hi", title: "हिंदी" } } });

    assert.strictEqual(getSession(user1).selectedLanguage, "mr");
    assert.strictEqual(getSession(user2).selectedLanguage, "hi");

    // User 1 requests Mandi Prices -> gets Marathi response
    const res1 = await processIncomingMessage({ from: user1, type: "interactive", interactive: { list_reply: { id: "menu_mandi_prices", title: "बाजारभाव तपासा" } } });
    assert.strictEqual(res1.lang, "mr");
    assert.ok(res1.replyText.includes("आपल्याला कोणत्या पिकाचा"));

    // User 2 requests Mandi Prices -> gets Hindi response
    const res2 = await processIncomingMessage({ from: user2, type: "interactive", interactive: { list_reply: { id: "menu_mandi_prices", title: "मंडी भाव देखें" } } });
    assert.strictEqual(res2.lang, "hi");
    assert.ok(res2.replyText.includes("आप किस फसल का"));
  });

  // --------------------------------------------------------------------------
  // AUDIT ITEM 4: FIVE MAIN MENU OPTIONS ROUTING
  // --------------------------------------------------------------------------
  console.log("\n--- AUDIT SECTION 4: FIVE MAIN MENU OPTIONS SERVICE ROUTING ---");

  const auditUser = "919333333333";
  resetSession(auditUser);
  await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "lang_en", title: "English" } } });

  await auditCheck("Option 1: Check Mandi Prices routes to MandiPriceService", async () => {
    await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "menu_mandi_prices", title: "Check Mandi Prices" } } });
    await processIncomingMessage({ from: auditUser, text: { body: "Cotton" } });
    const res = await processIncomingMessage({ from: auditUser, text: { body: "Akola" } });
    assert.strictEqual(res.intent, "price");
    assert.ok(res.replyText.includes("₹7200") || res.replyText.includes("Akola"));
  });

  await auditCheck("Option 2: Find Best Mandi routes to MandiDecisionService", async () => {
    await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "menu_best_mandi", title: "Find Best Mandi" } } });
    await processIncomingMessage({ from: auditUser, text: { body: "Soybean" } });
    await processIncomingMessage({ from: auditUser, text: { body: "20 quintals" } });
    const res = await processIncomingMessage({ from: auditUser, text: { body: "Chikhli" } });
    assert.strictEqual(res.intent, "transport_decision");
    assert.ok(res.replyText.includes("Nearby Mandi Comparison") || res.replyText.includes("Chikhli"));
  });

  await auditCheck("Option 3: Calculate Transport routes to TransportService / Decision", async () => {
    await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "menu_transport", title: "Calculate Transport" } } });
    await processIncomingMessage({ from: auditUser, text: { body: "Soybean" } });
    await processIncomingMessage({ from: auditUser, text: { body: "20 quintals" } });
    const res = await processIncomingMessage({ from: auditUser, text: { body: "Chikhli" } });
    assert.strictEqual(res.intent, "transport_decision");
    assert.ok(res.replyText.includes("Transport") || res.replyText.includes("₹"));
  });

  await auditCheck("Option 4: Government Schemes routes to SchemeService", async () => {
    const res = await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "menu_schemes", title: "Government Schemes" } } });
    assert.strictEqual(res.intent, "scheme");
    assert.ok(res.replyText.includes("PM-KISAN") || res.replyText.includes("MahaDBT"));
    assert.ok(res.interactive?.type === "list");
  });

  await auditCheck("Option 5: Crop Price Trend Forecast routes to trend advisory", async () => {
    await processIncomingMessage({ from: auditUser, type: "interactive", interactive: { list_reply: { id: "menu_trend", title: "Crop Price Trend" } } });
    const res = await processIncomingMessage({ from: auditUser, text: { body: "Soybean" } });
    assert.strictEqual(res.intent, "trend");
    assert.ok(res.replyText.includes("Mandi Market Outlook & Trend") || res.replyText.includes("Soybean"));
  });

  // --------------------------------------------------------------------------
  // AUDIT ITEM 5: DUAL MESSAGE DISPATCH (Result + Polite Thank-You Buttons)
  // --------------------------------------------------------------------------
  console.log("\n--- AUDIT SECTION 5: DUAL MESSAGE DELIVERY ON COMPLETED REQUEST ---");

  await auditCheck("Dispatches both the result report and follow-up interactive buttons", async () => {
    const sentCalls = [];
    const mockFetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      sentCalls.push(parsedBody);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ messages: [{ id: "wamid.AUDIT_" + Date.now() }] })
      };
    };

    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: "1293831230486528" },
            contacts: [{ wa_id: "919000000005" }],
            messages: [{
              id: "wamid.DUAL_TEST_" + Date.now(),
              from: "919000000005",
              type: "text",
              text: { body: "Soybean price in Buldhana" }
            }]
          }
        }]
      }]
    };

    const res = await handleIncomingWebhookPayload(payload, { fetchFn: mockFetch });
    assert.strictEqual(res.status, "success");
    assert.strictEqual(sentCalls.length, 2, "Must dispatch 2 WhatsApp messages: Result + Follow-up buttons");

    // Message 1: Text result
    assert.strictEqual(sentCalls[0].type, "text");
    assert.ok(sentCalls[0].text.body.includes("Buldhana") || sentCalls[0].text.body.includes("Soybean"));

    // Message 2: Interactive button reply
    assert.strictEqual(sentCalls[1].type, "interactive");
    assert.strictEqual(sentCalls[1].interactive.type, "button");
    assert.ok(sentCalls[1].interactive.body.text.includes("Thank you for using CropCash"));
    assert.strictEqual(sentCalls[1].interactive.action.buttons.length, 3);
  });

  // --------------------------------------------------------------------------
  // AUDIT ITEM 6: STATUS CODES, ERROR HANDLING & PRIVACY REDACTION
  // --------------------------------------------------------------------------
  console.log("\n--- AUDIT SECTION 6: API ERRORS, STATUS CODES & PRIVACY REDACTION ---");

  await auditCheck("Redacts access tokens and HMAC signatures from errors", async () => {
    const err = { error: { message: "Failed token EAAdMHdQGkocB with sha256=1c695fb98c83ae4903b5d230c626fe7a" } };
    const sanitized = sanitizeMetaError(err);
    assert.ok(!sanitized.message.includes("EAAdMHdQGkocB"), "Must redact token");
    assert.ok(!sanitized.message.includes("1c695fb98c83ae4903b5d230c626fe7a"), "Must redact secret");
    assert.ok(sanitized.message.includes("[REDACTED_TOKEN]"));
    assert.ok(sanitized.message.includes("[REDACTED_SIG]"));
  });

  await auditCheck("Correctly handles 401 token expired error without retry loop", async () => {
    let attempts = 0;
    const mock401 = async () => {
      attempts++;
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Error validating access token: Session has expired", code: 190 } })
      };
    };

    const res = await sendWhatsAppReply({
      phoneNumberId: "123456",
      accessToken: "EXPIRED_TOKEN",
      to: "919000000001",
      replyText: "Test",
      fetchFn: mock401
    });

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(attempts, 1, "Permanent 401 must not retry");
    assert.strictEqual(res.error.code, 190);
  });

  console.log("\n================================================================================");
  console.log(`FINAL AUDIT SUMMARY: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runAudit();
