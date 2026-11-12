<script setup>
// The fields of one session's attendance settings: room, the map editor, and
// the late allowance. The page owns the values; this sends each change up.
import FormField from './FormField.vue';
import GeofencePicker from './GeofencePicker.vue';

defineProps({
  values: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  // The most minutes a late allowance may have for this session.
  maxLate: { type: Number, default: 0 },
  // The test student of the check-in simulator, { lat, lng } or null.
  probe: { type: Object, default: null },
});
const emit = defineEmits(['update', 'probe']);

const change = (field, value) => emit('update', { field, value });
const numberFrom = (event) => {
  const raw = event.target.value;
  return raw === '' ? '' : Number(raw);
};
</script>

<template>
  <div class="row g-3">
    <div class="col-12 col-lg-6">
      <FormField
        id="session-room"
        label="Room"
        required
        :error="errors.room_label"
        hint="Shown to students for this session only."
      >
        <template #default="field">
          <input
            :id="field.id"
            :value="values.room_label"
            class="form-control"
            :class="{ 'is-invalid': field.invalid }"
            type="text"
            maxlength="100"
            autocomplete="off"
            required
            :disabled="disabled"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
            @input="change('room_label', $event.target.value)"
          />
        </template>
      </FormField>
    </div>
    <div class="col-12 col-lg-6">
      <FormField
        id="session-late-minutes"
        label="Late allowance (minutes after the start)"
        required
        :error="errors.late_minutes"
        :hint="`Whole minutes, 0 to ${maxLate}. A check-in up to this point is Present.`"
      >
        <template #default="field">
          <input
            :id="field.id"
            :value="values.late_minutes"
            class="form-control"
            :class="{ 'is-invalid': field.invalid }"
            type="number"
            inputmode="numeric"
            min="0"
            :max="maxLate"
            step="1"
            required
            :disabled="disabled"
            :aria-invalid="field.invalid"
            :aria-describedby="field.describedby"
            @input="change('late_minutes', numberFrom($event))"
          />
        </template>
      </FormField>
    </div>
    <div class="col-12 col-xl-7">
      <GeofencePicker
        :latitude="values.latitude"
        :longitude="values.longitude"
        :radius="values.radius_m"
        :errors="errors"
        :disabled="disabled"
        :probe="probe"
        @probe="emit('probe', $event)"
        @update:latitude="change('latitude', $event)"
        @update:longitude="change('longitude', $event)"
        @update:radius="change('radius_m', $event)"
      />
    </div>
    <!-- Beside the map on wide screens, so it can be used without scrolling.
         Below the map on narrow screens. -->
    <div v-if="$slots.aside" class="col-12 col-xl-5">
      <div class="ot-policy-aside d-grid gap-3">
        <slot name="aside" />
      </div>
    </div>
  </div>
</template>

<style>
@media (min-width: 1200px) {
  /* The column follows the page while the map and inputs are in view. */
  .ot-policy-aside {
    position: sticky;
    top: 5rem;
  }
}
</style>
