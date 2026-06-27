import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.enum(['SMS', 'VOICE', 'EMERGENCY'], { error: 'Type invalide' }),
  message: z.string().min(1, 'Message requis'),
  segment: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
