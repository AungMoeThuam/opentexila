import { computed, shallowRef } from 'vue';

import {
  findScheduleConflicts,
  isSessionEditable,
  validateSessionTimes,
} from '../utils/schedule-conflicts.js';

const HISTORY_LIMIT = 50;

function cloneSessions(sessions) {
  return JSON.parse(JSON.stringify(sessions));
}

function sameTimes(first, second) {
  return (
    Date.parse(first.starts_at) === Date.parse(second.starts_at) &&
    Date.parse(first.late_after) === Date.parse(second.late_after) &&
    Date.parse(first.ends_at) === Date.parse(second.ends_at)
  );
}

export function useTimetable(
  initialSessions = [],
  { now = () => Date.now() } = {},
) {
  const originalSessions = shallowRef(cloneSessions(initialSessions));

  const draftSessions = shallowRef(cloneSessions(initialSessions));

  const undoStack = shallowRef([]);
  const redoStack = shallowRef([]);

  const sessions = computed(() => draftSessions.value);

  const conflicts = computed(() => findScheduleConflicts(draftSessions.value));

  const canUndo = computed(() => undoStack.value.length > 0);

  const canRedo = computed(() => redoStack.value.length > 0);

  const changes = computed(() => {
    const originals = new Map(
      originalSessions.value.map((session) => [session.id, session]),
    );

    return draftSessions.value
      .filter((session) => {
        const original = originals.get(session.id);

        return original && !sameTimes(original, session);
      })
      .map((session) => ({
        id: session.id,
        starts_at: session.starts_at,
        late_after: session.late_after,
        ends_at: session.ends_at,
      }));
  });

  const isDirty = computed(() => changes.value.length > 0);

  const canSave = computed(() => isDirty.value && conflicts.value.length === 0);

  function rememberCurrentState() {
    undoStack.value = [
      ...undoStack.value,
      cloneSessions(draftSessions.value),
    ].slice(-HISTORY_LIMIT);

    redoStack.value = [];
  }

  function moveSession(sessionId, newStartTime, newEndTime = null) {
    const session = draftSessions.value.find((item) => item.id === sessionId);

    const original = originalSessions.value.find(
      (item) => item.id === sessionId,
    );

    if (!session || !original) {
      return {
        success: false,
        message: 'Session not found.',
      };
    }

    const currentTime = now();

    if (!isSessionEditable(original, currentTime)) {
      return {
        success: false,
        message: 'This session cannot be rescheduled.',
      };
    }

    const newStart = Date.parse(newStartTime);
    const oldStart = Date.parse(session.starts_at);
    const oldEnd = Date.parse(session.ends_at);
    const oldLate = Date.parse(session.late_after);

    if (![newStart, oldStart, oldEnd, oldLate].every(Number.isFinite)) {
      return {
        success: false,
        message: 'Invalid session time.',
      };
    }

    // Preserve duration and late threshold offset.
    const duration = oldEnd - oldStart;
    const lateOffset = oldLate - oldStart;

    // Drag-and-drop preserves the session duration.
    // The Move dialog can provide a custom end time.
    const newEnd =
      newEndTime === null ? newStart + duration : Date.parse(newEndTime);

    const newLate = newStart + lateOffset;

    if (
      !Number.isFinite(new Date(newEnd).getTime()) ||
      !Number.isFinite(new Date(newLate).getTime())
    ) {
      return {
        success: false,
        message: 'Invalid session time.',
      };
    }

    const updatedTimes = {
      starts_at: new Date(newStart).toISOString(),
      late_after: new Date(newLate).toISOString(),
      ends_at: new Date(newEnd).toISOString(),
    };

    const validation = validateSessionTimes(updatedTimes, currentTime);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
      };
    }

    if (sameTimes(session, updatedTimes)) {
      return {
        success: true,
        message: 'No changes made.',
      };
    }

    rememberCurrentState();

    draftSessions.value = draftSessions.value.map((item) =>
      item.id === sessionId ? { ...item, ...updatedTimes } : item,
    );

    return {
      success: true,
      message: 'Session moved successfully.',
    };
  }

  function undo() {
    if (!canUndo.value) {
      return false;
    }

    redoStack.value = [
      ...redoStack.value,
      cloneSessions(draftSessions.value),
    ].slice(-HISTORY_LIMIT);

    draftSessions.value = cloneSessions(
      undoStack.value[undoStack.value.length - 1],
    );

    undoStack.value = undoStack.value.slice(0, -1);

    return true;
  }

  function redo() {
    if (!canRedo.value) {
      return false;
    }

    undoStack.value = [
      ...undoStack.value,
      cloneSessions(draftSessions.value),
    ].slice(-HISTORY_LIMIT);

    draftSessions.value = cloneSessions(
      redoStack.value[redoStack.value.length - 1],
    );

    redoStack.value = redoStack.value.slice(0, -1);

    return true;
  }

  function discardChanges() {
    draftSessions.value = cloneSessions(originalSessions.value);

    undoStack.value = [];
    redoStack.value = [];
  }

  function loadSessions(newSessions) {
    originalSessions.value = cloneSessions(newSessions);
    draftSessions.value = cloneSessions(newSessions);

    undoStack.value = [];
    redoStack.value = [];
  }

  function prepareSave() {
    if (!isDirty.value) {
      return {
        success: false,
        message: 'There are no changes to save.',
      };
    }

    if (conflicts.value.length > 0) {
      return {
        success: false,
        message: 'Resolve scheduling conflicts before saving.',
      };
    }

    const currentTime = now();

    for (const change of changes.value) {
      const original = originalSessions.value.find(
        (session) => session.id === change.id,
      );

      if (!original || !isSessionEditable(original, currentTime)) {
        return {
          success: false,
          message: 'A session is no longer editable.',
        };
      }

      const validation = validateSessionTimes(change, currentTime);

      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }
    }

    return {
      success: true,
      payload: {
        changes: cloneSessions(changes.value),
      },
    };
  }

  return {
    sessions,
    conflicts,
    changes,
    isDirty,
    canUndo,
    canRedo,
    canSave,
    moveSession,
    undo,
    redo,
    discardChanges,
    loadSessions,
    prepareSave,
  };
}
