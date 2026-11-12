import { watch } from 'vue';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  PLACED_ZOOM,
  pickedPosition,
  samePosition,
} from '../services/geofence.js';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Draws a pin and a circle (radius in metres) on a Leaflet map and keeps them in
// step with values owned by the page. The page owns the numbers. This function:
//   - reads them through `position()` and `radius()` and moves the pin and the
//     circle when they change;
//   - calls `onPick({ lat, lng })` when the admin clicks the map or drops the pin.
// Moving the pin from code does not fire Leaflet events, and positions that are
// already equal are skipped, so the two directions cannot loop.
//
// Leaflet is loaded on first use. `init(element)` returns after the map exists;
// `destroy()` removes the watchers, the observer and the map.
export function useGeofenceMap({
  position,
  radius,
  onPick,
  // An optional second marker, the "test student" of the check-in simulator.
  // `probe()` gives its { lat, lng } or null, and `onProbe(point)` is called
  // when the admin drops it. A dashed line joins it to the pin.
  probe = () => null,
  onProbe = () => {},
  onTilesFailed = () => {},
  onTilesOk = () => {},
  loadLeaflet = () => import('leaflet'),
}) {
  // The map objects are plain handles, kept out of Vue's reactivity on purpose:
  // a reactive proxy around Leaflet's large objects is slow and breaks identity checks.
  let L = null;
  let map = null;
  let pin = null;
  let circle = null;
  let circleDrawn = null; // the position the circle is centred on now
  let probePin = null;
  let probeLine = null;
  let probeDrawn = null; // where the test student is now
  let observer = null;
  let stopWatch = null;
  let destroyed = false;
  let drawn = null; // the position the pin is at now

  function draw() {
    if (!map) return;
    const next = position();
    const meters = radius();
    if (!next) {
      pin?.remove();
      circle?.remove();
      pin = null;
      circle = null;
      circleDrawn = null;
      drawn = null;
      drawProbe();
      return;
    }
    const created = !pin;
    if (created) {
      pin = L.marker([next.lat, next.lng], {
        draggable: true,
        keyboard: true,
        title: 'Classroom location',
        alt: 'Classroom location pin',
        icon: L.divIcon({
          className: 'ot-geofence-pin',
          html: '<span></span>',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        }),
      }).addTo(map);
      pin.on('dragend', () => {
        const at = pin.getLatLng();
        drawn = pickedPosition(at);
        onPick(drawn);
      });
    } else if (!samePosition(drawn, next)) {
      pin.setLatLng([next.lat, next.lng]);
    }
    if (!circle) {
      circle = L.circle([next.lat, next.lng], {
        radius: meters ?? 0,
        color: '#c8312b',
        weight: 2,
        fillColor: '#c8312b',
        fillOpacity: 0.15,
      }).addTo(map);
      circleDrawn = next;
    } else {
      // The circle has its own position. The pin may already be at `next`
      // (the admin just dropped it there), but the circle is not until now.
      if (!samePosition(circleDrawn, next)) {
        circle.setLatLng([next.lat, next.lng]);
        circleDrawn = next;
      }
      if (meters !== null && circle.getRadius() !== meters)
        circle.setRadius(meters);
    }
    circle.setStyle({
      opacity: meters === null ? 0 : 1,
      fillOpacity: meters === null ? 0 : 0.15,
    });
    drawn = next;
    // Bring a position typed in the inputs into view. A pin the admin placed or
    // dragged is already in view, so the map is left alone and never fights them.
    if (!map.getBounds().contains([next.lat, next.lng]))
      map.setView([next.lat, next.lng], created ? PLACED_ZOOM : map.getZoom());
    drawProbe();
  }

  // The test student and its line to the pin. Like the pin, it is only moved
  // when its position really changed, so dragging it cannot loop.
  function drawProbe() {
    if (!map) return;
    const spot = probe();
    if (!spot) {
      probePin?.remove();
      probeLine?.remove();
      probePin = probeLine = probeDrawn = null;
      return;
    }
    if (!probePin) {
      probePin = L.marker([spot.lat, spot.lng], {
        draggable: true,
        keyboard: true,
        // Above the pin, so the test student is the one grabbed when they overlap.
        zIndexOffset: 1000,
        title: 'Test student',
        alt: 'Test student for the check-in simulator',
        icon: L.divIcon({
          className: 'ot-geofence-probe',
          html: '<span></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map);
      probePin.on('dragend', () => {
        probeDrawn = pickedPosition(probePin.getLatLng());
        onProbe(probeDrawn);
      });
    } else if (!samePosition(probeDrawn, spot)) {
      probePin.setLatLng([spot.lat, spot.lng]);
    }
    probeDrawn = spot;
    const center = position();
    if (!center) {
      probeLine?.remove();
      probeLine = null;
      return;
    }
    const ends = [
      [center.lat, center.lng],
      [spot.lat, spot.lng],
    ];
    if (!probeLine)
      probeLine = L.polyline(ends, {
        color: '#0b1f3a',
        weight: 2,
        dashArray: '6 6',
        interactive: false,
      }).addTo(map);
    else probeLine.setLatLngs(ends);
  }

  async function init(element) {
    const leaflet = await loadLeaflet();
    L = leaflet.default ?? leaflet;
    if (destroyed || !element) return;
    const start = position();
    map = L.map(element, {
      center: start ?? DEFAULT_CENTER,
      zoom: start ? PLACED_ZOOM : DEFAULT_ZOOM,
      worldCopyJump: true,
    });
    const tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION });
    tiles.on('tileerror', () => onTilesFailed());
    tiles.on('tileload', () => onTilesOk());
    tiles.addTo(map);
    map.on('click', (event) => {
      onPick(pickedPosition(event.latlng));
    });
    // The map needs a new size when its box changes (for example on a phone).
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(element);
    }
    draw();
    stopWatch = watch(() => {
      const at = position();
      const spot = probe();
      return [at?.lat, at?.lng, radius(), spot?.lat, spot?.lng];
    }, draw);
  }

  function destroy() {
    destroyed = true;
    stopWatch?.();
    observer?.disconnect();
    pin?.off();
    probePin?.off();
    map?.off();
    map?.remove();
    map = pin = circle = probePin = probeLine = observer = stopWatch = null;
    circleDrawn = null;
    drawn = probeDrawn = null;
  }

  return { init, destroy };
}
