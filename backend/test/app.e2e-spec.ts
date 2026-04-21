import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AdminService } from './../src/modules/admin/admin.service';
import { AuthService } from './../src/modules/auth/auth.service';
import { FinanceService } from './../src/modules/finance/finance.service';
import { InventoryService } from './../src/modules/inventory/inventory.service';
import { ProductsService } from './../src/modules/products/products.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const adminToken = new JwtService({}).sign(
    {
      sub: 'user_admin_001',
      account: 'admin_demo',
      role: 'admin',
      warehouseId: null,
    },
    { secret: 'dev_access_secret' },
  );
  const warehouseToken = new JwtService({}).sign(
    {
      sub: 'user_warehouse_001',
      account: 'warehouse_demo',
      role: 'warehouse',
      warehouseId: 'warehouse_001',
    },
    { secret: 'dev_access_secret' },
  );
  const adminServiceMock = {
    getLogs: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'log_1',
          module: 'finance_record',
          action: 'approve',
          operator: 'admin',
          payload: '{"id":"r1"}',
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 },
    }),
    getLogDetail: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'log_1',
        module: 'finance_record',
        action: 'approve',
        operator: 'admin',
        payload: '{"id":"r1"}',
        createdAt: new Date().toISOString(),
      },
    }),
    getLogsSummary: jest.fn().mockResolvedValue({
      success: true,
      data: {
        total: 3,
        modules: [{ module: 'finance_record', count: 2 }],
        actions: [{ module: 'finance_record', action: 'approve', count: 2 }],
      },
    }),
    exportLogsSummaryCsv: jest.fn().mockResolvedValue({
      success: true,
      data: {
        filename: 'operation-logs-summary-test.csv',
        csv: 'module,count\nfinance_record,2',
      },
    }),
  };
  const authServiceMock = {
    login: jest.fn().mockResolvedValue({
      success: true,
      message: '登录成功',
      data: {
        accessToken: 'access_mock',
        refreshToken: 'refresh_mock',
        role: 'admin',
        warehouseId: null,
        account: 'admin_demo',
      },
    }),
    refreshToken: jest.fn().mockResolvedValue({
      success: true,
      data: {
        accessToken: 'access_mock_next',
        refreshToken: 'refresh_mock_next',
      },
    }),
    logout: jest.fn().mockResolvedValue({ success: true, message: '退出成功' }),
    me: jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'user_admin_001', account: 'admin_demo', role: 'admin', warehouseId: null },
    }),
  };
  const financeServiceMock = {
    getAllocationRules: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'rule_1',
          warehouseId: 'warehouse_001',
          ruleName: '默认规则',
          currentVersionId: 'rule_v1',
          versions: [
            {
              id: 'rule_v1',
              versionName: 'v1.0',
              isActive: true,
              effectiveStartAt: new Date().toISOString(),
              sharedExpenseRate: 1,
              purchaseCostRate: 1,
            },
          ],
        },
      ],
    }),
    publishAllocationRule: jest.fn().mockImplementation((_: string, dto: { versionName: string }) => {
      if (dto.versionName === 'v1.0') {
        return {
          success: false,
          message: '版本号已存在，请更换后重试',
        };
      }
      return {
        success: true,
        message: '财务规则已发布',
        data: {
          id: 'rule_v2',
          versionName: dto.versionName,
          isActive: true,
        },
      };
    }),
    saveAllocationRuleConfig: jest.fn().mockResolvedValue({
      success: true,
      message: '财务规则草稿已保存',
      data: {
        id: 'rule_draft_1',
        versionName: 'draft-123',
        isActive: false,
        sharedExpenseRate: 1.2,
        purchaseCostRate: 0.9,
      },
    }),
    recalculateMonthlySnapshots: jest.fn().mockResolvedValue({
      success: true,
      message: '利润快照已重新计算',
      data: { count: 1 },
    }),
  };
  const productsServiceMock = {
    getProducts: jest.fn().mockImplementation((query: { category?: string; onlySellable?: boolean }) => {
      const catalog = [
        {
          id: 'product_sellable_1',
          productName: '可售商品A',
          category: '工具',
          coverImageUrl: null,
          description: '管理员上架可售商品',
          price: 19.9,
          unit: '件',
          stockQuantity: 100,
          isSellable: true,
          status: 'active',
          listedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
          unlistedAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          isCurrentlySellable: true,
        },
        {
          id: 'product_unsellable_1',
          productName: '不可售商品B',
          category: '工具',
          coverImageUrl: null,
          description: '不可售商品',
          price: 29.9,
          unit: '件',
          stockQuantity: 0,
          isSellable: false,
          status: 'active',
          listedAt: null,
          unlistedAt: null,
          isCurrentlySellable: false,
        },
      ];
      const byCategory = query?.category ? catalog.filter((item) => item.category === query.category) : catalog;
      const onlySellable = query?.onlySellable ?? true;
      const data = onlySellable ? byCategory.filter((item) => item.isCurrentlySellable) : byCategory;
      return { success: true, data };
    }),
    getAdminProducts: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'product_admin_1',
          productName: '管理员商品',
          category: '办公',
          coverImageUrl: null,
          description: '管理员维护',
          price: 88.8,
          unit: '套',
          stockQuantity: 20,
          isSellable: true,
          status: 'active',
          listedAt: null,
          unlistedAt: null,
          isCurrentlySellable: true,
        },
      ],
    }),
    createProduct: jest.fn().mockImplementation((dto: Record<string, unknown>) => ({
      success: true,
      message: '商品已创建',
      data: {
        id: 'product_created_1',
        productName: dto.productName,
        category: dto.category,
        coverImageUrl: dto.coverImageUrl ?? null,
        description: dto.description,
        price: dto.price ?? null,
        unit: dto.unit ?? null,
        stockQuantity: dto.stockQuantity ?? 0,
        isSellable: dto.isSellable ?? true,
        status: dto.status ?? 'active',
        listedAt: dto.listedAt ?? null,
        unlistedAt: dto.unlistedAt ?? null,
        isCurrentlySellable: true,
      },
    })),
    updateProduct: jest.fn().mockResolvedValue({
      success: true,
      message: '商品已更新',
      data: { id: 'product_updated_1' },
    }),
    updateProductStatus: jest.fn().mockResolvedValue({
      success: true,
      message: '商品状态已更新',
      data: { id: 'product_status_1', status: 'inactive' },
    }),
    submitInquiry: jest.fn().mockImplementation((id: string) => {
      if (id === 'product_unsellable_1') {
        return { success: false, message: '商品当前不可售', code: 'PRODUCT_NOT_SELLABLE' };
      }
      if (id === 'product_out_of_window_1') {
        return { success: false, message: '商品不在可售时间窗口', code: 'PRODUCT_OUT_OF_SALE_WINDOW' };
      }
      return {
        success: true,
        message: '采购意向已提交，管理员将尽快处理',
        data: { id: 'demand_product_1' },
      };
    }),
  };
  const inventoryServiceMock = {
    getWarehouseInventoryItems: jest.fn().mockImplementation((_: unknown, inventoryType?: 'product' | 'equipment' | 'other') => {
      const mine = [
        {
          id: 'inventory_mine_submitted_1',
          warehouseId: 'warehouse_001',
          inventoryType: 'product',
          title: '本仓产品库存',
          description: '待审核库存条目',
          quantity: 12,
          unit: '件',
          status: 'submitted',
          rejectionReason: null,
          reviewedByUserId: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
        },
      ];
      const shared = [
        {
          id: 'inventory_shared_approved_1',
          warehouseId: 'warehouse_002',
          inventoryType: 'product',
          title: '共享产品库存',
          description: '其他仓已审核通过',
          quantity: 30,
          unit: '件',
          status: 'approved',
          rejectionReason: null,
          reviewedByUserId: 'user_admin_001',
          reviewedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          warehouse: { id: 'warehouse_002', code: 'WH-002', name: '二号仓' },
          reviewedBy: { id: 'user_admin_001', account: 'admin_demo', role: 'admin' },
        },
      ];
      const filterByType = (items: Array<{ inventoryType: string }>) =>
        inventoryType ? items.filter((item) => item.inventoryType === inventoryType) : items;
      return {
        success: true,
        data: {
          mine: filterByType(mine),
          shared: filterByType(shared),
        },
      };
    }),
    getAdminInventoryItems: jest.fn().mockImplementation((query: { inventoryType?: string; status?: string }) => {
      const data = [
        {
          id: 'inventory_admin_submitted_1',
          warehouseId: 'warehouse_001',
          inventoryType: 'product',
          title: '待审核库存',
          description: '提交待审核',
          quantity: 9,
          unit: '件',
          status: 'submitted',
          rejectionReason: null,
          reviewedByUserId: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          warehouse: { id: 'warehouse_001', code: 'WH-001', name: '一号仓' },
          reviewedBy: null,
        },
        {
          id: 'inventory_admin_approved_1',
          warehouseId: 'warehouse_001',
          inventoryType: 'equipment',
          title: '已通过库存',
          description: '管理员已审核',
          quantity: 2,
          unit: '台',
          status: 'approved',
          rejectionReason: null,
          reviewedByUserId: 'user_admin_001',
          reviewedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          warehouse: { id: 'warehouse_001', code: 'WH-001', name: '一号仓' },
          reviewedBy: { id: 'user_admin_001', account: 'admin_demo', role: 'admin' },
        },
      ];
      const result = data.filter(
        (item) =>
          (!query?.inventoryType || item.inventoryType === query.inventoryType) &&
          (!query?.status || item.status === query.status),
      );
      return { success: true, data: result };
    }),
    approveInventoryItem: jest.fn().mockImplementation((_: unknown, id: string) => {
      if (id === 'inventory_admin_approved_1') {
        return { success: false, message: '仅已提交条目可审核通过', code: 'INVENTORY_ITEM_STATUS_INVALID' };
      }
      return {
        success: true,
        message: '库存条目已审核通过',
        data: {
          id,
          status: 'approved',
          reviewedByUserId: 'user_admin_001',
        },
      };
    }),
    rejectInventoryItem: jest.fn().mockImplementation((_: unknown, id: string, dto: { rejectionReason: string }) => {
      if (id === 'inventory_admin_approved_1') {
        return { success: false, message: '仅已提交条目可驳回', code: 'INVENTORY_ITEM_STATUS_INVALID' };
      }
      return {
        success: true,
        message: '库存条目已驳回',
        data: {
          id,
          status: 'rejected',
          rejectionReason: dto.rejectionReason,
          reviewedByUserId: 'user_admin_001',
        },
      };
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminService)
      .useValue(adminServiceMock)
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(FinanceService)
      .useValue(financeServiceMock)
      .overrideProvider(ProductsService)
      .useValue(productsServiceMock)
      .overrideProvider(InventoryService)
      .useValue(inventoryServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ success: true, message: 'ok' });
  });

  it('/api/admin/logs (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/admin/logs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('/api/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: 'admin_demo',
        password: '123456',
        role: 'admin',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBe('access_mock');
      });
  });

  it('/api/auth/refresh (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'refresh_mock',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBe('access_mock_next');
      });
  });

  it('/api/admin/logs/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/admin/logs/log_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe('log_1');
      });
  });

  it('/api/admin/logs/summary (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/admin/logs/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.total).toBe(3);
      });
  });

  it('/api/admin/logs/summary/export (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/admin/logs/summary/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.csv).toBe('string');
      });
  });

  it('/api/finance/rules (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/finance/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('/api/finance/rules/:id/publish (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/finance/rules/rule_1/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        versionName: 'v2.0',
        effectiveStartAt: new Date().toISOString(),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('/api/finance/rules/:id/publish (POST) duplicate version', () => {
    return request(app.getHttpServer())
      .post('/api/finance/rules/rule_1/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        versionName: 'v1.0',
        effectiveStartAt: new Date().toISOString(),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(String(res.body.message)).toContain('版本号已存在');
      });
  });

  it('/api/finance/rules/:id/config (PUT)', () => {
    return request(app.getHttpServer())
      .put('/api/finance/rules/rule_1/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sharedExpenseRate: 1.2,
        purchaseCostRate: 0.9,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('/api/admin/finance/profit-snapshots/recalculate (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/admin/finance/profit-snapshots/recalculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('/api/admin/products (POST) supports business fields', () => {
    return request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productName: '业务字段商品',
        category: '工具',
        description: '含库存和可售字段',
        price: 18.8,
        unit: '件',
        stockQuantity: 50,
        isSellable: true,
        status: 'active',
        listedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        unlistedAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Number(res.body.data.stockQuantity)).toBe(50);
        expect(res.body.data.isSellable).toBe(true);
      });
  });

  it('/api/products (GET) warehouse only sees sellable products by default', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.every((item: { isCurrentlySellable: boolean }) => item.isCurrentlySellable === true)).toBe(true);
      });
  });

  it('/api/products/:id/inquiry (POST) rejects unsellable product', () => {
    return request(app.getHttpServer())
      .post('/api/products/product_unsellable_1/inquiry')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ quantity: 1, urgency: 'medium' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe('PRODUCT_NOT_SELLABLE');
      });
  });

  it('/api/admin/products (GET) warehouse role forbidden', () => {
    return request(app.getHttpServer())
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(403)
      .expect((res) => {
        expect(String(res.body.message)).toContain('无权限');
      });
  });

  it('/api/inventory/items (GET) warehouse gets mine/shared inventory', () => {
    return request(app.getHttpServer())
      .get('/api/inventory/items?inventoryType=product')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.mine)).toBe(true);
        expect(Array.isArray(res.body.data.shared)).toBe(true);
        expect(res.body.data.shared[0].reviewedBy.account).toBe('admin_demo');
      });
  });

  it('/api/inventory/items (GET) admin role forbidden', () => {
    return request(app.getHttpServer())
      .get('/api/inventory/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)
      .expect((res) => {
        expect(String(res.body.message)).toContain('无权限');
      });
  });

  it('/api/admin/inventory/items (GET) admin can filter submitted list', () => {
    return request(app.getHttpServer())
      .get('/api/admin/inventory/items?status=submitted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0].status).toBe('submitted');
      });
  });

  it('/api/admin/inventory/items/:id/approve (POST) supports status transition', () => {
    return request(app.getHttpServer())
      .post('/api/admin/inventory/items/inventory_admin_submitted_1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('approved');
        expect(res.body.data.reviewedByUserId).toBe('user_admin_001');
      });
  });

  it('/api/admin/inventory/items/:id/approve (POST) rejects invalid status transition', () => {
    return request(app.getHttpServer())
      .post('/api/admin/inventory/items/inventory_admin_approved_1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe('INVENTORY_ITEM_STATUS_INVALID');
      });
  });

  it('/api/admin/inventory/items/:id/reject (POST) keeps rejection reason', () => {
    return request(app.getHttpServer())
      .post('/api/admin/inventory/items/inventory_admin_submitted_1/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: '资料不完整' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('rejected');
        expect(res.body.data.rejectionReason).toBe('资料不完整');
      });
  });

  it('/api/admin/inventory/items (GET) warehouse role forbidden', () => {
    return request(app.getHttpServer())
      .get('/api/admin/inventory/items')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(403)
      .expect((res) => {
        expect(String(res.body.message)).toContain('无权限');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
