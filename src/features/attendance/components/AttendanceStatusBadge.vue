<script setup>
import { computed } from 'vue';
import { statusFor } from './attendance-status.js';

const props = defineProps({
  status: { type: String, required: true },
});

const badge = computed(() => statusFor(props.status));
</script>

<template>
  <span class="ot-status" :class="`ot-status--${badge.modifier}`">{{
    badge.label
  }}</span>
</template>
