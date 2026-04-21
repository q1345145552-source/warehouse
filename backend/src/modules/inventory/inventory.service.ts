import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { QueryAdminInventoryItemsDto } from './dto/query-admin-inventory-items.dto';
import { RejectInventoryItemDto } from './dto/reject-inventory-item.dto';
import { SaveInventoryItemDto } from './dto/save-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getWarehouseInventoryItems(user: AuthUser, inventoryType?: 'product' | 'equipment' | 'other') {
    if (!user.warehouseId) throw new ForbiddenException('仓库账号未绑定仓库');

    const [mine, shared] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: {
          warehouseId: user.warehouseId,
          ...(inventoryType ? { inventoryType } : {}),
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.inventoryItem.findMany({
        where: {
          warehouseId: { not: user.warehouseId },
          status: 'approved',
          ...(inventoryType ? { inventoryType } : {}),
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              account: true,
              role: true,
            },
          },
        },
        orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return { success: true, data: { mine, shared } };
  }

  async createInventoryItem(user: AuthUser, dto: SaveInventoryItemDto) {
    if (!user.warehouseId) throw new ForbiddenException('仓库账号未绑定仓库');
    const data = await this.prisma.inventoryItem.create({
      data: {
        warehouseId: user.warehouseId,
        inventoryType: dto.inventoryType,
        title: dto.title.trim(),
        description: dto.description.trim(),
        quantity: dto.quantity,
        unit: dto.unit?.trim() || null,
        status: 'draft',
      },
    });
    await this.log('inventory', 'create_draft', { itemId: data.id, inventoryType: data.inventoryType, warehouseId: user.warehouseId }, user.account);
    return { success: true, message: '库存条目已创建为草稿', data };
  }

  async updateInventoryItem(user: AuthUser, id: string, dto: SaveInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { success: false, message: '库存条目不存在', code: 'INVENTORY_ITEM_NOT_FOUND' };
    this.ensureWarehouseAccess(user, item.warehouseId);
    if (!['draft', 'rejected'].includes(item.status)) {
      return { success: false, message: '当前状态不允许编辑', code: 'INVENTORY_ITEM_NOT_EDITABLE' };
    }

    const data = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        inventoryType: dto.inventoryType,
        title: dto.title.trim(),
        description: dto.description.trim(),
        quantity: dto.quantity,
        unit: dto.unit?.trim() || null,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });
    await this.log('inventory', 'update', { itemId: data.id, inventoryType: data.inventoryType, warehouseId: item.warehouseId }, user.account);
    return { success: true, message: '库存条目已更新', data };
  }

  async submitInventoryItem(user: AuthUser, id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { success: false, message: '库存条目不存在', code: 'INVENTORY_ITEM_NOT_FOUND' };
    this.ensureWarehouseAccess(user, item.warehouseId);
    if (!['draft', 'rejected'].includes(item.status)) {
      return { success: false, message: '当前状态不允许提交', code: 'INVENTORY_ITEM_NOT_SUBMITTABLE' };
    }

    const data = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: 'submitted',
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });
    await this.log('inventory', 'submit', { itemId: data.id, inventoryType: data.inventoryType, warehouseId: item.warehouseId }, user.account);
    return { success: true, message: '库存条目已提交审核', data };
  }

  async getAdminInventoryItems(query: QueryAdminInventoryItemsDto) {
    const data = await this.prisma.inventoryItem.findMany({
      where: {
        ...(query.inventoryType ? { inventoryType: query.inventoryType } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            account: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    return { success: true, data };
  }

  async approveInventoryItem(admin: AuthUser, id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { success: false, message: '库存条目不存在', code: 'INVENTORY_ITEM_NOT_FOUND' };
    if (item.status !== 'submitted') {
      return { success: false, message: '仅已提交条目可审核通过', code: 'INVENTORY_ITEM_STATUS_INVALID' };
    }

    const data = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: 'approved',
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId: admin.sub,
      },
    });
    await this.log(
      'inventory',
      'approve',
      { itemId: data.id, warehouseId: item.warehouseId, inventoryType: item.inventoryType, reviewerId: admin.sub },
      admin.account,
    );
    return { success: true, message: '库存条目已审核通过', data };
  }

  async rejectInventoryItem(admin: AuthUser, id: string, dto: RejectInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { success: false, message: '库存条目不存在', code: 'INVENTORY_ITEM_NOT_FOUND' };
    if (item.status !== 'submitted') {
      return { success: false, message: '仅已提交条目可驳回', code: 'INVENTORY_ITEM_STATUS_INVALID' };
    }

    const data = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: dto.rejectionReason.trim(),
        reviewedAt: new Date(),
        reviewedByUserId: admin.sub,
      },
    });
    await this.log(
      'inventory',
      'reject',
      {
        itemId: data.id,
        warehouseId: item.warehouseId,
        inventoryType: item.inventoryType,
        reviewerId: admin.sub,
        reason: dto.rejectionReason.trim(),
      },
      admin.account,
    );
    return { success: true, message: '库存条目已驳回', data };
  }

  private ensureWarehouseAccess(user: AuthUser, warehouseId: string) {
    if (user.role === 'admin') return;
    if (!user.warehouseId || user.warehouseId !== warehouseId) {
      throw new ForbiddenException('无权限操作其他仓库库存');
    }
  }

  private async log(module: string, action: string, payload: Record<string, unknown>, operator = 'system') {
    await this.prisma.operationLog.create({
      data: {
        module,
        action,
        operator,
        payload: JSON.stringify(payload),
      },
    });
  }
}
