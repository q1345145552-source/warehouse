import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/auth/roles.decorator';

@Injectable()
export class AuthService {
  private readonly maxLoginFailures = 5;
  private readonly lockDurationMinutes = 15;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.userAccount.findFirst({
      where: {
        account: dto.account,
        role: dto.role,
        status: 'active',
      },
    });

    if (!user) {
      throw new UnauthorizedException('账号、密码或角色不正确');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new HttpException('登录失败次数过多，账号已临时锁定，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    const passwordMatched = await this.verifyPassword(dto.password, user.password);
    if (!passwordMatched) {
      await this.handleLoginFailure(user.id, user.failedLoginCount);
      throw new UnauthorizedException('账号、密码或角色不正确');
    }

    if (user.role === 'warehouse' && !user.warehouseId) {
      throw new UnauthorizedException('仓库账号未绑定仓库，请联系管理员');
    }

    if (!user.password.startsWith('$2')) {
      await this.prisma.userAccount.update({
        where: { id: user.id },
        data: {
          password: await this.hashPassword(dto.password),
          passwordUpdatedAt: new Date(),
        },
      });
    }

    const payload: AuthUser = {
      sub: user.id,
      account: user.account,
      role: this.toUserRole(user.role),
      warehouseId: user.warehouseId,
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);

    await this.prisma.refreshToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.getRefreshExpiresAt(),
      },
      update: {
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.getRefreshExpiresAt(),
        revokedAt: null,
      },
    });

    await this.prisma.userAccount.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      success: true,
      message: '登录成功',
      data: {
        accessToken,
        refreshToken,
        role: user.role,
        warehouseId: user.warehouseId,
        account: user.account,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: AuthUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
      });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { userId: payload.sub },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.tokenHash !== this.hashToken(refreshToken) ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('刷新令牌已失效');
    }

    if (tokenRecord.user.status !== 'active') {
      throw new UnauthorizedException('账号已禁用');
    }

    const role = this.toUserRole(tokenRecord.user.role);
    if (role === 'warehouse' && !tokenRecord.user.warehouseId) {
      throw new UnauthorizedException('仓库账号未绑定仓库，请联系管理员');
    }

    const nextPayload: AuthUser = {
      sub: tokenRecord.user.id,
      account: tokenRecord.user.account,
      role,
      warehouseId: tokenRecord.user.warehouseId,
    };

    const accessToken = await this.signAccessToken(nextPayload);
    const nextRefreshToken = await this.signRefreshToken(nextPayload);

    await this.prisma.refreshToken.update({
      where: { userId: tokenRecord.user.id },
      data: {
        tokenHash: this.hashToken(nextRefreshToken),
        expiresAt: this.getRefreshExpiresAt(),
        revokedAt: null,
      },
    });

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: nextRefreshToken,
      },
    };
  }

  async logout(user: AuthUser | null) {
    if (user) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.sub },
        data: {
          revokedAt: new Date(),
        },
      });
    }
    return { success: true, message: '退出成功' };
  }

  async me(user: AuthUser | null) {
    if (!user) {
      throw new UnauthorizedException('未登录');
    }

    const dbUser = await this.prisma.userAccount.findUnique({
      where: { id: user.sub },
    });

    if (!dbUser || dbUser.status !== 'active') {
      throw new UnauthorizedException('账号不存在或已禁用');
    }

    const role = this.toUserRole(dbUser.role);

    return {
      success: true,
      data: {
        id: dbUser.id,
        account: dbUser.account,
        role,
        warehouseId: dbUser.warehouseId,
      },
    };
  }

  private toUserRole(role: string): UserRole {
    if (role === 'admin' || role === 'warehouse') {
      return role;
    }
    throw new UnauthorizedException('账号角色不合法');
  }

  private async signAccessToken(payload: AuthUser) {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
      expiresIn: '15m',
    });
  }

  private async signRefreshToken(payload: AuthUser) {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
      expiresIn: '7d',
    });
  }

  private getRefreshExpiresAt() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private async verifyPassword(input: string, saved: string) {
    if (!saved.startsWith('$2')) {
      return input === saved;
    }
    return compare(input, saved);
  }

  private async hashPassword(password: string) {
    return hash(password, 12);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async handleLoginFailure(userId: string, failedCount: number) {
    const nextCount = failedCount + 1;
    const lockAt = nextCount >= this.maxLoginFailures ? this.getLockUntilAt() : null;
    await this.prisma.userAccount.update({
      where: { id: userId },
      data: {
        failedLoginCount: nextCount >= this.maxLoginFailures ? 0 : nextCount,
        lockedUntil: lockAt,
      },
    });
  }

  private getLockUntilAt() {
    return new Date(Date.now() + this.lockDurationMinutes * 60 * 1000);
  }
}
