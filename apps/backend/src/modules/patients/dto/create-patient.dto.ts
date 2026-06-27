import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'Prenom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().nullable(),
  phone: z.string().regex(/^(?:\+?[1-9]\d{7,14}|0\d{9})$/, 'Telephone invalide'),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['ACTIF', 'PENDING', 'NO_SHOW']).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
