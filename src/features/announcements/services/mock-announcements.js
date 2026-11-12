import { ApiError } from '../../../shared/services/api-client.js';
import { buildAnnouncementsPath } from './announcements-service.js';

const CLASSES = {
  1: {
    id: 1,
    course: { id: 1, code: 'COS30043', name: 'Interface Design' },
    section: 'A',
    term: '2026-S2',
  },
  2: {
    id: 2,
    course: { id: 2, code: 'COS20007', name: 'Object Oriented Programming' },
    section: 'A',
    term: '2026-S2',
  },
};

const post = (
  id,
  classId,
  category,
  title,
  body,
  created,
  likes,
  comments,
) => ({
  id,
  class_id: classId,
  class: CLASSES[classId],
  category,
  title,
  body,
  author: { id: 2, name: 'Lecturer One' },
  created_at: created,
  updated_at: created,
  like_count: likes,
  comment_count: comments,
  liked_by_me: likes % 2 === 0,
});

const POSTS = [
  post(
    1,
    1,
    'general',
    'Welcome to COS30043',
    'Welcome to section A. Please read the unit outline before the first class.',
    '2026-10-20T01:00:00.000Z',
    6,
    2,
  ),
  post(
    2,
    1,
    'reminder',
    'Check-in reminder',
    'Attendance uses your location. Turn on location access and check in when you arrive.',
    '2026-11-05T01:00:00.000Z',
    3,
    1,
  ),
  post(
    3,
    2,
    'exam',
    'Quiz next week',
    'A short quiz covers weeks 1 to 4 and is worth 20% of your mark.',
    '2026-11-10T01:00:00.000Z',
    9,
    4,
  ),
  {
    ...post(
      4,
      1,
      'class_change',
      'Room change this week',
      'This week we meet in the lab next door.\nCheck-in works in the same way.',
      '2026-11-11T01:00:00.000Z',
      1,
      0,
    ),
    updated_at: '2026-11-11T03:00:00.000Z',
  },
];

// Mirrors the real list: class filter, search, category, sort and paging.
export function createMockAnnouncementsService() {
  return {
    async list(params = {}, { signal } = {}) {
      buildAnnouncementsPath(params);
      if (signal?.aborted)
        throw new DOMException('Request cancelled', 'AbortError');
      const {
        page = 1,
        limit = 20,
        classId = '',
        search = '',
        category = '',
        sort = 'newest',
      } = params;
      if (classId !== '' && !CLASSES[classId])
        throw new ApiError('Class not found.', {
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
        });
      const text = String(search).trim().toLowerCase();
      const rows = POSTS.filter(
        (item) =>
          (classId === '' || item.class_id === Number(classId)) &&
          (!category || item.category === category) &&
          (!text ||
            item.title.toLowerCase().includes(text) ||
            item.body.toLowerCase().includes(text)),
      ).sort((a, b) => {
        const byDate = b.created_at.localeCompare(a.created_at) || b.id - a.id;
        if (sort === 'oldest') return -byDate;
        if (sort === 'most_liked') return b.like_count - a.like_count || byDate;
        return byDate;
      });
      const start = (Number(page) - 1) * Number(limit);
      return {
        data: structuredClone(rows.slice(start, start + Number(limit))),
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: rows.length,
          totalPages: Math.ceil(rows.length / Number(limit)),
        },
      };
    },
  };
}
