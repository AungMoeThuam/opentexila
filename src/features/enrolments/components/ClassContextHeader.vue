<script setup>
import { computed } from 'vue';

const props = defineProps({
  context: { type: Object, required: true },
});

const details = computed(() => {
  const cls = props.context.class ?? {};
  return {
    code: cls.course?.code ?? '',
    name: cls.course?.name ?? '',
    section: cls.section || '—',
    term: cls.term || '—',
    room: cls.room_label || '—',
  };
});
</script>

<template>
  <div class="ot-card">
    <h1 class="ot-page-title mb-3">{{ details.code }} · {{ details.name }}</h1>
    <dl class="ot-dl mb-0">
      <div>
        <dt>Section</dt>
        <dd>{{ details.section }}</dd>
      </div>
      <div>
        <dt>Term</dt>
        <dd>{{ details.term }}</dd>
      </div>
      <div>
        <dt>Room</dt>
        <dd>{{ details.room }}</dd>
      </div>
    </dl>
  </div>
</template>
