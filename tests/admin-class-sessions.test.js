import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_TIME_ZONE,
  addMinutesToInput,
  dateToZonedInput,
  zonedInputToDate,
} from '../src/features/courses/services/zoned-time.js';
import {
  sessionSummary,
  validateSessionForm,
} from '../src/features/courses/services/class-session-validation.js';
import {
  buildSessionsPath,
  createClassSessionsService,
} from '../src/features/courses/services/class-sessions-service.js';
import { formErrorsFrom } from '../src/features/courses/services/form-errors.js';
import courseRoutes from '../src/features/courses/routes.js';
import { ApiError } from '../src/shared/services/api-client.js';

const fakeApi = (respond) => {
  const requests = [];
  return {
    requests,
    request: async (path, options = {}) => {
      requests.push([path, options]);
      return respond(path, options);
    },
  };
};
const NOW = new Date('2026-11-12T00:00:00.000Z');
const session = {
  id: 31,
  class_id: 7,
  room_label: 'EN402',
  starts_at: '2026-11-20T01:00:00.000Z',
  late_after: '2026-11-20T01:15:00.000Z',
  ends_at: '2026-11-20T03:00:00.000Z',
  state: 'scheduled',
  availability: 'upcoming',
  attendance: { present: 0, late: 0, absent: 0, pending: 0 },
};
const valid = {
  starts_at: '2026-11-20T09:00',
  late_after: '2026-11-20T09:15',
  ends_at: '2026-11-20T11:00',
};

test('admin times are read in Kuala Lumpur and converted to UTC', () => {
  assert.equal(ADMIN_TIME_ZONE, 'Asia/Kuala_Lumpur');
  assert.equal(
    zonedInputToDate('2026-11-20T09:00').toISOString(),
    '2026-11-20T01:00:00.000Z',
  );
  // 00:30 in Kuala Lumpur is the evening before in UTC.
  assert.equal(
    zonedInputToDate('2026-11-20T00:30').toISOString(),
    '2026-11-19T16:30:00.000Z',
  );
  assert.equal(
    dateToZonedInput('2026-11-20T01:00:00.000Z'),
    '2026-11-20T09:00',
  );
  assert.equal(
    dateToZonedInput(new Date('2026-11-19T16:30:00.000Z')),
    '2026-11-20T00:30',
  );
  assert.equal(dateToZonedInput('not a date'), '');
});

test('conversion round trips and handles zones with daylight saving', () => {
  for (const text of [
    '2026-01-01T00:00',
    '2026-12-31T23:59',
    '2028-02-29T12:00',
  ]) {
    assert.equal(dateToZonedInput(zonedInputToDate(text)), text);
  }
  const newYork = 'America/New_York';
  assert.equal(
    zonedInputToDate('2026-01-15T09:00', newYork).toISOString(),
    '2026-01-15T14:00:00.000Z',
    'winter: UTC-5',
  );
  assert.equal(
    zonedInputToDate('2026-07-15T09:00', newYork).toISOString(),
    '2026-07-15T13:00:00.000Z',
    'summer: UTC-4',
  );
  assert.equal(
    dateToZonedInput('2026-07-15T13:00:00.000Z', newYork),
    '2026-07-15T09:00',
  );
});

test('text that is not a real date and time is rejected', () => {
  for (const bad of [
    '',
    null,
    undefined,
    '2026-11-20',
    '2026-11-20T9:00',
    '2026-02-31T09:00',
    '2026-13-01T09:00',
    '2026-11-20T24:00',
    '2026-11-20T09:60',
    '2026-11-20T09:00:00Z',
  ])
    assert.equal(zonedInputToDate(bad), null, String(bad));
});

test('late and end times can follow the start time', () => {
  assert.equal(addMinutesToInput('2026-11-20T09:00', 15), '2026-11-20T09:15');
  assert.equal(addMinutesToInput('2026-11-20T23:30', 60), '2026-11-21T00:30');
  assert.equal(addMinutesToInput('', 15), '');
  assert.equal(addMinutesToInput('nope', 15), '');
});

test('valid times become UTC text for the API', () => {
  const check = validateSessionForm(valid, { now: NOW });
  assert.equal(check.valid, true);
  assert.deepEqual(check.payload, {
    starts_at: '2026-11-20T01:00:00.000Z',
    late_after: '2026-11-20T01:15:00.000Z',
    ends_at: '2026-11-20T03:00:00.000Z',
  });
  // A late time equal to the start is allowed.
  assert.equal(
    validateSessionForm({ ...valid, late_after: valid.starts_at }, { now: NOW })
      .valid,
    true,
  );
});

test('wrong times show a message under the right field and send nothing', () => {
  const cases = [
    [{}, ['starts_at', 'late_after', 'ends_at']],
    [{ ...valid, starts_at: 'x' }, ['starts_at']],
    [
      {
        ...valid,
        starts_at: '2026-11-11T09:00',
        late_after: '2026-11-11T09:15',
        ends_at: '2026-11-11T11:00',
      },
      ['starts_at'],
    ],
    [{ ...valid, ends_at: '2026-11-20T09:00' }, ['ends_at']],
    [{ ...valid, ends_at: '2026-11-20T08:00' }, ['ends_at']],
    [{ ...valid, late_after: '2026-11-20T08:59' }, ['late_after']],
    [{ ...valid, late_after: '2026-11-20T11:00' }, ['late_after']],
  ];
  for (const [values, fields] of cases) {
    const check = validateSessionForm(values, { now: NOW });
    assert.equal(check.valid, false, JSON.stringify(values));
    assert.deepEqual(
      Object.keys(check.errors).sort(),
      [...fields].sort(),
      JSON.stringify(values),
    );
    assert.deepEqual(check.payload, {});
  }
  // A start in the past is judged by the clock that is passed in.
  assert.equal(
    validateSessionForm(valid, { now: new Date('2026-11-21T00:00:00Z') }).errors
      .starts_at,
    'The start time must be in the future.',
  );
  assert.equal(
    validateSessionForm(valid, { now: new Date('2026-11-20T01:00:00.000Z') })
      .valid,
    false,
    'a start at this moment is not in the future',
  );
});

test('the summary says what the times mean, and is empty for bad times', () => {
  assert.equal(
    sessionSummary(valid),
    'Check-in opens at 09:00 and closes at 11:00. A check-in up to 09:15 is Present, and a later one is Late.',
  );
  assert.equal(sessionSummary({}), '');
  assert.equal(
    sessionSummary({ ...valid, late_after: '2026-11-20T12:00' }),
    '',
  );
  assert.equal(sessionSummary({ ...valid, ends_at: '2026-11-20T08:00' }), '');
});

test('session paths are built and checked', () => {
  assert.equal(buildSessionsPath(7), '/classes/7/class-sessions');
  assert.equal(
    buildSessionsPath('7', { page: 2, limit: 20, state: 'cancelled' }),
    '/classes/7/class-sessions?page=2&limit=20&state=cancelled',
  );
  for (const bad of [0, 'abc', -1, 4294967296, undefined])
    assert.throws(() => buildSessionsPath(bad), RangeError, String(bad));
  assert.throws(() => buildSessionsPath(7, { state: 'done' }), RangeError);
  assert.throws(() => buildSessionsPath(7, { page: 0 }), RangeError);
  assert.throws(() => buildSessionsPath(7, { limit: 101 }), RangeError);
});

test('the service follows the API contract', async () => {
  const api = fakeApi((path, options) => {
    if (options.method === 'POST') return { data: session };
    return {
      data: [session],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      context: { class: { id: 7 } },
    };
  });
  const service = createClassSessionsService({ api });
  const listed = await service.list(7, { page: 1, limit: 20 });
  assert.equal(listed.data[0].id, 31);
  assert.equal(listed.context.class.id, 7);
  const body = {
    starts_at: session.starts_at,
    late_after: session.late_after,
    ends_at: session.ends_at,
  };
  assert.deepEqual(await service.create(7, body), session);
  assert.deepEqual(await service.cancel(31), session);
  assert.deepEqual(
    api.requests.map(([path, { method = 'GET', body: sent }]) => [
      method,
      path,
      sent,
    ]),
    [
      ['GET', '/classes/7/class-sessions?page=1&limit=20', undefined],
      ['POST', '/classes/7/class-sessions', body],
      ['POST', '/class-sessions/31/cancel', undefined],
    ],
  );
});

test('the service refuses bad IDs and unexpected responses', async () => {
  const api = fakeApi(() => ({ data: {} }));
  const service = createClassSessionsService({ api });
  for (const bad of [0, 'abc', undefined]) {
    await assert.rejects(service.create(bad, {}), RangeError);
    await assert.rejects(service.cancel(bad), RangeError);
  }
  assert.deepEqual(api.requests, []);
  await assert.rejects(service.create(7, {}), { code: 'INVALID_RESPONSE' });
  await assert.rejects(service.cancel(31), { code: 'INVALID_RESPONSE' });
  await assert.rejects(service.list(7), { code: 'INVALID_RESPONSE' });
  const broken = createClassSessionsService({
    api: fakeApi(() => ({ data: [{ id: 1 }], meta: { totalPages: 1 } })),
  });
  await assert.rejects(broken.list(7), { code: 'INVALID_RESPONSE' });
});

test('server errors reach the fields and messages of the form', () => {
  const exists = formErrorsFrom(
    new ApiError('x', { status: 409, code: 'CLASS_SESSION_EXISTS' }),
  );
  assert.ok(exists.fields.starts_at);
  const conflict = formErrorsFrom(
    new ApiError(
      'This time overlaps a scheduled session of the same lecturer.',
      { status: 409, code: 'SCHEDULE_CONFLICT' },
    ),
  );
  assert.match(conflict.message, /same lecturer/, 'the server message is kept');
  const invalid = formErrorsFrom(
    new ApiError('x', {
      status: 422,
      code: 'VALIDATION_ERROR',
      fields: { late_after: 'bad' },
    }),
  );
  assert.equal(invalid.fields.late_after, 'bad');
});

test('the schedule routes are admin-only and keep the existing name', () => {
  const find = (name) => courseRoutes.find((route) => route.name === name);
  assert.equal(
    find('admin-class-schedule').path,
    'admin/classes/:classId(\\d+)/schedule',
  );
  assert.equal(
    find('admin-class-session-new').path,
    'admin/classes/:classId(\\d+)/schedule/new',
  );
  for (const name of ['admin-class-schedule', 'admin-class-session-new'])
    assert.deepEqual(find(name).meta.roles, ['admin'], name);
});
