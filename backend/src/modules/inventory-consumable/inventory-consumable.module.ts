import { Module } from '@nestjs/common';
import { InventoryConsumableController } from './inventory-consumable.controller';
import { InventoryConsumableService } from './inventory-consumable.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryConsumableController],
  providers: [InventoryConsumableService],
  exports: [InventoryConsumableService],
})
export class InventoryConsumableModule {}
