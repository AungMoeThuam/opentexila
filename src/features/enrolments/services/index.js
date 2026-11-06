import { api, mockMode } from '../../../app-context';
import { createClassRosterService } from './class-roster-service.js';
import { createMockClassRosterService } from './mock-class-roster.js';
import { createStudentClassesService } from './student-classes-service.js';

export const classRosterService = mockMode
  ? createMockClassRosterService()
  : createClassRosterService({ api });

export const studentClassesService = createStudentClassesService({ api });
