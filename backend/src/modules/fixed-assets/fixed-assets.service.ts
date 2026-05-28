import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FixedAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssets(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const data = await this.prisma.fixedAsset.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
    });

    return { success: true, data };
  }

  async getMonthlyExpense(month: string, warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const assets = await this.prisma.fixedAsset.findMany({ where });

    let totalExpense = 0;
    const details: Array<{
      id: string;
      assetName: string;
      nature: string;
      amount: number;
      method: string;
    }> = [];

    for (const asset of assets) {
      const purchaseDate = asset.purchaseDate;
      if (!purchaseDate) continue;

      const purchaseMonth = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;

      if (asset.depreciationMethod === 'immediate') {
        // 一次费用化：采购当月计入
        if (purchaseMonth === month) {
          const amount = Number(asset.purchaseAmount);
          totalExpense += amount;
          details.push({
            id: asset.id,
            assetName: asset.assetName,
            nature: asset.nature,
            amount,
            method: '一次费用化',
          });
        }
      } else if (asset.depreciationMethod === 'monthly' && asset.monthlyDepreciation) {
        // 按月折旧
        const usefulLife = asset.usefulLife ?? 12;
        const purchaseTime = purchaseDate.getTime();

        // 检查该月是否在折旧期内
        const [year, mon] = month.split('-').map(Number);
        const monthStart = new Date(year, mon - 1, 1).getTime();
        const monthEnd = new Date(year, mon, 0).getTime();
        const depreciationEnd = purchaseTime + usefulLife * 30 * 24 * 60 * 60 * 1000;

        if (monthStart >= purchaseTime && monthStart <= depreciationEnd) {
          const amount = Number(asset.monthlyDepreciation);
          totalExpense += amount;
          details.push({
            id: asset.id,
            assetName: asset.assetName,
            nature: asset.nature,
            amount,
            method: '按月折旧',
          });
        }
      }
    }

    return { success: true, data: { month, totalExpense, details } };
  }

  async saveAsset(data: {
    warehouseId: string;
    assetName: string;
    assetCode?: string;
    nature: string;
    purchaseDate: string;
    purchaseQty: number;
    unitPrice: number;
    depreciationMethod?: string;
    usefulLife?: number;
    remark?: string;
  }) {
    const purchaseAmount = data.purchaseQty * data.unitPrice;
    const depreciationMethod = data.depreciationMethod ?? 'immediate';

    const created = await this.prisma.fixedAsset.create({
      data: {
        warehouseId: data.warehouseId,
        assetName: data.assetName,
        assetCode: data.assetCode,
        nature: data.nature,
        purchaseDate: new Date(data.purchaseDate),
        purchaseQty: data.purchaseQty,
        unitPrice: data.unitPrice,
        purchaseAmount,
        balanceQty: data.purchaseQty,
        balanceAmount: purchaseAmount,
        depreciationMethod,
        usefulLife: data.usefulLife,
        monthlyDepreciation: depreciationMethod === 'monthly' && data.usefulLife
          ? purchaseAmount / data.usefulLife
          : null,
        remark: data.remark,
      },
    });

    return { success: true, data: created };
  }
}
