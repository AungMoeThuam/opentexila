import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PICK_TIME,
  HOURS,
  joinDateTime,
  minuteOptions,
  splitDateTime,
  withDefaultTime,
} from '../src/features/courses/services/date-time-parts.js';
import {
  parseHighlightId,
  scheduleLocation,
  sessionAnchor,
} from '../src/features/courses/services/session-highlight.js';
import { addMinutesToInput } from '../src/features/courses/services/zoned-time.js';

test('there is an hour for every hour of the day, on a 24-hour clock', () => {
  assert.equal(HOURS.length, 24);
  assert.equal(HOURS[0], '00');
  assert.equal(HOURS[9], '09');
  assert.equal(HOURS[23], '23');
});

test('the minutes go in steps of five', () => {
  const minutes = minuteOptions();
  assert.equal(minutes.length, 12);
  assert.deepEqual(minutes.slice(0, 3), ['00', '05', '10']);
  assert.equal(minutes.at(-1), '55');
});

test('a minute that is already set stays in the list, in order', () => {
  const minutes = minuteOptions('07');
  assert.equal(minutes.length, 13);
  assert.deepEqual(minutes.slice(0, 4), ['00', '05', '07', '10']);
  assert.deepEqual(minuteOptions('15'), minuteOptions());
  assert.deepEqual(minuteOptions('abc'), minuteOptions());
  assert.deepEqual(minuteOptions('75'), minuteOptions());
});

test('a value is split into a date, an hour and a minute', () => {
  assert.deepEqual(splitDateTime('2026-11-20T09:05'), {
    date: '2026-11-20',
    hour: '09',
    minute: '05',
  });
  // Seconds, if any, are ignored.
  assert.deepEqual(splitDateTime('2026-11-20T09:05:30'), {
    date: '2026-11-20',
    hour: '09',
    minute: '05',
  });
  for (const bad of ['', null, undefined, 'tomorrow', '2026-11-20', 12])
    assert.deepEqual(splitDateTime(bad), { date: '', hour: '', minute: '' });
});

test('the parts join back into the value the form uses', () => {
  const parts = { date: '2026-11-20', hour: '14', minute: '30' };
  assert.equal(joinDateTime(parts), '2026-11-20T14:30');
  assert.equal(
    joinDateTime(splitDateTime('2026-11-20T00:00')),
    '2026-11-20T00:00',
  );
});

test('the value stays empty until the date, hour and minute are all chosen', () => {
  assert.equal(joinDateTime({ date: '', hour: '09', minute: '00' }), '');
  assert.equal(
    joinDateTime({ date: '2026-11-20', hour: '', minute: '00' }),
    '',
  );
  assert.equal(
    joinDateTime({ date: '2026-11-20', hour: '09', minute: '' }),
    '',
  );
});

test('choosing a date first fills in the default time', () => {
  assert.deepEqual(DEFAULT_PICK_TIME, { hour: '09', minute: '00' });
  assert.deepEqual(
    withDefaultTime({ date: '2026-11-20', hour: '', minute: '' }),
    {
      date: '2026-11-20',
      hour: '09',
      minute: '00',
    },
  );
  // A time that was already chosen is kept.
  assert.deepEqual(
    withDefaultTime({ date: '2026-11-20', hour: '14', minute: '' }),
    { date: '2026-11-20', hour: '14', minute: '00' },
  );
  // Without a date nothing is filled in.
  assert.deepEqual(withDefaultTime({ date: '', hour: '', minute: '' }), {
    date: '',
    hour: '',
    minute: '',
  });
});

test('the late and end times the form fills in can be shown by the field', () => {
  const start = '2026-11-20T09:00';
  for (const minutes of [15, 120]) {
    const value = addMinutesToInput(start, minutes);
    const parts = splitDateTime(value);
    assert.ok(parts.date && parts.hour !== '' && parts.minute !== '', value);
    assert.equal(joinDateTime(parts), value);
    assert.ok(minuteOptions(parts.minute).includes(parts.minute), value);
  }
});

test('the session in the address is read only when it is a valid id', () => {
  assert.equal(parseHighlightId('42'), 42);
  assert.equal(parseHighlightId(['7', '8']), 7);
  assert.equal(parseHighlightId('4294967295'), 4294967295);
  for (const bad of [
    undefined,
    null,
    '',
    '0',
    '-3',
    '1.5',
    '12abc',
    '4294967296',
    '99999999999',
    ' 5',
  ])
    assert.equal(parseHighlightId(bad), null, String(bad));
});

test('the schedule link carries the overlapping session', () => {
  assert.deepEqual(scheduleLocation(3, 42), {
    name: 'admin-class-schedule',
    params: { classId: 3 },
    query: { session: '42' },
  });
  // Without a session it is the plain schedule link.
  assert.deepEqual(scheduleLocation(3), {
    name: 'admin-class-schedule',
    params: { classId: 3 },
  });
  assert.equal(sessionAnchor(42), 'session-42');
});
