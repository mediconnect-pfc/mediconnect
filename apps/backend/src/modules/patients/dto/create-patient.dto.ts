import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().nullable(),
  phone: z.string().min(1, 'Téléphone requis'),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
