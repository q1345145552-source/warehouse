import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const prisma = {
    userAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(jwtService, prisma as never);
  });

  it('密码错误时应累积失败次数', async () => {
    prisma.userAccount.findFirst.mockResolvedValue({
      id: 'u1',
      account: 'warehouse_demo',
      password: '123456',
      role: 'warehouse',
      warehouseId: 'w1',
      failedLoginCount: 2,
      lockedUntil: null,
      status: 'active',
    });

    await expect(
      service.login({
        account: 'warehouse_demo',
        password: 'wrong',
        role: 'warehouse',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.userAccount.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        failedLoginCount: 3,
        lockedUntil: null,
      },
    });
  });

  it('达到阈值后应返回 429 锁定错误', async () => {
    prisma.userAccount.findFirst.mockResolvedValue({
      id: 'u2',
      account: 'warehouse_demo',
      password: '123456',
      role: 'warehouse',
      warehouseId: 'w1',
      failedLoginCount: 0,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      status: 'active',
    });

    await expect(
      service.login({
        account: 'warehouse_demo',
        password: '123456',
        role: 'warehouse',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('refresh token 不匹配时应拒绝续期', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'u3',
      account: 'admin_demo',
      role: 'admin',
      warehouseId: null,
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      tokenHash: 'another_hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'u3',
        account: 'admin_demo',
        role: 'admin',
        warehouseId: null,
        status: 'active',
      },
    });

    await expect(service.refreshToken('refresh_token_not_match')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
