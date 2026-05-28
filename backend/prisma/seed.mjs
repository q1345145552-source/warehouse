import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据...');
  const hashedPassword = await hash('123456', 12);

  // ========== 1. 仓库 ==========
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-BKK' },
    update: {},
    create: {
      id: 'warehouse_bkk',
      code: 'WH-BKK',
      name: '暹联海外仓-曼谷仓',
      countryCode: 'TH',
      cityName: 'Bangkok',
      areaSize: 3200,
      status: 'enabled',
    },
  });
  console.log('✅ 仓库已创建');

  // ========== 2. 用户账号 ==========
  await prisma.userAccount.upsert({
    where: { account: 'warehouse_demo' },
    update: { password: hashedPassword },
    create: { id: 'user_wh', account: 'warehouse_demo', password: hashedPassword, role: 'warehouse', warehouseId: warehouse.id, status: 'active' },
  });
  await prisma.userAccount.upsert({
    where: { account: 'admin_demo' },
    update: { password: hashedPassword },
    create: { id: 'user_admin', account: 'admin_demo', password: hashedPassword, role: 'admin', status: 'active' },
  });
  await prisma.userAccount.upsert({
    where: { account: 'finance_demo' },
    update: { password: hashedPassword },
    create: { id: 'user_finance', account: 'finance_demo', password: hashedPassword, role: 'finance', warehouseId: warehouse.id, status: 'active' },
  });
  console.log('✅ 用户已创建');

  // ========== 3. 科目体系 ==========
  const accounts = [
    { code: '1001', name: '货币资金', category: 'asset', level: 1 },
    { code: '1001001', name: '雄哥银行账户', category: 'asset', level: 2, parentCode: '1001' },
    { code: '1001002', name: '龙哥个人账户', category: 'asset', level: 2, parentCode: '1001' },
    { code: '1122', name: '应收账款', category: 'asset', level: 1 },
    { code: '1122001', name: '房租押金', category: 'asset', level: 2, parentCode: '1122' },
    { code: '1221', name: '其他应收款', category: 'asset', level: 1 },
    { code: '1231', name: '存货', category: 'asset', level: 1 },
    { code: '1231001', name: '耗材库存', category: 'asset', level: 2, parentCode: '1231' },
    { code: '1601', name: '固定资产', category: 'asset', level: 1 },
    { code: '2203', name: '预收账款', category: 'liability', level: 1 },
    { code: '2203001', name: '客户预充值余额', category: 'liability', level: 2, parentCode: '2203' },
    { code: '4001', name: '实收资本', category: 'equity', level: 1 },
    { code: '4001001', name: '投资款-刘雄', category: 'equity', level: 2, parentCode: '4001' },
    { code: '4104', name: '未分配利润', category: 'equity', level: 1 },
    { code: '6001', name: '主营业务收入', category: 'revenue', level: 1 },
    { code: '6001001', name: '仓租费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001002', name: '入库费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001003', name: '出库费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001004', name: '线下发货', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001005', name: '线下运费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001006', name: '挪仓费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001007', name: '贴标', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001008', name: '退货', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001009', name: '包材费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6001010', name: '卸货费', category: 'revenue', level: 2, parentCode: '6001' },
    { code: '6401', name: '主营业务成本', category: 'cost', level: 1 },
    { code: '6401001', name: '耗材成本', category: 'cost', level: 2, parentCode: '6401' },
    { code: '6601', name: '期间费用', category: 'expense', level: 1 },
    { code: '6601001', name: '运输费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601002', name: '卸货费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601003', name: '交通费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601004', name: '职工薪酬', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601005', name: '职工福利费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601006', name: '办公费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601007', name: '网络费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601008', name: '水电费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601009', name: '材料费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601010', name: '加油费', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6601011', name: '房租', category: 'expense', level: 2, parentCode: '6601' },
    { code: '6602', name: '固定资产费用化', category: 'expense', level: 1 },
  ];

  const accountMap = {};
  for (const acc of accounts) {
    const parentId = acc.parentCode ? accountMap[acc.parentCode] : null;
    const created = await prisma.chartOfAccounts.upsert({
      where: { code: acc.code },
      update: { name: acc.name, parentId, category: acc.category, level: acc.level },
      create: { code: acc.code, name: acc.name, parentId, category: acc.category, level: acc.level, isLeaf: acc.level === 2 },
    });
    accountMap[acc.code] = created.id;
  }
  console.log('✅ 科目体系已创建');

  // ========== 4. 汇率 ==========
  await prisma.exchangeRate.upsert({
    where: { baseCurrency_quoteCurrency_effectiveDate: { baseCurrency: 'CNY', quoteCurrency: 'THB', effectiveDate: new Date('2026-01-01') } },
    update: { rateValue: 4.5 },
    create: { baseCurrency: 'CNY', quoteCurrency: 'THB', rateValue: 4.5, effectiveDate: new Date('2026-01-01'), source: 'manual' },
  });
  console.log('✅ 汇率已创建');

  // ========== 5. 客户 ==========
  const customers = [
    { customerId: 'CNOAGX00005', customerName: '蓝鲨', currencyPreference: 'CNY', exchangeRate: 4.5, contactName: '蓝鲨负责人' },
    { customerId: 'CNOAGX00006', customerName: '林江伟', currencyPreference: 'THB', contactName: '林江伟' },
    { customerId: 'xssh', customerName: '李炎', currencyPreference: 'THB', contactName: '李炎' },
    { customerId: 'CNOAGX00008', customerName: '黄子超', currencyPreference: 'CNY', exchangeRate: 4.5, contactName: '黄子超' },
    { customerId: 'bilan', customerName: '比蓝', currencyPreference: 'THB', contactName: '比蓝' },
  ];

  const customerMap = {};
  for (const c of customers) {
    const created = await prisma.customer.upsert({
      where: { customerId: c.customerId },
      update: { customerName: c.customerName },
      create: {
        warehouseId: warehouse.id,
        ...c,
        customerType: 'prepaid',
        status: 'active',
      },
    });
    customerMap[c.customerId] = created.id;
  }
  console.log('✅ 客户已创建');

  // ========== 6. 服务定价 ==========
  const pricings = [
    { customerId: 'CNOAGX00005', serviceType: '出库费', unitPrice: 6.75 },
    { customerId: 'CNOAGX00006', serviceType: '出库费', unitPrice: 10 },
    { customerId: 'xssh', serviceType: '出库费', unitPrice: 10 },
    { customerId: 'bilan', serviceType: '出库费', unitPrice: 9 },
  ];
  for (const p of pricings) {
    await prisma.servicePricing.create({
      data: { customerId: customerMap[p.customerId], ...p, unit: 'THB/单', isActive: true },
    });
  }
  console.log('✅ 服务定价已创建');

  // ========== 7. 银行账户 ==========
  const xiongAccount = await prisma.bankAccount.upsert({
    where: { id: 'bank_xiong' },
    update: {},
    create: { id: 'bank_xiong', warehouseId: warehouse.id, accountName: '雄哥银行账户', accountType: 'owner_xiong' },
  });
  const longAccount = await prisma.bankAccount.upsert({
    where: { id: 'bank_long' },
    update: {},
    create: { id: 'bank_long', warehouseId: warehouse.id, accountName: '龙哥个人账户', accountType: 'partner_long' },
  });
  console.log('✅ 银行账户已创建');

  // ========== 8. 银行流水示例 ==========
  const capitalCatId = accountMap['4001001'];
  const rentCatId = accountMap['6601011'];
  const salaryCatId = accountMap['6601004'];
  const transportCatId = accountMap['6601001'];

  // 雄哥投资款
  await prisma.bankAccountTransaction.create({
    data: {
      bankAccountId: xiongAccount.id,
      transactionDate: new Date('2025-10-05'),
      month: '2025-10',
      categoryId: capitalCatId,
      description: '投资款-初始投入',
      incomeThb: 100000,
      balanceAfterThb: 100000,
    },
  });

  // 龙哥房租支出
  await prisma.bankAccountTransaction.create({
    data: {
      bankAccountId: longAccount.id,
      transactionDate: new Date('2025-10-10'),
      month: '2025-10',
      categoryId: rentCatId,
      description: '10月仓库房租',
      expenseThb: 154000,
      balanceAfterThb: -154000,
    },
  });

  // 雄哥打投资款补龙哥
  await prisma.bankAccountTransaction.create({
    data: {
      bankAccountId: longAccount.id,
      transactionDate: new Date('2025-10-15'),
      month: '2025-10',
      categoryId: capitalCatId,
      description: '投资款-补龙哥账户',
      incomeThb: 154000,
      balanceAfterThb: 0,
    },
  });
  console.log('✅ 银行流水已创建');

  // ========== 9. 客户充值 ==========
  // 蓝鲨充值 5000 CNY
  await prisma.rechargeTransaction.create({
    data: {
      customerId: customerMap['CNOAGX00005'],
      transactionDate: new Date('2025-10-01'),
      type: 'recharge',
      currency: 'CNY',
      amountThb: 22500,
      amountCny: 5000,
      exchangeRate: 4.5,
      balanceAfterThb: 22500,
      balanceAfterCny: 5000,
      remark: '蓝鲨10月充值',
    },
  });

  // 林江伟充值 30000 THB
  await prisma.rechargeTransaction.create({
    data: {
      customerId: customerMap['CNOAGX00006'],
      transactionDate: new Date('2025-10-01'),
      type: 'recharge',
      currency: 'THB',
      amountThb: 30000,
      amountCny: 0,
      balanceAfterThb: 30000,
      balanceAfterCny: 0,
      remark: '林江伟10月充值',
    },
  });
  console.log('✅ 客户充值已创建');

  // ========== 10. 服务收入示例 ==========
  await prisma.serviceRevenue.create({
    data: {
      customerId: customerMap['CNOAGX00005'],
      serviceMonth: '2025-12',
      serviceType: '出库费',
      quantity: 18649,
      unitPrice: 6.75,
      amountThb: 125880.75,
      refOrderId: 'WMS-202512-BLUESHARK',
    },
  });
  await prisma.serviceRevenue.create({
    data: {
      customerId: customerMap['CNOAGX00006'],
      serviceMonth: '2025-12',
      serviceType: '出库费',
      quantity: 8892,
      unitPrice: 10,
      amountThb: 88920,
    },
  });
  await prisma.serviceRevenue.create({
    data: {
      customerId: customerMap['bilan'],
      serviceMonth: '2025-12',
      serviceType: '出库费',
      quantity: 1549,
      unitPrice: 9,
      amountThb: 14011,
    },
  });
  console.log('✅ 服务收入已创建');

  // ========== 11. 耗材 ==========
  const bagItem = await prisma.inventoryItem.create({
    data: { warehouseId: warehouse.id, itemName: '快递袋(中号)', category: 'packaging', unit: '个', defaultPrice: 0.5 },
  });
  const boxItem = await prisma.inventoryItem.create({
    data: { warehouseId: warehouse.id, itemName: '纸箱(标准)', category: 'packaging', unit: '个', defaultPrice: 8 },
  });
  const labelItem = await prisma.inventoryItem.create({
    data: { warehouseId: warehouse.id, itemName: '标签纸', category: 'consumable', unit: '卷', defaultPrice: 25 },
  });

  // 耗材入库
  await prisma.inventoryTransaction.create({
    data: { itemId: bagItem.id, transactionDate: new Date('2025-12-01'), month: '2025-12', type: 'inbound', quantity: 10000, unitPrice: 0.5, totalAmount: 5000, balanceAfter: 10000, balanceValue: 5000 },
  });
  await prisma.inventoryTransaction.create({
    data: { itemId: boxItem.id, transactionDate: new Date('2025-12-01'), month: '2025-12', type: 'inbound', quantity: 500, unitPrice: 8, totalAmount: 4000, balanceAfter: 500, balanceValue: 4000 },
  });
  await prisma.inventoryTransaction.create({
    data: { itemId: labelItem.id, transactionDate: new Date('2025-12-01'), month: '2025-12', type: 'inbound', quantity: 200, unitPrice: 25, totalAmount: 5000, balanceAfter: 200, balanceValue: 5000 },
  });

  // 耗材出库
  await prisma.inventoryTransaction.create({
    data: { itemId: bagItem.id, transactionDate: new Date('2025-12-31'), month: '2025-12', type: 'outbound', quantity: 8000, unitPrice: 0.5, totalAmount: 4000, balanceAfter: 2000, balanceValue: 1000 },
  });
  console.log('✅ 耗材已创建');

  // ========== 12. 固定资产 ==========
  await prisma.fixedAsset.create({
    data: {
      warehouseId: warehouse.id,
      assetName: '空调(5匹)',
      nature: 'purchase',
      purchaseDate: new Date('2025-10-15'),
      purchaseQty: 2,
      unitPrice: 18000,
      purchaseAmount: 36000,
      balanceQty: 2,
      balanceAmount: 36000,
      depreciationMethod: 'immediate',
    },
  });
  await prisma.fixedAsset.create({
    data: {
      warehouseId: warehouse.id,
      assetName: '货架(重型)',
      nature: 'purchase',
      purchaseDate: new Date('2025-10-20'),
      purchaseQty: 10,
      unitPrice: 2308.5,
      purchaseAmount: 23085,
      balanceQty: 10,
      balanceAmount: 23085,
      depreciationMethod: 'immediate',
    },
  });
  console.log('✅ 固定资产已创建');

  console.log('🎉 所有种子数据初始化完成！');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
