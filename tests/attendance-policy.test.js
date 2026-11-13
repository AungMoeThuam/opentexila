import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  changedPolicyFields,
  differsFromClass,
  isEditable,
  lateAfterFrom,
  lateMinutesOf,
  lateTooLongMessage,
  maxLateMinutes,
  policyFormValues,
  sessionLateLimit,
  policySummary,
  sessionOptionLabel,
  validatePolicy,
} from '../src/features/courses/services/attendance-policy.js';
import { createClassSessionsService } from '../src/features/courses/services/class-sessions-service.js';
import courseRoutes from '../src/features/courses/routes.js';
import { MAX_LATE_MINUTES } from '../src/features/courses/services/late-allowance.js';

// 09:00 to 11:00 in Kuala Lumpur (01:00Z to 03:00Z), late after 09:15.
const session = {
  id: 31,
  class_id: 7,
  room_label: 'EN402',
  latitude: '3.121500',
  longitude: '101.656800',
  radius_m: '75.00',
  starts_at: '2026-11-20T01:00:00.000Z',
  late_after: '2026-11-20T01:15:00.000Z',
  ends_at: '2026-11-20T03:00:00.000Z',
  state: 'scheduled',
  availability: 'upcoming',
  attendance: { present: 0, late: 0, absent: 0, pending: 0 },
};
const values = (over = {}) => ({ ...policyFormValues(session), ...over });

test('only a scheduled session that has not started can change', () => {
  assert.equal(isEditable(session), true);
  for (const availability of ['in_progress', 'ended', 'cancelled'])
    assert.equal(isEditable({ ...session, availability }), false, availability);
  assert.equal(isEditable({ ...session, state: 'cancelled' }), false);
  assert.equal(isEditable(undefined), false);
});

test('a saved session becomes form values, with the late time in minutes', () => {
  assert.deepEqual(policyFormValues(session), {
    room_label: 'EN402',
    latitude: 3.1215,
    longitude: 101.6568,
    radius_m: 75,
    late_minutes: 15,
  });
  assert.deepEqual(policyFormValues(null), {
    room_label: '',
    latitude: '',
    longitude: '',
    radius_m: '',
    late_minutes: '',
  });
  assert.equal(lateMinutesOf({ ...session, late_after: session.starts_at }), 0);
  assert.equal(lateMinutesOf({ ...session, late_after: 'bad' }), '');
});

test('minutes become an exact late time, and back', () => {
  assert.equal(
    lateAfterFrom(session.starts_at, 15),
    '2026-11-20T01:15:00.000Z',
  );
  assert.equal(lateAfterFrom(session.starts_at, 0), session.starts_at);
  assert.equal(
    lateAfterFrom(session.starts_at, '30'),
    '2026-11-20T01:30:00.000Z',
  );
  for (const minutes of [0, 1, 15, 45, 119])
    assert.equal(
      lateMinutesOf({
        ...session,
        late_after: lateAfterFrom(session.starts_at, minutes),
      }),
      minutes,
    );
});

test('the late allowance is at most 30 minutes and before the session ends', () => {
  assert.equal(MAX_LATE_MINUTES, 30);
  // A 120 minute session could allow 119; the app's limit is lower.
  assert.equal(sessionLateLimit(session), 119);
  assert.equal(maxLateMinutes(session), 30);
  // A short session is limited by its own length.
  const short = { ...session, ends_at: '2026-11-20T01:20:00.000Z' };
  assert.equal(maxLateMinutes(short), 19);
  assert.equal(
    maxLateMinutes({ ...session, ends_at: '2026-11-20T01:00:30.000Z' }),
    0,
  );
  assert.equal(maxLateMinutes({ ...session, ends_at: 'bad' }), 0);
  assert.equal(sessionLateLimit({ ...session, ends_at: 'bad' }), 0);
});

test('a late allowance up to the limit is accepted, and no more', () => {
  for (const minutes of [0, 15, 30])
    assert.equal(
      validatePolicy(values({ late_minutes: minutes }), session).valid,
      true,
      String(minutes),
    );
  for (const minutes of [31, 90, 113, 119]) {
    const check = validatePolicy(values({ late_minutes: minutes }), session);
    assert.equal(check.valid, false, String(minutes));
    assert.equal(
      check.errors.late_minutes,
      'Late allowance must be at most 30 minutes.',
    );
    assert.deepEqual(check.payload, {});
  }
});

test('a long late allowance has a message to show while typing', () => {
  assert.equal(
    lateTooLongMessage(31, session),
    'Late allowance must be at most 30 minutes.',
  );
  assert.equal(
    lateTooLongMessage('113', session),
    'Late allowance must be at most 30 minutes.',
  );
  // Nothing to say while the value is fine or not a number yet.
  for (const fine of [0, 15, 30, '', null, undefined, 'abc', -1, 1.5])
    assert.equal(lateTooLongMessage(fine, session), '', String(fine));
  assert.equal(lateTooLongMessage(40, null), '');
  const short = { ...session, ends_at: '2026-11-20T01:20:00.000Z' };
  assert.match(
    lateTooLongMessage(25, short),
    /at most 19 minutes, so the late time is before the session ends/,
  );
  // The saved check and the live message say the same thing.
  assert.equal(
    validatePolicy(values({ late_minutes: 45 }), session).errors.late_minutes,
    lateTooLongMessage(45, session),
  );
});

test('a short session says its own length is the limit', () => {
  const short = { ...session, ends_at: '2026-11-20T01:20:00.000Z' };
  const check = validatePolicy(values({ late_minutes: 25 }), short);
  assert.equal(check.valid, false);
  assert.equal(
    check.errors.late_minutes,
    'Late allowance must be at most 19 minutes, so the late time is before the session ends.',
  );
  assert.equal(validatePolicy(values({ late_minutes: 19 }), short).valid, true);
});

test('valid values become the API body with an exact late time', () => {
  const check = validatePolicy(
    values({ room_label: '  EN305 ', radius_m: '60', late_minutes: '30' }),
    session,
  );
  assert.equal(check.valid, true);
  assert.deepEqual(check.payload, {
    room_label: 'EN305',
    latitude: 3.1215,
    longitude: 101.6568,
    radius_m: 60,
    late_after: '2026-11-20T01:30:00.000Z',
  });
});

test('wrong values show a message under the right field and send nothing', () => {
  const cases = [
    [{ room_label: '' }, 'room_label'],
    [{ room_label: '   ' }, 'room_label'],
    [{ room_label: 'a'.repeat(101) }, 'room_label'],
    [{ latitude: '' }, 'latitude'],
    [{ latitude: 91 }, 'latitude'],
    [{ longitude: '' }, 'longitude'],
    [{ longitude: -181 }, 'longitude'],
    [{ radius_m: '' }, 'radius_m'],
    [{ radius_m: 0 }, 'radius_m'],
    [{ radius_m: 1001 }, 'radius_m'],
    [{ late_minutes: '' }, 'late_minutes'],
    [{ late_minutes: -1 }, 'late_minutes'],
    [{ late_minutes: 1.5 }, 'late_minutes'],
    [{ late_minutes: 'abc' }, 'late_minutes'],
    [{ late_minutes: 999 }, 'late_minutes'],
  ];
  for (const [over, field] of cases) {
    const check = validatePolicy(values(over), session);
    assert.equal(check.valid, false, JSON.stringify(over));
    assert.deepEqual(Object.keys(check.errors), [field], JSON.stringify(over));
    assert.deepEqual(check.payload, {});
  }
  const all = validatePolicy({}, session);
  assert.deepEqual(Object.keys(all.errors).sort(), [
    'late_minutes',
    'latitude',
    'longitude',
    'radius_m',
    'room_label',
  ]);
  // The limits themselves are allowed.
  for (const over of [
    { radius_m: 1 },
    { radius_m: 1000 },
    { latitude: -90 },
    { longitude: 180 },
    { late_minutes: 0 },
  ])
    assert.equal(
      validatePolicy(values(over), session).valid,
      true,
      JSON.stringify(over),
    );
});

test('only the fields that changed are sent', () => {
  const same = validatePolicy(values(), session).payload;
  assert.deepEqual(
    changedPolicyFields(same, session),
    {},
    'text decimals equal the numbers',
  );
  assert.deepEqual(changedPolicyFields({ ...same, radius_m: 50 }, session), {
    radius_m: 50,
  });
  assert.deepEqual(
    changedPolicyFields({ ...same, room_label: 'EN305' }, session),
    { room_label: 'EN305' },
  );
  assert.deepEqual(
    changedPolicyFields(
      { ...same, latitude: 3.1216, longitude: 101.5 },
      session,
    ),
    {
      latitude: 3.1216,
      longitude: 101.5,
    },
  );
  assert.deepEqual(
    changedPolicyFields(
      { ...same, late_after: '2026-11-20T01:30:00.000Z' },
      session,
    ),
    {
      late_after: '2026-11-20T01:30:00.000Z',
    },
  );
});

test('the summary says what students will experience', () => {
  assert.equal(
    policySummary(values(), session),
    'Check-in opens at 09:00 and closes at 11:00. A check-in up to 09:15 is Present, and a later one is Late. Students must be within 75 m of the pin (EN402).',
  );
  assert.match(
    policySummary(values({ late_minutes: 30, radius_m: 50 }), session),
    /up to 09:30.*within 50 m/,
  );
  for (const over of [
    { radius_m: '' },
    { room_label: '' },
    { late_minutes: '' },
    { late_minutes: 500 },
    { late_minutes: -1 },
    { radius_m: 2000 },
  ])
    assert.equal(
      policySummary(values(over), session),
      '',
      JSON.stringify(over),
    );
  assert.equal(policySummary(values(), null), '');
});

test('a session that differs from the class is noticed', () => {
  const classInfo = {
    room_label: 'EN402',
    latitude: '3.121500',
    longitude: '101.656800',
    radius_m: '75.00',
  };
  assert.equal(differsFromClass(values(), classInfo), false);
  assert.equal(
    differsFromClass(values({ room_label: 'EN305' }), classInfo),
    true,
  );
  assert.equal(differsFromClass(values({ latitude: 3.2 }), classInfo), true);
  assert.equal(differsFromClass(values({ longitude: 101.7 }), classInfo), true);
  assert.equal(differsFromClass(values({ radius_m: 80 }), classInfo), true);
  assert.equal(
    differsFromClass(values({ late_minutes: 30 }), classInfo),
    false,
    'the late time is not a class setting',
  );
  assert.equal(differsFromClass(values(), null), false);
});

test('the session picker shows the date and the time window', () => {
  assert.equal(sessionOptionLabel(session), 'Fri, 20 Nov 2026 · 09:00–11:00');
});

test('the service sends a PATCH to the attendance-policy path', async () => {
  const requests = [];
  const api = {
    request: async (path, options) => {
      requests.push([path, options]);
      return { data: session };
    },
  };
  const service = createClassSessionsService({ api });
  assert.deepEqual(await service.updatePolicy(31, { radius_m: 50 }), session);
  assert.deepEqual(requests, [
    [
      '/class-sessions/31/attendance-policy',
      { method: 'PATCH', body: { radius_m: 50 }, signal: undefined },
    ],
  ]);
  for (const bad of [0, 'abc', undefined, 4294967296])
    await assert.rejects(
      service.updatePolicy(bad, {}),
      RangeError,
      String(bad),
    );
  await assert.rejects(
    createClassSessionsService({
      api: { request: async () => ({ data: {} }) },
    }).updatePolicy(31, {}),
    { code: 'INVALID_RESPONSE' },
  );
});

test('the settings route is admin-only', () => {
  const route = courseRoutes.find(
    (item) => item.name === 'admin-class-attendance-settings',
  );
  assert.equal(route.path, 'admin/classes/:classId(\\d+)/attendance-settings');
  assert.deepEqual(route.meta.roles, ['admin']);
});
