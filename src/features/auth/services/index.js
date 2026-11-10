import { api } from '../../../app-context';
import { createAdminUsersService } from './admin-users-service.js';

// The admin account page always calls the real API, like the other admin pages.
export const adminUsersService = createAdminUsersService({ api });
