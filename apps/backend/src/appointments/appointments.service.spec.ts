import { Test, TestingModule } from '@nestjs/testing'
import { AppointmentsService } from './appointments.service'
import { AppointmentStatus, UserRole } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { PatientPortalService } from '../patient-portal/patient-portal.service'
import { AppointmentsAuditService } from './appointments-audit.service'
import { SmsConfirmationService } from '../notifications/sms-confirmation.service'
import { SmsReminderService } from '../notifications/sms-reminder.service'
import { CallReminderService } from '../notifications/call-reminder.service'

describe('AppointmentsService', () => {
  const mockPrisma = {
    patient: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    appointment: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  }

  const mockPatientPortalService = {
    generatePortalToken: jest.fn(),
  }

  const mockAuditService = {
    logStatusChange: jest.fn(),
    logUpdate: jest.fn(),
  }

  const mockSmsConfirmationService = {
    scheduleConfirmation: jest.fn(),
  }

  const mockSmsReminderService = {
    scheduleReminder: jest.fn(),
    cancelReminder: jest.fn(),
  }

  const mockCallReminderService = {
    scheduleReminder: jest.fn(),
    cancelReminder: jest.fn(),
  }

  const originalEnv = process.env
  let service: AppointmentsService
  let moduleRef: TestingModule

  beforeEach(async () => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.PATIENT_PORTAL_URL = 'https://portal.mediconnect.ma'
    process.env.FRONTEND_URL = 'https://staff.mediconnect.ma'

    moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PatientPortalService, useValue: mockPatientPortalService },
        { provide: AppointmentsAuditService, useValue: mockAuditService },
        { provide: SmsConfirmationService, useValue: mockSmsConfirmationService },
        { provide: SmsReminderService, useValue: mockSmsReminderService },
        { provide: CallReminderService, useValue: mockCallReminderService },
      ],
    }).compile()

    service = moduleRef.get(AppointmentsService)
  })

  afterEach(async () => {
    await moduleRef?.close()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('creates an appointment', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'doc-1' })
    mockPrisma.appointment.create.mockResolvedValue({
      id: 'apt-1',
      doctorId: 'doc-1',
      slot: new Date('2026-06-28T10:30:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
      source: 'manual',
      notes: 'note',
      patient: {
        id: 'pat-1',
        firstName: 'Karima',
        lastName: 'Alaoui',
        phone: '+212661234567',
      },
      doctor: { name: 'Dr. Benali' },
    })
    mockPatientPortalService.generatePortalToken.mockResolvedValue('portal-token-123')

    const result = await service.create(
      'est-1',
      {
        patientId: 'pat-1',
        doctorId: 'doc-1',
        date: '2026-06-28',
        time: '10:30',
        source: 'manual',
      } as any,
      'user-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        id: 'apt-1',
        portalLink: 'https://portal.mediconnect.ma/patient?t=portal-token-123',
      }),
    )
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slot: new Date('2026-06-28T09:30:00.000Z'),
        }),
      }),
    )
    expect(mockSmsReminderService.scheduleReminder).toHaveBeenCalled()
    expect(mockCallReminderService.scheduleReminder).toHaveBeenCalled()
  })

  it('confirms an appointment', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      patientId: 'pat-1',
      status: AppointmentStatus.SCHEDULED,
      patient: { establishmentId: 'est-1' },
    })
    mockPrisma.appointment.update.mockResolvedValue({
      id: 'apt-1',
      patient: {
        id: 'pat-1',
        firstName: 'Karima',
        lastName: 'Alaoui',
        phone: '+212661234567',
      },
      doctor: { name: 'Dr. Benali' },
      status: AppointmentStatus.CONFIRMED,
      source: 'portal',
    })

    const result = await service.confirm('est-1', 'apt-1', 'user-1')

    expect(result.status).toBe(AppointmentStatus.CONFIRMED)
  })

  it('cancels an appointment', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      patientId: 'pat-1',
      status: AppointmentStatus.SCHEDULED,
      patient: { establishmentId: 'est-1' },
    })
    mockPrisma.appointment.update.mockResolvedValue({
      id: 'apt-1',
      patient: {
        id: 'pat-1',
        firstName: 'Karima',
        lastName: 'Alaoui',
        phone: '+212661234567',
      },
      doctor: { name: 'Dr. Benali' },
      status: AppointmentStatus.CANCELLED,
      source: 'portal',
    })

    const result = await service.cancel('est-1', 'apt-1', 'user-1')

    expect(result.status).toBe(AppointmentStatus.CANCELLED)
    expect(mockSmsReminderService.cancelReminder).toHaveBeenCalledWith('apt-1')
    expect(mockCallReminderService.cancelReminder).toHaveBeenCalledWith('apt-1')
  })
})
