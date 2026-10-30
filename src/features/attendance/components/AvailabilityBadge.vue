<script setup>
import { computed } from 'vue';
import { statusFor } from './availability-status.js';

const props = defineProps({
  availability: { type: String, required: true },
});

const status = computed(() => statusFor(props.availability));
</script>

<template>
  <span class="ot-status" :class="`ot-status--${status.modifier}`">{{
    status.label
  }}</span>
</template>
