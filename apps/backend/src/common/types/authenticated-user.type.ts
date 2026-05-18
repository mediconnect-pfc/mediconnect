export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  establishmentId: string | null;
  name: string;
}
