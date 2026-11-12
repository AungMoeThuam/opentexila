import { api, mockMode } from '../../../app-context';
import { createAnnouncementWriteService } from './announcement-write-service.js';
import { createMockAnnouncementWriteService } from './mock-announcements.js';

// Mock mode blocks live API calls, so it uses the in-memory sample posts.
export const announcementWriteService = mockMode
  ? createMockAnnouncementWriteService()
  : createAnnouncementWriteService({ api });
