import { createClassListRequest } from './class-list-request.js';
import { buildStudentClassesPath } from './student-classes-query.js';

export function createStudentClassesService({ api }) {
  return {
    listEnrolledClasses: createClassListRequest({
      api,
      buildPath: buildStudentClassesPath,
    }),
  };
}
