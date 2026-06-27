import { z } from 'zod';

export const createDossierSchema = z.object({
  patientId: z.string().min(1, 'Patient requis'),
  notes: z.string().optional().nullable(),
  ordonnance: z.string().optional().nullable(),
});

export type CreateDossierInput = z.infer<typeof createDossierSchema>;
