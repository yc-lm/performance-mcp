export function createPerformanceClient({
  baseUrl,
  token,
  username,
  password,
  fetchImpl = fetch,
} = {}) {
  let accessToken = token;
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function authenticate() {
    if (accessToken) {
      return accessToken;
    }
    if (!username || !password) {
      throw new Error('Set PERFORMANCE_TOKEN or both PERFORMANCE_USERNAME and PERFORMANCE_PASSWORD.');
    }

    const response = await fetchImpl(`${normalizedBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await parseResponse(response, 'Login');
    accessToken = result?.data?.token;
    if (!result?.success || !accessToken) {
      throw new Error(result?.message || 'Login did not return a token.');
    }
    return accessToken;
  }

  async function request(path, { method = 'GET', body } = {}) {
    const currentToken = await authenticate();
    const headers = { Authorization: `Bearer ${currentToken}` };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse(response, `${method} ${path}`);
  }

  return {
    listPeriods() {
      return request('/api/periods');
    },

    listEvaluations({
      page = 1,
      limit = 10,
      my = true,
      periodId,
      status,
      departmentId,
      includeDeleted,
      sortBy = 'finalTotal',
      sortOrder = 'desc',
    } = {}) {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        my: String(my),
      });
      appendQuery(query, 'periodId', periodId);
      appendQuery(query, 'status', status);
      appendQuery(query, 'departmentId', departmentId);
      if (includeDeleted !== undefined) {
        query.set('includeDeleted', String(includeDeleted));
      }
      query.set('sortBy', sortBy);
      query.set('sortOrder', sortOrder);
      return request(`/api/evaluations?${query.toString()}`);
    },

    getEvaluation(evaluationId) {
      if (typeof evaluationId !== 'string' || !evaluationId.trim()) {
        throw new Error('evaluationId must be a non-empty string.');
      }
      return request(`/api/evaluations/${encodeURIComponent(evaluationId)}`);
    },

    async saveDraft({ evaluationId, scores, selfComment, docAndCode }) {
      validateDraft({ evaluationId, scores, selfComment, docAndCode });
      return request(`/api/evaluations/${encodeURIComponent(evaluationId)}/scores`, {
        method: 'PUT',
        body: { scores, selfComment, docAndCode },
      });
    },
  };
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new Error('Set PERFORMANCE_BASE_URL to the performance service URL.');
  }
  return baseUrl.replace(/\/$/, '');
}

function appendQuery(query, name, value) {
  if (value !== undefined && value !== null && value !== '') {
    query.set(name, String(value));
  }
}

function validateDraft({ evaluationId, scores, selfComment, docAndCode }) {
  if (typeof evaluationId !== 'string' || !evaluationId.trim()) {
    throw new Error('evaluationId must be a non-empty string.');
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    throw new Error('scores must be a non-empty array.');
  }
  for (const score of scores) {
    if (!score || typeof score.categoryCode !== 'string' || typeof score.indicatorCode !== 'string') {
      throw new Error('Each score must include categoryCode and indicatorCode.');
    }
    if (!Number.isFinite(score.selfScore) || score.selfScore < 0 || score.selfScore > 100) {
      throw new Error('Each selfScore must be a number from 0 to 100.');
    }
    for (const dayField of ['plannedDays', 'completedDays']) {
      if (score[dayField] !== undefined && (!Number.isFinite(score[dayField]) || score[dayField] < 0)) {
        throw new Error(`${dayField} must be a non-negative number when provided.`);
      }
    }
  }
  for (const field of [selfComment, docAndCode]) {
    if (field !== undefined && typeof field !== 'string') {
      throw new Error('selfComment and docAndCode must be strings when provided.');
    }
  }
}

async function parseResponse(response, operation) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`${operation} failed with HTTP ${response.status}: response was not JSON.`);
  }
  if (!response.ok || result?.success === false) {
    throw new Error(`${operation} failed with HTTP ${response.status}: ${result?.message || 'Unknown error.'}`);
  }
  return result;
}
