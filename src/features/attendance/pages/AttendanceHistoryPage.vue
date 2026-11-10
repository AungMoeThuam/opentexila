<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import RequestState from '../../../shared/components/RequestState.vue';
import AppIcon from '../../../shared/components/AppIcon.vue';
import {
  fetchPersonalAttendanceRecords,
  fetchAttendanceClassOptions,
} from '../services/attendance-service';
import { useAttendanceClassOptions } from '../composables/use-attendance-class-options';

const records = ref([]);
const meta = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
});

const state = ref('loading'); // 'loading' | 'ready' | 'empty' | 'no-match' | 'error'
const errorMessage = ref('');

const filters = reactive({
  classId: '',
  fromDate: '',
  toDate: '',
  status: '',
  includeCancelled: false,
});

const {
  options: availableClasses,
  loading: classOptionsLoading,
  error: classOptionsError,
  load: loadClassOptions,
  retry: retryClassOptions,
} = useAttendanceClassOptions({ fetchPage: fetchAttendanceClassOptions });

const selectedClassMissing = computed(
  () =>
    filters.classId !== '' &&
    !availableClasses.value.some((c) => c.id === filters.classId),
);

let abortController = null;

const hasActiveFilters = computed(() => {
  return (
    filters.classId !== '' ||
    filters.fromDate !== '' ||
    filters.toDate !== '' ||
    filters.status !== '' ||
    filters.includeCancelled === true
  );
});

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatTimeRange(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  try {
    const start = new Date(startIso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const end = new Date(endIso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${start} – ${end}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function getBadgeClass(status) {
  switch (status) {
    case 'present':
      return 'badge bg-success';
    case 'late':
      return 'badge bg-warning text-dark';
    case 'absent':
      return 'badge bg-danger';
    case 'pending':
    default:
      return 'badge bg-secondary';
  }
}

async function loadAttendance(page = 1) {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  state.value = 'loading';
  errorMessage.value = '';

  const params = {
    page,
    limit: meta.value.limit,
  };

  if (filters.classId) {
    params.classId = filters.classId;
  }

  // Convert inclusive calendar date to ISO string with timezone
  if (filters.fromDate) {
    const d = new Date(`${filters.fromDate}T00:00:00`);
    params.from = d.toISOString();
  }

  // UI 'to' date is inclusive for the full calendar day,
  // so set upper bound to the start of the next day (exclusive < to API semantics)
  if (filters.toDate) {
    const d = new Date(`${filters.toDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    params.to = d.toISOString();
  }

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.includeCancelled) {
    params.includeCancelled = true;
  }

  try {
    const response = await fetchPersonalAttendanceRecords(params, {
      signal: abortController.signal,
    });

    records.value = response.data || [];
    meta.value = response.meta || {
      page: 1,
      limit: 20,
      total: records.value.length,
      totalPages: 1,
    };

    if (records.value.length > 0) {
      state.value = 'ready';
    } else if (hasActiveFilters.value) {
      state.value = 'no-match';
    } else {
      state.value = 'empty';
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    state.value = 'error';
    errorMessage.value =
      err.message || 'Unable to load attendance records. Please try again.';
  }
}

function handleFilterChange() {
  meta.value.page = 1;
  loadAttendance(1);
}

function resetFilters() {
  filters.classId = '';
  filters.fromDate = '';
  filters.toDate = '';
  filters.status = '';
  filters.includeCancelled = false;
  meta.value.page = 1;
  loadAttendance(1);
}

function goToPage(page) {
  if (page < 1 || page > meta.value.totalPages || page === meta.value.page) {
    return;
  }
  meta.value.page = page;
  loadAttendance(page);
}

onMounted(() => {
  loadClassOptions();
  loadAttendance(1);
});

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort();
  }
});
</script>

<template>
  <div class="ot-page-content container-fluid py-4">
    <!-- Header -->
    <div
      class="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom"
    >
      <div>
        <h1 class="h3 fw-bold text-dark mb-1">Attendance History</h1>
        <p class="text-muted mb-0">
          View and manage your personal attendance records across enrolled
          classes.
        </p>
      </div>
    </div>

    <!-- Filters Card -->
    <div class="card shadow-sm border-0 mb-4 bg-white">
      <div class="card-body">
        <form
          @submit.prevent="handleFilterChange"
          class="row g-3 align-items-end"
        >
          <!-- Class Filter -->
          <div class="col-12 col-md-4 col-lg-3">
            <label
              for="filter-class"
              class="form-label fw-semibold small text-muted"
            >
              Class
            </label>
            <select
              id="filter-class"
              v-model="filters.classId"
              class="form-select form-select-sm"
              :disabled="classOptionsLoading"
              :aria-busy="classOptionsLoading"
              @change="handleFilterChange"
            >
              <option value="">
                {{ classOptionsLoading ? 'Loading classes…' : 'All classes' }}
              </option>
              <option
                v-if="selectedClassMissing"
                :key="filters.classId"
                :value="filters.classId"
              >
                Selected class
              </option>
              <option v-for="c in availableClasses" :key="c.id" :value="c.id">
                {{ c.label }}
              </option>
            </select>
            <span
              v-if="classOptionsLoading"
              class="visually-hidden"
              role="status"
            >
              Loading classes
            </span>
            <div
              v-if="classOptionsError"
              class="ot-notice ot-notice--error d-flex align-items-center gap-2 mt-1 py-1 px-2 small"
              role="alert"
            >
              <span>Unable to load classes.</span>
              <button
                type="button"
                class="btn btn-link btn-sm p-0"
                @click="retryClassOptions"
              >
                Retry
              </button>
            </div>
            <div
              v-else-if="!classOptionsLoading && availableClasses.length === 0"
              class="form-text"
            >
              No classes found.
            </div>
          </div>

          <!-- Date From -->
          <div class="col-6 col-md-3 col-lg-2">
            <label
              for="filter-from"
              class="form-label fw-semibold small text-muted"
            >
              From Date
            </label>
            <input
              id="filter-from"
              type="date"
              v-model="filters.fromDate"
              class="form-control form-control-sm"
              @change="handleFilterChange"
            />
          </div>

          <!-- Date To -->
          <div class="col-6 col-md-3 col-lg-2">
            <label
              for="filter-to"
              class="form-label fw-semibold small text-muted"
            >
              To Date
            </label>
            <input
              id="filter-to"
              type="date"
              v-model="filters.toDate"
              class="form-control form-control-sm"
              @change="handleFilterChange"
            />
          </div>

          <!-- Status Filter -->
          <div class="col-6 col-md-3 col-lg-2">
            <label
              for="filter-status"
              class="form-label fw-semibold small text-muted"
            >
              Attendance Status
            </label>
            <select
              id="filter-status"
              v-model="filters.status"
              class="form-select form-select-sm"
              @change="handleFilterChange"
            >
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <!-- Include Cancelled Checkbox -->
          <div class="col-6 col-md-4 col-lg-2">
            <div class="form-check mb-1">
              <input
                id="filter-cancelled"
                type="checkbox"
                v-model="filters.includeCancelled"
                class="form-check-input"
                @change="handleFilterChange"
              />
              <label
                for="filter-cancelled"
                class="form-check-label small fw-medium"
              >
                Include cancelled
              </label>
            </div>
          </div>

          <!-- Reset Button -->
          <div class="col-12 col-md-auto ms-md-auto d-flex justify-content-end">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
              :disabled="!hasActiveFilters"
              @click="resetFilters"
            >
              <AppIcon name="x" :size="14" class="me-1" />
              Reset filters
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="card shadow-sm border-0 bg-white">
      <!-- Loading State -->
      <div v-if="state === 'loading'" class="p-5 text-center">
        <RequestState
          state="loading"
          title="Loading attendance records"
          message="Fetching your latest records..."
        />
      </div>

      <!-- Error State -->
      <div v-else-if="state === 'error'" class="p-5 text-center">
        <RequestState
          state="error"
          title="Failed to load attendance"
          :message="errorMessage"
          :retry="true"
          @retry="() => loadAttendance(meta.page)"
        />
      </div>

      <!-- Empty State (No records at all) -->
      <div v-else-if="state === 'empty'" class="p-5 text-center">
        <RequestState
          state="empty"
          title="No attendance records available yet"
          message="You do not have any recorded attendance sessions for your enrolled classes."
        />
      </div>

      <!-- No Match State (Filters yielded zero results) -->
      <div v-else-if="state === 'no-match'" class="p-5 text-center">
        <RequestState
          state="empty"
          title="No attendance records match your filters"
          message="Try adjusting your class, date range, or status filters."
        />
        <div class="mt-3">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            @click="resetFilters"
          >
            Clear all filters
          </button>
        </div>
      </div>

      <!-- Ready State: Responsive Table -->
      <div v-else-if="state === 'ready'" class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr class="text-secondary small">
                <th scope="col" class="ps-4">Course & Class</th>
                <th scope="col">Lecturer & Venue</th>
                <th scope="col">Session Date</th>
                <th scope="col">Time</th>
                <th scope="col">Status</th>
                <th scope="col" class="pe-4">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in records" :key="item.class_session_id">
                <!-- Course & Class Details -->
                <td class="ps-4 py-3">
                  <div class="fw-bold text-dark">
                    {{ item.class?.course?.code }}
                    <span
                      v-if="item.class?.section"
                      class="badge bg-light text-dark border ms-1"
                    >
                      Sec {{ item.class.section }}
                    </span>
                  </div>
                  <div
                    class="small text-muted text-truncate"
                    style="max-width: 260px"
                  >
                    {{ item.class?.course?.name }}
                  </div>
                  <div v-if="item.class?.term" class="small text-muted">
                    Term: {{ item.class.term }}
                  </div>
                </td>

                <!-- Lecturer & Venue -->
                <td class="py-3">
                  <div class="fw-medium text-dark">
                    {{ item.class?.lecturer?.name || 'TBA' }}
                  </div>
                  <div class="small text-muted">
                    Room: {{ item.class?.room_label || 'TBA' }}
                  </div>
                </td>

                <!-- Session Date -->
                <td class="py-3">
                  <div class="fw-medium text-dark">
                    {{ formatDate(item.starts_at) }}
                  </div>
                  <div
                    v-if="item.class_state === 'cancelled'"
                    class="badge bg-danger-subtle text-danger border border-danger-subtle small mt-1"
                  >
                    Cancelled Session
                  </div>
                </td>

                <!-- Time -->
                <td class="py-3">
                  <div class="small text-dark">
                    {{ formatTimeRange(item.starts_at, item.ends_at) }}
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="py-3">
                  <span
                    :class="getBadgeClass(item.status)"
                    class="px-2 py-1 text-uppercase small"
                  >
                    {{ item.status }}
                  </span>
                </td>

                <!-- Check-in Time -->
                <td class="pe-4 py-3 text-secondary small">
                  {{ formatTime(item.checked_in_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div
          class="d-flex flex-wrap justify-content-between align-items-center px-4 py-3 border-top bg-light-subtle"
        >
          <div class="small text-muted mb-2 mb-md-0">
            Showing page <span class="fw-semibold">{{ meta.page }}</span> of
            <span class="fw-semibold">{{ meta.totalPages }}</span>
            ({{ meta.total }} total record{{ meta.total === 1 ? '' : 's' }})
          </div>

          <nav v-if="meta.totalPages > 1" aria-label="Attendance pagination">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: meta.page <= 1 }">
                <button
                  type="button"
                  class="page-link"
                  aria-label="Previous page"
                  :disabled="meta.page <= 1"
                  @click="goToPage(meta.page - 1)"
                >
                  Previous
                </button>
              </li>

              <li
                v-for="p in meta.totalPages"
                :key="p"
                class="page-item"
                :class="{ active: p === meta.page }"
              >
                <button type="button" class="page-link" @click="goToPage(p)">
                  {{ p }}
                </button>
              </li>

              <li
                class="page-item"
                :class="{ disabled: meta.page >= meta.totalPages }"
              >
                <button
                  type="button"
                  class="page-link"
                  aria-label="Next page"
                  :disabled="meta.page >= meta.totalPages"
                  @click="goToPage(meta.page + 1)"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-hover tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
