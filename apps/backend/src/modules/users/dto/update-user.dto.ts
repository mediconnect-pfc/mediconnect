import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Email invalide').optional(),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères').optional(),
  role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'CAISSIER']).optional(),
  specialty: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
