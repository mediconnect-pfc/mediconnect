import { CampaignType } from '@prisma/client';

export const CAMPAIGN_QUEUE = 'campaign';
export const CAMPAIGN_JOB_NAME = 'send-campaign-message';

export interface CampaignJobData {
  campaignId: string;
  campaignMessageId: string;
  patientId?: string | null;
  phone: string;
  name?: string | null;
  message: string;
  type: CampaignType;
}
