import { statusFor } from '../../attendance/components/availability-status.js';
import { TIME_ZONE } from './admin-home-today.js';

// The shortcuts on the lecturer home page. Paths match the lecturer menu;
// `icon` is a name from the shared icon set.
export const LECTURER_HOME_LINKS = [
  {
    key: 'classes',
    title: 'My classes',
    to: '/lecturer/classes',
    icon: 'book',
    action: 'View my classes',
    description: 'View the classes you teach and their students.',
  },
  {
    key: 'attendance',
    title: 'Attendance',
    to: '/lecturer/attendance',
    icon: 'check',
    action: 'Open attendance',
    description: 'Open attendance rosters for your class sessions.',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    to: '/lecturer/analytics',
    icon: 'chart',
    action: 'View analytics',
    description: 'See attendance trends and the students at risk.',
  },
  {
    key: 'announcements',
    title: 'Announcements',
    to: '/lecturer/announcements',
    icon: 'bell',
    action: 'Post announcements',
    description: 'Share news with the students of your classes.',
  },
];

// How many upcoming sessions the home page shows. The attendance page has all.
export const UPCOMING_CARDS = 6;

// Running sessions first, then the ones to come, then the ones that are over
// or cancelled. Inside each group the time order is kept.
const RANK = { in_progress: 0, upcoming: 1, ended: 2, cancelled: 3 };
const rank = (session) => RANK[session.availability] ?? 4;

const timeFormat = new Intl.DateTimeFormat('en-MY', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});

const clock = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : timeFormat.format(date);
};

// What one session card shows.
export function sessionCard(session, { withDate = false } = {}) {
  const course = session.class?.course ?? {};
  const status = statusFor(session.availability);
  const inProgress = session.availability === 'in_progress';
  return {
    id: session.id,
    code: course.code ?? '',
    title: course.name || course.code || 'Class session',
    section: session.class?.section ?? '',
    statusLabel: status.label,
    statusKind: inProgress
      ? 'active'
      : session.availability === 'cancelled'
        ? 'cancelled'
        : '',
    date: withDate ? dateFormat.format(new Date(session.starts_at)) : '',
    startsAt: session.starts_at,
    time: `${clock(session.starts_at)} – ${clock(session.ends_at)}`,
    room: session.room_label || session.class?.room_label || '',
    to: `/lecturer/class-sessions/${session.id}`,
    actionLabel: 'View attendance',
    primary: inProgress,
  };
}

export function todayCards(sessions) {
  return [...sessions]
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        a.id - b.id,
    )
    .map((session) => sessionCard(session));
}

export function upcomingCards(sessions) {
  return [...sessions]
    .filter((session) => session.availability !== 'cancelled')
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id - b.id,
    )
    .map((session) => sessionCard(session, { withDate: true }));
}

export function todaySummary(sessions) {
  return {
    total: sessions.length,
    inProgress: sessions.filter(
      (session) => session.availability === 'in_progress',
    ).length,
  };
}
