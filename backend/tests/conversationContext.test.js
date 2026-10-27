/**
 * Test Suite: Multi-Turn Conversation State & Context Handling
 */
const assert = require('assert');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { processIncomingMessage } = require('../services/responseHandler');
const { getSession, resetSession } = require('../services/conversationStateService');
const { MANDI_API_CACHE } = require('../services/mandiPriceService');

MANDI_API_CACHE.set('Soyabean|Buldhana|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4750', min_price: '4500', max_price: '4850', market: 'Buldhana', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|Chikhli|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4600', min_price: '4400', max_price: '4650', market: 'Chikhli', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|Khamgaon|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4800', min_price: '4600', max_price: '4900', market: 'Khamgaon', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|Malkapur|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4700', min_price: '4500', max_price: '4750', market: 'Malkapur', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|Nagpur|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4900', min_price: '4700', max_price: '5000', market: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|Latur|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Soyabean', modal_price: '4850', min_price: '4600', max_price: '4950', market: 'Latur', district: 'Latur', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Soyabean|||Maharashtra|100', {
  timestamp: Date.now(),
  data: [
    { commodity: 'Soyabean', modal_price: '4800', min_price: '4600', max_price: '4900', market: 'Khamgaon', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' },
    { commodity: 'Soyabean', modal_price: '4600', min_price: '4400', max_price: '4650', market: 'Chikhli', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' },
    { commodity: 'Soyabean', modal_price: '4700', min_price: '4500', max_price: '4750', market: 'Malkapur', district: 'Buldhana', state: 'Maharashtra', arrival_date: '23/09/2026' },
    { commodity: 'Soyabean', modal_price: '4850', min_price: '4600', max_price: '4950', market: 'Latur', district: 'Latur', state: 'Maharashtra', arrival_date: '23/09/2026' }
  ]
});
MANDI_API_CACHE.set('Cotton|Akola|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Cotton', modal_price: '7200', min_price: '6900', max_price: '7400', market: 'Akola', district: 'Akola', state: 'Maharashtra', arrival_date: '23/09/2026' }]
});
MANDI_API_CACHE.set('Wheat|Indore|||100', {
  timestamp: Date.now(),
  data: [{ commodity: 'Wheat', modal_price: '2450', min_price: '2300', max_price: '2550', market: 'Indore', district: 'Indore', state: 'Madhya Pradesh', arrival_date: '23/09/2026' }]
});

let passed = 0;
let total = 0;

async function asyncTest(name, fn) {
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
  console.log('\n=== SUITE 1: 10-TURN TARGET CONVERSATION FLOW ===');
  const testUser = '918010589136';
  resetSession(testUser);

  await asyncTest('Turn 1: Hi triggers welcoming greeting', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Hi' } });
    assert.strictEqual(res.intent, 'greeting');
    assert.ok(res.replyText.includes('Welcome to CropCash'));
  });

  await asyncTest('Turn 2: Soyabean buldhana resolves price intent & sets slots', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Soyabean buldhana' } });
    assert.strictEqual(res.intent, 'price');
    assert.ok(res.replyText.includes('Soybean') || res.replyText.includes('Soyabean'));
    assert.ok(res.replyText.includes('Buldhana'));
    const session = getSession(testUser);
    assert.strictEqual(session.crop?.standardName, 'Soyabean');
    assert.strictEqual(session.district, 'Buldhana');
  });

  await asyncTest('Turn 3: Chikhli updates location slot and preserves Soybean crop', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Chikhli' } });
    assert.strictEqual(res.intent, 'price');
    assert.ok(res.replyText.includes('Chikhli') || res.replyText.includes('Buldhana'));
    const session = getSession(testUser);
    assert.strictEqual(session.crop?.standardName, 'Soyabean');
    assert.strictEqual(session.district, 'Chikhli');
  });

  await asyncTest('Turn 4: Rates uses active crop and location in session', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Rates' } });
    assert.strictEqual(res.intent, 'price');
    assert.ok(res.replyText.includes('₹4600') || res.replyText.includes('Chikhli') || res.replyText.includes('Buldhana'));
  });

  await asyncTest('Turn 5: 20 quintal triggers transport comparison across candidate mandis', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: '20 quintal' } });
    assert.strictEqual(res.intent, 'transport_decision');
    assert.ok(res.replyText.includes('20 Quintals') || res.replyText.includes('20'));
    assert.ok(res.replyText.includes('Chikhli'));
    assert.ok(res.replyText.includes('Khamgaon'));
    const session = getSession(testUser);
    assert.strictEqual(session.quantity, 20);
  });

  await asyncTest('Turn 6: Kaha bechu? recommends optimal mandi using stored slots', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Kaha bechu?' } });
    assert.strictEqual(res.intent, 'transport_decision');
    assert.ok(res.replyText.includes('Recommendation') || res.replyText.includes('सलाह') || res.replyText.includes('शिफारस'));
  });

  await asyncTest('Turn 7: Nagpur updates market to Nagpur and preserves Soybean', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Nagpur' } });
    assert.ok(res.intent === 'price' || res.intent === 'transport_decision');
    assert.ok(res.replyText.includes('Nagpur'));
    const session = getSession(testUser);
    assert.strictEqual(session.district, 'Nagpur');
  });

  await asyncTest('Turn 8: Scheme batao returns verified overview of farmer schemes', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Scheme batao' } });
    assert.strictEqual(res.intent, 'scheme');
    assert.ok(res.replyText.includes('PM-KISAN') || res.replyText.includes('PM-Kisan'));
    assert.ok(res.replyText.includes('MahaDBT'));
    assert.ok(res.replyText.includes('pmkisan.gov.in'));
  });

  await asyncTest('Turn 9: PM Kisan returns PM-KISAN & Namo Shetkari details with official portal link', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'PM Kisan' } });
    assert.strictEqual(res.intent, 'scheme');
    assert.ok(res.replyText.includes('PM-KISAN'));
    assert.ok(res.replyText.includes('6,000') || res.replyText.includes('12,000'));
    assert.ok(res.replyText.includes('https://pmkisan.gov.in'));
    const session = getSession(testUser);
    assert.strictEqual(session.lastSubTopic, 'pm_kisan');
  });

  await asyncTest('Turn 10: Haan triggers contextual e-KYC follow-up steps', async () => {
    const res = await processIncomingMessage({ from: testUser, text: { body: 'Haan' } });
    assert.strictEqual(res.intent, 'affirmation');
    assert.ok(res.replyText.includes('e-KYC'));
    assert.ok(res.replyText.includes('https://pmkisan.gov.in'));
  });

  console.log('\n=== SUITE 2: TRANSPORT DECISION AFFIRMATION FOLLOW-UP ===');
  const transportUser = '919999988888';
  resetSession(transportUser);

  await asyncTest('Transport decision followed by Yes delivers vehicle and APMC loading guidance', async () => {
    await processIncomingMessage({ from: transportUser, text: { body: '20 quintal soyabean from Chikhli' } });
    const res = await processIncomingMessage({ from: transportUser, text: { body: 'Yes' } });
    assert.strictEqual(res.intent, 'affirmation');
    assert.ok(res.replyText.includes('Moisture') || res.replyText.includes('Vehicle') || res.replyText.includes('APMC'));
  });

  console.log('\n=== SUITE 3: SESSION RESET CAPABILITY ===');
  const resetUser = '917777766666';
  resetSession(resetUser);

  await asyncTest('User resets conversation with reset', async () => {
    await processIncomingMessage({ from: resetUser, text: { body: 'Soyabean buldhana' } });
    let session = getSession(resetUser);
    assert.strictEqual(session.crop?.standardName, 'Soyabean');

    const res = await processIncomingMessage({ from: resetUser, text: { body: 'reset' } });
    assert.strictEqual(res.intent, 'greeting');
    assert.ok(res.replyText.includes('CropCash'));

    session = getSession(resetUser);
    assert.strictEqual(session.crop, null);
    assert.strictEqual(session.district, null);
  });

  console.log('\n=== SUITE 4: MULTILINGUAL MULTI-TURN CONSISTENCY ===');
  const mrUser = '918888877777';
  resetSession(mrUser);

  await asyncTest('Marathi multi-turn maintains language and context across turns', async () => {
    const turn1 = await processIncomingMessage({ from: mrUser, text: { body: 'लातूर सोयाबीन भाव' } });
    assert.strictEqual(turn1.lang, 'mr');
    assert.strictEqual(turn1.intent, 'price');

    const turn2 = await processIncomingMessage({ from: mrUser, text: { body: '२० क्विंटल' } });
    assert.strictEqual(turn2.lang, 'mr');
    assert.strictEqual(turn2.intent, 'transport_decision');
    assert.ok(turn2.replyText.includes('लातूर') || turn2.replyText.includes('२० क्विंटल'));
  });

  console.log('\n=== SUITE 5: DISTINCT USER SESSION ISOLATION ===');
  const userA = '911111111111';
  const userB = '912222222222';
  resetSession(userA);
  resetSession(userB);

  await asyncTest('User A and User B maintain separate isolated slots without cross-talk', async () => {
    await processIncomingMessage({ from: userA, text: { body: 'Kapas in Akola' } });
    await processIncomingMessage({ from: userB, text: { body: 'Gehu in Indore' } });

    const resA = await processIncomingMessage({ from: userA, text: { body: 'Rates' } });
    assert.ok(resA.replyText.includes('Cotton') || resA.replyText.includes('Kapas'));
    assert.ok(resA.replyText.includes('Akola'));

    const resB = await processIncomingMessage({ from: userB, text: { body: 'Rates' } });
    assert.ok(resB.replyText.includes('Wheat') || resB.replyText.includes('Gehu'));
    assert.ok(resB.replyText.includes('Indore'));
  });

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
