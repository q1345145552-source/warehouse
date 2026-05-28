import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryConsumableService {
  constructor(private readonly prisma: PrismaService) {}

  async getItems(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const items = await this.prisma.consumableItem.findMany({
      where,
      include: {
        transactions: { orderBy: { transactionDate: 'desc' }, take: 1 },
      },
    });

    const data = items.map((item) => ({
      ...item,
      currentStock: item.transactions?.[0]?.balanceAfter ?? 0,
      currentValue: item.transactions?.[0]?.balanceValue ?? 0,
    }));

    return { success: true, data };
  }

  async getItemHistory(itemId: string) {
    const data = await this.prisma.consumableTransaction.findMany({
      where: { itemId },
      orderBy: { transactionDate: 'desc' },
    });
    return { success: true, data };
  }

  async getMonthlyCost(month: string, warehouseId?: string) {
    const items = warehouseId
      ? await this.prisma.consumableItem.findMany({ where: { warehouseId } })
      : await this.prisma.consumableItem.findMany();
    const itemIds = items.map((i) => i.id);

    const data = itemIds.length > 0
      ? await this.prisma.consumableTransaction.findMany({
          where: { month, type: 'outbound', itemId: { in: itemIds } },
        })
      : [];

    const totalCost = data.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);
    const byItem: Record<string, number> = {};

    for (const item of data) {
      byItem[item.itemId] = (byItem[item.itemId] ?? 0) + Number(item.totalAmount ?? 0);
    }

    return { success: true, data: { month, totalCost, byItem } };
  }

  async saveTransaction(data: {
    itemId: string;
    transactionDate: string;
    type: string;
    quantity: number;
    unitPrice?: number;
    remark?: string;
  }) {
    const date = new Date(data.transactionDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const latest = await this.prisma.consumableTransaction.findFirst({
      where: { itemId: data.itemId },
      orderBy: { transactionDate: 'desc' },
    });

    const currentStock = Number(latest?.balanceAfter ?? 0);
    const currentValue = Number(latest?.balanceValue ?? 0);
    const currentAvgPrice = currentStock > 0 ? currentValue / currentStock : 0;

    let newStock = currentStock;
    let newValue = currentValue;
    let totalAmount = 0;

    if (data.type === 'inbound') {
      newStock = currentStock + data.quantity;
      totalAmount = data.quantity * (data.unitPrice ?? 0);
      newValue = currentValue + totalAmount;
    } else if (data.type === 'outbound') {
      newStock = currentStock - data.quantity;
      totalAmount = data.quantity * currentAvgPrice;
      newValue = currentValue - totalAmount;
    } else if (data.type === 'check') {
      newStock = data.quantity;
      newValue = data.quantity * currentAvgPrice;
    }

    const created = await this.prisma.consumableTransaction.create({
      data: {
        itemId: data.itemId,
        transactionDate: date,
        month,
        type: data.type,
        quantity: data.quantity,
        unitPrice: data.unitPrice ?? currentAvgPrice,
        totalAmount,
        balanceAfter: newStock,
        balanceValue: newValue,
        remark: data.remark,
      },
    });

    return { success: true, data: created };
  }
}
