<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { onBeforeRouteLeave } from 'vue-router';

import TimetableGrid from '../components/TimetableGrid.vue';

import { useTimetable } from '../composables/use-timetable.js';
import { api } from '../../../app-context.js';
import { createTimetableService } from '../services/timetable-service.js';

const timetable = useTimetable();
const timetableApi = createTimetableService({ api });
const isLoading = ref(false);
const isSaving = ref(false);
let currentRequest = null;

const {
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
} = timetable;

const message = ref('');
const messageType = ref('success');

const showMoveDialog = ref(false);
const selectedSession = ref(null);

const moveDate = ref('');
const moveStart = ref('');
const moveEndDate = ref('');
const moveEnd = ref('');
const moveError = ref('');

function localDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonday(value = new Date()) {
  const date = new Date(value);

  date.setHours(0, 0, 0, 0);

  const day = date.getDay();

  date.setDate(date.getDate() - ((day + 6) % 7));

  return date;
}

function addDays(value, amount) {
  const date = new Date(value);

  date.setDate(date.getDate() + amount);

  return date;
}

function toLocalTime(value) {
  const date = new Date(value);

  const hour = String(date.getHours()).padStart(2, '0');

  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${hour}:${minute}`;
}

const weekStart = ref(localDateKey(getMonday()));

const weekEnd = computed(() =>
  localDateKey(addDays(new Date(`${weekStart.value}T00:00:00`), 6)),
);

const weekLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(
    new Date(`${weekStart.value}T00:00:00`),
  )} – ${formatter.format(new Date(`${weekEnd.value}T00:00:00`))}`;
});

function notify(text, type = 'success') {
  message.value = text;
  messageType.value = type;
}

// Query UTC days around the local week boundaries so that sessions
// close to midnight in the user's timezone are not missed.
function dateShift(dateKey, days) {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime() + days * 86400000;
}

function utcDateKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

async function loadRealSessions({ preserveOnError = false } = {}) {
  currentRequest?.abort();

  const controller = new AbortController();
  currentRequest = controller;
  isLoading.value = true;

  if (!preserveOnError) {
    message.value = '';
    loadSessions([]);
  }

  const firstLocalDay = weekStart.value;
  const lastLocalDay = weekEnd.value;

  try {
    const data = await timetableApi.list(
      {
        from: utcDateKey(dateShift(firstLocalDay, -1)),
        to: utcDateKey(dateShift(lastLocalDay, 1)),
      },
      { signal: controller.signal },
    );

    if (controller.signal.aborted) return false;

    const start = new Date(`${firstLocalDay}T00:00:00`).getTime();

    const end = new Date(`${lastLocalDay}T00:00:00`).getTime() + 86400000;

    const visibleSessions = data.filter(
      (session) =>
        new Date(session.starts_at).getTime() < end &&
        new Date(session.ends_at).getTime() > start,
    );

    loadSessions(visibleSessions);

    return true;
  } catch (error) {
    if (controller.signal.aborted) return false;

    if (!preserveOnError) {
      notify(error?.message || 'Unable to load the timetable.', 'danger');
    }

    return false;
  } finally {
    if (currentRequest === controller) {
      isLoading.value = false;
      currentRequest = null;
    }
  }
}

function confirmDiscard() {
  if (isSaving.value || isLoading.value) {
    return false;
  }

  if (!isDirty.value) {
    return true;
  }

  return window.confirm('You have unsaved timetable changes. Discard them?');
}

function changeWeek(amount) {
  if (!confirmDiscard()) {
    return;
  }

  const date = new Date(`${weekStart.value}T00:00:00`);

  weekStart.value = localDateKey(addDays(date, amount * 7));

  loadRealSessions();
}

function goToCurrentWeek() {
  if (!confirmDiscard()) {
    return;
  }

  weekStart.value = localDateKey(getMonday());

  loadRealSessions();
}

function handleMove(sessionId, newStartTime) {
  const result = moveSession(sessionId, newStartTime);

  notify(result.message, result.success ? 'success' : 'danger');
}

function openMoveDialog(session) {
  selectedSession.value = session;

  moveDate.value = localDateKey(new Date(session.starts_at));

  moveStart.value = toLocalTime(session.starts_at);

  moveEndDate.value = localDateKey(new Date(session.ends_at));

  moveEnd.value = toLocalTime(session.ends_at);

  moveError.value = '';
  showMoveDialog.value = true;
}

function closeMoveDialog() {
  showMoveDialog.value = false;
  selectedSession.value = null;
  moveError.value = '';
}

function updateEndDate() {
  moveEndDate.value = moveDate.value;
}

function submitMove() {
  if (!selectedSession.value) {
    return;
  }

  if (
    !moveDate.value ||
    !moveStart.value ||
    !moveEndDate.value ||
    !moveEnd.value
  ) {
    moveError.value = 'Please complete all time fields.';
    return;
  }

  if (moveDate.value < weekStart.value || moveDate.value > weekEnd.value) {
    moveError.value = 'Please select a start date within this week.';
    return;
  }

  const start = new Date(`${moveDate.value}T${moveStart.value}:00`);

  const end = new Date(`${moveEndDate.value}T${moveEnd.value}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    moveError.value = 'Invalid date or time.';
    return;
  }

  const result = moveSession(
    selectedSession.value.id,
    start.toISOString(),
    end.toISOString(),
  );

  if (!result.success) {
    moveError.value = result.message;
    return;
  }

  closeMoveDialog();

  notify(result.message);
}

function handleUndo() {
  if (undo()) {
    notify('Last timetable change undone.');
  }
}

function handleRedo() {
  if (redo()) {
    notify('Timetable change restored.');
  }
}

function handleDiscard() {
  if (!isDirty.value) {
    return;
  }

  if (!confirmDiscard()) {
    return;
  }

  discardChanges();

  notify('Unsaved changes discarded.');
}

async function handleSave() {
  if (isSaving.value || isLoading.value) return;

  const result = prepareSave();

  if (!result.success) {
    notify(result.message, 'danger');
    return;
  }

  isSaving.value = true;

  let savedSessions;

  try {
    savedSessions = await timetableApi.updateBatch(result.payload.changes);
  } catch (error) {
    notify(error?.message || 'Unable to save timetable changes.', 'danger');
    isSaving.value = false;
    return;
  }

  // PATCH succeeded. Update the local baseline so
  // changes are no longer marked as unsaved.
  const savedById = new Map(
    savedSessions.map((session) => [session.id, session]),
  );

  const updatedSessions = sessions.value.map(
    (session) => savedById.get(session.id) ?? session,
  );

  loadSessions(updatedSessions);

  try {
    const refreshed = await loadRealSessions({
      preserveOnError: true,
    });

    if (refreshed) {
      notify('Timetable changes saved successfully.');
    } else {
      notify(
        'Changes were saved, but the timetable could not be refreshed. Please reload the page later.',
        'warning',
      );
    }
  } finally {
    isSaving.value = false;
  }
}

function handleKeyboard(event) {
  if (showMoveDialog.value) {
    return;
  }

  const target = event.target;

  if (target?.matches?.('input, textarea, select, [contenteditable]')) {
    return;
  }

  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    handleUndo();
  } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault();
    handleRedo();
  }
}

function handleBeforeUnload(event) {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}

onBeforeRouteLeave(() => {
  return confirmDiscard();
});

onMounted(() => {
  loadRealSessions();

  window.addEventListener('keydown', handleKeyboard);

  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  currentRequest?.abort();
  window.removeEventListener('keydown', handleKeyboard);

  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <main class="timetable-page">
    <header class="mb-4">
      <div class="timetable-eyebrow">ADMIN · TIMETABLE</div>

      <h1 class="ot-page-title">Class Timetable</h1>

      <p class="text-secondary mb-0">
        Arrange and reschedule class sessions using the weekly timetable.
      </p>
    </header>

    <div class="alert alert-info" role="status">
      Live database timetable · Drag sessions to reschedule, then click Save
      changes to apply your updates.
    </div>

    <div v-if="isLoading" class="alert alert-secondary" role="status">
      Loading timetable sessions…
    </div>

    <div
      v-if="message"
      class="alert alert-dismissible"
      :class="`alert-${messageType}`"
      role="status"
    >
      {{ message }}

      <button
        type="button"
        class="btn-close"
        aria-label="Dismiss message"
        @click="message = ''"
      />
    </div>

    <section class="timetable-toolbar mb-3">
      <div class="week-navigation">
        <button
          type="button"
          class="btn btn-outline-secondary"
          aria-label="Previous week"
          @click="changeWeek(-1)"
        >
          ←
        </button>

        <strong class="week-label">
          {{ weekLabel }}
        </strong>

        <button
          type="button"
          class="btn btn-outline-secondary"
          aria-label="Next week"
          @click="changeWeek(1)"
        >
          →
        </button>

        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="goToCurrentWeek"
        >
          This week
        </button>
      </div>

      <div class="timetable-actions">
        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="!canUndo"
          @click="handleUndo"
        >
          ↶ Undo
        </button>

        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="!canRedo"
          @click="handleRedo"
        >
          ↷ Redo
        </button>

        <button
          type="button"
          class="btn btn-outline-danger"
          :disabled="!isDirty"
          @click="handleDiscard"
        >
          Discard
        </button>

        <button
          type="button"
          class="btn btn-danger"
          :disabled="!canSave || isSaving || isLoading"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Save changes' }}
        </button>
      </div>
    </section>

    <div class="timetable-summary mb-3">
      <span> {{ sessions.length }} sessions </span>

      <span v-if="isDirty" class="draft-indicator">
        {{ changes.length }} unsaved changes
      </span>

      <span v-if="conflicts.length" class="text-danger fw-semibold">
        {{ conflicts.length }} scheduling conflicts
      </span>

      <span v-else class="text-success"> No scheduling conflicts </span>
    </div>

    <div v-if="conflicts.length" class="alert alert-danger" role="alert">
      Resolve all class, lecturer and room conflicts before saving your
      timetable.
    </div>

    <TimetableGrid
      :sessions="sessions"
      :conflicts="conflicts"
      :week-start="weekStart"
      :disabled="showMoveDialog || isLoading"
      @move-session="handleMove"
      @open-move="openMoveDialog"
    />

    <Teleport to="body">
      <div
        v-if="showMoveDialog"
        class="move-overlay"
        @click.self="closeMoveDialog"
        @keydown.esc="closeMoveDialog"
      >
        <section
          class="move-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-dialog-title"
        >
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 id="move-dialog-title" class="h5 mb-0">Move class session</h2>

            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeMoveDialog"
            />
          </div>

          <p class="text-secondary">
            {{ selectedSession?.course?.code }}
            —
            {{ selectedSession?.course?.name }}
          </p>

          <form @submit.prevent="submitMove">
            <div class="mb-3">
              <label for="move-date" class="form-label"> Day </label>

              <input
                id="move-date"
                v-model="moveDate"
                type="date"
                class="form-control"
                :min="weekStart"
                :max="weekEnd"
                required
                @change="updateEndDate"
              />
            </div>

            <div class="mb-3">
              <label for="move-start" class="form-label"> Start time </label>

              <input
                id="move-start"
                v-model="moveStart"
                type="time"
                class="form-control"
                required
              />
            </div>

            <div class="mb-3">
              <label for="move-end-date" class="form-label"> End date </label>

              <input
                id="move-end-date"
                v-model="moveEndDate"
                type="date"
                class="form-control"
                :min="moveDate"
                required
              />
            </div>

            <div class="mb-3">
              <label for="move-end" class="form-label"> End time </label>

              <input
                id="move-end"
                v-model="moveEnd"
                type="time"
                class="form-control"
                required
              />
            </div>

            <div v-if="moveError" class="alert alert-danger" role="alert">
              {{ moveError }}
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="closeMoveDialog"
              >
                Cancel
              </button>

              <button type="submit" class="btn btn-danger">Move session</button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.timetable-page {
  min-width: 0;
}

.timetable-eyebrow {
  color: #dc161e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.timetable-toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background: #fff;
  border: 1px solid #dce3eb;
  border-radius: 10px;
  padding: 16px;
}

.week-navigation,
.timetable-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.week-label {
  font-size: 14px;
  color: #122238;
  margin: 0 4px;
}

.timetable-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  color: #64748b;
}

.draft-indicator {
  color: #92400e;
  background: #fef3c7;
  padding: 4px 10px;
  border-radius: 5px;
}

.move-overlay {
  position: fixed;
  inset: 0;
  z-index: 1055;
  background: rgba(15, 32, 56, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.move-dialog {
  background: #fff;
  width: 100%;
  max-width: 480px;
  border-radius: 12px;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .timetable-toolbar {
    flex-direction: column;
  }

  .timetable-actions {
    width: 100%;
  }

  .timetable-actions .btn {
    flex: 1;
  }

  .week-label {
    font-size: 12px;
  }

  .move-dialog {
    padding: 18px;
  }
}
</style>
