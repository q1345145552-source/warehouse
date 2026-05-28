import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('暹联海外仓财务系统 API')
    .setDescription('按暹联海外仓财务逻辑设计的完整 API 文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '请输入 JWT Token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('auth', '认证相关接口')
    .addTag('customers', '客户管理')
    .addTag('recharge', '充值系统')
    .addTag('service-revenue', '服务收入')
    .addTag('bank-accounts', '银行账户')
    .addTag('inventory-consumables', '耗材管理')
    .addTag('fixed-assets', '固定资产')
    .addTag('chart-of-accounts', '科目体系')
    .addTag('reports', '报表（利润表、资产负债表、勾稽校验）')
    .addTag('admin', '管理员功能')
    .addTag('dashboard', '仪表盘')
    .addTag('demands', '需求管理')
    .addTag('kpi', 'KPI考核')
    .addTag('inventory', '库存管理')
    .addTag('products', '产品管理')
    .addTag('warehouses', '仓库管理')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 应用已启动: http://localhost:3001/api`);
  console.log(`📚 API 文档: http://localhost:3001/api/docs`);
}

void bootstrap();
