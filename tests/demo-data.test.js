const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const demoPath = path.join(__dirname, '..', 'public', 'data', 'demo-data.json');
const demo = JSON.parse(fs.readFileSync(demoPath, 'utf8'));

test('demo data has unique IDs and valid relationships', () => {
  const courseIds = new Set(demo.courses.map((course) => course.id));
  const assignmentIds = demo.assignments.map((assignment) => assignment.id);
  assert.equal(new Set(assignmentIds).size, assignmentIds.length);
  for (const assignment of demo.assignments) {
    assert.ok(courseIds.has(assignment.courseId), `Missing course for ${assignment.id}`);
    assert.ok(assignment.title);
    assert.ok(assignment.estimatedMinutes > 0);
  }
});

test('gradebook weights total 100 percent', () => {
  for (const gradebook of demo.gradebooks) {
    const total = gradebook.categories.reduce((sum, category) => sum + category.weight, 0) + gradebook.final.weight;
    assert.equal(total, 100, `${gradebook.courseId} weights should total 100`);
  }
});

test('campus events contain enough data for availability checks', () => {
  assert.ok(demo.campusEvents.length >= 3);
  for (const event of demo.campusEvents) {
    assert.ok(event.title && event.time && event.location);
    assert.ok(event.durationMinutes > 0);
  }
});
