import { api } from '../../../app-context';
import { createTimetableService } from '../../scheduling/services/timetable-service.js';
import { createClassSessionsService } from './class-sessions-service.js';
import {
  createClassManagementService,
  createCoursesService,
  createLecturersService,
} from './course-class-services.js';

// Admin management pages always call the real API, like admin enrolments.
export const coursesService = createCoursesService({ api });
export const lecturersService = createLecturersService({ api });
export const classManagementService = createClassManagementService({ api });
export const classSessionsService = createClassSessionsService({ api });
// Used by the schedule form to warn about clashing sessions.
export const timetableService = createTimetableService({ api });
