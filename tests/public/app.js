'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEYS = {
  completed: 'jarvis.completedAssignments.v2',
  planner: 'jarvis.plannerItems.v2',
  checkin: 'jarvis.wellbeingCheckin.v2',
  speak: 'jarvis.speakReplies.v2',
  voice: 'jarvis.voice.v2'
};

const state = {
  data: null,
  courses: [],
  assignments: [],
  demoSchedule: [],
  gradebooks: [],
  campusEvents: [],
  plannerItems: readStorage(STORAGE_KEYS.planner, []),
  completed: readStorage(STORAGE_KEYS.completed, {}),
  runtime: null,
  serverAvailable: false,
  selectedAssignment: null,
  recognition: null,
  listening: false,
  voiceTriggered: false,
  preferredVoice: null,
  toastTimer: null
};

const elements = {
  navItems: $$('.nav-item'),
  pageViews: $$('.page-view'),
  sidebar: $('.sidebar'),
  mobileMenu: $('#mobileMenu'),
  currentDate: $('#currentDate'),
  profileInitials: $('#profileInitials'),
  profileName: $('#profileName'),
  profileMeta: $('#profileMeta'),
  firstName: $('#firstName'),
  timeOfDay: $('#timeOfDay'),
  overviewSummary: $('#overviewSummary'),
  assignmentBadge: $('#assignmentBadge'),
  sourceDescription: $('#sourceDescription'),
  sourceLight: $('#sourceLight'),
  modePill: $('#modePill'),
  modeLabel: $('#modeLabel'),
  focusCourse: $('#focusCourse'),
  focusTitle: $('#focusTitle'),
  focusDescription: $('#focusDescription'),
  focusDue: $('#focusDue'),
  focusEstimate: $('#focusEstimate'),
  focusProgress: $('#focusProgress'),
  progressRing: $('#progressRing'),
  planFocus: $('#planFocus'),
  dueSoonCount: $('#dueSoonCount'),
  progressCount: $('#progressCount'),
  focusHours: $('#focusHours'),
  todayTimeline: $('#todayTimeline'),
  insightTitle: $('#insightTitle'),
  insightText: $('#insightText'),
  triageTitle: $('#triageTitle'),
  triageText: $('#triageText'),
  wellbeingTitle: $('#wellbeingTitle'),
  wellbeingText: $('#wellbeingText'),
  askForm: $('#askForm'),
  askInput: $('#askInput'),
  conversation: $('#conversation'),
  voiceButton: $('#voiceButton'),
  quickVoice: $('#quickVoice'),
  voiceStatus: $('#voiceStatus'),
  assignmentSearch: $('#assignmentSearch'),
  courseFilter: $('#courseFilter'),
  statusFilter: $('#statusFilter'),
  assignmentGrid: $('#assignmentGrid'),
  assignmentEmpty: $('#assignmentEmpty'),
  priorityList: $('#priorityList'),
  plannerForm: $('#plannerForm'),
  scheduleList: $('#scheduleList'),
  resetPlanner: $('#resetPlanner'),
  gradeCourse: $('#gradeCourse'),
  finalName: $('#finalName'),
  finalScore: $('#finalScore'),
  finalScoreNumber: $('#finalScoreNumber'),
  targetGrade: $('#targetGrade'),
  projectedGrade: $('#projectedGrade'),
  projectedLetter: $('#projectedLetter'),
  projectedSummary: $('#projectedSummary'),
  currentGrade: $('#currentGrade'),
  neededScore: $('#neededScore'),
  neededSummary: $('#neededSummary'),
  gradeBreakdown: $('#gradeBreakdown'),
  weightCheck: $('#weightCheck'),
  campusEventGrid: $('#campusEventGrid'),
  freeTimeTitle: $('#freeTimeTitle'),
  freeTimeText: $('#freeTimeText'),
  availabilityResult: $('#availabilityResult'),
  connectionDialog: $('#connectionDialog'),
  assignmentDialog: $('#assignmentDialog'),
  openConnection: $('#openConnection'),
  settingsConnection: $('#settingsConnection'),
  closeConnection: $('#closeConnection'),
  closeAssignment: $('#closeAssignment'),
  useDemo: $('#useDemo'),
  connectRealCanvas: $('#connectRealCanvas'),
  realCanvasStatus: $('#realCanvasStatus'),
  canvasSettingsText: $('#canvasSettingsText'),
  voiceSelect: $('#voiceSelect'),
  speakReplies: $('#speakReplies'),
  detailTitle: $('#detailTitle'),
  detailDescription: $('#detailDescription'),
  detailMeta: $('#detailMeta'),
  detailRequirements: $('#detailRequirements'),
  detailRubric: $('#detailRubric'),
  detailPlan: $('#detailPlan'),
  detailSchedule: $('#detailSchedule'),
  toast: $('#toast')
};

function readStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast('Browser storage is unavailable; changes will last until this tab closes.');
  }
}

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function offsetDate(dayOffset, time = '23:59') {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(dayOffset || 0));
  const [hours, minutes] = String(time).split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dayStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateKey(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysUntil(date) {
  return Math.ceil((new Date(date) - dayStart()) / 86_400_000);
}

function formatDue(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  const days = daysUntil(date);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  if (days === 0) return `Today · ${time}`;
  if (days === 1) return `Tomorrow · ${time}`;
  if (days < 0) return `Overdue · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)}`;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatPlannerDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function courseFor(assignment) {
  return state.courses.find((course) => course.id === assignment.courseId) || {
    id: assignment.courseId || 'canvas',
    code: assignment.courseCode || 'COURSE',
    name: assignment.course || 'Canvas course'
  };
}

function activeAssignments() {
  return state.assignments
    .filter((assignment) => assignment.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt) - new Date(b.dueAt);
    });
}

function hydrateDemoData(data) {
  state.data = data;
  state.courses = data.courses;
  state.assignments = data.assignments.map((assignment) => ({
    ...assignment,
    dueAt: offsetDate(assignment.dueOffsetDays, assignment.dueTime).toISOString(),
    status: state.completed[assignment.id] ? 'completed' : assignment.status,
    progress: state.completed[assignment.id] ? 100 : assignment.progress
  }));
  state.demoSchedule = data.schedule.map((item) => ({
    ...item,
    date: dateKey(offsetDate(item.dayOffset, item.time)),
    source: 'demo'
  }));
  state.gradebooks = data.gradebooks || [];
  state.campusEvents = (data.campusEvents || []).map((event) => ({
    ...event,
    date: dateKey(offsetDate(event.dayOffset, event.time))
  }));
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function renderProfile() {
  const { profile } = state.data;
  const firstName = profile.name.split(/\s+/)[0];
  setText(elements.profileInitials, profile.initials);
  setText(elements.profileName, profile.name);
  setText(elements.profileMeta, `${profile.program} · ${profile.level}`);
  setText(elements.firstName, firstName);
  const hour = new Date().getHours();
  setText(elements.timeOfDay, hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');
  setText(elements.currentDate, new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date()));
}

function renderOverview() {
  const active = activeAssignments();
  const top = active[0] || state.assignments[0];
  const dueSoon = active.filter((assignment) => {
    const days = daysUntil(assignment.dueAt);
    return days >= 0 && days <= 7;
  });
  const workMinutes = dueSoon.reduce((sum, assignment) => sum + Number(assignment.estimatedMinutes || 0), 0);
  const progressCount = active.filter((assignment) => assignment.status === 'in-progress').length;
  setText(elements.assignmentBadge, String(active.length));
  setText(elements.dueSoonCount, String(dueSoon.length));
  setText(elements.progressCount, String(progressCount));
  setText(elements.focusHours, `${Math.round(workMinutes / 60)}h`);
  setText(elements.overviewSummary, `${active.length} active assignments · ${dueSoon.length} due in the next 7 days · ${formatDuration(workMinutes)} of estimated work`);

  if (!top) return;
  const course = courseFor(top);
  setText(elements.focusCourse, `${course.code} · ${course.name}`.toUpperCase());
  setText(elements.focusTitle, top.title);
  setText(elements.focusDescription, top.description);
  setText(elements.focusDue, formatDue(top.dueAt));
  setText(elements.focusEstimate, formatDuration(top.estimatedMinutes));
  setText(elements.focusProgress, `${top.progress || 0}%`);
  elements.progressRing.className = `progress-ring progress-${Math.round(Number(top.progress || 0) / 10) * 10}`;
  elements.progressRing.setAttribute('aria-label', `${top.progress || 0}% complete`);
  elements.planFocus.dataset.assignmentId = top.id;

  if (daysUntil(top.dueAt) <= 1) {
    setText(elements.insightTitle, 'Protect your focus window.');
    setText(elements.insightText, `${top.title} is your closest deadline. A focused ${Math.min(top.estimatedMinutes, 90)}-minute block will create the most momentum.`);
  } else {
    setText(elements.insightTitle, 'You have room to work ahead.');
    setText(elements.insightText, `Start ${top.title} before it becomes urgent, then use the final day only for review.`);
  }
}

function renderSmartSignals() {
  const groups = new Map();
  for (const assignment of activeAssignments()) {
    if (!assignment.dueAt) continue;
    const key = dateKey(new Date(assignment.dueAt));
    groups.set(key, [...(groups.get(key) || []), assignment]);
  }
  const collision = [...groups.entries()]
    .filter(([, assignments]) => assignments.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];

  const sleepConflict = activeAssignments().find((assignment) => {
    if (!assignment.dueAt) return false;
    const due = new Date(assignment.dueAt);
    if (due.getHours() < 23) return false;
    const nextDay = new Date(due);
    nextDay.setDate(nextDay.getDate() + 1);
    const key = dateKey(nextDay);
    return state.demoSchedule.some((item) => item.date === key && item.type === 'class' && item.time <= '09:00');
  });

  if (collision) {
    const [date, assignments] = collision;
    const label = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
    setText(elements.triageTitle, `${assignments.length} deadlines collide on ${label}.`);
    const names = assignments.map((assignment) => assignment.title).join(', ');
    const warning = sleepConflict ? ` ${sleepConflict.title} is also due late before an early class—finish it before evening.` : '';
    setText(elements.triageText, `Spread out ${names}. Start the longest task first instead of treating the due date as the start date.${warning}`);
  } else {
    setText(elements.triageTitle, 'No major deadline collisions detected.');
    setText(elements.triageText, sleepConflict ? `${sleepConflict.title} is due late before an early class. Plan to finish it before evening.` : 'Your active deadlines are spaced well. Use the gap to work ahead.');
  }

  const savedCheckin = localStorage.getItem(STORAGE_KEYS.checkin);
  updateWellbeing(savedCheckin, false);
}

function updateWellbeing(value, persist = true) {
  if (!value) return;
  const messages = {
    good: ['Good momentum.', 'Keep the plan realistic and protect at least one true break this week.'],
    stretched: ['Your schedule needs breathing room.', 'Use the generated study sessions, shorten one optional commitment, and stop work before the late-night deadline window.'],
    overloaded: ['Reduce the load before adding more.', 'Focus on the closest required deadline, move one flexible block, and contact the instructor early if a deadline is at risk.']
  };
  const [title, text] = messages[value] || messages.good;
  setText(elements.wellbeingTitle, title);
  setText(elements.wellbeingText, text);
  for (const button of $$('[data-checkin]')) button.classList.toggle('is-selected', button.dataset.checkin === value);
  if (persist) localStorage.setItem(STORAGE_KEYS.checkin, value);
}

function renderTodayTimeline() {
  elements.todayTimeline.replaceChildren();
  const today = dateKey();
  const items = state.demoSchedule.filter((item) => item.date === today);
  for (const item of items) {
    const row = createElement('div', 'timeline-item');
    row.dataset.type = item.type;
    const time = createElement('time', '', new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(`${item.date}T${item.time}:00`)));
    time.dateTime = `${item.date}T${item.time}`;
    const dot = createElement('span', 'timeline-dot');
    const copy = createElement('span', 'timeline-copy');
    copy.append(createElement('strong', '', item.title), createElement('small', '', item.location));
    row.append(time, dot, copy);
    elements.todayTimeline.append(row);
  }
  if (!items.length) elements.todayTimeline.append(createElement('p', 'voice-status', 'No demo events scheduled today.'));
}

function populateCourseFilter() {
  const selected = elements.courseFilter.value || 'all';
  elements.courseFilter.replaceChildren(new Option('All courses', 'all'));
  for (const course of state.courses) {
    elements.courseFilter.append(new Option(`${course.code} · ${course.name}`, course.id));
  }
  elements.courseFilter.value = state.courses.some((course) => course.id === selected) ? selected : 'all';
}

function metaBlock(label, value) {
  const item = createElement('span');
  item.append(createElement('small', '', label), document.createTextNode(value));
  return item;
}

function assignmentCard(assignment) {
  const course = courseFor(assignment);
  const card = createElement('article', 'assignment-card');
  card.dataset.priority = assignment.priority || 'medium';
  card.dataset.assignmentId = assignment.id;

  const top = createElement('div', 'assignment-card-top');
  top.append(createElement('span', '', `${course.code} · ${course.name}`.toUpperCase()));
  const statusLabel = assignment.status === 'in-progress' ? 'IN PROGRESS' : assignment.status === 'completed' ? 'COMPLETED' : 'NOT STARTED';
  top.append(createElement('span', `status-chip ${assignment.status}`, statusLabel));

  const body = createElement('div', 'assignment-card-body');
  body.append(createElement('h2', '', assignment.title), createElement('p', '', assignment.description || 'Open the assignment brief for details.'));
  const metadata = createElement('div', 'work-meta');
  metadata.append(
    metaBlock('DUE', formatDue(assignment.dueAt)),
    metaBlock('ESTIMATE', formatDuration(assignment.estimatedMinutes || 60)),
    metaBlock('POINTS', assignment.points == null ? 'Not listed' : String(assignment.points)),
    metaBlock('PROGRESS', `${assignment.progress || 0}%`)
  );
  body.append(metadata);

  const footer = createElement('div', 'assignment-footer');
  const details = createElement('button', '', 'View brief');
  details.type = 'button';
  details.dataset.action = 'details';
  const complete = createElement('button', '', assignment.status === 'completed' ? 'Mark active' : 'Mark complete');
  complete.type = 'button';
  complete.dataset.action = 'complete';
  footer.append(details, complete);
  card.append(top, body, footer);
  return card;
}

function renderAssignments() {
  const query = elements.assignmentSearch.value.trim().toLowerCase();
  const course = elements.courseFilter.value;
  const status = elements.statusFilter.value;
  const filtered = state.assignments.filter((assignment) => {
    const haystack = `${assignment.title} ${assignment.description || ''} ${courseFor(assignment).name}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesCourse = course === 'all' || assignment.courseId === course;
    const matchesStatus = status === 'all' || (status === 'active' ? assignment.status !== 'completed' : assignment.status === status);
    return matchesQuery && matchesCourse && matchesStatus;
  }).sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt) - new Date(b.dueAt);
  });

  elements.assignmentGrid.replaceChildren(...filtered.map(assignmentCard));
  elements.assignmentEmpty.hidden = filtered.length > 0;
}

function renderPriorityList() {
  elements.priorityList.replaceChildren();
  const assignments = activeAssignments();
  for (const [index, assignment] of assignments.entries()) {
    const item = createElement('div', 'priority-item');
    const number = createElement('span', 'priority-number', String(index + 1).padStart(2, '0'));
    const copy = createElement('span', 'priority-copy');
    copy.append(createElement('strong', '', assignment.title), createElement('small', '', `${courseFor(assignment).code} · ${formatDue(assignment.dueAt)}`));
    item.append(number, copy, createElement('span', 'priority-time', formatDuration(assignment.estimatedMinutes || 60)));
    elements.priorityList.append(item);
  }
  if (!assignments.length) elements.priorityList.append(createElement('p', 'voice-status', 'Everything is marked complete. Nice work.'));
}

function allScheduleItems() {
  return [...state.demoSchedule, ...state.plannerItems].sort((a, b) => (
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  ));
}

function renderSchedule() {
  elements.scheduleList.replaceChildren();
  for (const item of allScheduleItems()) {
    const row = createElement('div', 'schedule-item');
    const time = createElement('time', '', item.time);
    time.dateTime = `${item.date}T${item.time}`;
    const copy = createElement('div');
    copy.append(createElement('strong', '', item.title), createElement('small', '', item.source === 'demo' ? `${formatPlannerDate(item.date)} · Demo schedule` : `${formatPlannerDate(item.date)} · Custom focus block`));
    row.append(time, copy);
    if (item.source !== 'demo') {
      const remove = createElement('button', 'delete-plan', '×');
      remove.type = 'button';
      remove.dataset.planId = item.id;
      remove.setAttribute('aria-label', `Delete ${item.title}`);
      row.append(remove);
    } else {
      row.append(createElement('span'));
    }
    elements.scheduleList.append(row);
  }
}

function letterGrade(score) {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A−';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B−';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C−';
  if (score >= 60) return 'D';
  return 'F';
}

function populateGradeCourses() {
  const previous = elements.gradeCourse.value;
  elements.gradeCourse.replaceChildren();
  for (const gradebook of state.gradebooks) {
    const course = state.courses.find((item) => item.id === gradebook.courseId);
    if (course) elements.gradeCourse.append(new Option(`${course.code} · ${course.name}`, gradebook.courseId));
  }
  if (previous && state.gradebooks.some((item) => item.courseId === previous)) elements.gradeCourse.value = previous;
}

function renderGradeForecast() {
  const gradebook = state.gradebooks.find((item) => item.courseId === elements.gradeCourse.value) || state.gradebooks[0];
  if (!gradebook) return;
  if (elements.gradeCourse.value !== gradebook.courseId) elements.gradeCourse.value = gradebook.courseId;
  const course = state.courses.find((item) => item.id === gradebook.courseId);
  const finalScore = Math.max(0, Math.min(100, Number(elements.finalScoreNumber.value || 0)));
  const target = Math.max(0, Math.min(100, Number(elements.targetGrade.value || 0)));
  elements.finalScore.value = String(finalScore);
  elements.finalScoreNumber.value = String(finalScore);
  setText(elements.finalName, gradebook.final.name.toLowerCase());

  const completedWeight = gradebook.categories.reduce((sum, category) => sum + category.weight, 0);
  const completedPoints = gradebook.categories.reduce((sum, category) => sum + (category.score * category.weight / 100), 0);
  const totalWeight = completedWeight + gradebook.final.weight;
  const current = completedWeight ? completedPoints / completedWeight * 100 : 0;
  const projected = completedPoints + (finalScore * gradebook.final.weight / 100);
  const normalizedProjected = totalWeight ? projected / totalWeight * 100 : 0;
  const needed = gradebook.final.weight ? ((target * totalWeight / 100) - completedPoints) / gradebook.final.weight * 100 : Infinity;

  setText(elements.currentGrade, `${current.toFixed(1)}%`);
  setText(elements.projectedGrade, `${normalizedProjected.toFixed(1)}%`);
  setText(elements.projectedLetter, letterGrade(normalizedProjected));
  setText(elements.projectedSummary, `A ${finalScore}% on the ${gradebook.final.name.toLowerCase()} projects to ${letterGrade(normalizedProjected)} in ${course?.code || 'this course'}.`);
  if (needed > 100) {
    setText(elements.neededScore, '>100%');
    setText(elements.neededSummary, `${target}% is not reachable from the remaining ${gradebook.final.weight}% alone. Check for extra credit or adjust the target.`);
  } else if (needed <= 0) {
    setText(elements.neededScore, '0%');
    setText(elements.neededSummary, `You have already secured at least ${target}% based on these weights.`);
  } else {
    setText(elements.neededScore, `${needed.toFixed(1)}%`);
    setText(elements.neededSummary, `Needed on the ${gradebook.final.name.toLowerCase()} to finish with ${target}%.`);
  }

  setText(elements.weightCheck, `${totalWeight}% total`);
  elements.gradeBreakdown.replaceChildren();
  const categories = [...gradebook.categories, { name: gradebook.final.name, weight: gradebook.final.weight, score: finalScore, projected: true }];
  for (const category of categories) {
    const item = createElement('article', 'grade-category');
    item.append(
      createElement('strong', '', category.name),
      createElement('span', '', `${category.score}%`),
      createElement('small', '', `${category.weight}% of course${category.projected ? ' · what-if score' : ''}`)
    );
    elements.gradeBreakdown.append(item);
  }
}

function eventDate(event) {
  return new Date(`${event.date}T${event.time}:00`);
}

function renderCampusEvents() {
  elements.campusEventGrid.replaceChildren();
  for (const event of state.campusEvents) {
    const card = createElement('article', 'campus-event-card');
    const copy = createElement('div', 'campus-event-copy');
    copy.append(createElement('p', 'micro-label', event.category), createElement('h2', '', event.title), createElement('p', '', event.description));
    const facts = createElement('div', 'event-facts');
    facts.append(
      createElement('span', '', new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(eventDate(event))),
      createElement('span', '', event.location),
      createElement('span', '', formatDuration(event.durationMinutes))
    );
    const button = createElement('button', 'primary-button', 'Check my availability →');
    button.type = 'button';
    button.dataset.eventId = event.id;
    copy.append(facts, button);
    card.append(copy);
    elements.campusEventGrid.append(card);
  }
}

function scheduleWindow(item) {
  const start = new Date(`${item.date}T${item.time}:00`);
  const defaultDuration = item.durationMinutes || (item.type === 'class' ? 75 : item.type === 'focus' ? 90 : 60);
  return { start, end: new Date(start.getTime() + defaultDuration * 60_000) };
}

function checkEventAvailability(event) {
  const start = eventDate(event);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const conflicts = allScheduleItems().filter((item) => {
    if (item.date !== event.date) return false;
    const window = scheduleWindow(item);
    return start < window.end && end > window.start;
  });
  const nearestDeadline = activeAssignments().find((assignment) => {
    if (!assignment.dueAt) return false;
    const difference = new Date(assignment.dueAt) - end;
    return difference >= 0 && difference <= 36 * 60 * 60 * 1000;
  });
  setText(elements.freeTimeTitle, event.title);
  setText(elements.freeTimeText, `${new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(start)} · ${event.location}`);
  elements.availabilityResult.hidden = false;
  if (conflicts.length) {
    setText(elements.availabilityResult, `Conflict found: ${conflicts.map((item) => item.title).join(', ')} overlaps this event. Move the flexible block or choose another event.`);
  } else if (nearestDeadline) {
    setText(elements.availabilityResult, `You are free during this event. Heads-up: ${nearestDeadline.title} is due within 36 hours. Finish a study block before you go.`);
  } else {
    setText(elements.availabilityResult, 'You are free during this event, and no deadline lands in the next 36 hours. This is a strong fit for your week.');
  }
}

function generateStudySessions(assignment) {
  const totalMinutes = Math.max(30, Number(assignment.estimatedMinutes || 60));
  const sessionCount = Math.max(1, Math.ceil(totalMinutes / 75));
  const due = assignment.dueAt ? dayStart(new Date(assignment.dueAt)) : new Date(dayStart().getTime() + 3 * 86_400_000);
  const today = dayStart();
  const availableDays = Math.max(1, Math.round((due - today) / 86_400_000));
  state.plannerItems = state.plannerItems.filter((item) => item.assignmentId !== assignment.id);

  for (let index = 0; index < sessionCount; index += 1) {
    const daysFromToday = Math.min(availableDays - 1, Math.floor(index * availableDays / sessionCount));
    const date = new Date(today);
    date.setDate(date.getDate() + Math.max(0, daysFromToday));
    const minutes = index === sessionCount - 1 ? totalMinutes - 75 * (sessionCount - 1) : 75;
    state.plannerItems.push({
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${index}`,
      assignmentId: assignment.id,
      title: `Study: ${assignment.title} (${index + 1}/${sessionCount})`,
      date: dateKey(date),
      time: index % 2 === 0 ? '16:00' : '18:30',
      durationMinutes: Math.max(30, minutes),
      source: 'custom'
    });
  }
  writeStorage(STORAGE_KEYS.planner, state.plannerItems);
  renderSchedule();
  elements.assignmentDialog.close();
  goToPage('planner');
  showToast(`Created ${sessionCount} study session${sessionCount === 1 ? '' : 's'} working backward from the deadline.`);
}

function renderEverything() {
  renderProfile();
  renderOverview();
  renderTodayTimeline();
  renderSmartSignals();
  populateCourseFilter();
  renderAssignments();
  renderPriorityList();
  renderSchedule();
  populateGradeCourses();
  renderGradeForecast();
  renderCampusEvents();
}

function goToPage(page) {
  for (const item of elements.navItems) {
    const active = item.dataset.page === page;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  for (const view of elements.pageViews) {
    const active = view.dataset.view === page;
    view.hidden = !active;
    view.classList.toggle('is-active', active);
  }
  elements.sidebar.classList.remove('is-open');
  elements.mobileMenu.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message) {
  if (!elements.toast) return;
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 3800);
}

function appendMessage(text, role, className = '') {
  const message = createElement('div', `message ${role === 'user' ? 'user-message' : 'assistant-message'} ${className}`.trim(), text);
  elements.conversation.append(message);
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
  return message;
}

function findMentionedAssignment(message) {
  const normalized = message.toLowerCase();
  return activeAssignments().find((assignment) => assignment.title.toLowerCase().split(/\W+/).some((word) => word.length > 4 && normalized.includes(word)));
}

function localAssistantReply(message) {
  const normalized = message.toLowerCase();
  const active = activeAssignments();
  const mentioned = findMentionedAssignment(message);
  const chosen = mentioned || active[0];

  if (!chosen) return 'Everything is marked complete. You can mark an assignment active again from the Assignments page.';
  if (/what.*(first|priority)|prioriti[sz]e|start with|focus on/.test(normalized)) {
    return `Start with ${courseFor(chosen).code} — ${chosen.title}. It is due ${formatDue(chosen.dueAt)} and is ${chosen.progress || 0}% complete.\n\nUse one ${Math.min(chosen.estimatedMinutes || 60, 90)}-minute block for the core requirements, then reserve 20 minutes to test and review the rubric.`;
  }
  if (/due|deadline|coming up|this week/.test(normalized)) {
    return active.slice(0, 3).map((assignment, index) => `${index + 1}. ${courseFor(assignment).code} — ${assignment.title} · ${formatDue(assignment.dueAt)}`).join('\n');
  }
  if (mentioned || /help.*assignment|break.*down|make.*plan/.test(normalized)) {
    const requirements = (chosen.requirements || ['Read the full instructions', 'Complete the core work', 'Review before submitting']);
    return `${courseFor(chosen).code} — ${chosen.title}\n\nDeliverable: ${chosen.deliverable || 'Complete the Canvas submission.'}\n\nPlan:\n${requirements.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n${requirements.length + 1}. Review the rubric and submit.`;
  }
  if (/schedule|calendar|today|free time/.test(normalized)) {
    const focus = state.demoSchedule.find((item) => item.type === 'focus');
    return focus ? `You have an open focus block at ${focus.time}. Use it for ${chosen.title}, then take 10 minutes to document your next step.` : 'Open the Planner to add a focus block around your next deadline.';
  }
  if (/canvas|connect|integration/.test(normalized)) {
    return 'You are using safe demo data. Open Settings to connect an institution-approved Canvas OAuth app. Tokens and API keys stay on the server.';
  }
  return 'I can choose your next priority, list deadlines, break down an assignment, or help schedule a focus block. Try “What should I work on first?”';
}

async function requestAssistant(message) {
  if (!state.serverAvailable) return localAssistantReply(message);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      assignments: state.assignments.map((assignment) => ({
        ...assignment,
        course: courseFor(assignment).name,
        courseCode: courseFor(assignment).code
      }))
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'JARVIS could not answer right now.');
  return payload.reply;
}

async function submitQuestion(message, fromVoice = false) {
  const prompt = String(message || '').trim();
  if (!prompt) return;
  appendMessage(prompt, 'user');
  elements.askInput.value = '';
  elements.voiceStatus.textContent = 'JARVIS is thinking…';
  const loading = appendMessage('Reviewing your workload…', 'assistant', 'is-loading');

  try {
    const reply = await requestAssistant(prompt);
    loading.remove();
    appendMessage(reply, 'assistant');
    elements.voiceStatus.textContent = state.serverAvailable ? 'Response grounded in your loaded project data.' : 'Local demo response · no data left your browser.';
    if (fromVoice && elements.speakReplies.checked) speak(reply);
  } catch (error) {
    loading.remove();
    const fallback = localAssistantReply(prompt);
    appendMessage(fallback, 'assistant');
    elements.voiceStatus.textContent = 'Using the local assistant because the server response was unavailable.';
    showToast(error.message);
    if (fromVoice && elements.speakReplies.checked) speak(fallback);
  }
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = state.preferredVoice;
  utterance.lang = state.preferredVoice?.lang || 'en-US';
  utterance.rate = 0.98;
  utterance.pitch = 0.98;
  window.speechSynthesis.speak(utterance);
}

function loadVoices() {
  if (!('speechSynthesis' in window)) {
    elements.voiceSelect.replaceChildren(new Option('Speech is not supported', ''));
    elements.voiceSelect.disabled = true;
    return;
  }

  const voices = window.speechSynthesis.getVoices().filter((voice) => /^en(-|_)/i.test(voice.lang));
  const saved = localStorage.getItem(STORAGE_KEYS.voice);
  state.preferredVoice = voices.find((voice) => voice.voiceURI === saved)
    || voices.find((voice) => /Samantha|Ava|Jenny|Aria|Alex|Daniel|Google US English|Microsoft David/i.test(voice.name))
    || voices[0];
  elements.voiceSelect.replaceChildren();
  if (!voices.length) {
    elements.voiceSelect.append(new Option('Loading system voices…', ''));
    return;
  }
  for (const voice of voices) {
    const option = new Option(`${voice.name} (${voice.lang})`, voice.voiceURI);
    option.selected = voice.voiceURI === state.preferredVoice?.voiceURI;
    elements.voiceSelect.append(option);
  }
}

function initializeRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  state.recognition = new SpeechRecognition();
  state.recognition.lang = 'en-US';
  state.recognition.interimResults = false;
  state.recognition.maxAlternatives = 1;
  state.recognition.addEventListener('start', () => {
    state.listening = true;
    elements.voiceButton.classList.add('is-listening');
    elements.voiceButton.setAttribute('aria-pressed', 'true');
    elements.voiceStatus.textContent = 'Listening… say your question naturally.';
  });
  state.recognition.addEventListener('result', (event) => {
    const transcript = event.results[0][0].transcript;
    elements.askInput.value = transcript;
    submitQuestion(transcript, true);
  });
  state.recognition.addEventListener('error', (event) => {
    const friendly = event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'I could not hear that clearly. Try again.';
    elements.voiceStatus.textContent = friendly;
  });
  state.recognition.addEventListener('end', () => {
    state.listening = false;
    elements.voiceButton.classList.remove('is-listening');
    elements.voiceButton.setAttribute('aria-pressed', 'false');
  });
}

function startVoiceInput() {
  goToPage('overview');
  elements.askInput.focus();
  if (!state.recognition) {
    showToast('Voice input is not supported in this browser. Chrome or Edge works best.');
    elements.voiceStatus.textContent = 'Voice input unavailable; type your question instead.';
    return;
  }
  if (state.listening) state.recognition.stop();
  else state.recognition.start();
}

function openAssignmentDetails(assignment) {
  state.selectedAssignment = assignment;
  const course = courseFor(assignment);
  setText(elements.detailTitle, assignment.title);
  setText(elements.detailDescription, assignment.description || 'No description was provided.');
  elements.detailMeta.replaceChildren(
    createElement('span', '', `${course.code} · ${course.name}`),
    createElement('span', '', `Due ${formatDue(assignment.dueAt)}`),
    createElement('span', '', `${formatDuration(assignment.estimatedMinutes || 60)} estimated`),
    createElement('span', '', `${assignment.points ?? '—'} points`)
  );
  const requirements = assignment.requirements?.length ? assignment.requirements : ['Review the complete Canvas instructions', 'Complete the required submission', 'Check your work before submitting'];
  const rubric = assignment.rubric?.length ? assignment.rubric : ['Correctness', 'Completeness', 'Clear presentation'];
  elements.detailRequirements.replaceChildren(...requirements.map((item) => createElement('li', '', item)));
  elements.detailRubric.replaceChildren(...rubric.map((item) => createElement('li', '', item)));
  elements.assignmentDialog.showModal();
}

function toggleAssignmentComplete(assignment) {
  const complete = assignment.status !== 'completed';
  assignment.status = complete ? 'completed' : 'not-started';
  assignment.progress = complete ? 100 : 0;
  state.completed[assignment.id] = complete;
  if (!complete) delete state.completed[assignment.id];
  writeStorage(STORAGE_KEYS.completed, state.completed);
  renderOverview();
  renderAssignments();
  renderPriorityList();
  showToast(complete ? `${assignment.title} marked complete.` : `${assignment.title} moved back to active.`);
}

async function loadRuntime() {
  try {
    const response = await fetch('/api/runtime', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Static mode');
    state.runtime = await response.json();
    state.serverAvailable = true;
    const configured = state.runtime.canvas.configured;
    elements.connectRealCanvas.disabled = !configured;
    setText(elements.realCanvasStatus, configured ? `Ready for ${state.runtime.canvas.host}` : 'Add Canvas OAuth values to .env to enable');
    if (state.runtime.canvas.connected) setConnectedMode('Canvas connected');
  } catch {
    state.runtime = { mode: 'demo', ai: 'demo', canvas: { configured: false, connected: false } };
    state.serverAvailable = false;
    elements.connectRealCanvas.disabled = true;
    setText(elements.realCanvasStatus, 'Requires the Node server and OAuth configuration');
  }
}

function setConnectedMode(label) {
  setText(elements.sourceDescription, label);
  setText(elements.modeLabel, label);
  elements.sourceLight.setAttribute('aria-label', label);
  setText(elements.canvasSettingsText, 'Connected through server-side Canvas OAuth. Access tokens are not exposed to browser code.');
}

async function loadCanvasAssignments() {
  try {
    const response = await fetch('/api/canvas/assignments');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Canvas assignments could not be loaded.');
    const courseNames = [...new Set(payload.assignments.map((assignment) => assignment.course || 'Canvas course'))];
    state.courses = courseNames.map((name, index) => ({ id: `canvas-${index}`, code: payload.assignments.find((item) => item.course === name)?.courseCode || `C${index + 1}`, name }));
    state.assignments = payload.assignments.map((assignment) => {
      const course = state.courses.find((item) => item.name === assignment.course);
      return {
        ...assignment,
        courseId: course.id,
        status: assignment.submission?.workflowState === 'submitted' ? 'completed' : 'not-started',
        progress: assignment.submission?.workflowState === 'submitted' ? 100 : 0,
        estimatedMinutes: 60,
        priority: 'medium',
        requirements: ['Review the full Canvas description', 'Complete the requested work', 'Confirm the submission format'],
        rubric: ['Correctness', 'Completeness', 'Clear presentation']
      };
    });
    renderOverview();
    populateCourseFilter();
    renderAssignments();
    renderPriorityList();
    setConnectedMode('Canvas connected');
    showToast(`Loaded ${state.assignments.length} assignments from Canvas.`);
  } catch (error) {
    showToast(`${error.message} Demo data is still available.`);
  }
}

function bindEvents() {
  for (const item of elements.navItems) item.addEventListener('click', () => goToPage(item.dataset.page));
  for (const button of $$('[data-go-page]')) button.addEventListener('click', () => goToPage(button.dataset.goPage));
  elements.mobileMenu.addEventListener('click', () => {
    const open = elements.sidebar.classList.toggle('is-open');
    elements.mobileMenu.setAttribute('aria-expanded', String(open));
  });
  $('#focusAsk').addEventListener('click', () => { goToPage('overview'); elements.askInput.focus(); });
  elements.askForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuestion(elements.askInput.value);
  });
  for (const chip of $$('[data-prompt]')) chip.addEventListener('click', () => submitQuestion(chip.dataset.prompt));
  elements.planFocus.addEventListener('click', () => {
    const assignment = state.assignments.find((item) => item.id === elements.planFocus.dataset.assignmentId);
    if (assignment) submitQuestion(`Build a plan for ${assignment.title}`);
  });
  elements.voiceButton.addEventListener('click', startVoiceInput);
  elements.quickVoice.addEventListener('click', startVoiceInput);
  elements.assignmentSearch.addEventListener('input', renderAssignments);
  elements.courseFilter.addEventListener('change', renderAssignments);
  elements.statusFilter.addEventListener('change', renderAssignments);
  elements.assignmentGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    const card = event.target.closest('[data-assignment-id]');
    if (!button || !card) return;
    const assignment = state.assignments.find((item) => item.id === card.dataset.assignmentId);
    if (!assignment) return;
    if (button.dataset.action === 'details') openAssignmentDetails(assignment);
    if (button.dataset.action === 'complete') toggleAssignmentComplete(assignment);
  });
  elements.plannerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(elements.plannerForm);
    state.plannerItems.push({
      id: window.crypto?.randomUUID?.() || String(Date.now()),
      title: String(form.get('title')).trim(),
      date: String(form.get('date')),
      time: String(form.get('time')),
      source: 'custom'
    });
    writeStorage(STORAGE_KEYS.planner, state.plannerItems);
    elements.plannerForm.reset();
    setPlannerDefaults();
    renderSchedule();
    showToast('Focus block added to your local planner.');
  });
  elements.scheduleList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-plan-id]');
    if (!button) return;
    state.plannerItems = state.plannerItems.filter((item) => item.id !== button.dataset.planId);
    writeStorage(STORAGE_KEYS.planner, state.plannerItems);
    renderSchedule();
    showToast('Custom focus block removed.');
  });
  elements.resetPlanner.addEventListener('click', () => {
    state.plannerItems = [];
    writeStorage(STORAGE_KEYS.planner, []);
    renderSchedule();
    showToast('Custom planner blocks reset.');
  });
  for (const button of $$('[data-checkin]')) {
    button.addEventListener('click', () => {
      updateWellbeing(button.dataset.checkin);
      showToast('Check-in saved locally. JARVIS adjusted the recommendation.');
    });
  }
  elements.gradeCourse.addEventListener('change', renderGradeForecast);
  elements.finalScore.addEventListener('input', () => {
    elements.finalScoreNumber.value = elements.finalScore.value;
    renderGradeForecast();
  });
  elements.finalScoreNumber.addEventListener('input', renderGradeForecast);
  elements.targetGrade.addEventListener('input', renderGradeForecast);
  elements.campusEventGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-event-id]');
    if (!button) return;
    const campusEvent = state.campusEvents.find((item) => item.id === button.dataset.eventId);
    if (campusEvent) checkEventAvailability(campusEvent);
  });
  for (const button of [elements.openConnection, elements.settingsConnection]) {
    button.addEventListener('click', () => elements.connectionDialog.showModal());
  }
  elements.closeConnection.addEventListener('click', () => elements.connectionDialog.close());
  elements.closeAssignment.addEventListener('click', () => elements.assignmentDialog.close());
  for (const dialog of [elements.connectionDialog, elements.assignmentDialog]) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  elements.useDemo.addEventListener('click', () => {
    elements.connectionDialog.close();
    setConnectedMode('Safe demo data');
    showToast('Demo mode is active. No credentials are required.');
  });
  elements.connectRealCanvas.addEventListener('click', () => { window.location.assign('/auth/canvas'); });
  elements.detailPlan.addEventListener('click', () => {
    const assignment = state.selectedAssignment;
    elements.assignmentDialog.close();
    goToPage('overview');
    if (assignment) submitQuestion(`Build a plan for ${assignment.title}`);
  });
  elements.detailSchedule.addEventListener('click', () => {
    if (state.selectedAssignment) generateStudySessions(state.selectedAssignment);
  });
  elements.voiceSelect.addEventListener('change', () => {
    const voices = window.speechSynthesis?.getVoices() || [];
    state.preferredVoice = voices.find((voice) => voice.voiceURI === elements.voiceSelect.value) || state.preferredVoice;
    if (state.preferredVoice) localStorage.setItem(STORAGE_KEYS.voice, state.preferredVoice.voiceURI);
    showToast(state.preferredVoice ? `${state.preferredVoice.name} selected.` : 'Voice selection updated.');
  });
  elements.speakReplies.addEventListener('change', () => writeStorage(STORAGE_KEYS.speak, elements.speakReplies.checked));
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      goToPage('overview');
      elements.askInput.focus();
    }
  });
}

function setPlannerDefaults() {
  const dateInput = elements.plannerForm.elements.date;
  const timeInput = elements.plannerForm.elements.time;
  if (!dateInput.value) dateInput.value = dateKey();
  if (!timeInput.value) timeInput.value = '16:00';
}

async function initialize() {
  try {
    const response = await fetch('data/demo-data.json');
    if (!response.ok) throw new Error('Demo data could not be loaded.');
    hydrateDemoData(await response.json());
    renderEverything();
    bindEvents();
    setPlannerDefaults();
    elements.speakReplies.checked = readStorage(STORAGE_KEYS.speak, true);
    loadVoices();
    if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    initializeRecognition();
    await loadRuntime();

    const params = new URLSearchParams(window.location.search);
    if (params.get('canvas') === 'connected') {
      await loadCanvasAssignments();
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch (error) {
    setText(elements.overviewSummary, error.message);
    showToast(error.message);
  }
}

initialize();
