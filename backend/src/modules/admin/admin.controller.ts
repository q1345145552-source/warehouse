import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { QueryAdminLogsDto } from './dto/query-admin-logs.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('logs')
  getLogs(@Query() query: QueryAdminLogsDto) {
    return this.adminService.getLogs(query);
  }

  @Get('logs/export')
  exportLogs(@Query() query: QueryAdminLogsDto) {
    return this.adminService.exportLogsCsv(query);
  }

  @Get('logs/options')
  getLogOptions(@Query('module') module?: string) {
    return this.adminService.getLogOptions(module);
  }

  @Get('logs/summary')
  getLogsSummary(@Query() query: QueryAdminLogsDto) {
    return this.adminService.getLogsSummary(query);
  }

  @Get('logs/summary/export')
  exportLogsSummary(@Query() query: QueryAdminLogsDto) {
    return this.adminService.exportLogsSummaryCsv(query);
  }

  @Get('users')
  getUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Put('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Put('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto);
  }

  @Put('users/:id/password')
  resetUserPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.adminService.resetUserPassword(id, dto);
  }

  @Get('logs/:id')
  getLogDetail(@Param('id') id: string) {
    return this.adminService.getLogDetail(id);
  }

  @Post('finance/profit-snapshots/:id/confirm')
  confirmProfit(@Param('id') id: string) {
    return this.adminService.confirmProfit(id);
  }

  @Post('kpi/results/recalculate')
  recalculateKpi() {
    return { success: true, message: 'KPI 结果已重新计算（示例逻辑）' };
  }
}
