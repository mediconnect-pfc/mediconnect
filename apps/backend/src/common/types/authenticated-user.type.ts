import { UserRole } from '@prisma/client';

export type AuthRole = UserRole | 'SUPER_ADMIN';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  establishmentId: string | null;
  name: string;
}
