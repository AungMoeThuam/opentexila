import { api, mockMode } from '../../../app-context';
import { createClassSessionsService } from './class-sessions-service.js';
import { createMockClassSessionsService } from './mock-class-sessions.js';
import { createClassSessionRecordsService } from './class-session-records-service.js';
import { createMockClassSessionRecordsService } from './mock-class-session-records.js';

export const classSessionsService = mockMode
  ? createMockClassSessionsService()
  : createClassSessionsService({ api });

export const classSessionRecordsService = mockMode
  ? createMockClassSessionRecordsService()
  : createClassSessionRecordsService({ api });
