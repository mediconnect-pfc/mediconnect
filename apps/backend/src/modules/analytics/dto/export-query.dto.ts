import { z } from 'zod';

export const exportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format startDate invalide (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format endDate invalide (YYYY-MM-DD)'),
  type: z.enum(['patients', 'appointments', 'revenue', 'campaigns']).optional(),
  title: z.string().max(200).optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
