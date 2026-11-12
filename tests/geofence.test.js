import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTick, ref } from 'vue';
import {
  DEFAULT_CENTER,
  PLACED_ZOOM,
  geolocationMessage,
  pickedPosition,
  roundCoordinate,
  samePosition,
  toCoordinate,
  toLatitude,
  toLongitude,
  toPosition,
  toRadius,
} from '../src/features/courses/services/geofence.js';
import { useGeofenceMap } from '../src/features/courses/composables/use-geofence-map.js';

// A stand-in for Leaflet that records what the composable does with it.
function fakeLeaflet({ inView = true } = {}) {
  const log = { markers: [], circles: [], lines: [], maps: [], setViews: [] };
  const handlers = (target) => {
    target.handlers = {};
    target.on = (name, fn) => {
      target.handlers[name] = fn;
      return target;
    };
    target.off = () => {
      target.handlers = {};
    };
  };
  const L = {
    divIcon: (options) => options,
    map(element, options) {
      const map = {
        element,
        options,
        removed: false,
        zoom: options.zoom,
        invalidated: 0,
        remove() {
          map.removed = true;
        },
        getBounds: () => ({ contains: () => map.inView }),
        inView,
        getZoom: () => map.zoom,
        setView(center, zoom) {
          log.setViews.push([center, zoom]);
        },
        invalidateSize() {
          map.invalidated += 1;
        },
      };
      handlers(map);
      log.maps.push(map);
      return map;
    },
    tileLayer() {
      const layer = { addTo: () => layer };
      handlers(layer);
      log.tiles = layer;
      return layer;
    },
    marker(latlng, options) {
      const pin = {
        latlng,
        options,
        removed: false,
        setCalls: 0,
        addTo: () => pin,
        setLatLng(next) {
          pin.latlng = next;
          pin.setCalls += 1;
        },
        getLatLng: () => ({ lat: pin.latlng[0], lng: pin.latlng[1] }),
        remove() {
          pin.removed = true;
        },
      };
      handlers(pin);
      log.markers.push(pin);
      return pin;
    },
    polyline(points, options) {
      const line = {
        points,
        options,
        removed: false,
        setCalls: 0,
        addTo: () => line,
        setLatLngs(next) {
          line.points = next;
          line.setCalls += 1;
        },
        remove() {
          line.removed = true;
        },
      };
      log.lines.push(line);
      return line;
    },
    circle(latlng, options) {
      const circle = {
        latlng,
        radius: options.radius,
        radiusCalls: 0,
        styles: [],
        addTo: () => circle,
        setLatLng(next) {
          circle.latlng = next;
        },
        setRadius(value) {
          circle.radius = value;
          circle.radiusCalls += 1;
        },
        getRadius: () => circle.radius,
        setStyle: (style) => circle.styles.push(style),
        remove() {},
      };
      log.circles.push(circle);
      return circle;
    },
  };
  return { L, log };
}

async function start(options = {}) {
  const { L, log } = fakeLeaflet(options.leaflet);
  const position = ref(options.position ?? null);
  const radius = ref(options.radius ?? null);
  const probe = ref(options.probe ?? null);
  const probes = [];
  const picks = [];
  const events = [];
  const geofence = useGeofenceMap({
    position: () => position.value,
    radius: () => radius.value,
    onPick: (picked) => picks.push(picked),
    probe: () => probe.value,
    onProbe: (picked) => probes.push(picked),
    onTilesFailed: () => events.push('failed'),
    onTilesOk: () => events.push('ok'),
    loadLeaflet: async () => ({ default: L }),
  });
  await geofence.init({});
  return { geofence, position, radius, probe, probes, picks, events, log };
}

test('coordinates must be finite numbers in range', () => {
  assert.equal(toCoordinate('3.1215', -90, 90), 3.1215);
  assert.equal(toCoordinate(3.1215, -90, 90), 3.1215);
  assert.equal(toCoordinate('0', -90, 90), 0);
  for (const bad of [
    '',
    '  ',
    null,
    undefined,
    'abc',
    NaN,
    Infinity,
    91,
    -91,
    [],
    {},
    true,
  ])
    assert.equal(toLatitude(bad), null, String(bad));
  assert.equal(toLatitude(90), 90);
  assert.equal(toLatitude(-90), -90);
  assert.equal(toLongitude(180), 180);
  assert.equal(toLongitude(180.1), null);
  assert.equal(toLongitude('-180'), -180);
});

test('a position needs both a latitude and a longitude', () => {
  assert.deepEqual(toPosition('3.1', '101.6'), { lat: 3.1, lng: 101.6 });
  assert.deepEqual(toPosition(0, 0), { lat: 0, lng: 0 });
  assert.equal(toPosition('', '101.6'), null);
  assert.equal(toPosition('3.1', 'x'), null);
  assert.equal(toPosition(100, 0), null);
});

test('picked points are rounded to 6 decimals and the longitude wraps', () => {
  assert.equal(roundCoordinate(3.12345678), 3.123457);
  assert.deepEqual(pickedPosition({ lat: 3.12345678, lng: 101.98765432 }), {
    lat: 3.123457,
    lng: 101.987654,
  });
  assert.equal(pickedPosition({ lat: 0, lng: 190 }).lng, -170);
  assert.equal(pickedPosition({ lat: 0, lng: -190 }).lng, 170);
  assert.equal(pickedPosition({ lat: 0, lng: 360 }).lng, 0);
  assert.equal(pickedPosition({ lat: 95, lng: 0 }).lat, 90);
  assert.equal(pickedPosition({ lat: -95, lng: 0 }).lat, -90);
});

test('equal positions are recognised so the map and inputs cannot loop', () => {
  assert.equal(samePosition({ lat: 1, lng: 2 }, { lat: 1, lng: 2 }), true);
  assert.equal(
    samePosition({ lat: 1, lng: 2 }, { lat: 1.0000000001, lng: 2 }),
    true,
  );
  assert.equal(
    samePosition({ lat: 1, lng: 2 }, { lat: 1.000001, lng: 2 }),
    false,
  );
  assert.equal(samePosition(null, null), true);
  assert.equal(samePosition(null, { lat: 1, lng: 2 }), false);
});

test('the radius must be inside the allowed range', () => {
  assert.equal(toRadius('75'), 75);
  assert.equal(toRadius(1), 1);
  assert.equal(toRadius(1000), 1000);
  for (const bad of ['', null, undefined, 0, 0.5, 1001, 'abc', NaN])
    assert.equal(toRadius(bad), null, String(bad));
});

test('location button messages explain each failure', () => {
  assert.match(geolocationMessage(1), /blocked/);
  assert.match(geolocationMessage(2), /could not be found/);
  assert.match(geolocationMessage(3), /too long/);
  assert.match(geolocationMessage(0), /could not be read/);
});

test('the map opens on the saved location, or on the default centre', async () => {
  const placed = await start({
    position: { lat: 3.1, lng: 101.6 },
    radius: 75,
  });
  assert.deepEqual(placed.log.maps[0].options.center, { lat: 3.1, lng: 101.6 });
  assert.equal(placed.log.maps[0].options.zoom, PLACED_ZOOM);
  assert.equal(placed.log.markers.length, 1);
  assert.equal(placed.log.markers[0].options.draggable, true);
  assert.equal(placed.log.markers[0].options.keyboard, true);
  assert.equal(placed.log.circles[0].radius, 75);
  placed.geofence.destroy();
  const empty = await start();
  assert.deepEqual(empty.log.maps[0].options.center, DEFAULT_CENTER);
  assert.equal(empty.log.markers.length, 0, 'no pin until there is a location');
  assert.equal(empty.log.circles.length, 0);
  empty.geofence.destroy();
});

test('clicking the map and dropping the pin send rounded positions up', async () => {
  const { geofence, log, picks } = await start({
    position: { lat: 3.1, lng: 101.6 },
    radius: 50,
  });
  log.maps[0].handlers.click({ latlng: { lat: 3.12345678, lng: 101.5 } });
  assert.deepEqual(picks.at(-1), { lat: 3.123457, lng: 101.5 });
  log.markers[0].latlng = [3.2, 101.7];
  log.markers[0].handlers.dragend();
  assert.deepEqual(picks.at(-1), { lat: 3.2, lng: 101.7 });
  geofence.destroy();
});

test('typing coordinates moves the pin and the circle, and clearing removes them', async () => {
  const { geofence, position, log } = await start();
  position.value = { lat: 3.5, lng: 101.1 };
  await nextTick();
  assert.equal(log.markers.length, 1);
  assert.deepEqual(log.markers[0].latlng, [3.5, 101.1]);
  position.value = { lat: 3.6, lng: 101.2 };
  await nextTick();
  assert.deepEqual(log.markers[0].latlng, [3.6, 101.2]);
  assert.deepEqual(log.circles[0].latlng, [3.6, 101.2]);
  position.value = null;
  await nextTick();
  assert.equal(log.markers[0].removed, true);
  position.value = { lat: 4, lng: 102 };
  await nextTick();
  assert.equal(
    log.markers.length,
    2,
    'a new pin is drawn when a location returns',
  );
  geofence.destroy();
});

test('the radius changes the circle only when the value changes', async () => {
  const { geofence, radius, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
  });
  const circle = log.circles[0];
  radius.value = 120;
  await nextTick();
  assert.equal(circle.radius, 120);
  const calls = circle.radiusCalls;
  radius.value = 120;
  await nextTick();
  assert.equal(circle.radiusCalls, calls, 'same value, no redraw');
  radius.value = null;
  await nextTick();
  assert.equal(
    circle.styles.at(-1).opacity,
    0,
    'a radius out of range hides the circle',
  );
  geofence.destroy();
});

test('a position the pin already has is not set again, so there is no loop', async () => {
  const { geofence, position, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
  });
  const pin = log.markers[0];
  // The admin drops the pin: the map sends the point up, the page sends it back.
  pin.latlng = [3.0001, 101.0002];
  pin.handlers.dragend();
  position.value = { lat: 3.0001, lng: 101.0002 };
  await nextTick();
  assert.equal(pin.setCalls, 0, 'the pin was not moved again');
  // The circle was not moved by the drag itself, so it follows the pin now.
  assert.deepEqual(
    log.circles[0].latlng,
    [3.0001, 101.0002],
    'the circle follows a dragged pin',
  );
  geofence.destroy();
});

test('the map is only re-centred when the pin is out of view', async () => {
  const visible = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
    leaflet: { inView: true },
  });
  visible.log.setViews.length = 0;
  visible.position.value = { lat: 3.0001, lng: 101 };
  await nextTick();
  assert.equal(visible.log.setViews.length, 0);
  visible.geofence.destroy();
  const away = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
    leaflet: { inView: false },
  });
  away.log.setViews.length = 0;
  away.position.value = { lat: 10, lng: 110 };
  await nextTick();
  assert.deepEqual(away.log.setViews, [[[10, 110], away.log.maps[0].zoom]]);
  away.geofence.destroy();
});

test('tile problems are reported and cleared', async () => {
  const { geofence, log, events } = await start();
  log.tiles.handlers.tileerror();
  log.tiles.handlers.tileload();
  assert.deepEqual(events, ['failed', 'ok']);
  geofence.destroy();
});

test('destroy removes the map and stops reacting to changes', async () => {
  const { geofence, position, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
  });
  geofence.destroy();
  assert.equal(log.maps[0].removed, true);
  assert.deepEqual(log.maps[0].handlers, {}, 'map listeners are removed');
  const before = log.markers[0].setCalls;
  position.value = { lat: 9, lng: 109 };
  await nextTick();
  assert.equal(
    log.markers[0].setCalls,
    before,
    'nothing is drawn after destroy',
  );
  geofence.destroy(); // calling it twice is safe
});

test('destroy during loading leaves no map behind', async () => {
  const { L, log } = fakeLeaflet();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const geofence = useGeofenceMap({
    position: () => null,
    radius: () => null,
    onPick: () => {},
    loadLeaflet: async () => {
      await gate;
      return { default: L };
    },
  });
  const starting = geofence.init({});
  geofence.destroy();
  release();
  await starting;
  assert.equal(log.maps.length, 0);
});

test('the test student is a second marker with a line to the pin', async () => {
  const { geofence, log, probe, probes } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
    probe: { lat: 3.0002, lng: 101 },
  });
  assert.equal(log.markers.length, 2, 'the pin and the test student');
  const student = log.markers[1];
  assert.equal(student.options.draggable, true);
  assert.equal(student.options.keyboard, true);
  assert.equal(student.options.icon.className, 'ot-geofence-probe');
  assert.ok(
    student.options.zIndexOffset > 0,
    'above the pin when they overlap',
  );
  assert.equal(log.lines.length, 1);
  assert.deepEqual(log.lines[0].points, [
    [3, 101],
    [3.0002, 101],
  ]);
  // Dropping the student sends a rounded position up and nothing else moves.
  student.latlng = [3.00012345678, 101.0001];
  student.handlers.dragend();
  assert.deepEqual(probes.at(-1), { lat: 3.000123, lng: 101.0001 });
  assert.equal(log.markers[0].setCalls, 0, 'the classroom pin did not move');
  // The page sends the same position back: the marker is not set again.
  probe.value = { lat: 3.000123, lng: 101.0001 };
  await nextTick();
  assert.equal(student.setCalls, 0, 'no loop');
  // A position from the distance box moves the marker and the line.
  probe.value = { lat: 3.0005, lng: 101 };
  await nextTick();
  assert.deepEqual(student.latlng, [3.0005, 101]);
  assert.deepEqual(log.lines[0].points[1], [3.0005, 101]);
  geofence.destroy();
});

test('the line follows the pin, and the test student can be removed', async () => {
  const { geofence, position, probe, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
    probe: { lat: 3.0002, lng: 101 },
  });
  position.value = { lat: 3.01, lng: 101.01 };
  await nextTick();
  assert.deepEqual(
    log.lines[0].points[0],
    [3.01, 101.01],
    'the line starts at the pin',
  );
  probe.value = null;
  await nextTick();
  assert.equal(log.markers[1].removed, true);
  assert.equal(log.lines[0].removed, true);
  probe.value = { lat: 3.02, lng: 101.02 };
  await nextTick();
  assert.equal(log.markers.length, 3, 'a new marker is drawn when it returns');
  geofence.destroy();
});

test('without a pin the test student has no line, and cleanup removes both', async () => {
  const { geofence, position, log } = await start({
    probe: { lat: 3, lng: 101 },
  });
  assert.equal(log.markers.length, 1, 'the test student alone');
  assert.equal(log.lines.length, 0);
  position.value = { lat: 3.001, lng: 101 };
  await nextTick();
  assert.equal(log.lines.length, 1);
  geofence.destroy();
  assert.equal(log.maps[0].removed, true);
  assert.deepEqual(
    log.markers[1].handlers,
    {},
    'the marker listeners are removed',
  );
});

test('a map used without a test student draws none', async () => {
  const { geofence, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
  });
  assert.equal(log.markers.length, 1);
  assert.equal(log.lines.length, 0);
  geofence.destroy();
});

test('the circle follows the pin after every kind of move', async () => {
  const { geofence, position, log } = await start({
    position: { lat: 3, lng: 101 },
    radius: 50,
  });
  const pin = log.markers[0];
  const circle = log.circles[0];
  // Dragging the pin.
  pin.latlng = [3.01, 101.01];
  pin.handlers.dragend();
  position.value = { lat: 3.01, lng: 101.01 };
  await nextTick();
  assert.deepEqual(circle.latlng, [3.01, 101.01]);
  // A click on the map (the page moves the position).
  log.maps[0].handlers.click({ latlng: { lat: 3.02, lng: 101.02 } });
  position.value = { lat: 3.02, lng: 101.02 };
  await nextTick();
  assert.deepEqual(pin.latlng, [3.02, 101.02]);
  assert.deepEqual(circle.latlng, [3.02, 101.02]);
  // Typed coordinates.
  position.value = { lat: 3.5, lng: 101.5 };
  await nextTick();
  assert.deepEqual(circle.latlng, [3.5, 101.5]);
  // Dropping the pin twice in a row on new places.
  for (const [lat, lng] of [
    [4, 102],
    [4.001, 102.001],
  ]) {
    pin.latlng = [lat, lng];
    pin.handlers.dragend();
    position.value = { lat, lng };
    await nextTick();
    assert.deepEqual(circle.latlng, [lat, lng]);
  }
  geofence.destroy();
});
