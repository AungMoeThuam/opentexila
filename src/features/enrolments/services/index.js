import { api, mockMode } from '../../../app-context';
import { createClassRosterService } from './class-roster-service.js';
import { createMockClassRosterService } from './mock-class-roster.js';

export const classRosterService = mockMode
  ? createMockClassRosterService()
  : createClassRosterService({ api });
