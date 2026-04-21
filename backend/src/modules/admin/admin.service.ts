import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAdminLogsDto } from './dto/query-admin-logs.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(query: QueryAdminLogsDto) {
    const page = Number.isFinite(Number(query.page)) ? Math.max(1, Number(query.page)) : 1;
    const pageSize = Number.isFinite(Number(query.pageSize)) ? Math.min(200, Math.max(1, Number(query.pageSize))) : 20;
    const where = this.buildLogWhere(query);

    const [total, data] = await Promise.all([
      this.prisma.operationLog.count({ where }),
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getLogDetail(id: string) {
    const data = await this.prisma.operationLog.findUnique({ where: { id } });
    if (!data) {
      return { success: false, message: '日志不存在' };
    }
    return { success: true, data };
  }

  async exportLogsCsv(query: QueryAdminLogsDto) {
    const where = this.buildLogWhere(query);
    const rows = await this.prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = ['id', 'module', 'action', 'operator', 'payload', 'createdAt'];
    const body = rows.map((row) =>
      [
        row.id,
        row.module,
        row.action,
        row.operator,
        row.payload ?? '',
        row.createdAt.toISOString(),
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...body].join('\n');
    return { success: true, data: { filename: `operation-logs-${Date.now()}.csv`, csv } };
  }

  async getLogOptions(module?: string) {
    const [modules, actions] = await Promise.all([
      this.prisma.operationLog.findMany({
        distinct: ['module'],
        select: { module: true },
        orderBy: { module: 'asc' },
      }),
      this.prisma.operationLog.findMany({
        where: module ? { module } : {},
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        modules: modules.map((item) => item.module),
        actions: actions.map((item) => item.action),
      },
    };
  }

  async getLogsSummary(query: QueryAdminLogsDto) {
    const where = this.buildLogWhere(query);
    const rows = await this.prisma.operationLog.findMany({
      where,
      select: {
        module: true,
        action: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const moduleMap = new Map<string, number>();
    const actionMap = new Map<string, number>();

    for (const row of rows) {
      moduleMap.set(row.module, (moduleMap.get(row.module) ?? 0) + 1);
      const actionKey = `${row.module}::${row.action}`;
      actionMap.set(actionKey, (actionMap.get(actionKey) ?? 0) + 1);
    }

    return {
      success: true,
      data: {
        total: rows.length,
        modules: Array.from(moduleMap.entries())
          .map(([module, count]) => ({ module, count }))
          .sort((a, b) => b.count - a.count),
        actions: Array.from(actionMap.entries())
          .map(([key, count]) => {
            const [module, action] = key.split('::');
            return { module, action, count };
          })
          .sort((a, b) => b.count - a.count),
      },
    };
  }

  async exportLogsSummaryCsv(query: QueryAdminLogsDto) {
    const summary = await this.getLogsSummary(query);
    const moduleRows = summary.data.modules;
    const actionRows = summary.data.actions;

    const moduleHeader = ['module', 'count'];
    const moduleBody = moduleRows.map((item) => [item.module, String(item.count)].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','));

    const actionHeader = ['module', 'action', 'count'];
    const actionBody = actionRows.map((item) =>
      [item.module, item.action, String(item.count)].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','),
    );

    const csv = [
      `"# 审计汇总总数","${summary.data.total}"`,
      '',
      moduleHeader.join(','),
      ...moduleBody,
      '',
      actionHeader.join(','),
      ...actionBody,
    ].join('\n');

    return {
      success: true,
      data: {
        filename: `operation-logs-summary-${Date.now()}.csv`,
        csv,
      },
    };
  }

  async getUsers(query: QueryAdminUsersDto) {
    const where: Prisma.UserAccountWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { account: { contains: query.keyword, mode: 'insensitive' } },
              { warehouse: { name: { contains: query.keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const data = await this.prisma.userAccount.findMany({
      where,
      include: {
        warehouse: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return {
      success: true,
      data: data.map((item) => ({
        id: item.id,
        account: item.account,
        role: item.role,
        status: item.status,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse?.name ?? null,
        failedLoginCount: item.failedLoginCount,
        lockedUntil: item.lockedUntil,
        lastLoginAt: item.lastLoginAt,
        createdAt: item.createdAt,
      })),
    };
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    await this.ensureUserExists(userId);
    const data = await this.prisma.userAccount.update({
      where: { id: userId },
      data: {
        status: dto.status,
        ...(dto.unlockNow
          ? {
              failedLoginCount: 0,
              lockedUntil: null,
            }
          : {}),
      },
    });
    return { success: true, message: '账号状态已更新', data };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    await this.ensureUserExists(userId);
    const data = await this.prisma.userAccount.update({
      where: { id: userId },
      data: {
        role: dto.role,
        warehouseId: dto.role === 'warehouse' ? (dto.warehouseId ?? null) : null,
      },
    });
    return { success: true, message: '账号角色与绑定已更新', data };
  }

  async resetUserPassword(userId: string, dto: ResetUserPasswordDto) {
    await this.ensureUserExists(userId);
    const password = await hash(dto.password, 12);
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    const data = await this.prisma.userAccount.update({
      where: { id: userId },
      data: {
        password,
        passwordUpdatedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    return { success: true, message: '密码已重置，并已使旧会话失效', data: { id: data.id, account: data.account } };
  }

  async confirmProfit(id: string) {
    const data = await this.prisma.profitSnapshot.update({ where: { id }, data: { status: 'confirmed' } });
    await this.prisma.operationLog.create({
      data: {
        module: 'profit_snapshot',
        action: 'confirm',
        operator: 'admin',
        payload: JSON.stringify({ id }),
      },
    });
    return { success: true, message: `利润快照 ${id} 已确认`, data };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.userAccount.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('账号不存在');
    }
    return user;
  }

  private buildLogWhere(query: QueryAdminLogsDto): Prisma.OperationLogWhereInput {
    return {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.operator ? { operator: { contains: query.operator, mode: 'insensitive' } } : {}),
      ...(query.startAt || query.endAt
        ? {
            createdAt: {
              ...(query.startAt ? { gte: new Date(query.startAt) } : {}),
              ...(query.endAt ? { lte: new Date(query.endAt) } : {}),
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { module: { contains: query.keyword, mode: 'insensitive' } },
              { action: { contains: query.keyword, mode: 'insensitive' } },
              { operator: { contains: query.keyword, mode: 'insensitive' } },
              { payload: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.warehouseId ? { payload: { contains: query.warehouseId, mode: 'insensitive' } } : {}),
      ...(query.userId ? { payload: { contains: query.userId, mode: 'insensitive' } } : {}),
    };
  }
}
