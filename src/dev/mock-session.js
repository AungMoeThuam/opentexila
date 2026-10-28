const key = 'ot-demo-role';
const users = {
  student: {
    id: 9001,
    name: 'Student Demo',
    email: 'student@example.test',
    role: 'student',
    status: 'active',
  },
  teacher: {
    id: 9002,
    name: 'Lecturer Demo',
    email: 'lecturer@example.test',
    role: 'teacher',
    status: 'active',
  },
  admin: {
    id: 9003,
    name: 'Admin Demo',
    email: 'admin@example.test',
    role: 'admin',
    status: 'active',
  },
};

export function createMockSession(storage = sessionStorage) {
  let role = 'guest';
  try {
    role = storage.getItem(key) ?? 'guest';
  } catch {
    /* Optional tab persistence. */
  }
  const selectRole = (value) => {
    role = Object.hasOwn(users, value) ? value : 'guest';
    try {
      storage.setItem(key, role);
    } catch {
      /* Optional tab persistence. */
    }
  };
  return {
    selectRole,
    async currentUser() {
      return Object.hasOwn(users, role) ? { ...users[role] } : null;
    },
    async login() {
      throw new Error('Use the development role selector in mock mode.');
    },
    async logout() {
      selectRole('guest');
    },
  };
}
