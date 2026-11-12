<script setup>
// The map for the location editor: a draggable pin and a circle for the radius.
// It owns no numbers. The page passes them in and gets `pick` events back.
import 'leaflet/dist/leaflet.css';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useGeofenceMap } from '../composables/use-geofence-map.js';

const props = defineProps({
  // { lat, lng } or null when there is no usable location yet.
  position: { type: Object, default: null },
  // Radius in metres, or null.
  radius: { type: Number, default: null },
  // The test student of the check-in simulator, { lat, lng } or null.
  probe: { type: Object, default: null },
});
const emit = defineEmits(['pick', 'probe']);

const element = ref();
const tilesFailed = ref(false);
const loadError = ref(false);

const geofence = useGeofenceMap({
  position: () => props.position,
  radius: () => props.radius,
  onPick: (picked) => emit('pick', picked),
  probe: () => props.probe,
  onProbe: (picked) => emit('probe', picked),
  onTilesFailed: () => (tilesFailed.value = true),
  onTilesOk: () => (tilesFailed.value = false),
});

onMounted(async () => {
  try {
    await geofence.init(element.value);
  } catch {
    // The inputs next to the map still work without it.
    loadError.value = true;
  }
});
onBeforeUnmount(geofence.destroy);
</script>

<template>
  <div>
    <div
      ref="element"
      class="ot-geofence-map"
      role="group"
      aria-label="Map of the classroom location. Click the map or drag the pin to set the location. You can also type the coordinates."
    ></div>
    <p
      v-if="loadError"
      class="ot-notice ot-notice--error mt-2 mb-0"
      role="alert"
    >
      The map could not be loaded. Type the latitude and longitude instead.
    </p>
    <p
      v-else-if="tilesFailed"
      class="ot-notice ot-notice--warning mt-2 mb-0"
      role="status"
    >
      Some map tiles could not be loaded. Check your connection. The coordinates
      you entered are kept.
    </p>
  </div>
</template>

<style>
.ot-geofence-map {
  height: 460px;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.75rem;
  overflow: hidden;
}
@media (max-width: 575.98px) {
  .ot-geofence-map {
    height: 340px;
  }
}
/* The pin is drawn in CSS, so no image files are needed. */
.ot-geofence-pin span {
  display: block;
  width: 28px;
  height: 28px;
  background: #c8312b;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}
.ot-geofence-probe span {
  display: block;
  width: 24px;
  height: 24px;
  background: #0b1f3a;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}
.ot-geofence-probe:focus-visible span {
  outline: 3px solid #c8312b;
  outline-offset: 2px;
}
.ot-geofence-pin:focus-visible span {
  outline: 3px solid #0b1f3a;
  outline-offset: 2px;
}
</style>
