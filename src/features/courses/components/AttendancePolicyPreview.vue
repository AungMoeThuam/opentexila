<script setup>
// What students will experience with the values on the form, in one sentence.
defineProps({
  summary: { type: String, default: '' },
});
</script>

<template>
  <p
    v-if="summary"
    class="ot-notice mb-0"
    role="status"
    data-test="policy-summary"
  >
    {{ summary }}
  </p>
  <p v-else class="ot-meta mb-0" data-test="policy-summary-empty">
    Fill in the room, the location, the radius and the late allowance to see
    what students will experience.
  </p>
</template>
