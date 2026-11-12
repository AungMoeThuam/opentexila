import { ApiError } from '../../../shared/services/api-client.js';

// Development-only fixture, hand-written so the edge cases stay controllable:
// an exact-75% student, a tie, a student at risk in two classes, and a student
// whose only record is in the first week (left out of later ranges).
const CLASSES = {
  1: {
    classId: 1,
    course: { code: 'COS30043', name: 'Interface Design and Development' },
    section: 'A',
    term: '2026-S2',
    dates: [
      '2026-09-22',
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
      '2026-11-03',
      '2026-11-10',
    ],
  },
  2: {
    classId: 2,
    course: { code: 'SWE30003', name: 'Software Architectures and Design' },
    section: 'B',
    term: '2026-S2',
    dates: [
      '2026-09-24',
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
      '2026-11-05',
    ],
  },
  3: {
    classId: 3,
    course: { code: 'COS20031', name: 'Computing Technology Inquiry Project' },
    section: 'A',
    term: '2026-S2',
    dates: [
      '2026-09-25',
      '2026-10-02',
      '2026-10-09',
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
    ],
  },
};

// One letter per class session, in date order: P present, L late, A absent,
// - no record (not enrolled yet, or session not counted for this student).
const STUDENTS = [
  { id: 21, name: 'Student Two', patterns: { 1: 'PPAAPAAP', 2: 'AAPAAPA' } },
  { id: 22, name: 'Student Three', patterns: { 1: 'PPPPLPAA', 3: 'PPLAPA' } },
  {
    id: 23,
    name: 'Student Four',
    patterns: { 1: 'PPPPPPPL', 2: 'PLPPLPP', 3: 'PPPPPL' },
  },
  { id: 24, name: 'Student Five', patterns: { 1: 'PAAAPAAA', 2: 'PPAPPAP' } },
  {
    id: 25,
    name: 'Student Six',
    patterns: { 1: 'PAPPAAPP', 2: 'PPPPPPA', 3: 'PPPPPP' },
  },
  { id: 26, name: 'Student Seven', patterns: { 1: 'PPLPPPPA' } },
  { id: 27, name: 'Student Eight', patterns: { 1: 'A-------' } },
  { id: 28, name: 'Student Nine', patterns: { 3: 'PLLPPP' } },
];

const STATUS = { P: 'present', L: 'late', A: 'absent' };
const round1 = (value) => Math.round(value * 10) / 10;
const rateOf = ({ present, late, absent }) =>
  round1(((present + late) / (present + late + absent)) * 100);

const records = STUDENTS.flatMap((student) =>
  Object.entries(student.patterns).flatMap(([classId, pattern]) =>
    [...pattern].flatMap((letter, index) =>
      STATUS[letter]
        ? [
            {
              studentId: student.id,
              name: student.name,
              classId: Number(classId),
              date: CLASSES[classId].dates[index],
              status: STATUS[letter],
            },
          ]
        : [],
    ),
  ),
);

const zeroCounts = () => ({ present: 0, late: 0, absent: 0 });

function classLabelOf(classId) {
  const { course, section } = CLASSES[classId];
  return `${course.code} ${section}`;
}

export function createMockAnalyticsService({ delayMs = 0 } = {}) {
  return {
    async getAttendanceAnalytics(filters, { signal } = {}) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (signal?.aborted) {
        throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      }
      const { classId, from, to, atRiskBelow } = filters;
      if (classId && !CLASSES[classId]) {
        throw new ApiError('This class is not assigned to you.', {
          status: 403,
          code: 'FORBIDDEN',
        });
      }

      const inScope = records.filter(
        (r) =>
          (!classId || r.classId === Number(classId)) &&
          r.date >= from &&
          r.date <= to,
      );

      const summary = zeroCounts();
      const byDate = new Map();
      const byClass = new Map();
      const byStudent = new Map();
      const sessions = new Set();
      for (const r of inScope) {
        summary[r.status] += 1;
        sessions.add(`${r.classId}:${r.date}`);
        for (const [map, key] of [
          [byDate, r.date],
          [byClass, r.classId],
          [byStudent, `${r.studentId}:${r.classId}`],
        ]) {
          if (!map.has(key)) map.set(key, { ...zeroCounts(), r });
          map.get(key)[r.status] += 1;
        }
      }

      const atRisk = [...byStudent.values()]
        .map(({ r, present, late, absent }) => ({
          studentId: r.studentId,
          name: r.name,
          email: `student.${r.name.split(' ')[1].toLowerCase()}@example.com`,
          classId: r.classId,
          sessions: present + late + absent,
          present,
          late,
          absent,
          attendanceRate: rateOf({ present, late, absent }),
        }))
        .filter((row) => row.attendanceRate < atRiskBelow)
        .sort(
          (a, b) =>
            a.attendanceRate - b.attendanceRate ||
            a.name.localeCompare(b.name) ||
            classLabelOf(a.classId).localeCompare(classLabelOf(b.classId)),
        );

      const total = summary.present + summary.late + summary.absent;
      return {
        data: {
          summary: {
            sessions: sessions.size,
            ...summary,
            attendanceRate: total ? rateOf(summary) : 0,
            atRiskCount: atRisk.length,
          },
          trend: [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, c]) => ({
              date,
              present: c.present,
              late: c.late,
              absent: c.absent,
            })),
          byClass: [...byClass.entries()]
            .sort(([a], [b]) => a - b)
            .map(([id, c]) => {
              const { dates: _dates, ...cls } = CLASSES[id];
              return {
                ...cls,
                present: c.present,
                late: c.late,
                absent: c.absent,
                attendanceRate: rateOf(c),
              };
            }),
          atRisk,
        },
        meta: { from, to, atRiskBelow },
      };
    },
  };
}
