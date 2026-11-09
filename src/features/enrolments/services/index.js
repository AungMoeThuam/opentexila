import { api, mockMode } from '../../../app-context';
import { createClassRosterService } from './class-roster-service.js';
import { createMockClassRosterService } from './mock-class-roster.js';
import { createStudentClassesService } from './student-classes-service.js';
import { createAdminClassesService } from './admin-classes-service.js';
import { createEnrolmentsManagementService } from './enrolments-management-service.js';

export const classRosterService = mockMode
  ? createMockClassRosterService()
  : createClassRosterService({ api });

export const studentClassesService = createStudentClassesService({ api });
import { createMyClassesService } from './my-classes-service.js';
import { createMockMyClassesService } from './mock-my-classes.js';
export const myClassesService = mockMode
  ? createMockMyClassesService()
  : createMyClassesService({ api });

// Admin pages must use real endpoints, even in mock-auth development mode.
export const adminClassesService = createAdminClassesService({ api });
export const adminClassRosterService = createClassRosterService({ api });
export const enrolmentsManagementService = createEnrolmentsManagementService({
  api,
});
