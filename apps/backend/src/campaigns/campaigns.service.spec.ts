import { Test, TestingModule } from '@nestjs/testing'
import { CampaignStatus, CampaignType, MessageStatus } from '@prisma/client'
import { CampaignsService } from './campaigns.service'
import { PrismaService } from '../prisma/prisma.service'
import { CAMPAIGN_QUEUE } from './campaign.constants'
import { getQueueToken } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'

describe('CampaignsService', () => {
  const mockPrisma = {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaignMessage: {
      create: jest.fn(),
      count: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  }

  const mockConfig = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  }

  let service: CampaignsService
  let moduleRef: TestingModule

  beforeEach(async () => {
    jest.clearAllMocks()
    mockConfig.get.mockImplementation((_key: string, fallback?: string) => fallback)
    mockPrisma.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops))
    mockPrisma.campaignMessage.create.mockImplementation(async ({ data }: any) => ({
      id: `msg-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
    }))

    moduleRef = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getQueueToken(CAMPAIGN_QUEUE), useValue: mockQueue },
      ],
    }).compile()

    service = moduleRef.get(CampaignsService)
  })

  afterEach(async () => {
    await moduleRef?.close()
  })

  it('creates a campaign with DRAFT status', async () => {
    mockPrisma.campaign.create.mockResolvedValue({
      id: 'camp-1',
      name: 'Campagne test',
      status: CampaignStatus.DRAFT,
    })

    const result = await service.create('est-1', {
      name: 'Campagne test',
      type: CampaignType.SMS,
      message: 'Bonjour',
    })

    expect(result.status).toBe(CampaignStatus.DRAFT)
    expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          establishmentId: 'est-1',
          status: CampaignStatus.DRAFT,
        }),
      }),
    )
  })

  it('launchWithContacts launches with valid contacts', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      status: CampaignStatus.DRAFT,
      type: CampaignType.SMS,
      message: 'Bonjour',
      scheduledAt: null,
    })
    mockPrisma.campaign.update.mockResolvedValue({
      id: 'camp-1',
      status: CampaignStatus.RUNNING,
    })

    const result = await service.launchWithContacts('camp-1', 'est-1', [
      { phone: '+212661234567', name: 'Karima' },
      { phone: '+212672345678', name: 'Mohamed' },
      { phone: '+212683456789', name: 'Salma' },
    ])

    expect(result).toEqual({ status: CampaignStatus.RUNNING, totalContacts: 3 })
    expect(mockQueue.add).toHaveBeenCalledTimes(3)
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ delay: 0 }),
    )
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ delay: 250 }),
    )
  })

  it('rejects campaigns above the configured contact limit', async () => {
    mockConfig.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'CAMPAIGN_MAX_CONTACTS') return '1'
      return fallback
    })
    mockPrisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      status: CampaignStatus.DRAFT,
      type: CampaignType.SMS,
      message: 'Bonjour',
      scheduledAt: null,
    })

    await expect(
      service.launchWithContacts('camp-1', 'est-1', [
        { phone: '+212661234567', name: 'Karima' },
        { phone: '+212672345678', name: 'Mohamed' },
      ]),
    ).rejects.toThrow('Campagne trop volumineuse')
    expect(mockQueue.add).not.toHaveBeenCalled()
  })

  it('launchWithContacts skips contacts without phone', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      status: CampaignStatus.DRAFT,
      type: CampaignType.SMS,
      message: 'Bonjour',
      scheduledAt: null,
    })
    mockPrisma.campaign.update.mockResolvedValue({
      id: 'camp-1',
      status: CampaignStatus.RUNNING,
    })

    const result = await service.launchWithContacts('camp-1', 'est-1', [
      { phone: '' },
      { phone: '+212661234567', name: 'Test' },
    ])

    expect(result.totalContacts).toBe(1)
    expect(mockQueue.add).toHaveBeenCalledTimes(1)
  })

  it('parseCsvContacts returns contacts from a CSV buffer', async () => {
    const result = await service.parseCsvContacts(
      Buffer.from('phone,name\n+212661234567,Karima\n+212672345678,Mohamed'),
    )

    expect(result).toEqual([
      { phone: '+212661234567', name: 'Karima' },
      { phone: '+212672345678', name: 'Mohamed' },
    ])
  })
})
