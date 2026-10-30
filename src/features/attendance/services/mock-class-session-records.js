import { ApiError } from '../../../shared/services/api-client.js';
import { buildMockClassSessions } from './mock-class-sessions.js';

const MINUTE_MS = 60 * 1000;

const ROSTER = [
  'Aina Rahman',
  'Ben Choi',
  'Chloe Lim',
  'Daniel Ong',
  'Elif Demir',
  'Farid Hassan',
  'Grace Tan',
  'Hiro Sato',
  'Isabel Cruz',
  'Jun Park',
  'Kavya Nair',
  'Liam Foster',
  'Mei Ling Wong',
  'Noah Kim',
  'Olivia Brandt',
  'Priya Shah',
  'Quentin Moreau',
  'Ravi Kumar',
  'Sofia Rossi',
  'Tariq Aziz',
  'Uma Patel',
  'Victor Chen',
  'Wei Zhang',
  'Yara Haddad',
].map((name, index) => ({ id: index + 3, name }));

const IN_PROGRESS_STATUSES = ['present', 'late', 'pending'];
const ENDED_STATUSES = ['present', 'late', 'absent'];

const isSet = (value) => value !== undefined && value !== null && value !== '';

function statusFor(availability, studentId, sessionId) {
  const statuses =
    availability === 'in_progress' ? IN_PROGRESS_STATUSES : ENDED_STATUSES;
  return statuses[(studentId + sessionId) % statuses.length];
}

function checkedInAt(status, session, studentId) {
  const offset = (studentId + session.id) % 13;
  if (status === 'present') {
    return new Date(
      Date.parse(session.starts_at) + (offset + 1) * MINUTE_MS,
    ).toISOString();
  }
  if (status === 'late') {
    return new Date(
      Date.parse(session.late_after) + (offset * 2 + 1) * MINUTE_MS,
    ).toISOString();
  }
  return null;
}

export function createMockClassSessionRecordsService({
  now = () => new Date(),
} = {}) {
  return {
    async listClassSessionRecords(
      classSessionId,
      params = {},
      { signal } = {},
    ) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled', 'AbortError');
      }

      const session = buildMockClassSessions(now().getTime()).find(
        (item) => item.id === Number(classSessionId),
      );
      if (!session) {
        throw new ApiError('This class session was not found.', {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      const { status } = params;
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 20;
      const hasRoster = ['in_progress', 'ended'].includes(session.availability);

      const matching = hasRoster
        ? ROSTER.map((student) => {
            const recordStatus = statusFor(
              session.availability,
              student.id,
              session.id,
            );
            return {
              class_session_id: session.id,
              student_id: student.id,
              status: recordStatus,
              checked_in_at: checkedInAt(recordStatus, session, student.id),
              student: { ...student },
            };
          }).filter((record) => !isSet(status) || record.status === status)
        : [];

      const total = matching.length;
      const start = (page - 1) * limit;

      return {
        data: matching.slice(start, start + limit),
        context: {
          class_session_id: session.id,
          class: session.class,
          starts_at: session.starts_at,
          late_after: session.late_after,
          ends_at: session.ends_at,
          class_state: session.state,
        },
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
