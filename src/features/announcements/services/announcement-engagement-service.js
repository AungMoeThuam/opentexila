import { ApiError } from '../../../shared/services/api-client.js';
import {
  expectAnnouncement,
  resourceId,
} from './announcement-write-service.js';

const invalid = (what) =>
  new ApiError(`The server returned an unexpected ${what}.`, {
    code: 'INVALID_RESPONSE',
  });

function expectComment(item) {
  if (
    !item ||
    typeof item !== 'object' ||
    !Number.isInteger(item.id) ||
    typeof item.body !== 'string' ||
    typeof item.can_delete !== 'boolean'
  )
    throw invalid('comment');
  return item;
}

function expectLike(payload) {
  const item = payload?.data;
  if (typeof item?.liked !== 'boolean' || !Number.isInteger(item?.like_count))
    throw invalid('like');
  return item;
}

// Likes, comments and deleting, as in backend/docs/api/announcements.md.
// like and unlike resolve to { liked, like_count }. listComments resolves to
// { data, meta }. addComment resolves to the comment. Deletes resolve to nothing.
export function createAnnouncementEngagementService({ api }) {
  return {
    async get(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      return expectAnnouncement(
        await api.request(`/announcements/${id}`, { signal }),
      );
    },
    async like(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      return expectLike(
        await api.request(`/announcements/${id}/like`, {
          method: 'PUT',
          signal,
        }),
      );
    },
    async unlike(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      return expectLike(
        await api.request(`/announcements/${id}/like`, {
          method: 'DELETE',
          signal,
        }),
      );
    },
    async listComments(
      announcementId,
      { page = 1, limit = 20 } = {},
      { signal } = {},
    ) {
      const id = resourceId(announcementId, 'announcementId');
      const query = new URLSearchParams({
        page: String(resourceId(page, 'page')),
        limit: String(resourceId(limit, 'limit')),
      });
      const payload = await api.request(
        `/announcements/${id}/comments?${query}`,
        { signal },
      );
      if (
        !Array.isArray(payload?.data) ||
        !payload?.meta ||
        !Number.isInteger(payload.meta.totalPages)
      )
        throw invalid('comment list');
      payload.data.forEach(expectComment);
      return payload;
    },
    async addComment(announcementId, body, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      const payload = await api.request(`/announcements/${id}/comments`, {
        method: 'POST',
        body: { body },
        signal,
      });
      return expectComment(payload?.data);
    },
    async deleteComment(commentId, { signal } = {}) {
      const id = resourceId(commentId, 'commentId');
      await api.request(`/comments/${id}`, { method: 'DELETE', signal });
    },
    // Only an admin may delete a post from this page (the lecturer deletes
    // own posts on the form page).
    async deletePost(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      await api.request(`/announcements/${id}`, { method: 'DELETE', signal });
    },
  };
}
