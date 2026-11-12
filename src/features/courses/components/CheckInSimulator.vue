<script setup>
// "Try a check-in": what would happen if a student checked in at this place and
// time, with the values currently on the form (saved or not). It is a
// calculator. It never calls the server and never saves anything, and the
// server decides at a real check-in.
import { computed, ref, watch } from 'vue';
import { formatTime } from '../../../shared/utils/format-datetime.js';
import {
  OUTCOMES,
  checkInTime,
  distanceBetween,
  offsetRange,
  pointAtDistance,
  simulateCheckIn,
} from '../services/check-in-simulation.js';
import {
  lateAfterFrom,
  maxLateMinutes,
} from '../services/attendance-policy.js';
import { toPosition, toRadius } from '../services/geofence.js';

const DEFAULT_OFFSET_MINUTES = 5;

const props = defineProps({
  // The saved session: its state, start and end.
  session: { type: Object, required: true },
  // The form values: room_label, latitude, longitude, radius_m, late_minutes.
  values: { type: Object, required: true },
  // The test student, { lat, lng } or null.
  probe: { type: Object, default: null },
});
const emit = defineEmits(['update:probe']);

// Minutes after the start. Negative is before the start.
const offset = ref(DEFAULT_OFFSET_MINUTES);
watch(
  () => props.session.id,
  () => {
    offset.value = DEFAULT_OFFSET_MINUTES;
  },
);

const center = computed(() =>
  toPosition(props.values.latitude, props.values.longitude),
);
const radius = computed(() => toRadius(props.values.radius_m));
const range = computed(() =>
  offsetRange(props.session.starts_at, props.session.ends_at),
);
// The late time of the form, or null while the allowance cannot be used.
const lateAfter = computed(() => {
  const minutes = Number(props.values.late_minutes);
  return props.values.late_minutes !== '' &&
    Number.isInteger(minutes) &&
    minutes >= 0 &&
    minutes <= maxLateMinutes(props.session)
    ? lateAfterFrom(props.session.starts_at, minutes)
    : null;
});
const at = computed(() =>
  checkInTime(props.session.starts_at, Number(offset.value)),
);
const timeText = computed(() => {
  const minutes = Number(offset.value);
  const relation =
    minutes === 0
      ? 'at the start'
      : `${Math.abs(minutes)} min ${minutes > 0 ? 'after' : 'before'} the start`;
  return `${formatTime(at.value)} (${relation})`;
});
const distance = computed(() =>
  center.value && props.probe
    ? distanceBetween(center.value, props.probe)
    : null,
);
const distanceInput = computed(() =>
  distance.value === null ? '' : Math.round(distance.value * 10) / 10,
);

const result = computed(() => {
  if (!lateAfter.value || !props.probe)
    return { outcome: 'incomplete', message: '' };
  return simulateCheckIn({
    session: {
      state: props.session.state,
      startsAt: props.session.starts_at,
      lateAfter: lateAfter.value,
      endsAt: props.session.ends_at,
    },
    center: center.value,
    radius: radius.value ?? NaN,
    student: props.probe,
    at: at.value,
  });
});
const outcome = computed(() => OUTCOMES[result.value.outcome] ?? null);
const ready = computed(() =>
  Boolean(center.value && radius.value !== null && lateAfter.value),
);

function typeDistance(event) {
  const raw = event.target.value;
  const meters = raw === '' ? NaN : Number(raw);
  if (!center.value || !Number.isFinite(meters) || meters < 0) return;
  emit('update:probe', pointAtDistance(center.value, meters));
}

// Puts the test student inside the area, half way to the edge.
function placeInside() {
  if (center.value && radius.value !== null)
    emit('update:probe', pointAtDistance(center.value, radius.value / 2));
}
</script>

<template>
  <section
    class="ot-card"
    aria-labelledby="simulator-title"
    data-test="simulator"
  >
    <h3 id="simulator-title" class="ot-section-title">Try a check-in</h3>
    <p class="ot-meta">
      See what would happen to a student with the values above, saved or not.
      This is only a calculator. Nothing is saved, and the server decides at a
      real check-in.
    </p>

    <p v-if="!ready" class="ot-notice mb-0" data-test="simulator-incomplete">
      Fix the highlighted values above to try a check-in.
    </p>
    <template v-else>
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label" for="simulator-time">Check-in time</label>
          <input
            id="simulator-time"
            v-model.number="offset"
            class="form-range"
            type="range"
            :min="range.min"
            :max="range.max"
            step="1"
            :aria-valuetext="timeText"
          />
          <p class="mb-0" data-test="simulator-time-text">{{ timeText }}</p>
        </div>
        <div class="col-12">
          <label class="form-label" for="simulator-distance"
            >Distance from the pin (metres)</label
          >
          <div class="d-flex gap-2">
            <input
              id="simulator-distance"
              :value="distanceInput"
              class="form-control"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              aria-describedby="simulator-distance-help"
              @input="typeDistance"
            />
            <button
              type="button"
              class="btn btn-outline-primary text-nowrap"
              @click="placeInside"
            >
              {{ probe ? 'Move inside' : 'Place student' }}
            </button>
          </div>
          <div id="simulator-distance-help" class="form-text">
            Drag the dark dot on the map, or type a distance. Typing puts the
            dot due north of the pin.
          </div>
        </div>
      </div>

      <div class="mt-3" aria-live="polite" data-test="simulator-result">
        <template v-if="probe && outcome">
          <span class="ot-status" :class="`ot-status--${outcome.modifier}`">{{
            outcome.label
          }}</span>
          <p class="mb-0 mt-2">{{ result.message }}</p>
        </template>
        <p v-else class="ot-meta mb-0">
          Place the test student on the map, or press Place student.
        </p>
      </div>
    </template>
  </section>
</template>
