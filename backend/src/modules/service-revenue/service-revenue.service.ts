import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveServiceRevenueDto } from './dto/save-service-revenue.dto';
import { QueryServiceRevenueDto } from './dto/query-service-revenue.dto';

@Injectable()
export class ServiceRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenues(query: QueryServiceRevenueDto, user: AuthUser) {
    const where: any = {};

    if (query.customerId) where.customerId = query.customerId;
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.serviceMonth) where.serviceMonth = query.serviceMonth;
    if (query.startMonth || query.endMonth) {
      where.serviceMonth = {};
      if (query.startMonth) where.serviceMonth.gte = query.startMonth;
      if (query.endMonth) where.serviceMonth.lte = query.endMonth;
    }

    if (user.role === 'warehouse' && user.warehouseId) {
      where.customer = { warehouseId: user.warehouseId };
    }

    const data = await this.prisma.serviceRevenue.findMany({
      where,
      include: { customer: { select: { customerId: true, customerName: true } } },
      orderBy: [{ serviceMonth: 'desc' }, { serviceType: 'asc' }],
    });

    return { success: true, data };
  }

  async getMonthlySummary(month: string, user: AuthUser) {
    const where: any = { serviceMonth: month };
    if (user.role === 'warehouse' && user.warehouseId) {
      where.customer = { warehouseId: user.warehouseId };
    }

    const data = await this.prisma.serviceRevenue.findMany({
      where,
      include: { customer: { select: { customerId: true, customerName: true } } },
    });

    // 按服务类型汇总
    const byType: Record<string, number> = {};
    // 按客户汇总
    const byCustomer: Record<string, { name: string; total: number; types: Record<string, number> }> = {};

    for (const item of data) {
      const type = item.serviceType;
      const amount = Number(item.amountThb);

      byType[type] = (byType[type] ?? 0) + amount;

      if (!byCustomer[item.customerId]) {
        byCustomer[item.customerId] = {
          name: item.customer.customerName,
          total: 0,
          types: {},
        };
      }
      byCustomer[item.customerId].total += amount;
      byCustomer[item.customerId].types[type] = (byCustomer[item.customerId].types[type] ?? 0) + amount;
    }

    const totalRevenue = Object.values(byType).reduce((sum, v) => sum + v, 0);

    return {
      success: true,
      data: {
        month,
        totalRevenue,
        byType,
        byCustomer,
        details: data,
      },
    };
  }

  async getCustomerMonthlyReport(customerId: string, startMonth?: string, endMonth?: string) {
    const where: any = { customerId };
    if (startMonth || endMonth) {
      where.serviceMonth = {};
      if (startMonth) where.serviceMonth.gte = startMonth;
      if (endMonth) where.serviceMonth.lte = endMonth;
    }

    const data = await this.prisma.serviceRevenue.findMany({
      where,
      orderBy: [{ serviceMonth: 'asc' }, { serviceType: 'asc' }],
    });

    // 按月份分组
    const byMonth: Record<string, { total: number; types: Record<string, { qty: number; price: number; amount: number }> }> = {};

    for (const item of data) {
      if (!byMonth[item.serviceMonth]) {
        byMonth[item.serviceMonth] = { total: 0, types: {} };
      }
      byMonth[item.serviceMonth].types[item.serviceType] = {
        qty: Number(item.quantity),
        price: Number(item.unitPrice),
        amount: Number(item.amountThb),
      };
      byMonth[item.serviceMonth].total += Number(item.amountThb);
    }

    return {
      success: true,
      data: {
        customerId,
        byMonth,
        details: data,
      },
    };
  }

  async saveRevenue(dto: SaveServiceRevenueDto, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) return { success: false, message: '客户不存在' };

    if (user.role === 'warehouse' && user.warehouseId !== customer.warehouseId) {
      throw new ForbiddenException('无权操作');
    }

    const created = await this.prisma.serviceRevenue.create({
      data: {
        customerId: dto.customerId,
        serviceMonth: dto.serviceMonth,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : null,
        serviceType: dto.serviceType,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amountThb: dto.amountThb,
        remark: dto.remark,
        refOrderId: dto.refOrderId,
      },
    });

    await this.log('service_revenue', 'create', { id: created.id });
    return { success: true, message: '服务收入已记录', data: created };
  }

  async deleteRevenue(id: string, user: AuthUser) {
    const record = await this.prisma.serviceRevenue.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!record) return { success: false, message: '记录不存在' };

    if (user.role === 'warehouse' && user.warehouseId !== record.customer.warehouseId) {
      throw new ForbiddenException('无权操作');
    }

    await this.prisma.serviceRevenue.delete({ where: { id } });
    await this.log('service_revenue', 'delete', { id });
    return { success: true, message: '已删除' };
  }

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: { module, action, operator: 'system', payload: JSON.stringify(payload) },
    });
  }
}
