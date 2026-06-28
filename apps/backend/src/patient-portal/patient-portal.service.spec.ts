import { UnauthorizedException } from '@nestjs/common'
import { AppointmentStatus, ConfirmationStatus } from '@prisma/client'
import { PatientPortalService } from './patient-portal.service'

describe('PatientPortalService', () => {
  const prisma = {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
  }

  const auditService = {
    logStatusChange: jest.fn(),
  }

  const smsReminderService = {
    cancelReminder: jest.fn(),
  }

  const callReminderService = {
    cancelReminder: jest.fn(),
  }

  function createService() {
    return new PatientPortalService(
      prisma as never,
      auditService as never,
      smsReminderService as never,
      callReminderService as never,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('confirms an appointment for the matching portal token', async () => {
    const service = createService()

    prisma.appointment.findUnique
      .mockResolvedValueOnce({
        id: 'apt-token',
        patientId: 'pat-1',
        tokenExpiresAt: new Date('2026-06-30T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'apt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        status: AppointmentStatus.SCHEDULED,
        patient: { establishmentId: 'est-1' },
      })
    prisma.appointment.update.mockResolvedValue({
      id: 'apt-1',
      status: AppointmentStatus.CONFIRMED,
      confirmation: ConfirmationStatus.CONFIRMED,
      source: 'portal',
    })

    const result = await service.confirmAppointment('apt-1', 'portal-token')

    expect(result.status).toBe(AppointmentStatus.CONFIRMED)
    expect(result.confirmation).toBe(ConfirmationStatus.CONFIRMED)
    expect(result.source).toBe('portal')
    expect(auditService.logStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPOINTMENT_CONFIRMED',
        previousStatus: AppointmentStatus.SCHEDULED,
        newStatus: AppointmentStatus.CONFIRMED,
      }),
    )
  })

  it('cancels an appointment and clears reminders', async () => {
    const service = createService()

    prisma.appointment.findUnique
      .mockResolvedValueOnce({
        id: 'apt-token',
        patientId: 'pat-1',
        tokenExpiresAt: new Date('2026-06-30T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'apt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        status: AppointmentStatus.SCHEDULED,
        patient: { establishmentId: 'est-1' },
      })
    prisma.appointment.update.mockResolvedValue({
      id: 'apt-1',
      status: AppointmentStatus.CANCELLED,
      confirmation: ConfirmationStatus.CANCELLED,
      source: 'portal',
    })

    const result = await service.cancelAppointment('apt-1', 'portal-token')

    expect(result.status).toBe(AppointmentStatus.CANCELLED)
    expect(result.confirmation).toBe(ConfirmationStatus.CANCELLED)
    expect(smsReminderService.cancelReminder).toHaveBeenCalledWith('apt-1')
    expect(callReminderService.cancelReminder).toHaveBeenCalledWith('apt-1')
  })

  it('rejects a portal token from another patient', async () => {
    const service = createService()

    prisma.appointment.findUnique
      .mockResolvedValueOnce({
        id: 'apt-token',
        patientId: 'pat-1',
        tokenExpiresAt: new Date('2026-06-30T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'apt-2',
        patientId: 'pat-2',
        doctorId: 'doc-1',
        status: AppointmentStatus.SCHEDULED,
        patient: { establishmentId: 'est-1' },
      })

    await expect(service.confirmAppointment('apt-2', 'portal-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})
