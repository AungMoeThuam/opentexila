const MINUTE_MS = 60 * 1000;
const LATE_AFTER_MINUTES = 15;

const LECTURER = { id: 2, name: 'Lecturer Demo' };
const TERM = '2026-S2';

const CLASSES = {
  1: {
    id: 1,
    course: {
      id: 101,
      code: 'COS30043',
      name: 'Interface Design and Development',
    },
    section: 'A',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN402',
  },
  2: {
    id: 2,
    course: {
      id: 102,
      code: 'SWE30003',
      name: 'Software Architectures and Design',
    },
    section: 'B',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN305',
  },
  3: {
    id: 3,
    course: {
      id: 103,
      code: 'COS20031',
      name: 'Computing Technology Inquiry Project',
    },
    section: 'A',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN210',
  },
};

// [class_id, start offset in minutes from now, duration in minutes, state]
const SCHEDULE = [
  [1, -21 * 24 * 60, 120, 'scheduled'],
  [2, -14 * 24 * 60, 120, 'scheduled'],
  [1, -7 * 24 * 60, 120, 'scheduled'],
  [3, -7 * 24 * 60, 120, 'cancelled'],
  [2, -3 * 24 * 60, 120, 'scheduled'],
  [3, -30, 120, 'scheduled'],
  [1, 1 * 24 * 60, 120, 'scheduled'],
  [2, 2 * 24 * 60, 120, 'scheduled'],
  [3, 3 * 24 * 60, 120, 'cancelled'],
  [1, 7 * 24 * 60, 120, 'scheduled'],
  [2, 8 * 24 * 60, 120, 'scheduled'],
  [3, 9 * 24 * 60, 120, 'scheduled'],
  [1, -10 * 24 * 60, 120, 'scheduled'],
  [2, -17 * 24 * 60, 90, 'scheduled'],
];

const availabilityFor = (state, startMs, endMs, nowMs) => {
  if (state === 'cancelled') return 'cancelled';
  if (nowMs < startMs) return 'upcoming';
  if (nowMs < endMs) return 'in_progress';
  return 'ended';
};

export const buildMockClassSessions = (nowMs) =>
  SCHEDULE.map(([classId, offsetMinutes, durationMinutes, state], index) => {
    const startMs = nowMs + offsetMinutes * MINUTE_MS;
    const endMs = startMs + durationMinutes * MINUTE_MS;
    return {
      id: index + 1,
      class_id: classId,
      class: structuredClone(CLASSES[classId]),
      starts_at: new Date(startMs).toISOString(),
      late_after: new Date(
        startMs + LATE_AFTER_MINUTES * MINUTE_MS,
      ).toISOString(),
      ends_at: new Date(endMs).toISOString(),
      state,
      availability: availabilityFor(state, startMs, endMs, nowMs),
      my_attendance: null,
    };
  });

export const mockClassSessions = buildMockClassSessions(Date.now());

const isSet = (value) => value !== undefined && value !== null && value !== '';

export function createMockClassSessionsService({
  now = () => new Date(),
} = {}) {
  return {
    async listMyClassSessions(params = {}, { signal } = {}) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled', 'AbortError');
      }

      const nowMs = now().getTime();
      const { classId, from, to } = params;
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 20;
      const fromMs = isSet(from) ? new Date(from).getTime() : null;
      const toMs = isSet(to) ? new Date(to).getTime() : null;

      const matching = buildMockClassSessions(nowMs)
        .sort(
          (a, b) =>
            Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id - b.id,
        )
        .filter((session) => {
          const startMs = Date.parse(session.starts_at);
          if (isSet(classId) && session.class_id !== Number(classId)) {
            return false;
          }
          if (fromMs !== null && !(startMs >= fromMs)) return false;
          if (toMs !== null && !(startMs < toMs)) return false;
          return true;
        });

      const total = matching.length;
      const start = (page - 1) * limit;

      return {
        data: matching.slice(start, start + limit),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },
  };
}
