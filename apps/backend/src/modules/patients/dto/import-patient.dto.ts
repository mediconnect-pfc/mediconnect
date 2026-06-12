import { z } from 'zod';

export const csvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  tags: z.string().optional().default(''),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export interface ImportResult {
  total: number;
  imported: number;
  errors: { row: number; message: string }[];
}
