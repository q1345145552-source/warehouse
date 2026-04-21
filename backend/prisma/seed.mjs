import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedDefaultPassword = await hash('123456', 12);

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      id: 'warehouse_001',
      code: 'WH-001',
      name: '曼谷海外仓 A',
      countryCode: 'TH',
      cityName: 'Bangkok',
      areaSize: 3200,
      status: 'enabled',
    },
  });

  const warehouseB = await prisma.warehouse.upsert({
    where: { code: 'WH-002' },
    update: {},
    create: {
      id: 'warehouse_002',
      code: 'WH-002',
      name: '清迈海外仓 B',
      countryCode: 'TH',
      cityName: 'Chiang Mai',
      areaSize: 2100,
      status: 'enabled',
    },
  });

  await prisma.warehouseFeature.createMany({
    data: [
      { warehouseId: warehouse.id, featureKey: 'finance', enabled: true },
      { warehouseId: warehouse.id, featureKey: 'kpi', enabled: true },
      { warehouseId: warehouse.id, featureKey: 'demands', enabled: true },
    ],
    skipDuplicates: true,
  });

  await prisma.warehouseFeature.createMany({
    data: [
      { warehouseId: warehouse.id, featureKey: 'inventory', enabled: true },
      { warehouseId: warehouseB.id, featureKey: 'inventory', enabled: true },
    ],
    skipDuplicates: true,
  });

  const demandTypes = [
    {
      typeKey: 'warehouse_request',
      typeName: '仓库需求',
      description: '仓库运营相关协作诉求',
      sortOrder: 10,
    },
    {
      typeKey: 'group_purchase',
      typeName: '拼团需求',
      description: '联合采购与拼团资源诉求',
      sortOrder: 20,
    },
    {
      typeKey: 'staffing',
      typeName: '人员需求',
      description: '招聘、调配与用工支持诉求',
      sortOrder: 30,
    },
    {
      typeKey: 'qualification_auth',
      typeName: '资质认证',
      description: '资质申请、续期与认证支持',
      sortOrder: 40,
    },
    {
      typeKey: 'certificate_processing',
      typeName: '证件办理',
      description: '证照办理、变更与补办支持',
      sortOrder: 50,
    },
  ];

  for (const item of demandTypes) {
    await prisma.demandTypeConfig.upsert({
      where: { typeKey: item.typeKey },
      update: {
        typeName: item.typeName,
        description: item.description,
        sortOrder: item.sortOrder,
        isEnabled: true,
      },
      create: {
        typeKey: item.typeKey,
        typeName: item.typeName,
        description: item.description,
        sortOrder: item.sortOrder,
        isEnabled: true,
      },
    });
  }

  const products = [
    {
      id: 'product_printer_a',
      productName: '工业标签打印机 A1',
      category: '打印设备',
      coverImageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80',
      description: '支持热敏/热转印，适合仓库标签与面单批量打印。',
      price: 3299,
      unit: '台',
      status: 'active',
    },
    {
      id: 'product_pda_a',
      productName: '仓储PDA 扫码终端 X5',
      category: '扫码终端',
      coverImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
      description: '支持一维/二维码扫描，防摔设计，适合入库与拣货作业。',
      price: 2899,
      unit: '台',
      status: 'active',
    },
    {
      id: 'product_shelf_scanner_a',
      productName: '固定式货架扫码器 S2',
      category: '扫码终端',
      coverImageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80',
      description: '适用于流水线与货架口自动识别，提高分拣效率。',
      price: 1999,
      unit: '台',
      status: 'inactive',
    },
  ];

  for (const item of products) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {
        productName: item.productName,
        category: item.category,
        coverImageUrl: item.coverImageUrl,
        description: item.description,
        price: item.price,
        unit: item.unit,
        status: item.status,
      },
      create: {
        id: item.id,
        productName: item.productName,
        category: item.category,
        coverImageUrl: item.coverImageUrl,
        description: item.description,
        price: item.price,
        unit: item.unit,
        status: item.status,
      },
    });
  }

  const inventoryItems = [
    {
      id: 'inventory_product_tail_a',
      warehouseId: warehouse.id,
      inventoryType: 'product',
      title: '客户尾货-蓝牙耳机',
      description: '客户退仓尾货，适合促销清仓。',
      quantity: 120,
      unit: '件',
      status: 'approved',
      rejectionReason: null,
      reviewedAt: new Date(),
    },
    {
      id: 'inventory_equipment_shelf_b',
      warehouseId: warehouseB.id,
      inventoryType: 'equipment',
      title: '闲置货架-重型四层',
      description: '仓库扩容后闲置，成色较新。',
      quantity: 18,
      unit: '组',
      status: 'approved',
      rejectionReason: null,
      reviewedAt: new Date(),
    },
    {
      id: 'inventory_other_wrap_a',
      warehouseId: warehouse.id,
      inventoryType: 'other',
      title: '剩余气泡膜',
      description: '可用于打包易碎品，按卷转让。',
      quantity: 36,
      unit: '卷',
      status: 'submitted',
      rejectionReason: null,
      reviewedAt: null,
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {
        warehouseId: item.warehouseId,
        inventoryType: item.inventoryType,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        status: item.status,
        rejectionReason: item.rejectionReason,
        reviewedAt: item.reviewedAt,
      },
      create: item,
    });
  }

  const rule = await prisma.kpiRule.upsert({
    where: { id: 'kpi_rule_default' },
    update: {},
    create: {
      id: 'kpi_rule_default',
      warehouseId: warehouse.id,
      ruleName: '默认 KPI 规则',
      scopeType: 'warehouse',
    },
  });

  const activeVersion = await prisma.kpiRuleVersion.findFirst({ where: { ruleId: rule.id, isActive: true } });
  const version =
    activeVersion ??
    (await prisma.kpiRuleVersion.create({
      data: {
        ruleId: rule.id,
        versionName: 'v1.0',
        effectiveStartAt: new Date(),
        isActive: true,
      },
    }));

  await prisma.kpiRule.update({ where: { id: rule.id }, data: { currentVersionId: version.id } });

  await prisma.partner.upsert({
    where: { id: 'partner_a' },
    update: {},
    create: {
      id: 'partner_a',
      warehouseId: warehouse.id,
      name: '合伙人A',
      ratio: 0.6,
      status: 'active',
    },
  });

  const financeRule = await prisma.financeAllocationRule.upsert({
    where: { id: 'finance_rule_default' },
    update: {},
    create: {
      id: 'finance_rule_default',
      warehouseId: warehouse.id,
      ruleName: '默认财务分摊规则',
      scopeType: 'warehouse',
    },
  });

  const activeFinanceVersion = await prisma.financeAllocationRuleVersion.findFirst({
    where: { ruleId: financeRule.id, isActive: true },
  });
  const financeVersion =
    activeFinanceVersion ??
    (await prisma.financeAllocationRuleVersion.create({
      data: {
        ruleId: financeRule.id,
        versionName: 'v1.0',
        effectiveStartAt: new Date(),
        isActive: true,
        sharedExpenseRate: 1,
        purchaseCostRate: 1,
      },
    }));

  await prisma.financeAllocationRule.update({
    where: { id: financeRule.id },
    data: { currentVersionId: financeVersion.id },
  });

  await prisma.partner.upsert({
    where: { id: 'partner_b' },
    update: {},
    create: {
      id: 'partner_b',
      warehouseId: warehouse.id,
      name: '合伙人B',
      ratio: 0.4,
      status: 'active',
    },
  });

  await prisma.userAccount.upsert({
    where: { account: 'warehouse_demo' },
    update: {
      password: hashedDefaultPassword,
      role: 'warehouse',
      warehouseId: warehouse.id,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
    create: {
      id: 'user_warehouse_001',
      account: 'warehouse_demo',
      password: hashedDefaultPassword,
      role: 'warehouse',
      warehouseId: warehouse.id,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
  });

  await prisma.userAccount.upsert({
    where: { account: 'warehouse_demo_b' },
    update: {
      password: hashedDefaultPassword,
      role: 'warehouse',
      warehouseId: warehouseB.id,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
    create: {
      id: 'user_warehouse_002',
      account: 'warehouse_demo_b',
      password: hashedDefaultPassword,
      role: 'warehouse',
      warehouseId: warehouseB.id,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
  });

  await prisma.userAccount.upsert({
    where: { account: 'admin_demo' },
    update: {
      password: hashedDefaultPassword,
      role: 'admin',
      warehouseId: null,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
    create: {
      id: 'user_admin_001',
      account: 'admin_demo',
      password: hashedDefaultPassword,
      role: 'admin',
      warehouseId: null,
      status: 'active',
      passwordUpdatedAt: new Date(),
    },
  });

  await prisma.financeAnalysis.create({
    data: {
      warehouseId: warehouse.id,
      analysisType: 'purchase_fluctuation',
      content: '耗材采购成本较上周上涨 12%',
      riskLevel: 'medium',
    },
  });

  await prisma.operationLog.create({
    data: {
      module: 'seed',
      action: 'init',
      operator: 'system',
      payload: JSON.stringify({ warehouseId: warehouse.id }),
    },
  });

  await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_effectiveDate: {
        baseCurrency: 'USD',
        quoteCurrency: 'CNY',
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      rateValue: 7.2,
    },
    create: {
      baseCurrency: 'USD',
      quoteCurrency: 'CNY',
      rateValue: 7.2,
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_effectiveDate: {
        baseCurrency: 'THB',
        quoteCurrency: 'CNY',
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      rateValue: 0.2,
    },
    create: {
      baseCurrency: 'THB',
      quoteCurrency: 'CNY',
      rateValue: 0.2,
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
