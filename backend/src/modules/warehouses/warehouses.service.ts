import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { UpdateWarehouseFeaturesDto } from './dto/update-warehouse-features.dto';
import { UpdateWarehouseStatusDto } from './dto/update-warehouse-status.dto';
import { QueryAdminWarehousesDto } from './dto/query-admin-warehouses.dto';
import { BatchUpdateWarehouseStatusDto } from './dto/batch-update-warehouse-status.dto';
import { BatchUpdateWarehouseFeaturesDto } from './dto/batch-update-warehouse-features.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentWarehouse(user: AuthUser) {
    const where = user.role === 'admin' ? { status: 'enabled' } : { id: user.warehouseId ?? '' };
    const warehouse = await this.prisma.warehouse.findFirst({
      where,
      include: { features: true },
    });

    return { success: true, data: warehouse };
  }

  async updateCurrentWarehouse(dto: UpdateWarehouseDto, user: AuthUser) {
    if (user.role !== 'warehouse' || !user.warehouseId) {
      throw new ForbiddenException('仅仓库端可更新当前仓库资料');
    }

    const current = await this.prisma.warehouse.findUnique({ where: { id: user.warehouseId } });
    if (!current) {
      return { success: false, message: '未找到可更新仓库' };
    }

    const data = {
      name: dto.warehouseName ?? current.name,
      cityName: dto.cityName ?? current.cityName,
      countryCode: dto.countryCode ?? current.countryCode,
      areaSize: dto.areaSize,
    };

    const updated = await this.prisma.warehouse.update({ where: { id: current.id }, data });
    return { success: true, message: '仓库资料已更新', data: updated };
  }

  async getWarehouses(query: QueryAdminWarehousesDto) {
    const where: Prisma.WarehouseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { cityName: { contains: query.keyword, mode: 'insensitive' } },
              { countryCode: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.featureKey
        ? {
            features: {
              some: {
                featureKey: query.featureKey,
                enabled: true,
              },
            },
          }
        : {}),
    };

    const warehouses = await this.prisma.warehouse.findMany({
      where,
      include: { features: true, users: { select: { id: true, account: true, role: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: warehouses };
  }

  async getWarehouseDetail(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        features: true,
        users: { select: { id: true, account: true, role: true, status: true, lastLoginAt: true, lockedUntil: true } },
        projects: { orderBy: { createdAt: 'desc' }, take: 10 },
        records: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return { success: true, data: warehouse };
  }

  async updateWarehouseStatus(warehouseId: string, dto: UpdateWarehouseStatusDto) {
    const updated = await this.prisma.warehouse.update({ where: { id: warehouseId }, data: { status: dto.status } });
    return { success: true, message: `仓库 ${warehouseId} 状态已更新`, data: updated };
  }

  async updateWarehouseFeatures(warehouseId: string, dto: UpdateWarehouseFeaturesDto) {
    await this.prisma.warehouseFeature.deleteMany({ where: { warehouseId } });
    if (dto.items.length > 0) {
      await this.prisma.warehouseFeature.createMany({
        data: dto.items.map((item) => ({
          warehouseId,
          featureKey: item.key,
          enabled: item.enabled,
        })),
      });
    }
    const features = await this.prisma.warehouseFeature.findMany({ where: { warehouseId } });
    return { success: true, message: `仓库 ${warehouseId} 功能已更新`, data: features };
  }

  async batchUpdateWarehouseStatus(dto: BatchUpdateWarehouseStatusDto) {
    const updated = await this.prisma.warehouse.updateMany({
      where: { id: { in: dto.warehouseIds } },
      data: { status: dto.status },
    });
    return {
      success: true,
      message: `已批量更新 ${updated.count} 个仓库状态`,
      data: { count: updated.count, status: dto.status, warehouseIds: dto.warehouseIds },
    };
  }

  async batchUpdateWarehouseFeatures(dto: BatchUpdateWarehouseFeaturesDto) {
    for (const warehouseId of dto.warehouseIds) {
      await this.prisma.warehouseFeature.deleteMany({ where: { warehouseId } });
      if (dto.items.length > 0) {
        await this.prisma.warehouseFeature.createMany({
          data: dto.items.map((item) => ({
            warehouseId,
            featureKey: item.key,
            enabled: item.enabled,
          })),
        });
      }
    }

    return {
      success: true,
      message: `已批量更新 ${dto.warehouseIds.length} 个仓库功能开关`,
      data: { count: dto.warehouseIds.length, warehouseIds: dto.warehouseIds },
    };
  }
}
