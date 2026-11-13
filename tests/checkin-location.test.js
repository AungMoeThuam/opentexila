import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOD_ENOUGH_M,
  readBestLocation,
} from '../src/features/attendance/services/location-reading.js';
import {
  ALLOW_LOCATION_STEPS,
  watchLocationPermission,
} from '../src/features/attendance/services/location-permission.js';
import { errorMessage } from '../src/features/attendance/services/attendance.js';

// A stand-in for navigator.geolocation. `emit` sends a position to the
// watcher; `fail` sends an error.
function fakeGeolocation({ immediate = [] } = {}) {
  const geo = {
    cleared: [],
    options: null,
    watchPosition(success, error, options) {
      geo.success = success;
      geo.error = error;
      geo.options = options;
      for (const accuracy of immediate) geo.emit(accuracy);
      return 7;
    },
    clearWatch(id) {
      geo.cleared.push(id);
    },
    emit(accuracy, extra = {}) {
      geo.success({
        coords: {
          latitude: 3.1,
          longitude: 101.6,
          accuracy,
          ...extra,
        },
        timestamp: Date.parse('2026-11-14T02:00:00.000Z'),
      });
    },
    fail(code) {
      geo.error({ code });
    },
  };
  return geo;
}

const rejection = async (promise) => {
  try {
    await promise;
  } catch (failure) {
    return failure;
  }
  assert.fail('expected a rejection');
};

test('a reading that is accurate enough is used at once and the watch stops', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo);
  geo.emit(40);
  const reading = await result;
  assert.deepEqual(reading, {
    latitude: 3.1,
    longitude: 101.6,
    accuracy_m: 40,
    reading_timestamp: '2026-11-14T02:00:00.000Z',
  });
  assert.deepEqual(geo.cleared, [7]);
  assert.equal(geo.options.enableHighAccuracy, true);
  assert.equal(geo.options.maximumAge, 0);
});

test('a rough first reading is not used; it waits for a better one', async () => {
  const geo = fakeGeolocation();
  const progress = [];
  const result = readBestLocation(geo, {
    onProgress: ({ accuracy_m }) => progress.push(accuracy_m),
  });
  geo.emit(340);
  geo.emit(149);
  geo.emit(180); // worse than the best so far: progress stays at 149
  geo.emit(80);
  const reading = await result;
  assert.equal(reading.accuracy_m, 80);
  assert.deepEqual(progress, [340, 149, 149, 80]);
  assert.deepEqual(geo.cleared, [7]);
});

test('the limit is the one the server uses', () => {
  assert.equal(GOOD_ENOUGH_M, 100);
});

test('an accuracy exactly at the limit is good enough', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo);
  geo.emit(GOOD_ENOUGH_M);
  assert.equal((await result).accuracy_m, GOOD_ENOUGH_M);
});

test('after the wait, the best reading so far is sent and the server decides', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo, { maxWaitMs: 30 });
  geo.emit(500);
  geo.emit(220);
  geo.emit(300);
  const reading = await result;
  assert.equal(reading.accuracy_m, 220);
  assert.deepEqual(geo.cleared, [7]);
});

test('no reading at all is a timeout', async () => {
  const geo = fakeGeolocation();
  const failure = await rejection(readBestLocation(geo, { maxWaitMs: 20 }));
  assert.deepEqual(failure, { code: 'LOCATION_TIMEOUT' });
  assert.deepEqual(geo.cleared, [7]);
});

test('a denied permission stops at once', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo);
  geo.fail(1);
  assert.deepEqual(await rejection(result), { code: 'LOCATION_DENIED' });
  assert.deepEqual(geo.cleared, [7]);
});

test('an unavailable location is reported when there is no reading', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo);
  geo.fail(2);
  assert.deepEqual(await rejection(result), { code: 'LOCATION_UNAVAILABLE' });
});

test('an error after a reading keeps the reading and waits out the time', async () => {
  const geo = fakeGeolocation();
  const result = readBestLocation(geo, { maxWaitMs: 30 });
  geo.emit(250);
  geo.fail(2);
  assert.equal((await result).accuracy_m, 250);
});

test('a browser without location support is reported', async () => {
  const failure = await rejection(readBestLocation(null));
  assert.deepEqual(failure, { code: 'LOCATION_UNSUPPORTED' });
});

test('leaving the page stops the reading', async () => {
  const geo = fakeGeolocation();
  const controller = new AbortController();
  const result = readBestLocation(geo, { signal: controller.signal });
  controller.abort();
  assert.deepEqual(await rejection(result), { code: 'ABORTED' });
  assert.deepEqual(geo.cleared, [7]);
  // Nothing is asked of a page that is already gone.
  const gone = fakeGeolocation();
  const stopped = new AbortController();
  stopped.abort();
  assert.deepEqual(
    await rejection(readBestLocation(gone, { signal: stopped.signal })),
    { code: 'ABORTED' },
  );
  assert.equal(gone.success, undefined);
});

test('a position that arrives while the watch starts still stops the watch', async () => {
  const geo = fakeGeolocation({ immediate: [30] });
  const reading = await readBestLocation(geo);
  assert.equal(reading.accuracy_m, 30);
  assert.deepEqual(geo.cleared, [7]);
});

test('later readings after the result are ignored', async () => {
  const geo = fakeGeolocation();
  const progress = [];
  const result = readBestLocation(geo, {
    onProgress: ({ accuracy_m }) => progress.push(accuracy_m),
  });
  geo.emit(50);
  await result;
  geo.emit(10);
  assert.deepEqual(progress, [50, 10]);
  assert.deepEqual(geo.cleared, [7]);
});

test('the message for a rough location says how rough it was', () => {
  const text = errorMessage(
    { code: 'LOCATION_INACCURATE' },
    { accuracyM: 340.4 },
  );
  assert.match(text, /about 340 m/);
  assert.match(text, /100 m or better/);
  assert.equal(/move somewhere/i.test(text), false);
  // Without a number it still does not tell the student to move.
  const plain = errorMessage({ code: 'LOCATION_INACCURATE' });
  assert.equal(/move somewhere/i.test(plain), false);
  assert.match(plain, /try again/i);
});

test('other errors keep their messages', () => {
  assert.match(errorMessage({ code: 'OUTSIDE_ALLOWED_AREA' }), /outside/i);
  assert.match(errorMessage({ code: 'LOCATION_DENIED' }), /denied/i);
  assert.equal(errorMessage({ message: 'Boom' }), 'Boom');
  assert.match(errorMessage({}), /try again/i);
});

function fakeNavigator(state) {
  const listeners = new Set();
  const status = {
    state,
    addEventListener: (type, fn) => type === 'change' && listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
  };
  return {
    status,
    listeners,
    navigator: { permissions: { query: async () => status } },
    change(next) {
      status.state = next;
      for (const fn of [...listeners]) fn();
    },
  };
}

test('the permission is reported now and when it changes', async () => {
  const fake = fakeNavigator('denied');
  const seen = [];
  const watch = await watchLocationPermission(
    (s) => seen.push(s),
    fake.navigator,
  );
  assert.equal(watch.supported, true);
  assert.deepEqual(seen, ['denied']);
  fake.change('prompt');
  fake.change('granted');
  assert.deepEqual(seen, ['denied', 'prompt', 'granted']);
  watch.stop();
  assert.equal(fake.listeners.size, 0);
  fake.change('denied');
  assert.deepEqual(seen, ['denied', 'prompt', 'granted']);
});

test('a browser that cannot report the permission is handled', async () => {
  for (const nav of [
    undefined,
    {},
    { permissions: {} },
    {
      permissions: {
        query: async () => {
          throw new TypeError('not supported');
        },
      },
    },
  ]) {
    const seen = [];
    const watch = await watchLocationPermission((s) => seen.push(s), nav);
    assert.equal(watch.supported, false);
    assert.deepEqual(seen, []);
    watch.stop();
  }
});

test('the steps to allow location are short and in order', () => {
  assert.equal(ALLOW_LOCATION_STEPS.length, 3);
  assert.match(ALLOW_LOCATION_STEPS[0], /location or lock icon/i);
  assert.match(ALLOW_LOCATION_STEPS[1], /Allow/);
  assert.match(ALLOW_LOCATION_STEPS[2], /Reload/i);
});
