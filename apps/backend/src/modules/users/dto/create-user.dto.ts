import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
  role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CAISSIER'], { error: 'Rôle invalide' }),
  specialty: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
