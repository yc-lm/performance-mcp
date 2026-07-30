import assert from 'node:assert/strict';
import test from 'node:test';

import { createPerformanceClient } from '../src/performance-client.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('requires an explicit performance service base URL', () => {
  assert.throws(
    () => createPerformanceClient({ token: 'test-token' }),
    /PERFORMANCE_BASE_URL/,
  );
});

test('logs in once and uses the token for period and evaluation queries', async () => {
  const calls = [];
  const client = createPerformanceClient({
    baseUrl: 'http://performance.test',
    username: 'user',
    password: 'password',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/api/auth/login')) {
        return jsonResponse({ success: true, data: { token: 'test-token' } });
      }
      return jsonResponse({ success: true, data: { items: [] } });
    },
  });

  await client.listPeriods();
  await client.listEvaluations({ periodId: 'period-1' });

  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'user', password: 'password' });
  assert.equal(calls[1].url, 'http://performance.test/api/periods');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  assert.equal(
    calls[2].url,
    'http://performance.test/api/evaluations?page=1&limit=10&my=true&periodId=period-1&sortBy=finalTotal&sortOrder=desc',
  );
  assert.equal(calls[2].options.headers.Authorization, 'Bearer test-token');
});

test('saves draft scores only through the scores endpoint', async () => {
  const calls = [];
  const client = createPerformanceClient({
    baseUrl: 'http://performance.test/',
    token: 'existing-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return jsonResponse({ success: true, data: { status: 'DRAFT' } });
    },
  });
  const draft = {
    evaluationId: '73de1f7f-b11a-4598-913b-37e2f045f70d',
    scores: [{ categoryCode: 'work', indicatorCode: 'work_1', selfScore: 70 }],
    selfComment: 'Completed work.',
    docAndCode: 'Code and docs.',
  };

  await client.saveDraft(draft);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://performance.test/api/evaluations/73de1f7f-b11a-4598-913b-37e2f045f70d/scores');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer existing-token');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    scores: draft.scores,
    selfComment: draft.selfComment,
    docAndCode: draft.docAndCode,
  });
});

test('gets one evaluation detail by its ID', async () => {
  const calls = [];
  const client = createPerformanceClient({
    baseUrl: 'http://performance.test',
    token: 'existing-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return jsonResponse({ success: true, data: { id: 'evaluation-1', scores: [] } });
    },
  });

  const result = await client.getEvaluation('evaluation-1');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://performance.test/api/evaluations/evaluation-1');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer existing-token');
  assert.equal(result.data.id, 'evaluation-1');
});

test('rejects invalid score payloads before sending a request', async () => {
  const client = createPerformanceClient({
    baseUrl: 'http://performance.test',
    token: 'token',
    fetchImpl: async () => assert.fail('fetch must not be called'),
  });

  await assert.rejects(
    client.saveDraft({
      evaluationId: 'evaluation-1',
      scores: [{ categoryCode: 'work', indicatorCode: 'work_1', selfScore: 101 }],
    }),
    /selfScore/,
  );
});
