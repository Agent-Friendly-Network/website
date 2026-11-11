import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { GET as webhookGet, POST as webhookPost } from '../app/api/webhook/route.ts';
import { GET as callbackGet } from '../app/api/app/callback/route.ts';

async function runTests() {
  // 1. GET /api/webhook health probe
  {
    const res = await webhookGet();
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.endpoint, '/api/webhook');
  }

  // 2. POST /api/webhook missing X-GitHub-Event -> 400
  {
    const req = new NextRequest('https://agentfriendly.network/api/webhook', {
      method: 'POST',
      body: JSON.stringify({ zen: 'test' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await webhookPost(req);
    assert.equal(res.status, 400);
  }

  // 3. POST /api/webhook enforces HMAC signature when GITHUB_WEBHOOK_SECRET is set
  {
    const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = 'afn-test-secret';
    try {
      const body = JSON.stringify({ zen: 'AFN sovereign check' });

      const badReq = new NextRequest('https://agentfriendly.network/api/webhook', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'ping',
          'x-hub-signature-256': 'sha256=deadbeef',
        },
      });
      const badRes = await webhookPost(badReq);
      assert.equal(badRes.status, 401);

      const sig = 'sha256=' + crypto.createHmac('sha256', 'afn-test-secret').update(body).digest('hex');
      const goodReq = new NextRequest('https://agentfriendly.network/api/webhook', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'ping',
          'x-hub-signature-256': sig,
        },
      });
      const goodRes = await webhookPost(goodReq);
      assert.equal(goodRes.status, 200);
      const data = await goodRes.json();
      assert.equal(data.handled, true);
      assert.equal(data.event, 'ping');
    } finally {
      if (prevSecret === undefined) delete process.env.GITHUB_WEBHOOK_SECRET;
      else process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    }
  }

  // 4. GET /api/app/callback health probe
  {
    const req = new NextRequest('https://agentfriendly.network/api/app/callback');
    const res = await callbackGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.endpoint, '/api/app/callback');
  }

  // 5. GET /api/app/callback rejects invalid code format
  {
    const req = new NextRequest('https://agentfriendly.network/api/app/callback?code=bad<script>');
    const res = await callbackGet(req);
    assert.equal(res.status, 400);
  }

  // 6. GET /api/app/callback accepts valid manifest code and returns conversion command
  {
    const req = new NextRequest('https://agentfriendly.network/api/app/callback?code=validcode_123456');
    const res = await callbackGet(req);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('app-manifests/validcode_123456/conversions'));
  }

  // 7. GET /api/app/callback handles installation redirect
  {
    const req = new NextRequest('https://agentfriendly.network/api/app/callback?installation_id=998877&setup_action=install');
    const res = await callbackGet(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'installed');
    assert.equal(data.installation_id, '998877');
  }

  console.log('ALL 7 AFN API ROUTE TESTS PASSED');
}

await runTests();
