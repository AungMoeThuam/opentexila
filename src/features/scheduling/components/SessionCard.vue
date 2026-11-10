
<script setup>
import { computed } from 'vue'

import { isSessionEditable } from '../utils/schedule-conflicts.js'

const props = defineProps({
  session: {
    type: Object,
    required: true,
  },
  conflicts: {
    type: Array,
    default: () => [],
  },
  compact: {
    type: Boolean,
    default: false,
  },
  continuation: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['move'])

const editable = computed(
  () =>
    !props.continuation &&
    isSessionEditable(props.session),
)

const hasConflict = computed(
  () => props.conflicts.length > 0,
)

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatTime(value) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : timeFormatter.format(date)
}

function conflictLabel(type) {
  const labels = {
    class: 'Class time conflict',
    lecturer: 'Lecturer time conflict',
    room: 'Room time conflict',
  }

  return labels[type] || 'Scheduling conflict'
}

const timeRange = computed(
  () =>
    `${formatTime(props.session.starts_at)} – ${formatTime(
      props.session.ends_at,
    )}`,
)

const sessionDescription = computed(() => {
  const session = props.session

  const details = [
    session.course?.code || 'Class',
    session.course?.name || 'Class session',
    `Section ${session.section}`,
    session.lecturer?.name || 'Unassigned lecturer',
    session.room_label || 'No room assigned',
    timeRange.value,
  ]

  if (hasConflict.value) {
    details.push(
      ...props.conflicts.map((conflict) =>
        conflictLabel(conflict.type),
      ),
    )
  }

  return details.join('\n')
})

const statusLabel = computed(() => {
  if (props.session.status === 'cancelled') {
    return 'Cancelled'
  }

  if (props.continuation) {
    return 'Continued'
  }

  return 'Locked'
})
</script>

<template>
  <article
    class="session-card"
    :class="{
      'session-card--compact': compact,
      'session-card--conflict': hasConflict,
      'session-card--locked': !editable,
      'session-card--cancelled':
        session.status === 'cancelled',
    }"
    :title="sessionDescription"
    :aria-label="sessionDescription"
  >
    <!-- Course code and drag handle -->
    <div class="session-header">
      <div class="session-code">
        {{ session.course?.code || 'Class' }}
      </div>

      <span
        v-if="editable"
        class="session-drag-handle"
        title="Drag to reschedule"
        aria-hidden="true"
      >
        ⠿
      </span>
    </div>

    <!-- Compact layout for short sessions -->
    <template v-if="compact">
      <strong class="session-time compact-time">
        {{ timeRange }}
      </strong>

      <div class="compact-details">
        Sec {{ session.section }}
        ·
        {{ session.room_label || 'No room' }}
      </div>

      <div class="compact-footer">
        <span
          v-if="hasConflict"
          class="compact-conflict"
          role="alert"
          :title="
            conflicts
              .map((item) => conflictLabel(item.type))
              .join(', ')
          "
        >
          ⚠ Conflict
        </span>

        <button
          v-if="editable"
          type="button"
          class="btn btn-sm btn-outline-danger compact-move"
          :aria-label="`Move ${session.course?.code || 'class'} section ${session.section}`"
          @click="emit('move', session)"
        >
          Move
        </button>

        <span v-else class="session-status">
          {{ statusLabel }}
        </span>
      </div>
    </template>

    <!-- Full layout for longer sessions -->
    <template v-else>
      <div class="session-name">
        {{ session.course?.name || 'Class session' }}
      </div>

      <div class="session-details">
        <span>
          Section {{ session.section }}
        </span>

        <span>
          {{
            session.lecturer?.name ||
            'Unassigned lecturer'
          }}
        </span>

        <span>
          {{
            session.room_label ||
            'No room assigned'
          }}
        </span>

        <strong class="session-time">
          {{ timeRange }}
        </strong>
      </div>

      <div
        v-if="hasConflict"
        class="session-conflicts"
        role="alert"
      >
        <div
          v-for="conflict in conflicts"
          :key="`${conflict.type}-${conflict.sessionId}-${conflict.withSessionId}`"
        >
          ⚠ {{ conflictLabel(conflict.type) }}
        </div>
      </div>

      <div class="session-actions">
        <button
          v-if="editable"
          type="button"
          class="btn btn-sm btn-outline-danger"
          :aria-label="`Move ${session.course?.code || 'class'} section ${session.section}`"
          @click="emit('move', session)"
        >
          Move
        </button>

        <span v-else class="session-status">
          {{ statusLabel }}
        </span>
      </div>
    </template>
  </article>
</template>

<style scoped>
.session-card {
  background: #fff;
  border: 1px solid #dce3eb;
  border-left: 3px solid #dc161e;
  border-radius: 8px;
  padding: 10px;
  min-width: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  text-align: left;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.session-card:hover {
  box-shadow: 0 3px 10px rgba(15, 32, 56, 0.08);
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-width: 0;
}

.session-code {
  color: #dc161e;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-name {
  color: #122238;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  margin-top: 5px;
  overflow-wrap: break-word;
}

.session-drag-handle {
  flex-shrink: 0;
  color: #64748b;
  cursor: grab;
  font-size: 22px;
  line-height: 1;
  user-select: none;
  touch-action: none;
}

.session-drag-handle:active {
  cursor: grabbing;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #64748b;
  font-size: 11px;
  margin-top: 8px;
  overflow-wrap: break-word;
}

.session-time {
  color: #122238;
  font-size: 11px;
  white-space: nowrap;
}

.session-actions {
  margin-top: 10px;
}

.session-card--conflict {
  border-color: #dc161e;
  background: #fff4f4;
  outline: 2px solid #dc161e;
  outline-offset: -1px;
}

.session-conflicts {
  color: #b91c1c;
  background: #fee2e2;
  border-radius: 5px;
  font-size: 10px;
  padding: 6px;
  margin-top: 8px;
  line-height: 1.4;
}

.session-card--locked {
  border-left-color: #94a3b8;
  background: #f8fafc;
}

.session-card--cancelled {
  opacity: 0.7;
}

.session-status {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  background: #e2e8f0;
  color: #475569;
  padding: 3px 7px;
  border-radius: 4px;
}

/* Compact cards for sessions lasting one hour or less */

.session-card--compact {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compact-time {
  display: block;
  font-size: 11px;
}

.compact-details {
  color: #64748b;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: auto;
  flex-shrink: 0;
}

.compact-conflict {
  color: #b91c1c;
  font-weight: 600;
  font-size: 10px;
}

.compact-move {
  font-size: 11px;
  padding: 3px 9px;
  line-height: 1.3;
  min-height: 0;
}
</style>
