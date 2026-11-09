import { api } from '../../../app-context';
import {
  createClassManagementService,
  createCoursesService,
  createLecturersService,
} from './course-class-services.js';

// Admin management pages always call the real API, like admin enrolments.
export const coursesService = createCoursesService({ api });
export const lecturersService = createLecturersService({ api });
export const classManagementService = createClassManagementService({ api });
