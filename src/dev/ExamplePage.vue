<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import RequestState from '../shared/components/RequestState.vue';
import ConfirmDialog from '../shared/components/ConfirmDialog.vue';
import { notify } from '../shared/composables/notifications';

const records = ref([]);
const state = ref('loading');
const scenario = ref('populated');
const name = ref('');
const nameInput = ref();
const fieldError = ref('');
const saveError = ref('');
const success = ref('');
const saving = ref(false);
const failSave = ref(false);
const selected = ref(null);
const removing = ref(false);
const removeError = ref('');
let sequence = 3;
let loadVersion = 0;
let disposed = false;
const timers = new Map();
function pause() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      resolve();
    }, 500);
    timers.set(timer, resolve);
  });
}
onBeforeUnmount(() => {
  disposed = true;
  for (const [timer, resolve] of timers) {
    clearTimeout(timer);
    resolve();
  }
  timers.clear();
});
async function load() {
  const version = ++loadVersion;
  state.value = 'loading';
  records.value = [];
  success.value = '';
  await pause();
  if (disposed || version !== loadVersion) return;
  if (scenario.value === 'error') {
    state.value = 'error';
    return;
  }
  records.value =
    scenario.value === 'empty'
      ? []
      : [
          { id: 1, name: 'Amelia Demo' },
          { id: 2, name: 'Sara Demo' },
        ];
  state.value = records.value.length ? 'ready' : 'empty';
}
function retry() {
  scenario.value = 'populated';
  load();
}
async function addRecord() {
  if (saving.value) return;
  fieldError.value = '';
  saveError.value = '';
  success.value = '';
  const value = name.value.trim();
  if (!value || value.length > 150) {
    fieldError.value = 'Enter a name between 1 and 150 characters.';
    nameInput.value.focus();
    return;
  }
  saving.value = true;
  await pause();
  if (disposed) return;
  saving.value = false;
  if (failSave.value) {
    saveError.value =
      'Example save failed. Disable simulated failure and retry.';
    return;
  }
  records.value.push({ id: sequence++, name: value });
  name.value = '';
  state.value = 'ready';
  success.value = 'Example record added. No backend data was changed.';
  notify('Example record added.');
}
function askRemove(record) {
  selected.value = record;
  removeError.value = '';
}
async function removeRecord() {
  if (removing.value) return;
  removing.value = true;
  removeError.value = '';
  await pause();
  if (disposed) return;
  removing.value = false;
  if (failSave.value) {
    removeError.value =
      'Example removal failed. Cancel, disable simulated failure and retry.';
    return;
  }
  records.value = records.value.filter((item) => item.id !== selected.value.id);
  selected.value = null;
  state.value = records.value.length ? 'ready' : 'empty';
  notify('Example record removed.');
  // The removed row's trigger no longer exists, so give focus a stable target.
  await nextTick();
  nameInput.value.focus();
}
onMounted(load);
</script>

<template>
  <header class="ot-page-header">
    <div>
      <p class="ot-eyebrow">Development reference</p>
      <h1 class="ot-page-title">Example roster</h1>
      <p class="ot-subtitle">
        Shared styles and request patterns for your feature pages.
      </p>
    </div>
    <RouterLink to="/style-guide" class="btn btn-outline-primary"
      >Open style guide</RouterLink
    >
  </header>
  <div class="ot-notice ot-notice--warning mb-4">
    <strong>Fictional data · browser memory only</strong>
    <p>
      This example never calls an API. Reloading resets the records. It does not
      enrol students or record attendance.
    </p>
  </div>
  <div class="ot-card mb-4">
    <div class="d-flex flex-wrap align-items-end gap-3">
      <div>
        <label for="demo-scenario" class="form-label">List response</label
        ><select id="demo-scenario" v-model="scenario" class="form-select">
          <option value="populated">Populated</option>
          <option value="empty">Empty</option>
          <option value="error">Error</option>
        </select>
      </div>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="state === 'loading' || saving || removing"
        @click="load"
      >
        Reload example
      </button>
      <div class="form-check mb-3">
        <input
          id="demo-fail"
          v-model="failSave"
          type="checkbox"
          class="form-check-input"
        /><label for="demo-fail" class="form-check-label"
          >Simulate save failure</label
        >
      </div>
    </div>
  </div>
  <div class="row g-4">
    <section class="col-12 col-lg-7" aria-labelledby="roster-heading">
      <div class="ot-card">
        <h2 id="roster-heading" class="ot-section-title mb-4">
          Example records
        </h2>
        <RequestState
          v-if="state !== 'ready'"
          :state="state"
          :message="
            state === 'error'
              ? 'The example list could not be loaded.'
              : state === 'empty'
                ? 'Add an example record using the form.'
                : 'Loading example records…'
          "
          retry
          @retry="retry"
        />
        <div
          v-else
          class="table-responsive"
          role="region"
          aria-label="Example records"
          tabindex="0"
        >
          <table class="table ot-table align-middle mb-0">
            <caption>
              Fictional names for UI development.
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <th scope="row">{{ record.name }}</th>
                <td>
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    :disabled="saving || removing"
                    :aria-label="`Remove ${record.name}`"
                    @click="askRemove(record)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="col-12 col-lg-5" aria-labelledby="form-heading">
      <form
        class="ot-card"
        novalidate
        :aria-busy="saving"
        @submit.prevent="addRecord"
      >
        <h2 id="form-heading" class="ot-section-title mb-4">
          Add example record
        </h2>
        <label for="example-name" class="form-label">Name</label>
        <input
          id="example-name"
          ref="nameInput"
          v-model="name"
          class="form-control"
          :class="{ 'is-invalid': fieldError }"
          :aria-invalid="!!fieldError"
          :aria-describedby="fieldError ? 'name-error' : 'name-help'"
          :disabled="saving"
          maxlength="150"
          required
        />
        <div v-if="fieldError" id="name-error" class="invalid-feedback">
          {{ fieldError }}
        </div>
        <div v-else id="name-help" class="form-text">
          Use fictional data for this example.
        </div>
        <RequestState
          v-if="saveError"
          state="error"
          :message="saveError"
          class="mt-3"
        />
        <RequestState
          v-if="success"
          state="success"
          :message="success"
          class="mt-3"
        />
        <button
          type="submit"
          class="btn btn-primary w-100 mt-4"
          :disabled="saving || removing || ['loading', 'error'].includes(state)"
        >
          <span
            v-if="saving"
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span
          >{{ saving ? 'Saving…' : 'Add example record' }}
        </button>
        <span class="visually-hidden" role="status">{{
          saving ? 'Saving example record…' : ''
        }}</span>
      </form>
    </section>
  </div>
  <ConfirmDialog
    :open="!!selected"
    title="Remove example record?"
    :message="`Remove ${selected?.name ?? ''} from this demonstration?`"
    confirm-label="Remove"
    :busy="removing"
    :error="removeError"
    @cancel="selected = null"
    @confirm="removeRecord"
  />
</template>
