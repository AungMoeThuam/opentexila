<script setup>
import { computed, onMounted, ref } from 'vue';
import { Doughnut } from 'vue-chartjs';
import './chart-setup.js';
import BaseChart from './BaseChart.vue';
import { buildStatusBreakdownChart } from '../../composables/use-chart-data.js';
import { readPalette } from './read-palette.js';

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
});
defineEmits(['retry']);

const palette = ref(undefined);
onMounted(() => {
  palette.value = readPalette();
});
const chart = computed(() =>
  buildStatusBreakdownChart(props.summary, { palette: palette.value }),
);
</script>

<template>
  <BaseChart
    title="Status breakdown"
    :chart="chart"
    :loading="loading"
    :error="error"
    @retry="$emit('retry')"
  >
    <Doughnut :data="chart.data" :options="chart.options" />
  </BaseChart>
</template>
