import { ApiError } from '../../../shared/services/api-client.js';

const MAX_LIMIT = 100;
const MAX_PAGES = 100;
const MAX_BATCH_SIZE = 100;

function validateDate(value, name) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError(`${name} must be a valid YYYY-MM-DD date.`);
  }

  return value;
}

function validateSession(session) {
  return (
    session &&
    Number.isSafeInteger(session.id) &&
    session.id > 0 &&
    Number.isSafeInteger(session.class_id) &&
    session.class_id > 0 &&
    typeof session.course?.code === 'string' &&
    typeof session.course?.name === 'string' &&
    typeof session.section === 'string' &&
    Number.isSafeInteger(session.lecturer?.id) &&
    typeof session.lecturer?.name === 'string' &&
    typeof session.room_label === 'string' &&
    typeof session.starts_at === 'string' &&
    typeof session.late_after === 'string' &&
    typeof session.ends_at === 'string' &&
    ['scheduled', 'cancelled'].includes(session.status)
  );
}

function expectSessions(payload) {
  if (
    !Array.isArray(payload?.data) ||
    !payload.meta ||
    !Number.isInteger(payload.meta.page) ||
    !Number.isInteger(payload.meta.limit) ||
    !Number.isInteger(payload.meta.total) ||
    !Number.isInteger(payload.meta.totalPages) ||
    !payload.data.every(validateSession)
  ) {
    throw new ApiError('The server returned an invalid timetable response.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return payload;
}

function validateChanges(changes) {
  if (
    !Array.isArray(changes) ||
    changes.length < 1 ||
    changes.length > MAX_BATCH_SIZE
  ) {
    throw new RangeError('Provide between 1 and 100 session changes.');
  }

  const ids = new Set();

  return changes.map((change) => {
    if (
      !Number.isSafeInteger(change.id) ||
      change.id < 1 ||
      ids.has(change.id)
    ) {
      throw new RangeError('Each change must have a unique valid session ID.');
    }

    ids.add(change.id);

    const startsAt = new Date(change.starts_at);
    const lateAfter = new Date(change.late_after);
    const endsAt = new Date(change.ends_at);

    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(lateAfter.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt > lateAfter ||
      lateAfter >= endsAt
    ) {
      throw new RangeError('Each session must have a valid time range.');
    }

    return {
      id: change.id,
      starts_at: startsAt.toISOString(),
      late_after: lateAfter.toISOString(),
      ends_at: endsAt.toISOString(),
    };
  });
}

/**
 * Backend #32 API adapter for Frontend #23.
 *
 * Uses the shared authenticated API client.
 * Does not create or cancel class sessions.
 */
export function createTimetableService({ api }) {
  return {
    async list({ from, to }, { signal } = {}) {
      validateDate(from, 'from');
      validateDate(to, 'to');

      if (from > to) {
        throw new RangeError('The end date cannot be before the start date.');
      }

      const sessions = [];
      const seenIds = new Set();

      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const query = new URLSearchParams({
          from,
          to,
          page: String(page),
          limit: String(MAX_LIMIT),
        });

        const payload = expectSessions(
          await api.request(`/class-sessions?${query.toString()}`, { signal }),
        );

        for (const session of payload.data) {
          if (seenIds.has(session.id)) {
            throw new ApiError('The timetable contains duplicate sessions.', {
              code: 'INVALID_RESPONSE',
            });
          }

          seenIds.add(session.id);
          sessions.push(session);
        }

        if (page >= payload.meta.totalPages) {
          return sessions;
        }
      }

      throw new ApiError('The timetable contains too many pages to load.', {
        code: 'PAGE_LIMIT_EXCEEDED',
      });
    },

    async updateBatch(changes, { signal } = {}) {
      const body = {
        changes: validateChanges(changes),
      };

      const payload = await api.request('/class-sessions/batch', {
        method: 'PATCH',
        body,
        signal,
      });

      if (
        !Array.isArray(payload?.data) ||
        payload.data.length !== body.changes.length ||
        !payload.data.every(validateSession)
      ) {
        throw new ApiError(
          'The server returned an invalid batch update response.',
          { code: 'INVALID_RESPONSE' },
        );
      }

      return payload.data;
    },
  };
}
