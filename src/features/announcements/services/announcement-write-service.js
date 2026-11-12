import { ApiError } from '../../../shared/services/api-client.js';

const MAX_ID = 4294967295;

export function resourceId(value, name) {
  const raw = typeof value === 'string' ? value.trim() : value;
  const number =
    typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_ID)
    throw new RangeError(`${name} must be an integer from 1 to ${MAX_ID}.`);
  return number;
}

export function expectAnnouncement(payload) {
  const item = payload?.data;
  if (!item || typeof item !== 'object' || !Number.isInteger(item.id))
    throw new ApiError('The server returned an unexpected announcement.', {
      code: 'INVALID_RESPONSE',
    });
  return item;
}

// get, create, update and remove, as in backend/docs/api/announcements.md.
// get, create and update resolve to the announcement object; remove resolves
// to nothing (204).
export function createAnnouncementWriteService({ api }) {
  return {
    async get(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      return expectAnnouncement(
        await api.request(`/announcements/${id}`, { signal }),
      );
    },
    async create(classId, body, { signal } = {}) {
      const id = resourceId(classId, 'classId');
      return expectAnnouncement(
        await api.request(`/classes/${id}/announcements`, {
          method: 'POST',
          body,
          signal,
        }),
      );
    },
    async update(announcementId, body, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      return expectAnnouncement(
        await api.request(`/announcements/${id}`, {
          method: 'PATCH',
          body,
          signal,
        }),
      );
    },
    async remove(announcementId, { signal } = {}) {
      const id = resourceId(announcementId, 'announcementId');
      await api.request(`/announcements/${id}`, { method: 'DELETE', signal });
    },
  };
}
