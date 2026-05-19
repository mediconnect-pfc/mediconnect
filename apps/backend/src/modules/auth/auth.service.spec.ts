import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    superAdmin: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('signed-token');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should login super admin when email matches', async () => {
      const superAdmin = {
        id: 'sa-1',
        name: 'Super Admin',
        email: dto.email,
        password: 'hashed',
      };
      mockPrisma.superAdmin.findUnique.mockResolvedValue(superAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.user).toEqual({
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'SUPER_ADMIN',
        establishmentId: null,
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw when super admin password is invalid', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue({
        id: 'sa-1',
        email: dto.email,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login regular user when not a super admin', async () => {
      const user = {
        id: 'user-1',
        name: 'Admin',
        email: dto.email,
        password: 'hashed',
        role: 'ADMIN',
        specialty: null,
        isActive: true,
        establishmentId: 'est-001',
        establishment: { id: 'est-001', name: 'Clinic', type: 'CLINIC' },
      };
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.user.establishment).toEqual(user.establishment);
      expect(result.accessToken).toBe('signed-token');
    });

    it('should throw when user is not found', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(
        'Email ou mot de passe incorrect',
      );
    });

    it('should throw when user is inactive', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        password: 'hashed',
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow('Compte désactivé');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens for super admin', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue({
        id: 'sa-1',
        email: 'super@test.ma',
      });

      const result = await service.refreshToken('sa-1', 'SUPER_ADMIN');

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
      expect(mockPrisma.superAdmin.findUnique).toHaveBeenCalledWith({
        where: { id: 'sa-1' },
      });
    });

    it('should refresh tokens for regular user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.ma',
        role: 'DOCTOR',
        establishmentId: 'est-001',
      });

      const result = await service.refreshToken('user-1', 'DOCTOR');

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('should throw when account is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken('missing-id', 'ADMIN'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should sign access and refresh tokens', async () => {
      const result = await service.generateTokens(
        'user-1',
        'user@test.ma',
        'ADMIN',
        'est-001',
      );

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'user@test.ma',
          role: 'ADMIN',
          establishmentId: 'est-001',
        },
        { expiresIn: '15m' },
      );
    });
  });
});
