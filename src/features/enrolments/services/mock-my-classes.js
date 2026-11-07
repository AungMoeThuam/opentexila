import { CLASSES } from './mock-class-roster.js';
import { buildMyClassesPath } from './my-classes-service.js';
export function createMockMyClassesService() {
  return {
    async list(params = {}, { signal } = {}) {
      buildMyClassesPath(params);
      if (signal?.aborted)
        throw new DOMException('Request cancelled', 'AbortError');
      const { page = 1, limit = 20, courseId, term } = params;
      const rows = Object.values(CLASSES).filter(
        (c) =>
          (!courseId || c.course.id === Number(courseId)) &&
          (!term || c.term === term),
      );
      return {
        data: structuredClone(rows.slice((page - 1) * limit, page * limit)),
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: rows.length,
          totalPages: Math.ceil(rows.length / limit),
        },
      };
    },
  };
}
