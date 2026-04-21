import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const describeReal = process.env.RUN_REAL_E2E === 'true' ? describe : describe.skip;
jest.setTimeout(30000);

describeReal('Real chain smoke (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  const jwtService = new JwtService();

  const ids = {
    warehouseId: 'warehouse_e2e_real',
    adminId: 'user_admin_real_e2e',
    warehouseUserId: 'user_warehouse_real_e2e',
    lockedUserId: 'user_locked_real_e2e',
    ruleId: 'finance_rule_real_e2e',
  };

  const accounts = {
    admin: 'admin_real_e2e',
    warehouse: 'warehouse_real_e2e',
    locked: 'locked_real_e2e',
  };

  beforeAll(async () => {
    await prepareBaseData();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('完整真实链路：login -> refresh -> 规则发布 -> 快照重算 -> 日志审计', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.admin,
      password: '123456',
      role: 'admin',
    });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.success).toBe(true);

    const adminAccessToken = String(loginRes.body.data.accessToken);
    const refreshToken = String(loginRes.body.data.refreshToken);

    const refreshRes = await request(app.getHttpServer()).post('/api/auth/refresh').send({
      refreshToken,
    });
    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.success).toBe(true);
    expect(typeof refreshRes.body.data.accessToken).toBe('string');
    expect(typeof refreshRes.body.data.refreshToken).toBe('string');

    const versionName = `v-real-${Date.now()}`;
    const publishRes = await request(app.getHttpServer())
      .post(`/api/finance/rules/${ids.ruleId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        versionName,
        effectiveStartAt: new Date().toISOString(),
      });
    expect(publishRes.status).toBe(201);
    expect(publishRes.body.success).toBe(true);
    expect(publishRes.body.data.versionName).toBe(versionName);

    const recalcRes = await request(app.getHttpServer())
      .post('/api/admin/finance/profit-snapshots/recalculate')
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(recalcRes.status).toBe(201);
    expect(recalcRes.body.success).toBe(true);
    expect(Number(recalcRes.body.data.count)).toBeGreaterThan(0);

    const logsSummaryRes = await request(app.getHttpServer())
      .get('/api/admin/logs/summary')
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(logsSummaryRes.status).toBe(200);
    expect(logsSummaryRes.body.success).toBe(true);
    expect(Array.isArray(logsSummaryRes.body.data.modules)).toBe(true);

    const modules = logsSummaryRes.body.data.modules.map((item: { module: string }) => item.module);
    expect(modules).toEqual(expect.arrayContaining(['finance_rule', 'profit_snapshot']));
  });

  it('失败路径：权限不足（仓库角色访问管理员接口）', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.warehouse,
      password: '123456',
      role: 'warehouse',
    });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.success).toBe(true);

    const warehouseAccessToken = String(loginRes.body.data.accessToken);
    const forbiddenRes = await request(app.getHttpServer())
      .post('/api/admin/finance/profit-snapshots/recalculate')
      .set('Authorization', `Bearer ${warehouseAccessToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(String(forbiddenRes.body.message)).toContain('无权限');
  });

  it('失败路径：重复版本发布失败', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.admin,
      password: '123456',
      role: 'admin',
    });
    const adminAccessToken = String(loginRes.body.data.accessToken);

    const baseVersionName = `v-dup-${Date.now()}`;
    const firstPublishRes = await request(app.getHttpServer())
      .post(`/api/finance/rules/${ids.ruleId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        versionName: baseVersionName,
        effectiveStartAt: new Date().toISOString(),
      });
    expect(firstPublishRes.status).toBe(201);
    expect(firstPublishRes.body.success).toBe(true);

    const duplicatePublishRes = await request(app.getHttpServer())
      .post(`/api/finance/rules/${ids.ruleId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        versionName: baseVersionName,
        effectiveStartAt: new Date().toISOString(),
      });

    expect(duplicatePublishRes.status).toBe(201);
    expect(duplicatePublishRes.body.success).toBe(false);
    expect(duplicatePublishRes.body.code).toBe('DUPLICATE_VERSION_NAME');
    expect(String(duplicatePublishRes.body.message)).toContain('版本号已存在');
  });

  it('失败路径：规则不存在', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.admin,
      password: '123456',
      role: 'admin',
    });
    const adminAccessToken = String(loginRes.body.data.accessToken);

    const notFoundRes = await request(app.getHttpServer())
      .post('/api/finance/rules/rule_not_exist/publish')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        versionName: `v-not-exist-${Date.now()}`,
        effectiveStartAt: new Date().toISOString(),
      });
    expect(notFoundRes.status).toBe(201);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.code).toBe('RULE_NOT_FOUND');
  });

  it('失败路径：锁定账号登录失败', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.locked,
      password: '123456',
      role: 'warehouse',
    });
    expect(loginRes.status).toBe(429);
    expect(String(loginRes.body.message)).toContain('临时锁定');
  });

  it('失败路径：过期 refresh token', async () => {
    const expiredRefreshToken = await jwtService.signAsync(
      {
        sub: ids.adminId,
        account: accounts.admin,
        role: 'admin',
        warehouseId: null,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
        expiresIn: '-10s',
      },
    );

    const refreshRes = await request(app.getHttpServer()).post('/api/auth/refresh').send({
      refreshToken: expiredRefreshToken,
    });
    expect(refreshRes.status).toBe(401);
    expect(String(refreshRes.body.message)).toContain('无效或已过期');
  });

  it('审计路径：发布/回滚日志包含关键字段', async () => {
    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({
      account: accounts.admin,
      password: '123456',
      role: 'admin',
    });
    const adminAccessToken = String(loginRes.body.data.accessToken);

    const publishVersionName = `v-audit-${Date.now()}`;
    const publishRes = await request(app.getHttpServer())
      .post(`/api/finance/rules/${ids.ruleId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        versionName: publishVersionName,
        effectiveStartAt: new Date().toISOString(),
      });
    expect(publishRes.body.success).toBe(true);

    const rollbackRes = await request(app.getHttpServer())
      .post(`/api/finance/rules/${ids.ruleId}/versions/${publishRes.body.data.id}/rollback`)
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(rollbackRes.status).toBe(201);
    expect(rollbackRes.body.success).toBe(true);

    const logsRes = await request(app.getHttpServer())
      .get('/api/admin/logs?page=1&pageSize=50&module=finance_rule')
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.success).toBe(true);

    const publishLog = logsRes.body.data.find((item: { action: string }) => item.action === 'publish');
    const rollbackLog = logsRes.body.data.find((item: { action: string }) => item.action === 'rollback');
    expect(publishLog).toBeTruthy();
    expect(rollbackLog).toBeTruthy();

    const publishPayload = JSON.parse(String(publishLog.payload));
    const rollbackPayload = JSON.parse(String(rollbackLog.payload));
    expect(publishPayload.ruleId).toBe(ids.ruleId);
    expect(publishPayload.userRole).toBe('admin');
    expect(publishPayload.userId).toBe(ids.adminId);
    expect(rollbackPayload.ruleId).toBe(ids.ruleId);
    expect(rollbackPayload.userRole).toBe('admin');
    expect(rollbackPayload.userId).toBe(ids.adminId);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  async function prepareBaseData() {
    const hashedPassword = await hash('123456', 12);

    await prisma.warehouse.upsert({
      where: { id: ids.warehouseId },
      update: { status: 'enabled' },
      create: {
        id: ids.warehouseId,
        code: 'WH-E2E-REAL',
        name: 'Real E2E Warehouse',
        status: 'enabled',
      },
    });

    await prisma.financeAllocationRule.upsert({
      where: { id: ids.ruleId },
      update: {
        warehouseId: ids.warehouseId,
        ruleName: 'Real E2E Rule',
        scopeType: 'warehouse',
      },
      create: {
        id: ids.ruleId,
        warehouseId: ids.warehouseId,
        ruleName: 'Real E2E Rule',
        scopeType: 'warehouse',
      },
    });

    const activeVersion = await prisma.financeAllocationRuleVersion.findFirst({
      where: {
        ruleId: ids.ruleId,
        versionName: 'v1.0',
      },
    });
    const version =
      activeVersion ??
      (await prisma.financeAllocationRuleVersion.create({
        data: {
          ruleId: ids.ruleId,
          versionName: 'v1.0',
          effectiveStartAt: new Date(),
          isActive: true,
          sharedExpenseRate: 1,
          purchaseCostRate: 1,
        },
      }));

    await prisma.financeAllocationRule.update({
      where: { id: ids.ruleId },
      data: { currentVersionId: version.id },
    });

    await prisma.userAccount.upsert({
      where: { account: accounts.admin },
      update: {
        password: hashedPassword,
        role: 'admin',
        warehouseId: null,
        status: 'active',
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        id: ids.adminId,
        account: accounts.admin,
        password: hashedPassword,
        role: 'admin',
        warehouseId: null,
        status: 'active',
      },
    });

    await prisma.userAccount.upsert({
      where: { account: accounts.warehouse },
      update: {
        password: hashedPassword,
        role: 'warehouse',
        warehouseId: ids.warehouseId,
        status: 'active',
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        id: ids.warehouseUserId,
        account: accounts.warehouse,
        password: hashedPassword,
        role: 'warehouse',
        warehouseId: ids.warehouseId,
        status: 'active',
      },
    });

    await prisma.userAccount.upsert({
      where: { account: accounts.locked },
      update: {
        password: hashedPassword,
        role: 'warehouse',
        warehouseId: ids.warehouseId,
        status: 'active',
        failedLoginCount: 0,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        id: ids.lockedUserId,
        account: accounts.locked,
        password: hashedPassword,
        role: 'warehouse',
        warehouseId: ids.warehouseId,
        status: 'active',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }
});
