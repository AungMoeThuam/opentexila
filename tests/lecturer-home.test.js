import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LECTURER_HOME_LINKS,
  UPCOMING_CARDS,
  sessionCard,
  todayCards,
  todaySummary,
  upcomingCards,
} from '../src/features/dashboard/services/lecturer-home-view.js';
import { navigationForRole } from '../src/layouts/navigation.js';

const session = (id, startsAt, endsAt, availability, extra = {}) => ({
  id,
  starts_at: startsAt,
  ends_at: endsAt,
  availability,
  class: {
    section: 'A',
    room_label: 'Room 1',
    course: { code: 'COS30043', name: 'Interface Design and Development' },
  },
  ...extra,
});

test('the lecturer shortcuts match the lecturer menu and the shared icons', () => {
  const menu = navigationForRole('lecturer').map((item) => item.to);
  const icons = ['home', 'book', 'check', 'file', 'folder', 'bell', 'chart'];
  for (const link of LECTURER_HOME_LINKS) {
    assert.ok(menu.includes(link.to), `${link.to} is in the lecturer menu`);
    assert.ok(icons.includes(link.icon), `${link.key}: ${link.icon}`);
    assert.ok(link.title && link.description && link.action, link.key);
    assert.equal(/teacher/i.test(link.title + link.description), false);
  }
  assert.equal(
    new Set(LECTURER_HOME_LINKS.map((link) => link.key)).size,
    LECTURER_HOME_LINKS.length,
  );
});

test('a card has the course, the time in the app time zone and the attendance link', () => {
  // 09:00-11:00 in Kuala Lumpur (UTC+8).
  const card = sessionCard(
    session(
      7,
      '2026-11-14T01:00:00.000Z',
      '2026-11-14T03:00:00.000Z',
      'upcoming',
    ),
  );
  assert.equal(card.code, 'COS30043');
  assert.equal(card.title, 'Interface Design and Development');
  assert.equal(card.section, 'A');
  assert.equal(card.room, 'Room 1');
  assert.equal(card.statusLabel, 'Upcoming');
  assert.equal(card.statusKind, '');
  assert.match(card.time, /^09:00 am – 11:00 am$/i);
  assert.equal(card.to, '/lecturer/class-sessions/7');
  assert.equal(card.actionLabel, 'View attendance');
  assert.equal(card.primary, false);
  assert.equal(card.date, '');
});

test('a running session is marked active and gets the main button', () => {
  const card = sessionCard(
    session(
      1,
      '2026-11-14T01:00:00.000Z',
      '2026-11-14T03:00:00.000Z',
      'in_progress',
    ),
  );
  assert.equal(card.statusKind, 'active');
  assert.equal(card.primary, true);
  const cancelled = sessionCard(
    session(
      2,
      '2026-11-14T01:00:00.000Z',
      '2026-11-14T03:00:00.000Z',
      'cancelled',
    ),
  );
  assert.equal(cancelled.statusKind, 'cancelled');
});

test('a session with missing details still gets a readable card', () => {
  const card = sessionCard({
    id: 3,
    starts_at: '2026-11-14T01:00:00.000Z',
    ends_at: '2026-11-14T03:00:00.000Z',
    availability: 'upcoming',
  });
  assert.equal(card.title, 'Class session');
  assert.equal(card.section, '');
  assert.equal(card.room, '');
});

test("today's cards put running and coming sessions before the rest", () => {
  const cards = todayCards([
    session(1, '2026-11-14T00:00:00.000Z', '2026-11-14T01:00:00.000Z', 'ended'),
    session(
      2,
      '2026-11-14T01:00:00.000Z',
      '2026-11-14T03:00:00.000Z',
      'cancelled',
    ),
    session(
      3,
      '2026-11-14T07:00:00.000Z',
      '2026-11-14T09:00:00.000Z',
      'upcoming',
    ),
    session(
      4,
      '2026-11-14T01:30:00.000Z',
      '2026-11-14T03:30:00.000Z',
      'in_progress',
    ),
  ]);
  assert.deepEqual(
    cards.map((card) => card.id),
    [4, 3, 1, 2],
  );
});

test('upcoming cards skip cancelled sessions, keep time order and show the date', () => {
  const cards = upcomingCards([
    session(
      2,
      '2026-11-17T01:00:00.000Z',
      '2026-11-17T03:00:00.000Z',
      'upcoming',
    ),
    session(
      1,
      '2026-11-16T01:00:00.000Z',
      '2026-11-16T03:00:00.000Z',
      'upcoming',
    ),
    session(
      3,
      '2026-11-16T05:00:00.000Z',
      '2026-11-16T07:00:00.000Z',
      'cancelled',
    ),
  ]);
  assert.deepEqual(
    cards.map((card) => card.id),
    [1, 2],
  );
  assert.match(cards[0].date, /^Mon, 16 Nov$|^Mon 16 Nov$/);
  assert.match(cards[1].date, /Tue/);
  assert.ok(UPCOMING_CARDS >= 1);
});

test('the summary counts the sessions and the ones in progress', () => {
  assert.deepEqual(todaySummary([]), { total: 0, inProgress: 0 });
  assert.deepEqual(
    todaySummary([
      session(
        1,
        '2026-11-14T00:00:00.000Z',
        '2026-11-14T01:00:00.000Z',
        'ended',
      ),
      session(
        2,
        '2026-11-14T01:30:00.000Z',
        '2026-11-14T03:30:00.000Z',
        'in_progress',
      ),
    ]),
    { total: 2, inProgress: 1 },
  );
});
