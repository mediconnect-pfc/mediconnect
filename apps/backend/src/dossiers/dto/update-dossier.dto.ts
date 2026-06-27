import { z } from 'zod';

export const updateDossierSchema = z.object({
  notes: z.string().optional().nullable(),
  ordonnance: z.string().optional().nullable(),
});

export type UpdateDossierInput = z.infer<typeof updateDossierSchema>;
