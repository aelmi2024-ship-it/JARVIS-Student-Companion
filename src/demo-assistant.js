function courseFor(assignment, courses) {
  return courses.find((course) => course.id === assignment.courseId);
}

function dueDateFor(assignment, now = new Date()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(assignment.dueOffsetDays || 0));
  const [hours, minutes] = String(assignment.dueTime || '23:59').split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function assignmentSummary(assignment, courses) {
  const course = courseFor(assignment, courses);
  return `${course?.code || 'Course'} — ${assignment.title}`;
}

function createDemoReply(message, data, now = new Date()) {
  const normalized = message.toLowerCase();
  const assignments = [...data.assignments].sort((a, b) => dueDateFor(a, now) - dueDateFor(b, now));
  const active = assignments.filter((assignment) => assignment.status !== 'completed');
  const mentioned = active.find((assignment) => {
    const titleWords = assignment.title.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    return titleWords.some((word) => normalized.includes(word));
  });

  if (/what.*(first|priority)|prioriti[sz]e|start with|focus on/.test(normalized)) {
    const first = active[0];
    const second = active[1];
    return [
      `Start with ${assignmentSummary(first, data.courses)}. It is due ${formatDate(dueDateFor(first, now))} and is already ${first.progress}% complete.`,
      `Use one focused ${Math.min(first.estimatedMinutes, 90)}-minute block to finish the core requirements, then spend 20 minutes testing and reviewing the rubric.`,
      second ? `After that, move to ${assignmentSummary(second, data.courses)}.` : ''
    ].filter(Boolean).join('\n\n');
  }

  if (/due|deadline|coming up|this week/.test(normalized)) {
    return active.slice(0, 3).map((assignment, index) => (
      `${index + 1}. ${assignmentSummary(assignment, data.courses)} — ${formatDate(dueDateFor(assignment, now))}`
    )).join('\n');
  }

  if (mentioned || /help.*assignment|break.*down|make.*plan/.test(normalized)) {
    const assignment = mentioned || active[0];
    const requirements = assignment.requirements.map((item, index) => `${index + 1}. ${item}`).join('\n');
    return `${assignmentSummary(assignment, data.courses)}\n\nDeliverable: ${assignment.deliverable}\n\nPlan:\n${requirements}\n${assignment.requirements.length + 1}. Review the rubric and submit the final file.`;
  }

  if (/schedule|calendar|today|free time/.test(normalized)) {
    return 'You have a 90-minute focus block at 11:30 today. Use the first 60 minutes for the highest-priority assignment, take a 10-minute break, then spend 20 minutes testing and documenting your work.';
  }

  if (/canvas|connect|integration/.test(normalized)) {
    return 'This showcase is using safe demo data. Open Settings to connect an institution-approved Canvas OAuth app. Credentials and access tokens stay on the server and are never placed in browser code.';
  }

  return `I can help you choose what to do first, list upcoming deadlines, break an assignment into steps, or plan a study block. Try “What should I work on first?”`;
}

module.exports = { createDemoReply, dueDateFor };
