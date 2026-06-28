import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AppointmentStatus, ConfirmationStatus, UserRole } from '@prisma/client'

describe('AppointmentsService', () => {
  const prisma = {
    patient: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }

  const patientPortalService = {
    generatePortalToken: jest.fn(),
  }

  const auditService = {
    logStatusChange: jest.fn(),
    logUpdate: jest.fn(),
  }

  const smsConfirmationService = {
    scheduleConfirmation: jest.fn(),
  }

  const smsReminderService = {
    scheduleReminder: jest.fn(),
    cancelReminder: jest.fn(),
  }

  const callReminderService = {
    scheduleReminder: jest.fn(),
    cancelReminder: jest.fn(),
  }

  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.PATIENT_PORTAL_URL = 'https://portal.mediconnect.ma'
    process.env.FRONTEND_URL = 'https://staff.mediconnect.ma'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createService() {
    return new AppointmentsService(
      prisma as never,
      patientPortalService as never,
      auditService as never,
      smsConfirmationService as never,
      smsReminderService as never,
      callReminderService as never,
    )
  }

  it('builds the patient portal link from PATIENT_PORTAL_URL', async () => {
    const service = createService()

    const link = (service as any).buildPortalLink('portal-token-123')

    expect(link).toBe('https://portal.mediconnect.ma/patient?t=portal-token-123')
  })

  it('falls back to FRONTEND_URL when PATIENT_PORTAL_URL is missing', async () => {
    delete process.env.PATIENT_PORTAL_URL
    const service = createService()

    const link = (service as any).buildPortalLink('portal-token-123')

    expect(link).toBe('https://staff.mediconnect.ma/patient?t=portal-token-123')
  })

  it('creates an appointment response containing the portal link when a token exists', async () => {
    const service = createService()

    prisma.appointment.create.mockResolvedValue({
      id: 'apt-1',
      doctorId: 'doc-1',
      slot: new Date('2026-06-28T10:30:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
      source: 'manual',
      notes: 'test',
      patient: {
        id: 'pat-1',
        firstName: 'Laila',
        lastName: 'Idrissi',
        phone: '+212600000000',
      },
      doctor: { name: 'Dr. Benali' },
      portalToken: 'portal-token-123',
    })
    prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' })
    prisma.user.findFirst.mockResolvedValue({ id: 'doc-1' })
    patientPortalService.generatePortalToken.mockResolvedValue('portal-token-123')

    const result = await service.create(
      'est-1',
      {
        patientId: 'pat-1',
        doctorId: 'doc-1',
        date: '2026-06-28',
        time: '10:30',
        source: 'manual',
      },
      'user-1',
    )

    expect(result.portalLink).toBe('https://portal.mediconnect.ma/patient?t=portal-token-123')
    expect(auditService.logStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CREATED',
        previousStatus: AppointmentStatus.SCHEDULED,
        newStatus: AppointmentStatus.SCHEDULED,
      }),
    )
  })

  it('rejects invalid appointment time', () => {
    const service = createService()

    expect(() => (service as any).parseSlot('2026-06-28', 'invalid')).toThrow(BadRequestException)
  })
})
