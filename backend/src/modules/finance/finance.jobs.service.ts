import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FinanceService } from './finance.service';

@Injectable()
export class FinanceJobsService {
  private readonly logger = new Logger(FinanceJobsService.name);

  constructor(private readonly financeService: FinanceService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async recalculateProfitSnapshots() {
    try {
      const result = await this.financeService.recalculateMonthlySnapshots();
      this.logger.log(`自动利润快照任务完成：${result.data.count} 条快照更新`);
    } catch (error) {
      this.logger.error('自动利润快照任务失败', error as Error);
    }
  }
}
