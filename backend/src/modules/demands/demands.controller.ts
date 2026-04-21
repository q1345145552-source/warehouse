import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { DemandsService } from './demands.service';
import { SaveDemandDto } from './dto/save-demand.dto';
import { UpdateDemandProgressDto } from './dto/update-demand-progress.dto';

@Controller()
export class DemandsController {
  constructor(private readonly demandsService: DemandsService) {}

  @Get('demands')
  @Roles('warehouse', 'admin')
  getDemands(@CurrentUser() user: AuthUser) {
    return this.demandsService.getDemands(user);
  }

  @Get('demands/types')
  @Roles('warehouse', 'admin')
  getDemandTypes() {
    return this.demandsService.getDemandTypes();
  }

  @Post('demands')
  @Roles('warehouse')
  createDemand(@CurrentUser() user: AuthUser, @Body() dto: SaveDemandDto) {
    return this.demandsService.createDemand(dto, user);
  }

  @Get('demands/:id')
  @Roles('warehouse', 'admin')
  getDemandDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.demandsService.getDemandDetail(id, user);
  }

  @Post('demands/:id/confirm-finish')
  @Roles('warehouse')
  confirmFinish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.demandsService.confirmFinish(id, user);
  }

  @Get('admin/demands')
  @Roles('admin')
  getAdminDemands() {
    return this.demandsService.getAdminDemands();
  }

  @Post('admin/demands/:id/approve')
  @Roles('admin')
  approveDemand(@Param('id') id: string) {
    return this.demandsService.approveDemand(id);
  }

  @Post('admin/demands/:id/reject')
  @Roles('admin')
  rejectDemand(@Param('id') id: string) {
    return this.demandsService.rejectDemand(id);
  }

  @Post('admin/demands/:id/request-material')
  @Roles('admin')
  requestMaterial(@Param('id') id: string) {
    return this.demandsService.requestMaterial(id);
  }

  @Post('admin/demands/:id/progress')
  @Roles('admin')
  updateProgress(@Param('id') id: string, @Body() dto: UpdateDemandProgressDto) {
    return this.demandsService.updateProgress(id, dto);
  }

  @Post('admin/demands/:id/close')
  @Roles('admin')
  closeDemand(@Param('id') id: string) {
    return this.demandsService.closeDemand(id);
  }
}
