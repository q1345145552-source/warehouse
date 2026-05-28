import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    userAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // 设置环境变量
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      account: 'testuser',
      password: 'password123',
      role: 'warehouse',
    };

    const mockUser = {
      id: 'user-1',
      account: 'testuser',
      password: '$2a$12$hashedpassword',
      role: 'warehouse',
      warehouseId: 'warehouse-1',
      status: 'active',
      failedLoginCount: 0,
      lockedUntil: null,
    };

    it('应该成功登录', async () => {
      mockPrismaService.userAccount.findFirst.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');
      mockPrismaService.refreshToken.upsert.mockResolvedValue({});
      mockPrismaService.userAccount.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('登录成功');
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
    });

    it('应该在用户不存在时抛出错误', async () => {
      mockPrismaService.userAccount.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('应该在账号被锁定时抛出错误', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 1000000),
      };
      mockPrismaService.userAccount.findFirst.mockResolvedValue(lockedUser);

      await expect(service.login(loginDto)).rejects.toThrow();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      account: 'newuser',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'warehouse',
      phone: '13800138000',
    };

    it('应该成功注册', async () => {
      mockPrismaService.userAccount.findFirst.mockResolvedValue(null);
      mockPrismaService.userAccount.create.mockResolvedValue({
        id: 'new-user',
        ...registerDto,
        warehouseId: null,
      });
      mockJwtService.signAsync.mockResolvedValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('注册成功');
    });

    it('应该在账号已存在时抛出错误', async () => {
      mockPrismaService.userAccount.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('应该在密码不匹配时抛出错误', async () => {
      const invalidDto = {
        ...registerDto,
        confirmPassword: 'different-password',
      };

      await expect(service.register(invalidDto)).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockPayload = {
      sub: 'user-1',
      account: 'testuser',
      role: 'warehouse',
      warehouseId: 'warehouse-1',
    };

    it('应该成功刷新 token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        tokenHash: 'hashed-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
        user: {
          status: 'active',
          role: 'warehouse',
          warehouseId: 'warehouse-1',
        },
      });
      mockJwtService.signAsync.mockResolvedValue('new-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      const result = await service.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
    });

    it('应该在 token 无效时抛出错误', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('应该成功登出', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.logout({ sub: 'user-1' } as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe('退出成功');
    });
  });
});
