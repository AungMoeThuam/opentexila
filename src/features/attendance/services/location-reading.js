// Reads the student's location for a check-in.
//
// A phone or a laptop often gives a rough first position (a few hundred
// metres off) and a better one a few seconds later. The server rejects a
// reading that is not accurate enough, so this waits for a good one instead of
// sending the first one that arrives.

// The server rejects a reading with an accuracy above this (metres). Keep in
// step with `locationPolicy.maxAccuracyM` in the backend.
export const GOOD_ENOUGH_M = 100;

// How long to wait for a reading that is good enough.
export const MAX_WAIT_MS = 12000;

const DENIED = 1;
const TIMEOUT = 3;

const toReading = ({ coords, timestamp }) => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  accuracy_m: coords.accuracy,
  reading_timestamp: new Date(timestamp).toISOString(),
});

// Resolves with the first reading whose accuracy is `goodEnoughM` or better. If
// none gets that good in `maxWaitMs`, resolves with the best one received, and
// the server decides. Rejects with `{ code }`: LOCATION_UNSUPPORTED,
// LOCATION_DENIED, LOCATION_UNAVAILABLE, LOCATION_TIMEOUT (no reading at all)
// or ABORTED. `onProgress({ accuracy_m })` is called with the best accuracy so
// far. `signal` stops the reading.
export function readBestLocation(
  geolocation = globalThis.navigator?.geolocation,
  {
    onProgress = () => {},
    signal,
    maxWaitMs = MAX_WAIT_MS,
    goodEnoughM = GOOD_ENOUGH_M,
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (!geolocation) return reject({ code: 'LOCATION_UNSUPPORTED' });
    if (signal?.aborted) return reject({ code: 'ABORTED' });

    let best = null;
    let watchId = null;
    let timer = null;
    let done = false;

    function finish(action, value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId !== null) geolocation.clearWatch(watchId);
      signal?.removeEventListener('abort', onAbort);
      action(value);
    }
    const onAbort = () => finish(reject, { code: 'ABORTED' });
    const giveUp = (code) => finish(best ? resolve : reject, best ?? { code });

    signal?.addEventListener('abort', onAbort);
    timer = setTimeout(() => giveUp('LOCATION_TIMEOUT'), maxWaitMs);

    watchId = geolocation.watchPosition(
      (position) => {
        const reading = toReading(position);
        if (!best || reading.accuracy_m < best.accuracy_m) best = reading;
        onProgress({ accuracy_m: best.accuracy_m });
        if (best.accuracy_m <= goodEnoughM) finish(resolve, best);
      },
      ({ code }) => {
        if (code === DENIED) return finish(reject, { code: 'LOCATION_DENIED' });
        // With a reading in hand, keep waiting for a better one.
        if (best) return;
        giveUp(code === TIMEOUT ? 'LOCATION_TIMEOUT' : 'LOCATION_UNAVAILABLE');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
    // A watch can report an error at once; `finish` may already have run.
    if (done) geolocation.clearWatch(watchId);
  });
}
