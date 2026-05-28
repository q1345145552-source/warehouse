// 通用响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

// 错误响应类型
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    path: string;
  };
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 用户角色类型
export type UserRole = 'admin' | 'warehouse';

// 认证用户信息
export interface AuthUser {
  sub: string;
  account: string;
  role: UserRole;
  warehouseId: string | null;
}

// 财务记录类型
export type FinanceRecordType = 'income' | 'expense' | 'purchase';

// 财务记录状态
export type FinanceRecordStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// KPI 周期类型
export type KpiCycleType = 'daily' | 'weekly' | 'monthly';

// 需求状态
export type DemandStatus = 'submitted' | 'processing' | 'completed' | 'closed';

// 需求紧急程度
export type DemandUrgency = 'low' | 'medium' | 'high' | 'urgent';

// 仓库状态
export type WarehouseStatus = 'enabled' | 'disabled';

// 通用 ID 参数
export interface IdParam {
  id: string;
}

// 通用仓库 ID 参数
export interface WarehouseIdParam {
  warehouseId: string;
}

// 日期范围
export interface DateRange {
  startDate: string | Date;
  endDate: string | Date;
}

// 排序选项
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

// 筛选选项
export interface FilterOption {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: unknown;
}

// 查询参数
export interface QueryParams extends PaginationParams {
  filters?: FilterOption[];
  sort?: SortOption[];
}
