<script setup>
import { computed } from 'vue';

const props = defineProps({
  classInfo: {
    type: Object,
    required: true,
  },
});

const details = computed(() => {
  const cls = props.classInfo || {};
  return {
    code: cls.course?.code ?? '—',
    name: cls.course?.name ?? '—',
    section: cls.section || '—',
    term: cls.term || '—',
    lecturer: cls.lecturer?.name || '—',
    room: cls.room_label || '—',
  };
});
</script>

<template>
  <article class="ot-card h-100 d-flex flex-column">
    <div class="mb-3">
      <p class="ot-eyebrow">{{ details.code }}</p>
      <h2 class="ot-section-title mb-0">{{ details.name }}</h2>
    </div>

    <dl class="ot-dl mt-auto mb-0">
      <div>
        <dt>Section</dt>
        <dd>{{ details.section }}</dd>
      </div>
      <div>
        <dt>Term</dt>
        <dd>{{ details.term }}</dd>
      </div>
      <div>
        <dt>Lecturer</dt>
        <dd>{{ details.lecturer }}</dd>
      </div>
      <div>
        <dt>Room</dt>
        <dd>{{ details.room }}</dd>
      </div>
    </dl>
  </article>
</template>
