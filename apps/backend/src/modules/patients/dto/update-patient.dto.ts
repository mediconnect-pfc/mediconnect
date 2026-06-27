import { z } from 'zod';

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email('Email invalide').optional().nullable(),
  phone: z.string().regex(/^(?:\+?[1-9]\d{7,14}|0\d{9})$/, 'Telephone invalide').optional(),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIF', 'PENDING', 'NO_SHOW']).optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
