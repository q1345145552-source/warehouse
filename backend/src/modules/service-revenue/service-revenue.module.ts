import { Module } from '@nestjs/common';
import { ServiceRevenueController } from './service-revenue.controller';
import { ServiceRevenueService } from './service-revenue.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceRevenueController],
  providers: [ServiceRevenueService],
  exports: [ServiceRevenueService],
})
export class ServiceRevenueModule {}
