import { z } from 'zod';

export const launchCampaignSchema = z.object({});

export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;
