export type UserRole = 'dean' | 'chair' | 'faculty' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  position?: string;
  department?: string;
  signature_url?: string;
  signature_size?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Mock users for demonstration
export const mockUsers = [
  {
    id: '1',
    email: 'dean@university.edu',
    password: 'password123',
    name: 'Dr. John Dean',
    role: 'dean' as UserRole,
    department: 'College of Engineering'
  },
  {
    id: '2',
    email: 'chair@university.edu',
    password: 'password123',
    name: 'Dr. Jane Chair',
    role: 'chair' as UserRole,
    department: 'Computer Science'
  },
  {
    id: '3',
    email: 'faculty@university.edu',
    password: 'password123',
    name: 'Prof. Mike Faculty',
    role: 'faculty' as UserRole,
    department: 'Computer Science'
  },
  {
    id: '4',
    email: 'admin@university.edu',
    password: 'password123',
    name: 'Admin User',
    role: 'admin' as UserRole,
    department: 'Administration'
  }
];

export const rolePermissions = {
  dean: ['view_all', 'approve_reports', 'manage_departments', 'view_statistics'],
  chair: ['view_department', 'submit_reports', 'manage_faculty', 'view_analytics'],
  faculty: ['view_own', 'submit_reports', 'view_schedule'],
  admin: ['manage_users', 'system_settings', 'manage_roles', 'view_logs']
};
