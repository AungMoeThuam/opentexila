import { createClassListRequest } from './class-list-request.js';
import { buildAdminClassesPath } from './admin-class-list-query.js';

export function createAdminClassesService({ api }) {
  return {
    list: createClassListRequest({ api, buildPath: buildAdminClassesPath }),
  };
}
