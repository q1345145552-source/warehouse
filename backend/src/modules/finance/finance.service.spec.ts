import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const prisma = {
    warehouse: {
      findMany: jest.fn(),
    },
    financeRecord: {
      findMany: jest.fn(),
    },
    financeAllocationRule: {
      findFirst: jest.fn(),
    },
    profitSnapshot: {
      upsert: jest.fn(),
    },
    partnerProfitResult: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    partner: {
      findMany: jest.fn(),
    },
    financeAnalysis: {
      create: jest.fn(),
    },
    operationLog: {
      create: jest.fn(),
    },
  };

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma as never);
  });

  it('重算快照时应应用分摊规则系数', async () => {
    prisma.warehouse.findMany.mockResolvedValue([{ id: 'w1', status: 'enabled' }]);
    prisma.financeAllocationRule.findFirst.mockResolvedValue({
      versions: [
        {
          id: 'rule_v1',
          sharedExpenseRate: 1.2,
          purchaseCostRate: 0.8,
        },
      ],
    });
    prisma.financeRecord.findMany.mockResolvedValue([
      { recordType: 'income', amount: 1000 },
      { recordType: 'expense', amount: 100 },
      { recordType: 'purchase', amount: 50 },
    ]);
    prisma.profitSnapshot.upsert.mockResolvedValue({ id: 's1' });
    prisma.partner.findMany.mockResolvedValue([]);

    const result = await service.recalculateMonthlySnapshots(new Date('2026-04-15T00:00:00.000Z'));

    expect(result.success).toBe(true);
    expect(prisma.profitSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalExpense: 120,
          totalPurchaseCost: 40,
          netProfit: 840,
          appliedRuleVersionId: 'rule_v1',
          appliedSharedExpenseRate: 1.2,
          appliedPurchaseCostRate: 0.8,
        }),
      }),
    );
  });
});
