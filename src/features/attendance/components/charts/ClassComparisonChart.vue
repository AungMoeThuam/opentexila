<script setup>
import { computed, onMounted, ref } from 'vue';
import { Bar } from 'vue-chartjs';
import './chart-setup.js';
import BaseChart from './BaseChart.vue';
import { buildClassComparisonChart } from '../../composables/use-chart-data.js';
import { readPalette } from './read-palette.js';

const props = defineProps({
  byClass: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
});
defineEmits(['retry']);

const palette = ref(undefined);
onMounted(() => {
  palette.value = readPalette();
});
const chart = computed(() =>
  buildClassComparisonChart(props.byClass, { palette: palette.value }),
);
</script>

<template>
  <BaseChart
    title="Class comparison"
    :chart="chart"
    :loading="loading"
    :error="error"
    @retry="$emit('retry')"
  >
    <Bar :data="chart.data" :options="chart.options" />
  </BaseChart>
</template>
