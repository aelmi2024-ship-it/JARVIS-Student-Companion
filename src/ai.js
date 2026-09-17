const { createDemoReply } = require('./demo-assistant');

function stripHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAssignmentContext(assignments = []) {
  return assignments.slice(0, 30).map((assignment) => ({
    course: String(assignment.course || assignment.courseCode || '').slice(0, 120),
    title: String(assignment.title || assignment.name || '').slice(0, 180),
    description: stripHtml(assignment.description).slice(0, 1200),
    dueAt: assignment.dueAt || assignment.due_at || null,
    points: assignment.points ?? assignment.points_possible ?? null,
    deliverable: String(assignment.deliverable || '').slice(0, 500),
    requirements: Array.isArray(assignment.requirements) ? assignment.requirements.slice(0, 10) : []
  }));
}

async function askAnthropic(config, message, assignments) {
  if (!config.anthropicApiKey || !config.aiModel) {
    const error = new Error('AI mode requires ANTHROPIC_API_KEY and AI_MODEL.');
    error.statusCode = 503;
    throw error;
  }

  const context = buildAssignmentContext(assignments);
  const system = [
    'You are JARVIS, a practical academic planning assistant.',
    'Use only the supplied assignment context for assignment-specific claims.',
    'Never invent deadlines, requirements, grades, professor policies, or citations.',
    'Give concise, actionable guidance that helps the student learn and complete their own work.',
    'When planning, prioritize by deadline, effort, and progress. When context is missing, say what is missing.',
    `Assignment context: ${JSON.stringify(context)}`
  ].join('\n');

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': config.anthropicApiKey
    },
    body: JSON.stringify({
      model: config.aiModel,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: message }]
    }),
    signal: AbortSignal.timeout(20_000)
  });

  if (!apiResponse.ok) {
    const error = new Error(`AI provider request failed with status ${apiResponse.status}.`);
    error.statusCode = 502;
    throw error;
  }

  const result = await apiResponse.json();
  const reply = result.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!reply) {
    const error = new Error('AI provider returned an empty response.');
    error.statusCode = 502;
    throw error;
  }

  return reply;
}

async function createAssistantReply(config, message, assignments, demoData) {
  if (config.aiProvider === 'anthropic') return askAnthropic(config, message, assignments);
  return createDemoReply(message, demoData);
}

module.exports = { buildAssignmentContext, createAssistantReply, stripHtml };
