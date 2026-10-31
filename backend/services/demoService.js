/**
 * CropCash Public Demo Access & QR Code Service
 * Generates direct WhatsApp chat links, high-res QR codes, and serves
 * a public demo access portal for judges, visitors, and presentations.
 */

const QRCode = require("qrcode");

const PREFILLED_MESSAGE = "Hello CropCash, I want to explore your farming assistance services.";

/**
 * Resolves the active WhatsApp public phone number
 * @returns {{ phone: string, displayPhone: string, isTestNumber: boolean, chatLink: string, prefilledMessage: string }}
 */
function getWhatsAppPublicConfig() {
  const envPhone = (
    process.env.PUBLIC_WHATSAPP_PHONE ||
    process.env.WHATSAPP_PHONE_NUMBER ||
    process.env.DISPLAY_PHONE_NUMBER ||
    ""
  ).replace(/[^0-9]/g, "");

  // If explicitly configured, use it; otherwise fallback to the registered Meta Cloud API test number (15556692938)
  const phone = envPhone || "15556692938";
  const isTestNumber = phone.startsWith("1555");

  let displayPhone = `+${phone}`;
  if (phone === "15556692938") {
    displayPhone = "+1 (555) 669-2938";
  } else if (phone.length === 12 && phone.startsWith("91")) {
    displayPhone = `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`;
  }

  const encodedMsg = encodeURIComponent(PREFILLED_MESSAGE);
  const chatLink = `https://wa.me/${phone}?text=${encodedMsg}`;

  return {
    phone,
    displayPhone,
    isTestNumber,
    chatLink,
    prefilledMessage: PREFILLED_MESSAGE
  };
}

/**
 * Generates a PNG buffer for the WhatsApp chat link QR code
 * @param {number} [width=600]
 * @returns {Promise<Buffer>}
 */
async function generateQRCodeBuffer(width = 600) {
  const { chatLink } = getWhatsAppPublicConfig();
  return QRCode.toBuffer(chatLink, {
    width,
    margin: 2,
    color: {
      dark: "#1b4332",
      light: "#ffffff"
    },
    errorCorrectionLevel: "H"
  });
}

/**
 * Generates an SVG string for the WhatsApp chat link QR code
 * @returns {Promise<string>}
 */
async function generateQRCodeSVG() {
  const { chatLink } = getWhatsAppPublicConfig();
  return QRCode.toString(chatLink, {
    type: "svg",
    margin: 2,
    color: {
      dark: "#1b4332",
      light: "#ffffff"
    },
    errorCorrectionLevel: "H"
  });
}

/**
 * Generates a Data URL (base64 PNG) for inline HTML rendering
 * @returns {Promise<string>}
 */
async function generateQRCodeDataUrl() {
  const { chatLink } = getWhatsAppPublicConfig();
  return QRCode.toDataURL(chatLink, {
    width: 380,
    margin: 2,
    color: {
      dark: "#1b4332",
      light: "#ffffff"
    },
    errorCorrectionLevel: "H"
  });
}

/**
 * Renders the HTML for the public-facing Demo Access Page
 * @returns {Promise<string>}
 */
async function renderDemoPageHTML() {
  const config = getWhatsAppPublicConfig();
  const qrDataUrl = await generateQRCodeDataUrl();

  const testNumberBanner = config.isTestNumber
    ? `
    <div class="test-notice-badge">
      <div class="notice-icon">ℹ️</div>
      <div class="notice-content">
        <strong>Meta Sandbox Test Mode Active:</strong> This WhatsApp number (<code>${config.displayPhone}</code>) is currently registered under Meta's Cloud API Developer Sandbox. In Meta sandbox mode, messaging is restricted to phone numbers registered in the developer console. To enable open public messaging for any external phone number without pre-registration, register a dedicated mobile number in the Meta Developer Portal.
      </div>
    </div>
    `
    : `
    <div class="prod-notice-badge">
      <div class="notice-icon">✅</div>
      <div class="notice-content">
        <strong>Production WhatsApp Online:</strong> This chatbot is live on <code>${config.displayPhone}</code> and open to all public WhatsApp users!
      </div>
    </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CropCash 🌾 | Multilingual WhatsApp Farming Assistant Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1b4332;
      --primary-light: #2d6a4f;
      --accent: #52b788;
      --accent-soft: #d8f3dc;
      --bg: #f8faf9;
      --card-bg: #ffffff;
      --text: #1a202c;
      --text-muted: #4a5568;
      --border: #e2e8f0;
      --whatsapp-green: #25D366;
      --whatsapp-dark: #128C7E;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding-bottom: 60px;
    }
    .top-header {
      background: linear-gradient(135deg, #081c15 0%, #1b4332 50%, #2d6a4f 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 10px #4ade80;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    .top-header h1 {
      font-size: 2.6rem;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .top-header p {
      font-size: 1.15rem;
      color: #e2e8f0;
      max-width: 700px;
      margin: 0 auto;
    }
    .container {
      max-width: 1100px;
      margin: -30px auto 0;
      padding: 0 20px;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 28px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .main-grid {
        grid-template-columns: 1fr;
        margin-top: 20px;
      }
      .top-header h1 { font-size: 2rem; }
    }
    .card {
      background: var(--card-bg);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid var(--border);
    }
    .qr-card {
      text-align: center;
      background: #ffffff;
      border: 2px solid var(--accent-soft);
      position: sticky;
      top: 20px;
    }
    .qr-frame {
      display: inline-block;
      padding: 16px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.08);
      margin: 20px 0;
      border: 1px solid var(--border);
    }
    .qr-frame img {
      display: block;
      width: 240px;
      height: 240px;
      border-radius: 8px;
    }
    .btn-whatsapp {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      background: var(--whatsapp-green);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 16px 24px;
      border-radius: 14px;
      transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(37, 211, 102, 0.35);
      border: none;
      cursor: pointer;
    }
    .btn-whatsapp:hover {
      background: #20bd5a;
      transform: translateY(-2px);
      box-shadow: 0 12px 25px rgba(37, 211, 102, 0.45);
    }
    .btn-download {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
      background: #f1f5f9;
      color: var(--text);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 12px 20px;
      border-radius: 12px;
      transition: all 0.2s;
      border: 1px solid #cbd5e1;
    }
    .btn-download:hover {
      background: #e2e8f0;
    }
    .prefill-box {
      margin-top: 20px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 14px;
      border-radius: 10px;
      text-align: left;
      font-size: 0.88rem;
    }
    .prefill-box span {
      display: block;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .prefill-box code {
      color: #0f172a;
      font-family: inherit;
      font-weight: 500;
    }
    .test-notice-badge, .prod-notice-badge {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 24px;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .test-notice-badge {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .prod-notice-badge {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .notice-icon {
      font-size: 1.25rem;
    }
    h2.section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 8px;
    }
    p.section-subtitle {
      color: var(--text-muted);
      margin-bottom: 24px;
      font-size: 0.98rem;
    }
    .feature-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    @media (max-width: 600px) {
      .feature-list { grid-template-columns: 1fr; }
    }
    .feature-item {
      padding: 16px;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s;
    }
    .feature-item:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }
    .feature-icon {
      font-size: 1.6rem;
      margin-bottom: 8px;
    }
    .feature-item h3 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
    }
    .feature-item p {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .prompt-category {
      margin-top: 24px;
    }
    .prompt-category h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .prompt-chips {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .prompt-chip {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 12px 16px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif;
    }
    .prompt-chip:hover {
      border-color: var(--accent);
      background: #f0fdf4;
    }
    .prompt-chip .text {
      font-size: 0.92rem;
      color: #1e293b;
      font-weight: 500;
    }
    .prompt-chip .tag {
      font-size: 0.75rem;
      background: #e2e8f0;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      white-space: nowrap;
    }
    .ppt-card {
      margin-top: 28px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #bbf7d0;
      border-radius: 16px;
      padding: 24px;
    }
    .ppt-card h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ppt-card ol {
      padding-left: 20px;
      font-size: 0.9rem;
      color: #166534;
      line-height: 1.6;
    }
    .ppt-card li { margin-bottom: 6px; }
  </style>
</head>
<body>

  <header class="top-header">
    <div class="brand-badge">
      <span class="status-dot"></span>
      Render Cloud Live 24/7
    </div>
    <h1>CropCash 🌾</h1>
    <p>AI-Powered Multilingual Agricultural Decision Support & Mandi Optimization via WhatsApp</p>
  </header>

  <div class="container">
    <div class="main-grid">

      <!-- Left Column: Project Overview & Sample Questions -->
      <div class="card">
        ${testNumberBanner}

        <h2 class="section-title">About CropCash</h2>
        <p class="section-subtitle">Bridging agricultural price disparities and agronomic guidance for Indian farmers through real-time WhatsApp conversational intelligence.</p>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">📈</div>
            <h3>Real-Time Mandi Rates</h3>
            <p>Official Government Agmarknet prices across APMC mandis in Maharashtra & nationwide.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🚚</div>
            <h3>Transport Net-Return</h3>
            <p>Calculates dynamic freight costs and compares mandis for the highest net take-home profit.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🌾</div>
            <h3>PDKV / VNMKV Agronomy</h3>
            <p>Official university Package of Practices for pest control, fertilizer dosages & seed treatment.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🏛️</div>
            <h3>Government Schemes</h3>
            <p>Direct DBT eligibility, application steps and links for PM-Kisan, MahaDBT & PMFBY.</p>
          </div>
        </div>

        <h2 class="section-title">Sample Prompts to Test</h2>
        <p class="section-subtitle">Send any of these queries in English, मराठी, हिन्दी, or Hinglish to see instant intelligent responses:</p>

        <div class="prompt-category">
          <h3>🇬🇧 English Prompts</h3>
          <div class="prompt-chips">
            <div class="prompt-chip" onclick="openQuery('What is the soybean price in Buldhana today?')">
              <span class="text">"What is the soybean price in Buldhana today?"</span>
              <span class="tag">Live Mandi</span>
            </div>
            <div class="prompt-chip" onclick="openQuery('Find best mandi to sell 20 quintals soybean from Chikhli')">
              <span class="text">"Find best mandi to sell 20 quintals soybean from Chikhli"</span>
              <span class="tag">Net Return</span>
            </div>
            <div class="prompt-chip" onclick="openQuery('How to control pink bollworm in cotton crop?')">
              <span class="text">"How to control pink bollworm in cotton crop?"</span>
              <span class="tag">PDKV Agronomy</span>
            </div>
          </div>
        </div>

        <div class="prompt-category">
          <h3>🇮🇳 मराठी (Marathi) Prompts</h3>
          <div class="prompt-chips">
            <div class="prompt-chip" onclick="openQuery('लातूर बाजार समिती सोयाबीन भाव सांगा')">
              <span class="text">"लातूर बाजार समिती सोयाबीन भाव सांगा"</span>
              <span class="tag">बाजारभाव</span>
            </div>
            <div class="prompt-chip" onclick="openQuery('कापूस पिकावरील बोंडअळी नियंत्रण उपाय सांगा')">
              <span class="text">"कापूस पिकावरील बोंडअळी नियंत्रण उपाय सांगा"</span>
              <span class="tag">पीक सल्ला</span>
            </div>
            <div class="prompt-chip" onclick="openQuery('२० क्विंटल सोयाबीन चिखलीहून कुठे विकल्यास सर्वाधिक नफा होईल?')">
              <span class="text">"२० क्विंटल सोयाबीन चिखलीहून कुठे विकल्यास सर्वाधिक नफा होईल?"</span>
              <span class="tag">नफा सल्ला</span>
            </div>
          </div>
        </div>

        <div class="prompt-category">
          <h3>🇮🇳 हिन्दी (Hindi) Prompts</h3>
          <div class="prompt-chips">
            <div class="prompt-chip" onclick="openQuery('इंदौर मंडी में गेहूं का क्या भाव है?')">
              <span class="text">"इंदौर मंडी में गेहूं का क्या भाव है?"</span>
              <span class="tag">मंडी भाव</span>
            </div>
            <div class="prompt-chip" onclick="openQuery('पीएम किसान सम्मान निधि और महाडीबीटी योजना की जानकारी दें')">
              <span class="text">"पीएम किसान सम्मान निधि और महाडीबीटी योजना की जानकारी दें"</span>
              <span class="tag">सरकारी योजना</span>
            </div>
          </div>
        </div>

        <div class="ppt-card">
          <h3>📊 Hackathon / Project PPT Instructions</h3>
          <ol>
            <li><strong>Live Demo Slide:</strong> Download the QR Code on the right and insert it into your project presentation slide.</li>
            <li><strong>Direct Chat Link:</strong> Hyperlink your "Live WhatsApp Bot" button to: <br><code>${config.chatLink}</code></li>
            <li><strong>24/7 Availability:</strong> The backend is deployed on Render Cloud (<code>https://cropcash.onrender.com</code>), which continues operating seamlessly when your personal computer is turned off.</li>
          </ol>
        </div>
      </div>

      <!-- Right Column: Scannable QR Code & WhatsApp Link -->
      <div class="card qr-card">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">Scan & Chat Now</h2>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">Open WhatsApp camera or scanner</p>

        <div class="qr-frame">
          <img src="${qrDataUrl}" alt="CropCash WhatsApp QR Code" id="qrImage">
        </div>

        <div style="margin-bottom: 16px;">
          <a href="${config.chatLink}" target="_blank" class="btn-whatsapp">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/>
            </svg>
            Open in WhatsApp
          </a>

          <a href="/api/qr?download=true" download="cropcash_whatsapp_qr.png" class="btn-download">
            📥 Download QR Code (PNG)
          </a>
        </div>

        <div class="prefill-box">
          <span>Pre-filled Welcome Message</span>
          <code>"${config.prefilledMessage}"</code>
        </div>

        <div style="margin-top: 16px; font-size: 0.8rem; color: #64748b;">
          Number: <strong>${config.displayPhone}</strong>
        </div>
      </div>

    </div>
  </div>

  <script>
    function openQuery(promptText) {
      const phone = "${config.phone}";
      const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(promptText);
      window.open(url, "_blank");
    }
  </script>
</body>
</html>`;
}

module.exports = {
  PREFILLED_MESSAGE,
  getWhatsAppPublicConfig,
  generateQRCodeBuffer,
  generateQRCodeSVG,
  generateQRCodeDataUrl,
  renderDemoPageHTML
};
