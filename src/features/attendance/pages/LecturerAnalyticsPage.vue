<script setup>
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import { myClassesService } from '../../enrolments/services/index.js';
import AnalyticsFilters from '../components/AnalyticsFilters.vue';
import AtRiskStudentList from '../components/AtRiskStudentList.vue';
import UnfinalisedSessionsCard from '../components/UnfinalisedSessionsCard.vue';
import ChartSkeleton from '../components/charts/ChartSkeleton.vue';
import { useAttendanceAnalytics } from '../composables/use-attendance-analytics.js';
import { useAttendanceClassOptions } from '../composables/use-attendance-class-options.js';
import { formatRate } from '../composables/use-chart-data.js';
import { analyticsService } from '../services/index.js';
import { filtersToQuery } from '../services/analytics-query.js';

// Chart.js stays out of the main bundle: each chart loads when this page opens.
const lazyChart = (loader) =>
  defineAsyncComponent({ loader, loadingComponent: ChartSkeleton, delay: 0 });
const AttendanceTrendChart = lazyChart(
  () => import('../components/charts/AttendanceTrendChart.vue'),
);
const StatusBreakdownChart = lazyChart(
  () => import('../components/charts/StatusBreakdownChart.vue'),
);
const ClassComparisonChart = lazyChart(
  () => import('../components/charts/ClassComparisonChart.vue'),
);

const route = useRoute();
const router = useRouter();

const {
  filters,
  applied,
  notices,
  filterErrors,
  data,
  loading,
  error,
  isEmpty,
  load,
  retry,
  updateFilters,
  finalisingId,
  finaliseError,
  finalise,
  dismissNotices,
  dispose,
} = useAttendanceAnalytics({
  service: analyticsService,
  initialQuery: route.query,
  onFiltersChange: (next) => router.replace({ query: filtersToQuery(next) }),
});

const {
  options: classOptions,
  error: classOptionsError,
  load: loadClassOptions,
} = useAttendanceClassOptions({
  fetchPage: (params, options) => myClassesService.list(params, options),
});

watch(error, (failure) => {
  if (failure?.status === 403) router.replace({ name: 'forbidden' });
});

const firstLoad = computed(() => loading.value && !data.value);
const failedFirstLoad = computed(() =>
  error.value && !data.value ? error.value : null,
);
const summary = computed(() => data.value?.summary);

onBeforeUnmount(dispose);

onMounted(() => {
  load();
  loadClassOptions();
});
</script>

<template>
  <header class="ot-page-header">
    <div>
      <h1 class="ot-page-title">Attendance analytics</h1>
      <p class="ot-subtitle">
        See how attendance changes over time across the classes you teach, and
        which students are at risk.
      </p>
    </div>
  </header>

  <div
    v-for="notice in notices"
    :key="notice"
    class="ot-notice ot-notice--warning mb-3 d-flex justify-content-between gap-2"
    role="status"
  >
    <span>{{ notice }}</span>
    <button type="button" class="btn btn-link p-0" @click="dismissNotices">
      Dismiss
    </button>
  </div>

  <AnalyticsFilters
    :filters="filters"
    :errors="filterErrors"
    :class-options="classOptions"
    :class-options-error="classOptionsError"
    @update="updateFilters"
    @retry-classes="loadClassOptions"
  />

  <RequestState
    v-if="failedFirstLoad"
    state="error"
    title="Could not load attendance analytics"
    :message="failedFirstLoad.message"
    retry
    @retry="retry"
  />
  <RequestState
    v-else-if="firstLoad"
    state="loading"
    title="Loading attendance analytics…"
  />
  <RequestState
    v-else-if="isEmpty"
    state="empty"
    title="No finalised class sessions"
    message="No finalised class sessions in this range. Sessions count here once a Lecturer finalises them."
  />
  <div v-else-if="data" :aria-busy="loading">
    <div
      v-if="error"
      class="ot-notice ot-notice--error mb-3 d-flex justify-content-between gap-2"
      role="alert"
    >
      <span>{{ error.message }}</span>
      <button type="button" class="btn btn-link p-0" @click="retry">
        Retry
      </button>
    </div>

    <UnfinalisedSessionsCard
      v-if="data.unfinalised.length"
      :sessions="data.unfinalised"
      :classes="data.byClass"
      :finalising-id="finalisingId"
      :error="finaliseError"
      @finalise="finalise"
    />

    <ul class="list-unstyled row g-3 mb-4" aria-label="Summary">
      <li class="col-12 col-md-4">
        <div class="ot-card h-100">
          <p class="ot-eyebrow mb-1">Finalised class sessions</p>
          <p class="ot-page-title mb-0">{{ summary.sessions }}</p>
        </div>
      </li>
      <li class="col-12 col-md-4">
        <div class="ot-card h-100">
          <p class="ot-eyebrow mb-1">Attendance rate</p>
          <p class="ot-page-title mb-0">
            {{ formatRate(summary.attendanceRate) }}
          </p>
          <p class="ot-meta mb-0">Present and late count as attended</p>
        </div>
      </li>
      <li class="col-12 col-md-4">
        <div class="ot-card h-100">
          <p class="ot-eyebrow mb-1">
            At risk (below {{ applied.atRiskBelow }}%)
          </p>
          <p class="ot-page-title mb-0">{{ summary.atRiskCount }}</p>
          <p class="ot-meta mb-0">Students, counted once per class</p>
        </div>
      </li>
    </ul>

    <div class="row g-4 mb-4">
      <div class="col-12 col-xl-8">
        <AttendanceTrendChart
          :trend="data.trend"
          :loading="loading"
          @retry="retry"
        />
      </div>
      <div class="col-12 col-xl-4">
        <StatusBreakdownChart
          :summary="summary"
          :loading="loading"
          @retry="retry"
        />
      </div>
      <div class="col-12">
        <ClassComparisonChart
          :by-class="data.byClass"
          :loading="loading"
          @retry="retry"
        />
      </div>
    </div>

    <AtRiskStudentList
      :rows="data.atRisk"
      :classes="data.byClass"
      :threshold="filters.atRiskBelow"
      :applied-threshold="applied.atRiskBelow"
      :error="filterErrors?.atRiskBelow ?? ''"
      :loading="loading"
      @update-threshold="(value) => updateFilters({ atRiskBelow: value })"
    />
  </div>
</template>
