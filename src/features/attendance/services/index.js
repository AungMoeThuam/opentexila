import { api, mockMode } from '../../../app-context';
import { createClassSessionsService } from './class-sessions-service.js';
import { createMockClassSessionsService } from './mock-class-sessions.js';

export const classSessionsService = mockMode
  ? createMockClassSessionsService()
  : createClassSessionsService({ api });
