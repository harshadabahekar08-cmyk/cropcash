const assert = require("assert");
const {
  PREFILLED_MESSAGE,
  getWhatsAppPublicConfig,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  generateQRCodeDataUrl,
  renderDemoPageHTML
} = require("../services/demoService");
const { processIncomingMessage } = require("../services/responseHandler");
const { isGreetingMessage } = require("../services/chatbotFlowService");

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(` PASS  ${name}`);
    passedTests++;
  } catch (err) {
    console.error(` FAIL  ${name}`);
    console.error(err);
  }
}

async function runTests() {
  console.log("\n=== SUITE: DEMO ACCESS & QR CODE VERIFICATION ===");

  await test("1. Resolves WhatsApp Public Config with correct pre-filled message", async () => {
    const config = getWhatsAppPublicConfig();
    assert.ok(config.phone, "Phone number must be present");
    assert.strictEqual(config.prefilledMessage, "Hello CropCash, I want to explore your farming assistance services.");
    assert.ok(config.chatLink.startsWith("https://wa.me/"), "Chat link must use wa.me protocol");
    assert.ok(config.chatLink.includes(encodeURIComponent(config.prefilledMessage)), "Link must include URL-encoded prefilled message");
  });

  await test("2. Generates high-resolution PNG buffer with valid PNG signature", async () => {
    const buffer = await generateQRCodeBuffer(400);
    assert.ok(Buffer.isBuffer(buffer), "Should return a Buffer");
    assert.ok(buffer.length > 1000, "Buffer should contain image bytes");
    // Verify PNG header bytes: 0x89, 'P', 'N', 'G'
    assert.strictEqual(buffer[0], 0x89);
    assert.strictEqual(buffer[1], 0x50);
    assert.strictEqual(buffer[2], 0x4E);
    assert.strictEqual(buffer[3], 0x47);
  });

  await test("3. Generates valid SVG markup", async () => {
    const svg = await generateQRCodeSVG();
    assert.ok(typeof svg === "string", "Should return SVG string");
    assert.ok(svg.includes("<svg"), "Must contain <svg root tag");
    assert.ok(svg.includes("</svg>"), "Must contain closing </svg> tag");
    assert.ok(svg.includes('viewBox="0 0'), "Must contain viewBox attribute");
  });

  await test("4. Generates inline Data URL base64 image", async () => {
    const dataUrl = await generateQRCodeDataUrl();
    assert.ok(dataUrl.startsWith("data:image/png;base64,"), "Data URL must start with data:image/png;base64,");
    assert.ok(dataUrl.length > 500, "Base64 data must have content");
  });

  await test("5. Renders Demo Page HTML with full project introduction, CTA and prompts", async () => {
    const html = await renderDemoPageHTML();
    assert.ok(html.includes("CropCash 🌾"), "Page must contain CropCash branding");
    assert.ok(html.includes("Open in WhatsApp"), "Page must contain WhatsApp CTA button");
    assert.ok(html.includes("Hello CropCash, I want to explore your farming assistance services."), "Must show pre-filled message");
    assert.ok(html.includes("About CropCash"), "Must contain project overview section");
    assert.ok(html.includes("लातूर बाजार समिती"), "Must include Marathi sample prompts");
    assert.ok(html.includes("इंदौर मंडी"), "Must include Hindi sample prompts");
    assert.ok(html.includes("Buldhana today"), "Must include English sample prompts");
    assert.ok(html.includes("Hackathon / Project PPT Instructions"), "Must include PPT guidance");
    assert.ok(html.includes('id="qrImage"'), "Must include rendered QR image");
  });

  await test("6. Recognizes pre-filled welcome message and triggers interactive language greeting", async () => {
    const isGreeting = isGreetingMessage(PREFILLED_MESSAGE);
    assert.strictEqual(isGreeting, true, "isGreetingMessage must return true for pre-filled welcome message");

    const res = await processIncomingMessage(
      { text: { body: PREFILLED_MESSAGE } },
      "test_judge_9988"
    );

    assert.strictEqual(res.type, "interactive", "Response type must be interactive");
    assert.strictEqual(res.intent, "greeting", "Intent must be greeting");
    assert.ok(res.replyText.includes("Welcome to CropCash"), "Must greet welcome");
    assert.strictEqual(res.interactive?.action?.button, "Select Language", "Must offer language selection");
    assert.strictEqual(res.interactive?.action?.sections[0]?.rows?.length, 4, "Must offer 4 languages");
  });

  await test("7. Server endpoints /demo, /api/qr, and /api/chat-link are properly registered in Express", async () => {
    const { app } = require("../server");
    const router = app.router || app._router;
    assert.ok(router && router.stack, "App must have an active router stack");

    const routes = router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    assert.ok(routes.includes("/demo"), "/demo route must be registered");
    assert.ok(routes.includes("/api/qr"), "/api/qr route must be registered");
    assert.ok(routes.includes("/api/chat-link"), "/api/chat-link route must be registered");
    assert.ok(routes.includes("/health"), "/health route must be registered");
    assert.ok(routes.includes("/webhook"), "/webhook route must be registered");
  });

  console.log("\n========================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("========================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
