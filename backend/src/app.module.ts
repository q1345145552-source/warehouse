import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DemandsModule } from './modules/demands/demands.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { ProductsModule } from './modules/products/products.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { RolesGuard } from './common/auth/roles.guard';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';

// 新财务模块
import { CustomersModule } from './modules/customers/customers.module';
import { RechargeModule } from './modules/recharge/recharge.module';
import { ServiceRevenueModule } from './modules/service-revenue/service-revenue.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { InventoryConsumableModule } from './modules/inventory-consumable/inventory-consumable.module';
import { FixedAssetsModule } from './modules/fixed-assets/fixed-assets.module';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    InventoryModule,
    KpiModule,
    ProductsModule,
    DemandsModule,
    WarehousesModule,
    // 新财务模块
    CustomersModule,
    RechargeModule,
    ServiceRevenueModule,
    BankAccountsModule,
    InventoryConsumableModule,
    FixedAssetsModule,
    ChartOfAccountsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
