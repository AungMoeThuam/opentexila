/**
 * Conflict detection for the admin class scheduling timetable.
 * Frontend Issue #23 / Backend Issue #32.
 */

export function sessionsOverlap(first, second) {
  const firstStart = Date.parse(first.starts_at);
  const firstEnd = Date.parse(first.ends_at);
  const secondStart = Date.parse(second.starts_at);
  const secondEnd = Date.parse(second.ends_at);

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function findScheduleConflicts(sessions) {
  const conflicts = [];

  const activeSessions = sessions.filter(
    (session) => session.status !== 'cancelled',
  );

  for (let i = 0; i < activeSessions.length; i++) {
    for (let j = i + 1; j < activeSessions.length; j++) {
      const first = activeSessions[i];
      const second = activeSessions[j];

      if (!sessionsOverlap(first, second)) {
        continue;
      }

      const types = [];

      // Same class conflict
      if (first.class_id != null && first.class_id === second.class_id) {
        types.push('class');
      }

      // Lecturer conflict
      if (
        first.lecturer?.id != null &&
        first.lecturer.id === second.lecturer?.id
      ) {
        types.push('lecturer');
      }

      // Room conflict
      const firstRoom = first.room_label?.trim().toLowerCase();
      const secondRoom = second.room_label?.trim().toLowerCase();

      if (firstRoom && firstRoom === secondRoom) {
        types.push('room');
      }

      for (const type of types) {
        conflicts.push({
          sessionId: first.id,
          type,
          withSessionId: second.id,
        });
      }
    }
  }

  return conflicts;
}

export function isSessionEditable(session, now = Date.now()) {
  const start = Date.parse(session.starts_at);

  return (
    session.status === 'scheduled' && Number.isFinite(start) && start > now
  );
}

export function validateSessionTimes(times, now = Date.now()) {
  const start = Date.parse(times.starts_at);
  const late = Date.parse(times.late_after);
  const end = Date.parse(times.ends_at);

  if (![start, late, end].every(Number.isFinite)) {
    return {
      valid: false,
      message: 'Please enter valid session times.',
    };
  }

  if (start >= end) {
    return {
      valid: false,
      message: 'End time must be after start time.',
    };
  }

  if (late < start || late >= end) {
    return {
      valid: false,
      message: 'Late threshold must be within the session time.',
    };
  }

  if (start <= now) {
    return {
      valid: false,
      message: 'The new start time must be in the future.',
    };
  }

  return {
    valid: true,
    message: '',
  };
}

export function getSessionConflicts(conflicts, sessionId) {
  return conflicts.filter(
    (conflict) =>
      conflict.sessionId === sessionId || conflict.withSessionId === sessionId,
  );
}
