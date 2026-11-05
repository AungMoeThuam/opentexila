import { ApiError } from '../../../shared/services/api-client.js';

const LECTURER = { id: 2, name: 'Lecturer Demo' };
const TERM = '2026-S2';

const CLASSES = {
  1: {
    id: 1,
    course: {
      id: 101,
      code: 'COS30043',
      name: 'Interface Design and Development',
    },
    section: 'A',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN402',
  },
  2: {
    id: 2,
    course: {
      id: 102,
      code: 'SWE30003',
      name: 'Software Architectures and Design',
    },
    section: 'B',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN305',
  },
  3: {
    id: 3,
    course: {
      id: 103,
      code: 'COS20031',
      name: 'Computing Technology Inquiry Project',
    },
    section: 'A',
    term: TERM,
    lecturer: LECTURER,
    room_label: 'EN210',
  },
};

const NAMES = [
  'Aina Rahman',
  'Ben Choi',
  'Chloe Lim',
  'Daniel Ong',
  'Elif Demir',
  'Farid Hassan',
  'Grace Tan',
  'Hiro Sato',
  'Isabel Cruz',
  'Jun Park',
  'Kavya Nair',
  'Liam Foster',
  'Mei Ling Wong',
  'Noah Kim',
  'Olivia Brandt',
  'Priya Shah',
  'Quentin Moreau',
  'Ravi Kumar',
  'Sofia Rossi',
  'Tariq Aziz',
  'Uma Patel',
  'Victor Chen',
  'Wei Zhang',
  'Yara Haddad',
  'Zane Mitchell',
];

const STUDENTS = NAMES.map((name, index) => ({
  id: index + 3,
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
}));

// Class 1 spans two pages, class 2 is short, class 3 shows the empty state.
const ROSTER_SIZE = { 1: 25, 2: 3, 3: 0 };

export function createMockClassRosterService() {
  return {
    async listClassRoster(classId, params = {}, { signal } = {}) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled', 'AbortError');
      }

      const cls = Object.hasOwn(CLASSES, classId) ? CLASSES[classId] : null;
      if (!cls) {
        throw new ApiError('This class was not found.', {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 20;
      const all = STUDENTS.slice(0, ROSTER_SIZE[cls.id]).map((student) => ({
        class_id: cls.id,
        student_id: student.id,
        student: { ...student },
      }));
      const total = all.length;
      const start = (page - 1) * limit;

      return {
        data: all.slice(start, start + limit),
        context: { class: structuredClone(cls) },
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },
  };
}
