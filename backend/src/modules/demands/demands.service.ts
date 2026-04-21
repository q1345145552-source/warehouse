import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveDemandDto } from './dto/save-demand.dto';
import { UpdateDemandProgressDto } from './dto/update-demand-progress.dto';

const legacyDemandTypeMap: Record<string, string> = {
  finance: 'warehouse_request',
  purchase_optimization: 'group_purchase',
  certificate: 'certificate_processing',
  second_hand: 'warehouse_request',
  other: 'warehouse_request',
};

@Injectable()
export class DemandsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthUser) {
    const where = user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' };
    const [pending, processing] = await Promise.all([
      this.prisma.demand.count({ where: { ...where, status: 'submitted' } }),
      this.prisma.demand.count({ where: { ...where, status: 'processing' } }),
    ]);

    return { success: true, data: { pending, processing } };
  }

  async getAdminDashboard() {
    const pending = await this.prisma.demand.count({ where: { status: 'submitted' } });
    return { success: true, data: { pending } };
  }

  async getDemands(user: AuthUser) {
    const data = await this.prisma.demand.findMany({
      where: user.role === 'admin' ? {} : { warehouseId: user.warehouseId ?? '' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async getDemandTypes() {
    const data = await this.prisma.demandTypeConfig.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { success: true, data };
  }

  async createDemand(dto: SaveDemandDto, user: AuthUser) {
    const warehouseId = user.role === 'warehouse' ? (user.warehouseId ?? '') : dto.warehouseId;
    if (!warehouseId) throw new ForbiddenException('缺少仓库ID');
    const normalizedDemandType = this.normalizeDemandTypeKey(dto.demandType);
    const demandType = await this.prisma.demandTypeConfig.findFirst({
      where: {
        typeKey: normalizedDemandType,
        isEnabled: true,
      },
    });
    if (!demandType) {
      return { success: false, message: '需求类型不存在或未启用', code: 'DEMAND_TYPE_UNSUPPORTED' };
    }

    const data = await this.prisma.demand.create({
      data: {
        warehouseId,
        demandType: demandType.typeKey,
        title: dto.title,
        description: dto.description,
        urgency: dto.urgency,
        contactName: dto.contactName,
        status: 'submitted',
      },
    });

    await this.log('demand', 'submit', { id: data.id });
    return { success: true, message: '需求已创建', data };
  }

  async getDemandDetail(id: string, user: AuthUser) {
    const data = await this.prisma.demand.findUnique({
      where: { id },
      include: { progressLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!data) return { success: false, message: '需求不存在' };
    this.ensureWarehouseAccess(user, data.warehouseId);
    return { success: true, data };
  }

  async confirmFinish(id: string, user: AuthUser) {
    const demand = await this.prisma.demand.findUnique({ where: { id } });
    if (!demand) return { success: false, message: '需求不存在' };
    this.ensureWarehouseAccess(user, demand.warehouseId);

    const data = await this.prisma.demand.update({ where: { id }, data: { status: 'confirmed' } });
    await this.log('demand', 'confirm_finish', { id });
    return { success: true, message: `需求 ${id} 已确认完成`, data };
  }

  async getAdminDemands() {
    const data = await this.prisma.demand.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, data };
  }

  async approveDemand(id: string) {
    const data = await this.prisma.demand.update({ where: { id }, data: { status: 'processing' } });
    await this.log('demand', 'approve', { id });
    return { success: true, message: `需求 ${id} 审核通过`, data };
  }

  async rejectDemand(id: string) {
    const data = await this.prisma.demand.update({ where: { id }, data: { status: 'rejected' } });
    await this.log('demand', 'reject', { id });
    return { success: true, message: `需求 ${id} 已驳回`, data };
  }

  async requestMaterial(id: string) {
    const data = await this.prisma.demand.update({ where: { id }, data: { status: 'waiting_material' } });
    await this.log('demand', 'request_material', { id });
    return { success: true, message: `需求 ${id} 已要求补充资料`, data };
  }

  async updateProgress(id: string, dto: UpdateDemandProgressDto) {
    const log = await this.prisma.demandProgressLog.create({
      data: {
        demandId: id,
        status: dto.status,
        note: dto.note,
      },
    });

    await this.prisma.demand.update({ where: { id }, data: { status: dto.status } });
    await this.log('demand', 'update_progress', { id, status: dto.status });
    return { success: true, message: `需求 ${id} 进度已更新`, data: log };
  }

  async closeDemand(id: string) {
    const data = await this.prisma.demand.update({ where: { id }, data: { status: 'closed' } });
    await this.log('demand', 'close', { id });
    return { success: true, message: `需求 ${id} 已关闭`, data };
  }

  private ensureWarehouseAccess(user: AuthUser, warehouseId: string) {
    if (user.role === 'admin') return;
    if (user.warehouseId !== warehouseId) {
      throw new ForbiddenException('无权限访问其他仓库需求');
    }
  }

  private async log(module: string, action: string, payload: Record<string, unknown>) {
    await this.prisma.operationLog.create({
      data: {
        module,
        action,
        operator: 'system',
        payload: JSON.stringify(payload),
      },
    });
  }

  private normalizeDemandTypeKey(input: string) {
    const key = input.trim();
    return legacyDemandTypeMap[key] ?? key;
  }
}
