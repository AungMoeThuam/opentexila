<script setup>
import { computed, ref, useId } from 'vue';
import RequestState from '../../../../shared/components/RequestState.vue';

const props = defineProps({
  title: { type: String, required: true },
  // { ariaLabel, summary, empty, tableColumns, tableRows } from use-chart-data
  chart: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
  emptyMessage: {
    type: String,
    default: 'No submitted class sessions in this range.',
  },
});
defineEmits(['retry']);

const uid = useId();
const showTable = ref(false);
const state = computed(() => {
  if (props.error) return 'error';
  if (props.loading) return 'loading';
  if (props.chart.empty) return 'empty';
  return 'success';
});
</script>

<template>
  <section class="ot-card h-100" :aria-labelledby="`${uid}-title`">
    <div
      class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
    >
      <h2 :id="`${uid}-title`" class="ot-section-title mb-0">{{ title }}</h2>
      <button
        v-if="state === 'success'"
        type="button"
        class="btn btn-sm btn-outline-primary"
        :aria-pressed="showTable"
        :aria-controls="`${uid}-body`"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'View as chart' : 'View as table' }}
      </button>
    </div>

    <div :id="`${uid}-body`">
      <RequestState
        v-if="state === 'loading'"
        state="loading"
        :title="`Loading ${title.toLowerCase()}…`"
      />
      <RequestState
        v-else-if="state === 'error'"
        state="error"
        :title="`Could not load ${title.toLowerCase()}`"
        :message="error.message"
        retry
        @retry="$emit('retry')"
      />
      <RequestState
        v-else-if="state === 'empty'"
        state="empty"
        title="No data"
        :message="emptyMessage"
      />
      <template v-else>
        <div v-show="!showTable">
          <div
            class="position-relative chart-frame"
            role="img"
            :aria-label="chart.ariaLabel"
          >
            <slot />
          </div>
          <p class="visually-hidden">{{ chart.summary }}</p>
        </div>
        <div
          v-if="showTable"
          class="table-responsive"
          tabindex="0"
          role="region"
          :aria-label="`${title} as a table`"
        >
          <table class="table ot-table align-middle mb-0">
            <caption class="visually-hidden">
              {{
                chart.summary
              }}
            </caption>
            <thead>
              <tr>
                <th
                  v-for="column in chart.tableColumns"
                  :key="column.key"
                  scope="col"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in chart.tableRows" :key="index">
                <template
                  v-for="(column, i) in chart.tableColumns"
                  :key="column.key"
                >
                  <th v-if="i === 0" scope="row">{{ row[column.key] }}</th>
                  <td v-else>{{ row[column.key] }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.chart-frame {
  height: 18rem;
}
</style>
