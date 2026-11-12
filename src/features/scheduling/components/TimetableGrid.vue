<script setup>
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';

import SessionCard from './SessionCard.vue';

import {
  getSessionConflicts,
  isSessionEditable,
} from '../utils/schedule-conflicts.js';

const props = defineProps({
  sessions: {
    type: Array,
    default: () => [],
  },
  conflicts: {
    type: Array,
    default: () => [],
  },
  weekStart: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['move-session', 'open-move']);

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 72;
const MIN_CARD_WIDTH = 170;
const TIME_COLUMN_WIDTH = 66;

const isDragging = ref(false);

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function localDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function timeLabel(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');

  const minute = String(minutes % 60).padStart(2, '0');

  return `${hour}:${minute}`;
}

// Monday to Sunday.
// Keep all seven days until the team confirms otherwise.
const days = computed(() => {
  const start = new Date(`${props.weekStart}T00:00:00`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);

    date.setDate(date.getDate() + index);

    return {
      key: localDateKey(date),
      date,
      label: dateFormatter.format(date),
    };
  });
});

function slotDate(day, minutes) {
  const date = new Date(day.date);

  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date;
}

// Split sessions into visible day segments.
// Sessions continuing past midnight remain visible.
const daySegments = computed(() => {
  const result = new Map();

  for (const day of days.value) {
    const dayStart = day.date.getTime();

    const nextDay = new Date(day.date);

    nextDay.setDate(nextDay.getDate() + 1);

    const dayEnd = nextDay.getTime();

    const entries = [];

    for (const session of props.sessions) {
      const start = Date.parse(session.starts_at);
      const end = Date.parse(session.ends_at);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }

      if (start >= dayEnd || end <= dayStart) {
        continue;
      }

      const visibleStart = Math.max(start, dayStart);

      const visibleEnd = Math.min(end, dayEnd);

      const startMinutes =
        visibleStart === dayStart ? 0 : minutesOfDay(new Date(visibleStart));

      const endMinutes =
        visibleEnd === dayEnd ? 1440 : minutesOfDay(new Date(visibleEnd));

      entries.push({
        key: `${session.id}-${day.key}`,
        session,
        startMinutes,
        endMinutes,
        continuation: start < dayStart,
        lane: 0,
        laneCount: 1,
      });
    }

    entries.sort(
      (first, second) =>
        first.startMinutes - second.startMinutes ||
        first.endMinutes - second.endMinutes,
    );

    // Place overlapping sessions in separate lanes.
    let cluster = [];
    let laneEnds = [];
    let clusterEnd = -1;

    function finishCluster() {
      const count = Math.max(laneEnds.length, 1);

      for (const entry of cluster) {
        entry.laneCount = count;
      }

      cluster = [];
      laneEnds = [];
      clusterEnd = -1;
    }

    for (const entry of entries) {
      if (cluster.length && entry.startMinutes >= clusterEnd) {
        finishCluster();
      }

      let lane = laneEnds.findIndex((end) => end <= entry.startMinutes);

      if (lane === -1) {
        lane = laneEnds.length;

        laneEnds.push(entry.endMinutes);
      } else {
        laneEnds[lane] = entry.endMinutes;
      }

      entry.lane = lane;

      cluster.push(entry);

      clusterEnd = Math.max(clusterEnd, entry.endMinutes);
    }

    finishCluster();

    result.set(day.key, entries);
  }

  return result;
});

// Automatically widen days containing overlapping sessions.
// Each overlapping card retains a readable width.
const dayColumnWidths = computed(() => {
  return days.value.map((day) => {
    const entries = daySegments.value.get(day.key) || [];

    const lanes = Math.max(1, ...entries.map((entry) => entry.laneCount));

    return lanes * MIN_CARD_WIDTH;
  });
});

const gridColumns = computed(() => {
  const columns = dayColumnWidths.value.map(
    (width) => `minmax(${width}px, 1fr)`,
  );

  return `${TIME_COLUMN_WIDTH}px ${columns.join(' ')}`;
});

const gridMinWidth = computed(() => {
  return (
    TIME_COLUMN_WIDTH +
    dayColumnWidths.value.reduce((total, width) => total + width, 0)
  );
});

// Default teaching hours are 08:00–18:00.
// Expand automatically to include actual session times.
const timeSlots = computed(() => {
  let first = 8 * 60;
  let last = 18 * 60;

  for (const entries of daySegments.value.values()) {
    for (const entry of entries) {
      first = Math.min(
        first,
        Math.floor(entry.startMinutes / SLOT_MINUTES) * SLOT_MINUTES,
      );

      last = Math.max(
        last,
        Math.ceil(entry.endMinutes / SLOT_MINUTES) * SLOT_MINUTES,
      );
    }
  }

  const slots = [];

  for (
    let minutes = first;
    minutes < Math.min(last, 1440);
    minutes += SLOT_MINUTES
  ) {
    slots.push({
      minutes,
      label: timeLabel(minutes),
    });
  }

  return slots;
});

const sessionGroups = computed(() => {
  const groups = new Map();

  for (const [dayKey, entries] of daySegments.value) {
    for (const entry of entries) {
      const slot = Math.floor(entry.startMinutes / SLOT_MINUTES) * SLOT_MINUTES;

      const key = `${dayKey}-${slot}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(entry);
    }
  }

  return groups;
});

function sessionsForSlot(day, slot) {
  return sessionGroups.value.get(`${day.key}-${slot.minutes}`) || [];
}

function sessionDuration(entry) {
  return entry.endMinutes - entry.startMinutes;
}

function isCompact(entry) {
  return sessionDuration(entry) <= 60;
}

function isExtraShort(entry) {
  return sessionDuration(entry) <= 30;
}

// Card position and height follow the actual session time.
function cardStyle(entry, slot) {
  const pixelsPerMinute = SLOT_HEIGHT / SLOT_MINUTES;

  const offset = entry.startMinutes - slot.minutes;

  const duration = sessionDuration(entry);

  const laneWidth = 100 / entry.laneCount;

  return {
    top: `${offset * pixelsPerMinute + 2}px`,

    height: `${Math.max(duration * pixelsPerMinute - 4, 1)}px`,

    left: `calc(${entry.lane * laneWidth}% + 3px)`,

    width: `calc(${laneWidth}% - 6px)`,
  };
}

function isPastSlot(day, slot) {
  return slotDate(day, slot.minutes).getTime() <= Date.now();
}

function canDrag(event) {
  if (props.disabled) {
    return false;
  }

  const entry = event.draggedContext?.element;

  if (!entry || entry.continuation || !isSessionEditable(entry.session)) {
    return false;
  }

  const targetTime = Date.parse(event.to?.dataset?.start || '');

  return Number.isFinite(targetTime) && targetTime > Date.now();
}

function handleDrop(event, day, slot) {
  if (!event.added || props.disabled || isPastSlot(day, slot)) {
    return;
  }

  const entry = event.added.element;

  if (!entry || entry.continuation || !isSessionEditable(entry.session)) {
    return;
  }

  const newStart = slotDate(day, slot.minutes).toISOString();

  emit('move-session', entry.session.id, newStart);
}
</script>

<template>
  <section class="timetable-container" aria-label="Weekly class timetable">
    <div class="timetable-hint mb-3">
      Drag a session by its handle to another time slot, or use its Move button.
      Each card spans its actual session duration.
    </div>

    <div class="timetable-scroll">
      <div
        class="timetable-grid"
        :class="{ 'is-dragging': isDragging }"
        :style="{
          '--slot-height': `${SLOT_HEIGHT}px`,
          gridTemplateColumns: gridColumns,
          minWidth: `${gridMinWidth}px`,
        }"
      >
        <div class="time-heading">Time</div>

        <div v-for="day in days" :key="day.key" class="day-heading">
          {{ day.label }}
        </div>

        <template v-for="slot in timeSlots" :key="slot.minutes">
          <div class="time-label">
            {{ slot.label }}
          </div>

          <div
            v-for="day in days"
            :key="`${day.key}-${slot.minutes}`"
            class="timetable-cell"
            :class="{
              'timetable-cell--past': isPastSlot(day, slot),
            }"
          >
            <draggable
              :model-value="sessionsForSlot(day, slot)"
              item-key="key"
              :group="{
                name: 'timetable-sessions',
                pull: true,
                put: true,
              }"
              :sort="false"
              :disabled="disabled"
              :move="canDrag"
              handle=".session-drag-handle"
              ghost-class="session-ghost"
              drag-class="session-dragging"
              :force-fallback="true"
              :fallback-on-body="true"
              :animation="0"
              class="timetable-drop-zone"
              :data-start="slotDate(day, slot.minutes).toISOString()"
              :aria-label="`${day.label} at ${slot.label}`"
              @start="isDragging = true"
              @end="isDragging = false"
              @change="(event) => handleDrop(event, day, slot)"
            >
              <template #item="{ element }">
                <div
                  class="session-wrapper"
                  :class="{
                    'session-wrapper--compact': isCompact(element),

                    'session-wrapper--extra-short': isExtraShort(element),

                    'session-wrapper--continuation': element.continuation,

                    'session-wrapper--conflict':
                      getSessionConflicts(conflicts, element.session.id)
                        .length > 0,
                  }"
                  :style="cardStyle(element, slot)"
                >
                  <SessionCard
                    :session="element.session"
                    :compact="isCompact(element)"
                    :continuation="element.continuation"
                    :conflicts="
                      getSessionConflicts(conflicts, element.session.id)
                    "
                    @move="emit('open-move', $event)"
                  />
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timetable-container {
  min-width: 0;
}

.timetable-hint {
  font-size: 13px;
  color: #64748b;
}

.timetable-scroll {
  overflow: auto;
  border: 1px solid #dce3eb;
  border-radius: 10px;
  background: #fff;
  max-height: 75vh;
}

.timetable-grid {
  display: grid;
  grid-template-rows: 44px;
  grid-auto-rows: var(--slot-height);
  width: 100%;
}

.time-heading,
.day-heading {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #122238;
  color: #fff;
  padding: 13px 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border-right: 1px solid #34445a;
}

.time-heading {
  left: 0;
  z-index: 12;
}

.time-label {
  position: sticky;
  left: 0;
  z-index: 8;
  background: #f1f5f9;
  color: #64748b;
  padding: 10px 6px;
  font-size: 12px;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
}

.timetable-cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  background: #fff;
}

.timetable-cell--past {
  background: #f1f5f9;
}

.timetable-drop-zone {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.session-wrapper {
  position: absolute;
  z-index: 3;
  min-width: 0;
}

.session-wrapper--conflict {
  z-index: 4;
}

.session-wrapper :deep(.session-card) {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.session-wrapper--compact :deep(.session-card) {
  padding: 6px 8px;
}

.session-wrapper--continuation :deep(.session-drag-handle) {
  display: none;
}

/* Extra compact layout for 30-minute sessions. */

.session-wrapper--extra-short :deep(.session-card) {
  padding: 3px 6px;
  gap: 2px;
}

.session-wrapper--extra-short :deep(.compact-details) {
  display: none;
}

.session-wrapper--extra-short :deep(.session-code) {
  font-size: 11px;
}

.session-wrapper--extra-short :deep(.session-drag-handle) {
  font-size: 17px;
}

.session-wrapper--extra-short :deep(.compact-time) {
  font-size: 10px;
}

.session-wrapper--extra-short :deep(.compact-move) {
  padding: 1px 6px;
  font-size: 10px;
  line-height: 1.2;
}

.session-wrapper--extra-short :deep(.compact-footer) {
  margin-top: 0;
}

/* Keep underlying time slots available as drop targets
   when a long session spans several rows. */

.is-dragging .session-wrapper {
  pointer-events: none;
}

.is-dragging .timetable-cell:not(.timetable-cell--past) .timetable-drop-zone {
  outline: 1px dashed #94a3b8;
  outline-offset: -3px;
}

.is-dragging
  .timetable-cell:not(.timetable-cell--past)
  .timetable-drop-zone:hover {
  background: #fff1f2;
  outline-color: #dc161e;
}

.session-ghost {
  opacity: 0.35;
}

.session-dragging {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .timetable-scroll {
    max-height: 65vh;
  }
}
</style>
