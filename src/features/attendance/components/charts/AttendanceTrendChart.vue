<script setup>
import { computed, onMounted, ref } from 'vue';
import { Line } from 'vue-chartjs';
import './chart-setup.js';
import BaseChart from './BaseChart.vue';
import { buildTrendChart } from '../../composables/use-chart-data.js';
import { readPalette } from './read-palette.js';

const props = defineProps({
  trend: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
});
defineEmits(['retry']);

const palette = ref(undefined);
onMounted(() => {
  palette.value = readPalette();
});
const chart = computed(() =>
  buildTrendChart(props.trend, { palette: palette.value }),
);
</script>

<template>
  <BaseChart
    title="Attendance trend"
    :chart="chart"
    :loading="loading"
    :error="error"
    @retry="$emit('retry')"
  >
    <Line :data="chart.data" :options="chart.options" />
  </BaseChart>
</template>
