<script setup>
import { computed, useId } from 'vue';
import { classLabel } from '../composables/use-chart-data.js';

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  classes: { type: Array, default: () => [] },
  finalisingId: { type: Number, default: null },
  error: { type: String, default: null },
});
const emit = defineEmits(['finalise']);

const uid = useId();
const labels = computed(
  () => new Map(props.classes.map((cls) => [cls.classId, classLabel(cls)])),
);
const labelFor = (classId) => labels.value.get(classId) ?? `Class ${classId}`;
</script>

<template>
  <section class="ot-card mb-4" :aria-labelledby="`${uid}-title`">
    <h2 :id="`${uid}-title`" class="ot-section-title mb-1">
      Sessions waiting to be finalised
    </h2>
    <p class="ot-meta">
      These class sessions have ended but still have pending records. They stay
      out of every number on this page until you finalise them. Finalising marks
      pending students as absent.
    </p>

    <div v-if="error" class="ot-notice ot-notice--error mb-3" role="alert">
      {{ error }}
    </div>

    <ul class="list-unstyled d-grid gap-2 mb-0">
      <li
        v-for="session in sessions"
        :key="session.classSessionId"
        class="d-flex flex-wrap justify-content-between align-items-center gap-2"
      >
        <span>
          <span class="fw-bold d-block">{{ labelFor(session.classId) }}</span>
          <span class="ot-meta">
            {{ session.date }} · {{ session.pendingCount }} pending
          </span>
        </span>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="finalisingId !== null"
          :aria-label="`Finalise ${labelFor(session.classId)} on ${session.date}`"
          @click="emit('finalise', session.classSessionId)"
        >
          {{
            finalisingId === session.classSessionId ? 'Finalising…' : 'Finalise'
          }}
        </button>
      </li>
    </ul>
  </section>
</template>
