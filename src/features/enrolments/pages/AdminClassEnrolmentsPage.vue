<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RequestState from '../../../shared/components/RequestState.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { notify } from '../../../shared/composables/notifications.js';
import ClassContextHeader from '../components/ClassContextHeader.vue';
import ClassPagination from '../components/ClassPagination.vue';
import { useClassRoster } from '../composables/use-class-roster.js';
import {
  adminClassRosterService,
  enrolmentsManagementService,
} from '../services/index.js';
import { validateStudentId } from '../services/enrolments-management-service.js';

const route = useRoute();
const router = useRouter();
const {
  enrolments,
  context,
  meta,
  page,
  loading,
  error,
  notFound,
  load,
  retry,
  setPage,
  reset,
} = useClassRoster({
  service: adminClassRosterService,
  classId: () => route.params.classId,
});

const inputId = ref('');
const formError = ref('');
const formBusy = ref(false);
const deletingStudent = ref(null);
const deleteError = ref('');
const deleteBusy = ref(false);
const changing = computed(() => formBusy.value || deleteBusy.value);
let componentActive = true;

function apiMessage(cause) {
  if (cause?.code === 'ENROLMENT_ALREADY_EXISTS')
    return 'This student is already enrolled in the class.';
  if (cause?.code === 'STUDENT_NOT_ELIGIBLE')
    return 'The account must be an active student to enrol.';
  if (cause?.code === 'CSRF_INVALID')
    return 'Your security token expired. Please retry.';
  if (cause?.fields && Object.keys(cause.fields).length)
    return Object.values(cause.fields).flat().join(' ');
  return cause?.message || 'The operation failed. Please retry.';
}

async function addStudent() {
  if (changing.value) return;
  let studentId;
  try {
    studentId = validateStudentId(inputId.value);
    formError.value = '';
  } catch (cause) {
    formError.value = cause.message;
    return;
  }
  formBusy.value = true;
  try {
    await enrolmentsManagementService.addStudent(
      route.params.classId,
      studentId,
    );
    if (!componentActive) return;
    inputId.value = '';
    notify('Student enrolled successfully.', 'success');
    await load();
  } catch (cause) {
    if (componentActive) formError.value = apiMessage(cause);
  } finally {
    formBusy.value = false;
  }
}

function openRemove(enrolment) {
  if (changing.value) return;
  deletingStudent.value = enrolment;
  deleteError.value = '';
}
function closeRemove() {
  if (deleteBusy.value) return;
  deletingStudent.value = null;
  deleteError.value = '';
}
async function confirmRemove() {
  if (!deletingStudent.value || changing.value) return;
  deleteBusy.value = true;
  deleteError.value = '';
  try {
    await enrolmentsManagementService.removeStudent(
      route.params.classId,
      deletingStudent.value.student_id,
    );
    if (!componentActive) return;
    deletingStudent.value = null;
    notify('Student removed from the class.', 'success');
    await load();
    // After deleting the only student on the last page, navigate to the preceding page.
    if (
      componentActive &&
      !error.value &&
      meta.value?.totalPages > 0 &&
      page.value > meta.value.totalPages
    ) {
      await setPage(meta.value.totalPages);
    }
  } catch (cause) {
    if (componentActive) deleteError.value = apiMessage(cause);
  } finally {
    deleteBusy.value = false;
  }
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
watch(
  () => route.params.classId,
  () => {
    reset();
    inputId.value = '';
    deletingStudent.value = null;
    formError.value = '';
    load();
  },
);
onMounted(load);
onBeforeUnmount(() => {
  componentActive = false;
  reset();
});
</script>

<template>
  <div class="ot-page-content">
    <RouterLink class="d-inline-block mb-4" :to="{ name: 'admin-enrolments' }"
      >← All classes</RouterLink
    >
    <div v-if="notFound" class="ot-card ot-empty">
      <h1 class="ot-section-title">Class not found</h1>
      <p class="ot-meta">The selected class is not available.</p>
      <RouterLink
        class="btn btn-outline-primary"
        :to="{ name: 'admin-enrolments' }"
        >Back to classes</RouterLink
      >
    </div>
    <template v-else>
      <RequestState
        v-if="!context && loading"
        state="loading"
        title="Loading class…"
      />
      <RequestState
        v-else-if="!context && error"
        state="error"
        title="Could not load class"
        :message="apiMessage(error)"
        retry
        @retry="retry"
      />
      <template v-else-if="context">
        <header class="ot-page-header">
          <div>
            <p class="ot-eyebrow">Admin · Enrolments</p>
            <h1 class="ot-page-title">Class students</h1>
          </div>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="loading || changing"
            @click="load"
          >
            Refresh
          </button>
        </header>
        <ClassContextHeader :context="context" class="mb-4" />
        <section class="ot-card mb-4" aria-label="Add student">
          <h2 class="ot-section-title">Add student</h2>
          <p class="ot-meta">Enter the ID of an existing active student.</p>
          <form class="row g-3 align-items-end" @submit.prevent="addStudent">
            <div class="col-12 col-md-6">
              <label class="form-label" for="admin-student-id"
                >Student ID</label
              >
              <input
                id="admin-student-id"
                v-model="inputId"
                class="form-control"
                type="text"
                inputmode="numeric"
                :disabled="changing"
                :aria-invalid="Boolean(formError)"
                aria-describedby="student-id-error"
                placeholder="e.g. 3"
              />
              <p
                v-if="formError"
                id="student-id-error"
                class="text-danger mt-2 mb-0"
                role="alert"
              >
                {{ formError }}
              </p>
            </div>
            <div class="col-12 col-md-auto">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="changing"
              >
                {{ formBusy ? 'Adding…' : 'Add student' }}
              </button>
            </div>
          </form>
        </section>
        <section aria-label="Enrolled students" :aria-busy="loading">
          <div
            class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"
          >
            <h2 class="ot-section-title mb-0">Enrolled students</h2>
            <span v-if="meta" class="ot-meta">{{ meta.total }} students</span>
          </div>
          <RequestState
            v-if="loading && !enrolments.length"
            state="loading"
            title="Loading students…"
          />
          <RequestState
            v-else-if="error"
            state="error"
            title="Could not load students"
            :message="apiMessage(error)"
            retry
            @retry="retry"
          />
          <RequestState
            v-else-if="!enrolments.length"
            state="empty"
            title="No enrolled students"
            message="Add a student using the form above."
          />
          <template v-else>
            <div class="d-none d-md-block table-responsive ot-card p-0">
              <table class="table ot-table align-middle mb-0">
                <caption class="visually-hidden">
                  Student enrolments
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Student ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in enrolments" :key="item.student_id">
                    <td>{{ item.student_id }}</td>
                    <th scope="row">{{ item.student?.name }}</th>
                    <td>{{ item.student?.email }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        :disabled="changing"
                        :aria-label="`Remove ${item.student?.name} from class`"
                        @click="openRemove(item)"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul class="list-unstyled d-md-none d-grid gap-3 mb-0">
              <li v-for="item in enrolments" :key="item.student_id">
                <article class="ot-card">
                  <p class="fw-bold mb-1">{{ item.student?.name }}</p>
                  <p class="ot-meta mb-1">ID {{ item.student_id }}</p>
                  <p class="ot-meta">{{ item.student?.email }}</p>
                  <button
                    type="button"
                    class="btn btn-outline-danger mt-2"
                    :disabled="changing"
                    @click="openRemove(item)"
                  >
                    Remove
                  </button>
                </article>
              </li>
            </ul>
            <ClassPagination
              :meta="meta"
              :disabled="loading || changing"
              noun="student"
              plural-noun="students"
              label="Enrolled student pages"
              @change="setPage"
            />
          </template>
        </section>
      </template>
    </template>
    <ConfirmDialog
      :open="Boolean(deletingStudent)"
      :busy="deleteBusy"
      title="Remove student?"
      :message="`Remove ${deletingStudent?.student?.name ?? 'this student'} (ID ${deletingStudent?.student_id ?? ''}) from this class? Historical attendance records will be kept.`"
      :error="deleteError"
      confirm-label="Remove student"
      @confirm="confirmRemove"
      @cancel="closeRemove"
    />
  </div>
</template>
