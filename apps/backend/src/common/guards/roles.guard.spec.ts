import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no @Roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('should allow access when user has a required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN', 'SUPER_ADMIN']);

    const user: AuthenticatedUser = {
      id: '1',
      email: 'admin@test.ma',
      role: 'ADMIN',
      establishmentId: 'est-001',
      name: 'Admin',
    };

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('should support SUPER_ADMIN role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);

    const user: AuthenticatedUser = {
      id: '1',
      email: 'super@test.ma',
      role: 'SUPER_ADMIN',
      establishmentId: null,
      name: 'Super Admin',
    };

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it.each(['DOCTOR', 'RECEPTIONIST', 'CAISSIER'] as const)(
    'should allow access for %s role when required',
    (role) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);

      const user: AuthenticatedUser = {
        id: '1',
        email: `${role}@test.ma`,
        role,
        establishmentId: 'est-001',
        name: role,
      };

      expect(guard.canActivate(createContext(user))).toBe(true);
    },
  );

  it('should throw ForbiddenException when user role is not allowed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const user: AuthenticatedUser = {
      id: '1',
      email: 'doctor@test.ma',
      role: 'DOCTOR',
      establishmentId: 'est-001',
      name: 'Doctor',
    };

    expect(() => guard.canActivate(createContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it('should read roles metadata from ROLES_KEY', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN']);

    guard.canActivate(
      createContext({
        id: '1',
        email: 'admin@test.ma',
        role: 'ADMIN',
        establishmentId: 'est-001',
        name: 'Admin',
      }),
    );

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
