<script setup>
// Location editor: a map with a draggable pin and a radius circle, plus the
// number inputs and a radius slider. The page owns the three numbers. The map,
// the inputs and the slider all read them from props and send changes up, so
// they cannot disagree.
import { computed, ref } from 'vue';
import FormField from './FormField.vue';
import GeofenceMap from './GeofenceMap.vue';
import {
  MAX_RADIUS_M,
  MIN_RADIUS_M,
} from '../services/course-class-validation.js';
import {
  geolocationMessage,
  pickedPosition,
  toPosition,
  toRadius,
} from '../services/geofence.js';

const props = defineProps({
  latitude: { type: [Number, String], default: '' },
  longitude: { type: [Number, String], default: '' },
  radius: { type: [Number, String], default: '' },
  // Messages by field: { latitude, longitude, radius_m }.
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits([
  'update:latitude',
  'update:longitude',
  'update:radius',
]);

const position = computed(() => toPosition(props.latitude, props.longitude));
const radiusMetres = computed(() => toRadius(props.radius));
const sliderValue = computed(() => radiusMetres.value ?? MIN_RADIUS_M);

const locating = ref(false);
const locationNote = ref('');
const locationError = ref('');

// Number inputs send a number, or '' when the box is empty.
function numberFrom(event) {
  const raw = event.target.value;
  if (raw === '') return '';
  const number = Number(raw);
  return Number.isNaN(number) ? raw : number;
}

function setPosition({ lat, lng }) {
  emit('update:latitude', lat);
  emit('update:longitude', lng);
}

function pick(picked) {
  locationNote.value = '';
  setPosition(picked);
}

function useMyLocation() {
  locationNote.value = '';
  locationError.value = '';
  if (!navigator.geolocation) {
    locationError.value = geolocationMessage(0);
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      locating.value = false;
      setPosition(
        pickedPosition({ lat: coords.latitude, lng: coords.longitude }),
      );
      locationNote.value = `Pin placed at your device location (accurate to about ${Math.round(coords.accuracy)} m). Drag it onto the classroom if it is off.`;
    },
    (failure) => {
      locating.value = false;
      locationError.value = geolocationMessage(failure.code);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}
</script>

<template>
  <div>
    <GeofenceMap :position="position" :radius="radiusMetres" @pick="pick" />
    <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        :disabled="disabled || locating"
        @click="useMyLocation"
      >
        {{ locating ? 'Finding your location…' : 'Use my current location' }}
      </button>
      <span class="ot-meta">Or click the map, or drag the pin.</span>
    </div>
    <p v-if="locationNote" class="ot-meta mt-2 mb-0" role="status">
      {{ locationNote }}
    </p>
    <p
      v-if="locationError"
      class="ot-notice ot-notice--error mt-2 mb-0"
      role="alert"
    >
      {{ locationError }}
    </p>

    <div class="row g-3 mt-1">
      <div class="col-12 col-sm-6">
        <FormField
          id="class-latitude"
          label="Latitude"
          required
          :error="errors.latitude"
          hint="-90 to 90, e.g. -37.8221"
        >
          <template #default="field">
            <input
              :id="field.id"
              :value="latitude"
              class="form-control"
              :class="{ 'is-invalid': field.invalid }"
              type="number"
              inputmode="decimal"
              min="-90"
              max="90"
              step="any"
              required
              :disabled="disabled"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="emit('update:latitude', numberFrom($event))"
            />
          </template>
        </FormField>
      </div>
      <div class="col-12 col-sm-6">
        <FormField
          id="class-longitude"
          label="Longitude"
          required
          :error="errors.longitude"
          hint="-180 to 180, e.g. 145.0389"
        >
          <template #default="field">
            <input
              :id="field.id"
              :value="longitude"
              class="form-control"
              :class="{ 'is-invalid': field.invalid }"
              type="number"
              inputmode="decimal"
              min="-180"
              max="180"
              step="any"
              required
              :disabled="disabled"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="emit('update:longitude', numberFrom($event))"
            />
          </template>
        </FormField>
      </div>
      <div class="col-12 col-lg-8">
        <FormField
          id="class-radius-slider"
          label="Radius slider"
          :hint="`Drag to change the area. ${MIN_RADIUS_M} to ${MAX_RADIUS_M} metres.`"
        >
          <template #default="field">
            <input
              :id="field.id"
              :value="sliderValue"
              class="form-range"
              type="range"
              :min="MIN_RADIUS_M"
              :max="MAX_RADIUS_M"
              step="1"
              :disabled="disabled"
              :aria-describedby="field.describedby"
              :aria-valuetext="`${sliderValue} metres`"
              @input="emit('update:radius', numberFrom($event))"
            />
          </template>
        </FormField>
      </div>
      <div class="col-12 col-lg-4">
        <FormField
          id="class-radius"
          label="Attendance radius (metres)"
          required
          :error="errors.radius_m"
        >
          <template #default="field">
            <input
              :id="field.id"
              :value="radius"
              class="form-control"
              :class="{ 'is-invalid': field.invalid }"
              type="number"
              inputmode="decimal"
              :min="MIN_RADIUS_M"
              :max="MAX_RADIUS_M"
              step="any"
              required
              :disabled="disabled"
              :aria-invalid="field.invalid"
              :aria-describedby="field.describedby"
              @input="emit('update:radius', numberFrom($event))"
            />
          </template>
        </FormField>
      </div>
      <p class="ot-meta mb-0">
        Phone GPS is usually accurate to 5–20 m outdoors and worse indoors, so
        use about 50 m or more for a building. A circle cannot tell floors or
        rooms apart.
      </p>
    </div>
  </div>
</template>
