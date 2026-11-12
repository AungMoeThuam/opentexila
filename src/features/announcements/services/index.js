import { api, mockMode } from '../../../app-context';
import { createAnnouncementsService } from './announcements-service.js';
import { createMockAnnouncementsService } from './mock-announcements.js';

// Mock mode blocks live API calls, so it uses sample posts.
export const announcementsService = mockMode
  ? createMockAnnouncementsService()
  : createAnnouncementsService({ api });
