import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EARTH_RADIUS_M,
  OUTCOMES,
  bearingBetween,
  checkInTime,
  distanceBetween,
  followProbe,
  offsetRange,
  pointAtBearing,
  pointAtDistance,
  simulateCheckIn,
} from '../src/features/courses/services/check-in-simulation.js';

// 09:00 to 11:00 in Kuala Lumpur, late after 09:15.
const session = {
  state: 'scheduled',
  startsAt: '2026-11-20T01:00:00.000Z',
  lateAfter: '2026-11-20T01:15:00.000Z',
  endsAt: '2026-11-20T03:00:00.000Z',
};
const center = { lat: 3.1215, lng: 101.6568 };
const near = pointAtDistance(center, 40);
const decide = (over = {}) =>
  simulateCheckIn({
    session,
    center,
    radius: 75,
    student: near,
    at: '2026-11-20T01:05:00.000Z',
    ...over,
  });

test('distance uses the same formula and Earth radius as the server', () => {
  assert.equal(EARTH_RADIUS_M, 6371000);
  assert.equal(distanceBetween(center, center), 0);
  // One degree of latitude is about 111.195 km.
  assert.ok(
    Math.abs(
      distanceBetween({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) - 111194.93,
    ) < 0.01,
  );
  // The 0.0006 degree step used in the backend check-in test: about 66.7 m.
  assert.ok(
    Math.abs(
      distanceBetween({ lat: 0, lng: 0 }, { lat: 0.0006, lng: 0 }) - 66.717,
    ) < 0.01,
  );
  // A long distance: Sydney to Melbourne is about 713 km.
  const sydneyToMelbourne = distanceBetween(
    { lat: -33.8688, lng: 151.2093 },
    { lat: -37.8136, lng: 144.9631 },
  );
  assert.ok(sydneyToMelbourne > 710000 && sydneyToMelbourne < 717000);
  // Symmetric.
  assert.equal(distanceBetween(center, near), distanceBetween(near, center));
});

test('a point placed by distance really is that far away', () => {
  for (const meters of [0, 1, 30, 75, 100, 1000, 25000]) {
    const point = pointAtDistance(center, meters);
    assert.ok(
      Math.abs(distanceBetween(center, point) - meters) <
        1e-6 * Math.max(1, meters),
      String(meters),
    );
    assert.equal(point.lng, center.lng, 'due north');
  }
  assert.equal(
    pointAtDistance({ lat: 89.9999, lng: 0 }, 100000).lat,
    90,
    'the latitude stays in range',
  );
  assert.equal(pointAtDistance({ lat: -89.9999, lng: 0 }, -100000).lat, -90);
});

test('the check-in time is counted from the start, and the slider has a margin', () => {
  assert.equal(checkInTime(session.startsAt, 0), session.startsAt);
  assert.equal(checkInTime(session.startsAt, 20), '2026-11-20T01:20:00.000Z');
  assert.equal(checkInTime(session.startsAt, -15), '2026-11-20T00:45:00.000Z');
  assert.deepEqual(offsetRange(session.startsAt, session.endsAt), {
    min: -30,
    max: 150,
  });
  assert.deepEqual(offsetRange('bad', session.endsAt), { min: -30, max: 30 });
});

test('inside the area and on time is Present, later is Late', () => {
  const present = decide();
  assert.equal(present.outcome, 'present');
  assert.ok(Math.abs(present.distance - 40) < 1e-6);
  assert.match(present.message, /Present/);
  assert.match(present.message, /09:05/);
  assert.match(present.message, /09:15/);
  const late = decide({ at: '2026-11-20T01:20:00.000Z' });
  assert.equal(late.outcome, 'late');
  assert.match(late.message, /Late/);
  assert.match(late.message, /09:20 is after 09:15/);
});

test('the timing boundaries are the same as the server', () => {
  const outcomeAt = (iso) => decide({ at: iso }).outcome;
  assert.equal(outcomeAt('2026-11-20T00:59:59.999Z'), 'not_open');
  assert.equal(
    outcomeAt('2026-11-20T01:00:00.000Z'),
    'present',
    'the start is inclusive',
  );
  assert.equal(
    outcomeAt('2026-11-20T01:15:00.000Z'),
    'present',
    'the late time itself is Present',
  );
  assert.equal(outcomeAt('2026-11-20T01:15:00.001Z'), 'late');
  assert.equal(outcomeAt('2026-11-20T02:59:59.999Z'), 'late');
  assert.equal(
    outcomeAt('2026-11-20T03:00:00.000Z'),
    'closed',
    'the end is exclusive',
  );
  // A Date works as well as text.
  assert.equal(
    decide({ at: new Date('2026-11-20T01:15:00.000Z') }).outcome,
    'present',
  );
});

test('the radius boundary: exactly on the radius is inside', () => {
  const student = pointAtDistance(center, 75);
  const exact = distanceBetween(center, student);
  assert.equal(decide({ student, radius: exact }).outcome, 'present');
  assert.equal(decide({ student, radius: exact - 0.001 }).outcome, 'outside');
  const outside = decide({ student: pointAtDistance(center, 80), radius: 75 });
  assert.equal(outside.outcome, 'outside');
  assert.match(outside.message, /80 m from the pin is outside the 75 m area/);
});

test('the checks run in the server order', () => {
  const far = pointAtDistance(center, 500);
  // Not open yet and closed come before the place is looked at.
  assert.equal(
    decide({ student: far, at: '2026-11-20T00:00:00.000Z' }).outcome,
    'not_open',
  );
  assert.equal(
    decide({ student: far, at: '2026-11-20T04:00:00.000Z' }).outcome,
    'closed',
  );
  assert.equal(decide({ student: far }).outcome, 'outside');
  // A cancelled session comes first of all.
  const cancelled = { ...session, state: 'cancelled' };
  for (const at of [
    '2026-11-20T00:00:00.000Z',
    '2026-11-20T01:05:00.000Z',
    '2026-11-20T04:00:00.000Z',
  ])
    assert.equal(decide({ session: cancelled, at }).outcome, 'cancelled', at);
  assert.equal(
    decide({ session: cancelled, student: far }).outcome,
    'cancelled',
  );
});

test('missing or unusable inputs give no answer', () => {
  for (const over of [
    { center: null },
    { student: null },
    { radius: NaN },
    { radius: undefined },
    { at: 'not a time' },
    { session: { ...session, lateAfter: 'bad' } },
    { session: undefined },
  ])
    assert.equal(decide(over).outcome, 'incomplete', JSON.stringify(over));
  assert.equal(decide({ center: null }).message, '');
});

test('every outcome has a label and a badge style', () => {
  for (const outcome of [
    'present',
    'late',
    'outside',
    'not_open',
    'closed',
    'cancelled',
  ]) {
    assert.ok(OUTCOMES[outcome].label, outcome);
    assert.ok(OUTCOMES[outcome].modifier, outcome);
  }
  assert.equal(OUTCOMES.present.label, 'Present');
  assert.equal(OUTCOMES.late.label, 'Late');
});

test('the direction between two points is measured from north', () => {
  const origin = { lat: 3, lng: 101 };
  const bearing = (to) => Math.round(bearingBetween(origin, to));
  assert.equal(bearing({ lat: 3.01, lng: 101 }), 0);
  assert.equal(bearing({ lat: 3, lng: 101.01 }), 90);
  assert.equal(bearing({ lat: 2.99, lng: 101 }), 180);
  assert.equal(bearing({ lat: 3, lng: 100.99 }), 270);
  assert.equal(
    bearing({ lat: 3.01, lng: 101.01 }) > 0 &&
      bearing({ lat: 3.01, lng: 101.01 }) < 90,
    true,
  );
});

test('a point at a bearing is that far away in that direction', () => {
  const origin = { lat: 3, lng: 101 };
  for (const meters of [1, 50, 150, 5000]) {
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const point = pointAtBearing(origin, meters, bearing);
      assert.ok(
        Math.abs(distanceBetween(origin, point) - meters) <
          1e-6 * Math.max(1, meters),
        `${meters} m at ${bearing}`,
      );
      assert.ok(
        Math.abs(bearingBetween(origin, point) - bearing) < 0.01 ||
          Math.abs(Math.abs(bearingBetween(origin, point) - bearing) - 360) <
            0.01,
        `bearing ${bearing}`,
      );
    }
  }
  // Due north matches the simpler helper.
  const north = pointAtBearing(origin, 150, 0);
  const placed = pointAtDistance(origin, 150);
  assert.ok(
    Math.abs(north.lat - placed.lat) < 1e-9 &&
      Math.abs(north.lng - placed.lng) < 1e-9,
  );
  // The longitude wraps at the date line.
  assert.ok(
    Math.abs(pointAtBearing({ lat: 0, lng: 179.9999 }, 100, 90).lng) <= 180,
  );
});

test('the test student keeps its distance and direction when the pin moves', () => {
  const before = { lat: 3.1215, lng: 101.6568 };
  const student = pointAtBearing(before, 150, 70);
  const moves = [
    { lat: 3.1219, lng: 101.6571 }, // a few metres
    { lat: 3.2, lng: 101.8 }, // across the city
    { lat: -37.8221, lng: 145.0389 }, // another country
    { lat: 60, lng: -120 }, // a high latitude
  ];
  for (const next of moves) {
    const followed = followProbe({ previous: before, next, probe: student });
    assert.ok(
      Math.abs(distanceBetween(next, followed) - 150) < 1e-6,
      JSON.stringify(next),
    );
    assert.ok(
      Math.abs(bearingBetween(next, followed) - 70) < 0.01,
      JSON.stringify(next),
    );
  }
});

test('the test student on the pin stays on the pin, and nothing follows without both points', () => {
  const before = { lat: 3, lng: 101 };
  const next = { lat: 3.5, lng: 101.5 };
  const onPin = followProbe({ previous: before, next, probe: before });
  assert.ok(distanceBetween(onPin, next) < 1e-6);
  const probe = { lat: 3.001, lng: 101 };
  assert.equal(followProbe({ previous: null, next, probe }), probe);
  assert.equal(followProbe({ previous: before, next: null, probe }), probe);
  assert.equal(followProbe({ previous: before, next, probe: null }), null);
  // A pin that did not move leaves the student where it is.
  const same = followProbe({ previous: before, next: { ...before }, probe });
  assert.ok(distanceBetween(same, probe) < 1e-6);
});

test('the answer of the simulator does not change when the pin moves', () => {
  // Moving the pin and the student together keeps the same distance, so the
  // result for the same time is the same.
  const before = { lat: 3.1215, lng: 101.6568 };
  const student = pointAtBearing(before, 60, 200);
  const next = { lat: 3.15, lng: 101.7 };
  const moved = followProbe({ previous: before, next, probe: student });
  const first = decide({ center: before, student });
  const second = decide({ center: next, student: moved });
  assert.equal(second.outcome, first.outcome);
  assert.ok(Math.abs(second.distance - first.distance) < 1e-6);
});
