import { api, auth, mockMode } from '../../../app-context';
import { createAnnouncementEngagementService } from './announcement-engagement-service.js';
import { createMockAnnouncementEngagementService } from './mock-announcements.js';

// Mock mode blocks live API calls, so it uses the in-memory sample posts and
// answers as the person who is signed in.
export const announcementEngagementService = mockMode
  ? createMockAnnouncementEngagementService({
      currentUser: () => auth.state.user ?? { id: 0, role: 'student' },
    })
  : createAnnouncementEngagementService({ api });
