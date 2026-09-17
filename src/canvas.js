function isCanvasConfigured(config) {
  return Boolean(config.canvasClientId && config.canvasClientSecret && config.canvasRedirectUri);
}

function createCanvasAuthUrl(config, state) {
  const authUrl = new URL('/login/oauth2/auth', config.canvasBaseUrl);
  authUrl.searchParams.set('client_id', config.canvasClientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', config.canvasRedirectUri);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

async function exchangeCanvasCode(config, code) {
  const response = await fetch(new URL('/login/oauth2/token', config.canvasBaseUrl), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.canvasClientId,
      client_secret: config.canvasClientSecret,
      redirect_uri: config.canvasRedirectUri,
      code
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    const error = new Error(`Canvas authorization failed with status ${response.status}.`);
    error.statusCode = 502;
    throw error;
  }

  return response.json();
}

function parseNextLink(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.split(',').find((item) => /rel="next"/.test(item));
  return match?.match(/<([^>]+)>/)?.[1] || null;
}

async function canvasGetAll(config, accessToken, endpoint) {
  const collected = [];
  let nextUrl = new URL(`/api/v1${endpoint}`, config.canvasBaseUrl).toString();
  let pageCount = 0;

  while (nextUrl && pageCount < 10) {
    const response = await fetch(nextUrl, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      const error = new Error(`Canvas API request failed with status ${response.status}.`);
      error.statusCode = 502;
      throw error;
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error('Canvas API returned an unexpected response.');
    collected.push(...payload);
    nextUrl = parseNextLink(response.headers.get('link'));
    pageCount += 1;
  }

  return collected;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function fetchCanvasAssignments(config, accessToken) {
  const courses = await canvasGetAll(config, accessToken, '/courses?enrollment_state=active&per_page=100');
  const assignmentGroups = await mapWithConcurrency(courses, 4, async (course) => {
    const assignments = await canvasGetAll(
      config,
      accessToken,
      `/courses/${encodeURIComponent(course.id)}/assignments?include[]=submission&per_page=100`
    );

    return assignments.map((assignment) => ({
      id: String(assignment.id),
      course: course.name,
      courseCode: course.course_code,
      title: assignment.name,
      description: assignment.description || '',
      dueAt: assignment.due_at,
      points: assignment.points_possible,
      htmlUrl: assignment.html_url,
      submission: assignment.submission ? {
        submittedAt: assignment.submission.submitted_at,
        workflowState: assignment.submission.workflow_state
      } : null
    }));
  });

  return assignmentGroups.flat().sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt) - new Date(b.dueAt);
  });
}

module.exports = {
  createCanvasAuthUrl,
  exchangeCanvasCode,
  fetchCanvasAssignments,
  isCanvasConfigured,
  parseNextLink
};
