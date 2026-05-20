import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  const authenticatedUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@alshifa.ma',
    role: 'ADMIN',
    establishmentId: 'est-001',
    name: 'Admin Al Shifa',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const dto = { email: 'admin@alshifa.ma', password: 'password123' };
      const result = {
        user: authenticatedUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockAuthService.login.mockResolvedValue(result);

      await expect(controller.login(dto)).resolves.toEqual(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getMe', () => {
    it('should return the authenticated user', () => {
      expect(controller.getMe(authenticatedUser)).toEqual(authenticatedUser);
    });
  });

  describe('refresh', () => {
    it('should delegate to authService.refreshToken', async () => {
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshToken.mockResolvedValue(tokens);

      await expect(controller.refresh(authenticatedUser)).resolves.toEqual(
        tokens,
      );
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        authenticatedUser.id,
        authenticatedUser.role,
      );
    });
  });

  describe('role-protected routes', () => {
    it('adminOnly should return super admin message', () => {
      const superAdmin: AuthenticatedUser = {
        ...authenticatedUser,
        role: 'SUPER_ADMIN',
        establishmentId: null,
      };

      expect(controller.adminOnly(superAdmin)).toEqual({
        message: `Bienvenue ${superAdmin.name} — accès Super Admin !`,
      });
    });

    it('staffOnly should return staff message', () => {
      expect(controller.staffOnly(authenticatedUser)).toEqual({
        message: `Bienvenue ${authenticatedUser.name} — accès Staff !`,
      });
    });

    it('clinicalOnly should return clinical message for DOCTOR', () => {
      const doctor: AuthenticatedUser = {
        ...authenticatedUser,
        role: 'DOCTOR',
        email: 'benali@alshifa.ma',
        name: 'Dr. Benali',
      };

      expect(controller.clinicalOnly(doctor)).toEqual({
        message: `Bienvenue ${doctor.name} — accès clinique !`,
      });
    });
  });
});
