import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveCustomerDto } from './dto/save-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomers(query: QueryCustomersDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user);
    const where: any = { warehouseId };

    if (query.status) where.status = query.status;
    if (query.customerType) where.customerType = query.customerType;
    if (query.keyword) {
      where.OR = [
        { customerId: { contains: query.keyword, mode: 'insensitive' } },
        { customerName: { contains: query.keyword, mode: 'insensitive' } },
        { contactName: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.customer.findMany({
      where,
      include: {
        servicePricings: { where: { isActive: true } },
        _count: { select: { rechargeTransactions: true, serviceRevenues: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data };
  }

  async getCustomerDetail(id: string, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        servicePricings: { where: { isActive: true } },
        rechargeTransactions: { orderBy: { transactionDate: 'desc' }, take: 50 },
        serviceRevenues: { orderBy: { serviceMonth: 'desc' }, take: 100 },
      },
    });

    if (!customer) return { success: false, message: '客户不存在' };
    this.ensureWarehouseAccess(user, customer.warehouseId);

    // 计算余额
    const latestRecharge = await this.prisma.rechargeTransaction.findFirst({
      where: { customerId: id },
      orderBy: { transactionDate: 'desc' },
    });

    return {
      success: true,
      data: {
        ...customer,
        balanceThb: latestRecharge?.balanceAfterThb ?? 0,
        balanceCny: latestRecharge?.balanceAfterCny ?? 0,
      },
    };
  }

  async saveCustomer(dto: SaveCustomerDto, user: AuthUser) {
    const warehouseId = this.resolveWarehouseId(user);

    if (dto.id) {
      const existing = await this.prisma.customer.findUnique({ where: { id: dto.id } });
      if (!existing) return { success: false, message: '客户不存在' };
      this.ensureWarehouseAccess(user, existing.warehouseId);

      const updated = await this.prisma.customer.update({
        where: { id: dto.id },
        data: {
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerType: dto.customerType ?? existing.customerType,
          currencyPreference: dto.currencyPreference ?? existing.currencyPreference,
          exchangeRate: dto.exchangeRate ?? existing.exchangeRate,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          wechatId: dto.wechatId,
        },
      });
      await this.log('customer', 'update', { id: updated.id });
      return { success: true, message: '客户信息已更新', data: updated };
    }

    const existingId = await this.prisma.customer.findFirst({
      where: { warehouseId, customerId: dto.customerId },
    });
    if (existingId) return { success: false, message: '客户编号已存在' };

    const created = await this.prisma.customer.create({
      data: {
        warehouseId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerType: dto.customerType ?? 'prepaid',
        currencyPreference: dto.currencyPreference ?? 'THB',
        exchangeRate: dto.exchangeRate,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        wechatId: dto.wechatId,
      },
    });
    await this.log('customer', 'create', { id: created.id });
    return { success: true, message: '客户已创建', data: created };
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) return { success: false, message: '客户不存在' };
    this.ensureWarehouseAccess(user, customer.warehouseId);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status },
    });
    await this.log('customer', 'update_status', { id, status });
    return { success: true, message: `客户已${status === 'active' ? '启用' : '停用'}`, data: updated };
  }

  private resolveWarehouseId(user: AuthUser) {
    if (user.role === 'admin') return user.warehouseId ?? '';
    return user.warehouseId ?? '';
  }

  private ensureWarehouseAccess(user: AuthUser, warehouseId: string) {
    if (user.role === 'admin') return;
    if (user.warehouseId !== warehouseId) throw new ForbiddenException('无权访问');
  }

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: { module, action, operator: 'system', payload: JSON.stringify(payload) },
    });
  }
}
