import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { MailService } from './mail.service'

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

describe('AuthService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    superAdmin: {
      findUnique: jest.fn(),
    },
    establishment: {
      create: jest.fn(),
    },
    passwordResetToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  }

  const mockConfigService = {
    get: jest.fn(),
  }

  const mockMailService = {
    sendPasswordReset: jest.fn(),
  }

  let service: AuthService
  let moduleRef: TestingModule

  beforeEach(async () => {
    jest.clearAllMocks()

    moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    })
      .compile()

    service = moduleRef.get(AuthService)
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await moduleRef?.close()
  })

  it('login with valid super admin credentials returns token and user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.superAdmin.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Super Admin',
      password: 'hashed',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const result = await service.login({ email: 'admin@example.com', password: 'secret' } as any)

    expect(result).toEqual({
      token: 'mock-token',
      user: {
        id: 'admin-1',
        name: 'Super Admin',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
      },
    })
  })

  it('login with wrong password throws UnauthorizedException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hashed',
      role: 'DOCTOR',
      isActive: true,
    })
    mockPrisma.superAdmin.findUnique.mockResolvedValue(null)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('login with non-existent email throws UnauthorizedException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.superAdmin.findUnique.mockResolvedValue(null)

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('login with inactive user throws UnauthorizedException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hashed',
      role: 'DOCTOR',
      isActive: false,
    })

    await expect(
      service.login({ email: 'user@example.com', password: 'secret' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
