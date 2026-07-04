import { Test, TestingModule } from '@nestjs/testing'
import { PatientsService } from './patients.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('PatientsService', () => {
  const mockPrisma = {
    patient: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  }

  const originalCrypto = global.crypto
  let service: PatientsService
  let moduleRef: TestingModule

  beforeEach(async () => {
    jest.clearAllMocks()
    ;(global as any).crypto = {
      randomUUID: jest.fn().mockReturnValue('mock-uuid'),
    }

    moduleRef = await Test.createTestingModule({
      providers: [PatientsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = moduleRef.get(PatientsService)
  })

  afterEach(async () => {
    await moduleRef?.close()
    ;(global as any).crypto = originalCrypto
  })

  it('creates a patient with a portal token', async () => {
    mockPrisma.patient.create.mockResolvedValue({
      id: 'pat-1',
      firstName: 'Karima',
      lastName: 'Alaoui',
      portalToken: 'mock-uuid',
    })

    const result = await service.create({
      firstName: 'Karima',
      lastName: 'Alaoui',
      phone: '+212661234567',
      establishmentId: 'est-1',
    })

    expect(result.portalToken).toBe('mock-uuid')
    expect(mockPrisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Karima Alaoui',
          portalToken: 'mock-uuid',
          establishmentId: 'est-1',
        }),
      }),
    )
  })

  it('findAll filters by establishmentId', async () => {
    mockPrisma.patient.findMany.mockResolvedValue([])
    mockPrisma.patient.count.mockResolvedValue(0)

    await service.findAll('est-1', 1, 10)

    expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { establishmentId: 'est-1', deletedAt: null },
      }),
    )
  })

  it('imports a CSV-derived row and creates one patient', async () => {
    mockPrisma.patient.create.mockResolvedValue({
      id: 'pat-1',
      firstName: 'Karima',
      lastName: 'Alaoui',
    })

    const result = await service.import('est-1', [
      { firstName: 'Karima', lastName: 'Alaoui', phone: '+212661234567' },
    ])

    expect(result.imported).toBe(1)
    expect(result.total).toBe(1)
    expect(mockPrisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Karima Alaoui',
        }),
      }),
    )
  })
})
