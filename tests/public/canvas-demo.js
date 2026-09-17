'use strict';

function offsetDate(offset, time = '23:59') {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(offset || 0));
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0);
  return date;
}

function formatDue(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

async function initializeCanvasDemo() {
  const response = await fetch('data/demo-data.json');
  if (!response.ok) throw new Error('Demo data is unavailable.');
  const data = await response.json();
  const courseMap = new Map(data.courses.map((course) => [course.id, course]));

  document.querySelector('#canvasInitials').textContent = data.profile.initials;
  document.querySelector('#canvasUser').textContent = data.profile.name;
  document.querySelector('#canvasFirstName').textContent = data.profile.name.split(/\s+/)[0];

  const courses = document.querySelector('#courses');
  for (const course of data.courses) {
    const card = document.createElement('article');
    card.className = 'course-card';
    const banner = document.createElement('div');
    banner.className = 'course-banner';
    banner.textContent = course.code;
    const copy = document.createElement('div');
    copy.className = 'course-copy';
    const name = document.createElement('strong');
    name.textContent = course.name;
    const term = document.createElement('span');
    term.textContent = 'Active course · Demo term';
    copy.append(name, term);
    card.append(banner, copy);
    courses.append(card);
  }

  const activeAssignments = data.assignments
    .filter((assignment) => assignment.status !== 'completed')
    .sort((a, b) => offsetDate(a.dueOffsetDays, a.dueTime) - offsetDate(b.dueOffsetDays, b.dueTime));

  document.querySelector('#todoCount').textContent = String(activeAssignments.length);
  const todoList = document.querySelector('#todoList');
  for (const assignment of activeAssignments) {
    const course = courseMap.get(assignment.courseId);
    const item = document.createElement('article');
    item.className = 'todo-item';
    const title = document.createElement('strong');
    title.textContent = assignment.title;
    const courseName = document.createElement('span');
    courseName.textContent = `${course.code} · ${course.name}`;
    const due = document.createElement('time');
    due.dateTime = offsetDate(assignment.dueOffsetDays, assignment.dueTime).toISOString();
    due.textContent = `Due ${formatDue(offsetDate(assignment.dueOffsetDays, assignment.dueTime))}`;
    item.append(title, courseName, due);
    todoList.append(item);
  }
}

initializeCanvasDemo().catch((error) => {
  const main = document.querySelector('main');
  const message = document.createElement('p');
  message.textContent = error.message;
  main.append(message);
});
