import { ApiError } from '../../../shared/services/api-client.js';
import { buildAnnouncementsPath } from './announcements-service.js';

export const CLASSES = {
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

export const POSTS = [
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

const notFound = (message) =>
  new ApiError(message, { status: 404, code: 'RESOURCE_NOT_FOUND' });
const AUTHOR = { id: 2, name: 'Lecturer One' };

// In-memory create, edit and delete on the same sample posts as the feed, so a
// new post shows up there. Mock mode blocks live API calls.
export function createMockAnnouncementWriteService() {
  const find = (id) => {
    const found = POSTS.find((item) => item.id === Number(id));
    if (!found) throw notFound('Announcement not found.');
    return found;
  };
  return {
    async get(announcementId) {
      return structuredClone(find(announcementId));
    },
    async create(classId, body) {
      if (!CLASSES[classId]) throw notFound('Class not found.');
      const now = new Date().toISOString();
      const created = {
        id: Math.max(0, ...POSTS.map((item) => item.id)) + 1,
        class_id: Number(classId),
        class: CLASSES[classId],
        ...body,
        author: AUTHOR,
        created_at: now,
        updated_at: now,
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      };
      POSTS.push(created);
      return structuredClone(created);
    },
    async update(announcementId, body) {
      const target = find(announcementId);
      Object.assign(target, body, { updated_at: new Date().toISOString() });
      return structuredClone(target);
    },
    async remove(announcementId) {
      POSTS.splice(POSTS.indexOf(find(announcementId)), 1);
    },
  };
}

const forbiddenError = (message) =>
  new ApiError(message, { status: 403, code: 'FORBIDDEN' });

const comment = (id, authorId, name, role, body, created) => ({
  id,
  body,
  author: { id: authorId, name, role },
  created_at: created,
});

// Sample comments by post. Post 1 has one with HTML in it, to show that the
// page keeps comments as plain text. Post 3 has enough for "Load more".
const COMMENTS = {
  1: [
    comment(
      1,
      21,
      'Student Two',
      'student',
      'Thank you, see you there.',
      '2026-10-20T02:00:00.000Z',
    ),
    comment(
      2,
      2,
      'Lecturer One',
      'lecturer',
      'Please bring your laptop.\nThe lab is open from 8:30.',
      '2026-10-20T03:00:00.000Z',
    ),
    comment(
      3,
      22,
      'Student Three',
      'student',
      '<script>alert("not run")</script> <b>plain text</b>',
      '2026-10-21T01:00:00.000Z',
    ),
  ],
  3: Array.from({ length: 24 }, (_, index) =>
    comment(
      100 + index,
      21 + (index % 3),
      `Student ${index + 2}`,
      'student',
      `Quiz question number ${index + 1}.`,
      `2026-11-10T${String(2 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}:00.000Z`,
    ),
  ),
};

let nextCommentId = 1000;

// In-memory likes, comments and deletes on the same sample posts as the feed.
// `currentUser()` gives { id, name, role } of the person who is signed in, so
// the mock can say who may like, comment and delete, as the server does.
// Mock mode blocks live API calls.
export function createMockAnnouncementEngagementService({
  currentUser = () => ({ id: 2, name: 'Lecturer One', role: 'lecturer' }),
} = {}) {
  const find = (id) => {
    const found = POSTS.find((item) => item.id === Number(id));
    if (!found) throw notFound('Announcement not found.');
    return found;
  };
  const commentsOf = (id) => COMMENTS[id] ?? (COMMENTS[id] = []);
  const view = (item) => {
    const user = currentUser();
    return {
      ...structuredClone(item),
      comment_count: commentsOf(item.id).length,
      liked_by_me: user.role !== 'admin' && item.liked_by_me,
    };
  };
  const withDelete = (item) => {
    const user = currentUser();
    return {
      ...structuredClone(item),
      can_delete:
        user.role === 'admin' ||
        user.role === 'lecturer' ||
        item.author.id === user.id,
    };
  };
  const setLike = (id, liked) => {
    if (currentUser().role === 'admin')
      throw forbiddenError('Admins cannot like announcements.');
    const target = find(id);
    if (target.liked_by_me !== liked) {
      target.liked_by_me = liked;
      target.like_count += liked ? 1 : -1;
    }
    return { liked, like_count: target.like_count };
  };
  return {
    async get(announcementId) {
      return view(find(announcementId));
    },
    async like(announcementId) {
      return setLike(announcementId, true);
    },
    async unlike(announcementId) {
      return setLike(announcementId, false);
    },
    async listComments(announcementId, { page = 1, limit = 20 } = {}) {
      find(announcementId);
      const all = commentsOf(Number(announcementId));
      const start = (Number(page) - 1) * Number(limit);
      return {
        data: all.slice(start, start + Number(limit)).map(withDelete),
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: all.length,
          totalPages: Math.ceil(all.length / Number(limit)),
        },
      };
    },
    async addComment(announcementId, body) {
      const user = currentUser();
      if (user.role === 'admin')
        throw forbiddenError('Admins cannot write comments.');
      find(announcementId);
      const created = comment(
        (nextCommentId += 1),
        user.id,
        user.name ?? 'You',
        user.role,
        body,
        new Date().toISOString(),
      );
      commentsOf(Number(announcementId)).push(created);
      return withDelete(created);
    },
    async deleteComment(commentId) {
      for (const list of Object.values(COMMENTS)) {
        const index = list.findIndex((item) => item.id === Number(commentId));
        if (index === -1) continue;
        if (!withDelete(list[index]).can_delete)
          throw forbiddenError('You cannot delete this comment.');
        list.splice(index, 1);
        return;
      }
      throw notFound('Comment not found.');
    },
    async deletePost(announcementId) {
      if (currentUser().role !== 'admin')
        throw forbiddenError('Only an admin can delete a post here.');
      POSTS.splice(POSTS.indexOf(find(announcementId)), 1);
    },
  };
}
