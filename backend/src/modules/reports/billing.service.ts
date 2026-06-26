import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 对指定客户在指定月份自动生成扣费记录
   * Excel逻辑：客户预充值 → 月末按实际服务消耗扣费
   */
  async autoBillCustomer(
    customerId: string,
    month: string,
    operator?: string,
  ) {
    // 1. 获取该客户当月所有服务收入
    const revenues = await this.prisma.serviceRevenue.findMany({
      where: {
        customerId,
        serviceMonth: month,
        status: 'confirmed',
      },
    });

    if (revenues.length === 0) {
      return { success: false, message: '该客户当月无服务收入记录' };
    }

    // 2. 计算总收入金额
    const totalThb = revenues.reduce((sum, r) => sum + Number(r.amountThb), 0);

    // 3. 获取客户汇率偏好
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) return { success: false, message: '客户不存在' };

    // 4. 获取当前余额
    const latest = await this.prisma.rechargeTransaction.findFirst({
      where: { customerId },
      orderBy: { transactionDate: 'desc' },
    });

    const currentThb = Number(latest?.balanceAfterThb ?? 0);
    const currentCny = Number(latest?.balanceAfterCny ?? 0);

    // 5. 生成扣费记录
    const billingDate = new Date(`${month}-28`); // 月末扣费
    const newBalanceThb = Number((currentThb - totalThb).toFixed(2));
    const newBalanceCny = Number(
      (currentCny - Number((totalThb / Number(customer.exchangeRate ?? 4.5)).toFixed(2))).toFixed(2),
    );

    const services = revenues.map((r) => r.serviceType).join('、');
    const created = await this.prisma.rechargeTransaction.create({
      data: {
        customerId,
        transactionDate: billingDate,
        type: 'billing',
        currency: 'THB',
        amountThb: totalThb,
        amountCny: Number((totalThb / Number(customer.exchangeRate ?? 4.5)).toFixed(2)),
        exchangeRate: customer.exchangeRate ?? 4.5,
        balanceAfterThb: newBalanceThb,
        balanceAfterCny: newBalanceCny,
        remark: `${month} 服务扣费：${services}，共 ${totalThb} THB`,
      },
    });

    // 6. 记录操作日志
    await this.prisma.operationLog.create({
      data: {
        module: 'billing',
        action: 'auto_bill',
        operator: operator ?? 'system',
        payload: JSON.stringify({
          customerId,
          month,
          totalThb,
          billingId: created.id,
        }),
      },
    });

    return {
      success: true,
      message: `已为 ${customer.customerName} 生成 ${month} 扣费记录，金额 ${totalThb} THB`,
      data: created,
    };
  }

  /**
   * 批量对指定月份所有活跃客户执行自动扣费
   */
  async autoBillAllCustomers(warehouseId: string, month: string) {
    const customers = await this.prisma.customer.findMany({
      where: { warehouseId, status: 'active' },
    });

    const results: Array<{ customerId: string; customerName: string; billed: number; success: boolean; message: string }> = [];

    for (const customer of customers) {
      const result = await this.autoBillCustomer(customer.id, month, 'system');
      results.push({
        customerId: customer.id,
        customerName: customer.customerName,
        billed: result.success ? (result.data as any)?.amountThb ?? 0 : 0,
        success: result.success,
        message: result.message ?? '',
      });
    }

    return {
      success: true,
      data: {
        month,
        totalCustomers: customers.length,
        results,
      },
    };
  }
}
