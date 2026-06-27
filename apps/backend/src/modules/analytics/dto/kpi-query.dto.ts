import { z } from 'zod';

export const kpiQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format startDate invalide (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format endDate invalide (YYYY-MM-DD)'),
});

export type KpiQueryInput = z.infer<typeof kpiQuerySchema>;
