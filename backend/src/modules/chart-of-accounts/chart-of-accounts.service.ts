import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccounts(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    const data = await this.prisma.chartOfAccounts.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    // 构建树形结构
    const tree = this.buildTree(data);

    return { success: true, data, tree };
  }

  async getAccountTree() {
    const data = await this.prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    const tree = this.buildTree(data);
    return { success: true, data: tree };
  }

  async saveAccount(data: {
    code: string;
    name: string;
    parentId?: string;
    category: string;
    level?: number;
    isLeaf?: boolean;
  }) {
    const existing = await this.prisma.chartOfAccounts.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      const updated = await this.prisma.chartOfAccounts.update({
        where: { code: data.code },
        data: {
          name: data.name,
          parentId: data.parentId,
          category: data.category,
          level: data.level ?? existing.level,
          isLeaf: data.isLeaf ?? existing.isLeaf,
        },
      });
      return { success: true, data: updated };
    }

    const created = await this.prisma.chartOfAccounts.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId,
        category: data.category,
        level: data.level ?? 1,
        isLeaf: data.isLeaf ?? true,
      },
    });
    return { success: true, data: created };
  }

  private buildTree(accounts: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const acc of accounts) {
      map.set(acc.id, { ...acc, children: [] });
    }

    for (const acc of accounts) {
      const node = map.get(acc.id)!;
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
