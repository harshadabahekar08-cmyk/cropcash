/**
 * Test Suite: Webhook Pipeline, Deduplication & Follow-Up Recommendation Flow
 */
const assert = require('assert');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { isValidIncomingMessage } = require('../services/safetyValidator');
const { processIncomingMessage } = require('../services/responseHandler');
const { resetSession } = require('../services/conversationStateService');

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
  console.log('\n=== SUITE: WEBHOOK PAYLOAD EXTRACTION & VALIDATION ===');

  await test('Validates standard Meta WhatsApp text message', async () => {
    const msg = {
      from: '918010589136',
      id: 'wamid.HBgMOTE4MDEwNTg5MTM2',
      timestamp: '1670000000',
      text: { body: 'Soybean rate in Nagpur' },
      type: 'text'
    };
    assert.strictEqual(isValidIncomingMessage(msg), true);
  });

  await test('Rejects invalid payload without text, media or type', async () => {
    assert.strictEqual(isValidIncomingMessage({}), false);
    assert.strictEqual(isValidIncomingMessage(null), false);
    assert.strictEqual(isValidIncomingMessage(undefined), false);
  });

  console.log('\n=== SUITE: MULTI-TURN DECISION "WHERE TO GO" ROUTING ===');
  const testUser = '918010589136_' + Date.now();
  resetSession(testUser);

  await test('Turn 1: "I have 20 quintal soyabean where to go" prompts for village location', async () => {
    const res = await processIncomingMessage(
      { type: 'text', text: { body: 'I have 20 quintal soyabean where to go' } },
      testUser
    );
    assert.strictEqual(res.intent, 'transport_decision');
    assert.ok(res.replyText.includes('20 quintal') || res.replyText.includes('Soybean'));
    assert.ok(res.replyText.includes('village or town name'));
  });

  await test('Turn 2: Follow-up location "Chikhli" provides mandi rates and retains Soybean crop', async () => {
    const res = await processIncomingMessage(
      { type: 'text', text: { body: 'Chikhli' } },
      testUser
    );
    assert.strictEqual(res.intent, 'price');
    assert.ok(res.replyText.includes('Chikhli') || res.replyText.includes('Soybean'));
  });

  await test('Turn 3: "where should I sell?" calculates nearby mandi comparison using remembered slots', async () => {
    const res = await processIncomingMessage(
      { type: 'text', text: { body: 'where should I sell?' } },
      testUser
    );
    assert.strictEqual(res.intent, 'transport_decision');
    assert.ok(res.replyText.includes('Chikhli'));
    assert.ok(res.replyText.includes('Khamgaon'));
  });

  console.log('\n=== SUITE: DEDUPLICATION & CONCURRENCY CONTROLS ===');
  const {
    handleIncomingWebhookPayload,
    sendWhatsAppReply,
    acquireMessageLock,
    markMessageCompleted,
    releaseMessageLock,
    processedMessageIds,
    maskPhoneNumber,
    sanitizeMetaError
  } = require('../server');

  await test('Lock prevents concurrent duplicate processing', async () => {
    const testMsgId = 'wamid.CONCURRENT_TEST_' + Date.now();
    assert.strictEqual(acquireMessageLock(testMsgId), true, 'First acquisition must succeed');
    assert.strictEqual(acquireMessageLock(testMsgId), false, 'Concurrent acquisition must be blocked');
    releaseMessageLock(testMsgId);
  });

  await test('Completed message prevents duplicate reply', async () => {
    const testMsgId = 'wamid.COMPLETED_TEST_' + Date.now();
    acquireMessageLock(testMsgId);
    markMessageCompleted(testMsgId);
    assert.strictEqual(acquireMessageLock(testMsgId), false, 'Completed message must reject re-acquisition');
    releaseMessageLock(testMsgId);
  });

  await test('Failed processing releases lock so retry can be attempted', async () => {
    const testMsgId = 'wamid.RETRY_TEST_' + Date.now();
    acquireMessageLock(testMsgId);
    assert.strictEqual(acquireMessageLock(testMsgId), false, 'Locked while in-flight');
    releaseMessageLock(testMsgId);
    assert.strictEqual(acquireMessageLock(testMsgId), true, 'Lock re-acquisition must succeed after release');
    releaseMessageLock(testMsgId);
  });

  console.log('\n=== SUITE: OUTBOUND WHATSAPP API & ERROR RESILIENCE ===');

  await test('Outbound send: permanent 401 error is not retried', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            message: 'Error validating access token: Session has expired. Token EAAB123456789 expired.',
            code: 190
          }
        })
      };
    };

    const res = await sendWhatsAppReply({
      phoneNumberId: '1234567890',
      accessToken: 'EAAB_TEST_TOKEN',
      to: '918010589136',
      replyText: 'Hello test',
      fetchFn: mockFetch
    });

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(callCount, 1, 'Permanent 4xx must not be retried');
    assert.strictEqual(res.error.code, 190);
    assert.ok(!res.error.message.includes('EAAB123456789'), 'Access token must be redacted');
  });

  await test('Outbound send: transient 500 error retries boundedly at most once', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: { message: 'Temporary glitch' } })
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ messages: [{ id: 'wamid.SENT_500_RETRY' }] })
      };
    };

    const res = await sendWhatsAppReply({
      phoneNumberId: '1234567890',
      accessToken: 'EAAB_TEST_TOKEN',
      to: '918010589136',
      replyText: 'Hello test',
      fetchFn: mockFetch
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(callCount, 2, 'Transient 5xx must retry once');
    assert.strictEqual(res.messageId, 'wamid.SENT_500_RETRY');
  });

  await test('Outbound send: timeout error does not trigger duplicate sends', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    };

    const res = await sendWhatsAppReply({
      phoneNumberId: '1234567890',
      accessToken: 'EAAB_TEST_TOKEN',
      to: '918010589136',
      replyText: 'Hello test',
      fetchFn: mockFetch
    });

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.isTimeout, true);
    assert.strictEqual(callCount, 1, 'Timed-out send must NOT be blindly retried');
  });

  console.log('\n=== SUITE: CONFIGURATION, PRIVACY & FULL WEBHOOK PIPELINE ===');

  await test('Missing credentials abort safely without locking the message ID', async () => {
    const origToken = process.env.ACCESS_TOKEN;
    delete process.env.ACCESS_TOKEN;

    const testMsgId = 'wamid.MISSING_CRED_TEST_' + Date.now();
    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '1234567890' },
            contacts: [{ wa_id: '918010589136' }],
            messages: [{
              id: testMsgId,
              from: '918010589136',
              type: 'text',
              text: { body: 'Soybean rate' }
            }]
          }
        }]
      }]
    };

    const res = await handleIncomingWebhookPayload(payload);
    assert.strictEqual(res.status, 'error_missing_credentials');
    assert.strictEqual(acquireMessageLock(testMsgId), true, 'Lock must be released when config is missing');
    releaseMessageLock(testMsgId);

    process.env.ACCESS_TOKEN = origToken;
  });

  await test('Privacy masking masks phone numbers and redacts tokens', async () => {
    assert.strictEqual(maskPhoneNumber('918010589136'), '9180****9136');
    assert.strictEqual(maskPhoneNumber('123'), '****');
    const sanitized = sanitizeMetaError({ error: { message: 'Failed for EAAB123456XYZ with sha256=abcdef123456' } });
    assert.ok(!sanitized.message.includes('EAAB123456XYZ'));
    assert.ok(!sanitized.message.includes('abcdef123456'));
    assert.ok(sanitized.message.includes('[REDACTED_TOKEN]'));
  });

  await test('Full pipeline: failed outbound releases lock; retry succeeds and marks completed', async () => {
    const testMsgId = 'wamid.E2E_RETRY_' + Date.now();
    let outboundSucceed = false;

    const mockFetch = async () => {
      if (!outboundSucceed) {
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: { message: 'Test 400' } })
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ messages: [{ id: 'wamid.DELIVERED_OK' }] })
      };
    };

    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: process.env.PHONE_NUMBER_ID || '123456789' },
            contacts: [{ wa_id: '918010589136' }],
            messages: [{
              id: testMsgId,
              from: '918010589136',
              type: 'text',
              text: { body: 'Soybean rate in Buldhana' }
            }]
          }
        }]
      }]
    };

    // Attempt 1: Outbound fails
    const res1 = await handleIncomingWebhookPayload(payload, { fetchFn: mockFetch });
    assert.strictEqual(res1.status, 'outbound_failed');
    assert.strictEqual(acquireMessageLock(testMsgId), true, 'Lock must be freed after outbound failure');
    releaseMessageLock(testMsgId);

    // Attempt 2: Outbound succeeds on retry
    outboundSucceed = true;
    const res2 = await handleIncomingWebhookPayload(payload, { fetchFn: mockFetch });
    assert.strictEqual(res2.status, 'success');

    // Attempt 3: Duplicate webhook delivery is skipped
    const res3 = await handleIncomingWebhookPayload(payload, { fetchFn: mockFetch });
    assert.strictEqual(res3.status, 'duplicate_skipped');
  });

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
