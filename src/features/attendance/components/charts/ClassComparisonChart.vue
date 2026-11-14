<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
// Below Bootstrap's sm breakpoint (576px) long class names need a y axis.
const horizontal = ref(false);
let phoneQuery;
const syncHorizontal = () => {
  horizontal.value = phoneQuery.matches;
};
onMounted(() => {
  palette.value = readPalette();
  phoneQuery = window.matchMedia('(max-width: 575.98px)');
  syncHorizontal();
  phoneQuery.addEventListener('change', syncHorizontal);
});
onBeforeUnmount(() =>
  phoneQuery?.removeEventListener('change', syncHorizontal),
);
const chart = computed(() =>
  buildClassComparisonChart(props.byClass, {
    palette: palette.value,
    horizontal: horizontal.value,
  }),
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
