/**
 * 通用类型定义
 * 提供系统中使用的标准枚举和基本类型
 */

// ============================================
// 优先级枚举（统一标准）
// ============================================

export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];

// ============================================
// 任务状态枚举（统一标准）
// ============================================

export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// ============================================
// 业务类型枚举（动态，但提供基础类型）
// ============================================

export const BUSINESS_TYPES = {
  RCC: 'RCC',
  RPP: 'RPP',
  RSM: 'RSM',
  RCM: 'RCM',
  RCE: 'RCE',
  RCI: 'RCI',
  RCP: 'RCP',
  RCR: 'RCR',
  RCB: 'RCB',
  RCS: 'RCS',
  RCD: 'RCD',
  RCF: 'RCF',
  RCT: 'RCT',
  RCW: 'RCW',
  RCG: 'RCG',
  RCCU: 'RCCU',
  RCCS: 'RCCS',
  RCCD: 'RCCD',
  RCCF: 'RCCF',
  RCCW: 'RCCW',
  RCCO: 'RCCO',
  RCCA: 'RCCA',
  RCCP: 'RCCP',
  RCCM: 'RCCM',
  RCCV: 'RCCV',
  RCCS2: 'RCCS2',
  RCCP2: 'RCCP2'
} as const;

export type BusinessTypeCode = typeof BUSINESS_TYPES[keyof typeof BUSINESS_TYPES];
export type BusinessType = string; // 动态业务类型，基础类型为string

// ============================================
// 生成阶段枚举
// ============================================

export const GENERATION_STAGE = {
  TEST_POINTS: 'test_points',
  TEST_CASES: 'test_cases',
  FULL: 'full'
} as const;

export type GenerationStage = typeof GENERATION_STAGE[keyof typeof GENERATION_STAGE];

export const GENERATION_TYPE = {
  TEST_POINTS: 'test_points',
  TEST_CASES: 'test_cases',
  BOTH: 'both'
} as const;

export type GenerationType = typeof GENERATION_TYPE[keyof typeof GENERATION_TYPE];

// ============================================
// 复杂度等级枚举
// ============================================

export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  STANDARD: 'standard',
  COMPREHENSIVE: 'comprehensive'
} as const;

export type ComplexityLevel = typeof COMPLEXITY_LEVELS[keyof typeof COMPLEXITY_LEVELS];

// ============================================
// 统一测试用例状态枚举 - 请使用 unifiedTestCase.ts 中的定义
// ============================================

// ============================================
// 统一测试用例阶段枚举 - 请使用 unifiedTestCase.ts 中的定义
// ============================================

// ============================================
// HTTP状态码类型
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// ============================================
// 排序和方向枚举
// ============================================

export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc'
} as const;

export type SortDirection = typeof SORT_DIRECTIONS[keyof typeof SORT_DIRECTIONS];

export const COMMON_SORT_FIELDS = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  NAME: 'name',
  TITLE: 'title',
  PRIORITY: 'priority',
  STATUS: 'status',
  BUSINESS_TYPE: 'business_type'
} as const;

export type SortField = typeof COMMON_SORT_FIELDS[keyof typeof COMMON_SORT_FIELDS] | string;

// ============================================
// 分页配置接口
// ============================================

export interface PaginationConfig {
  page: number;
  size: number;
  sortBy?: SortField;
  sortOrder?: SortDirection;
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// API响应基础接口
// ============================================

export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

export interface PaginatedApiResponse<T> extends BaseApiResponse {
  data: PaginationResponse<T>;
}

export interface ItemApiResponse<T> extends BaseApiResponse {
  data: T;
}

export interface ListApiResponse<T> extends BaseApiResponse {
  data: T[];
}

// ============================================
// 搜索和过滤接口
// ============================================

export interface SearchFilter {
  keyword?: string;
  businessType?: BusinessType;
  priority?: PriorityLevel;
  status?: TaskStatus | string; // 将具体类型留给使用方定义
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface DateRange {
  start: string;
  end: string;
}

// ============================================
// WebSocket消息类型
// ============================================

export const WEBSOCKET_MESSAGE_TYPES = {
  PROGRESS_UPDATE: 'progress_update',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TEST_POINT_GENERATED: 'test_point_generated',
  TEST_CASE_GENERATED: 'test_case_generated',
  ERROR: 'error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
} as const;

export type WebSocketMessageType = typeof WEBSOCKET_MESSAGE_TYPES[keyof typeof WEBSOCKET_MESSAGE_TYPES];

export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data?: any;
}

// ============================================
// 文件类型和导出格式
// ============================================

export const EXPORT_FORMATS = {
  JSON: 'json',
  EXCEL: 'excel',
  CSV: 'csv',
  PDF: 'pdf'
} as const;

export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'],
  ARCHIVE: ['zip', 'rar', '7z'],
  CODE: ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml']
} as const;

export type FileType = keyof typeof FILE_TYPES;

// ============================================
// 通知类型
// ============================================

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ============================================
// 工具函数
// ============================================

/**
 * 检查是否为有效的优先级
 */
export function isValidPriority(value: string): value is PriorityLevel {
  return Object.values(PRIORITY_LEVELS).includes(value as PriorityLevel);
}

/**
 * 检查是否为有效的任务状态
 */
export function isValidTaskStatus(value: string): value is TaskStatus {
  return Object.values(TASK_STATUS).includes(value as TaskStatus);
}

/**
 * 检查是否为有效的业务类型代码
 */
export function isValidBusinessTypeCode(value: string): value is BusinessTypeCode {
  return Object.values(BUSINESS_TYPES).includes(value as BusinessTypeCode);
}

/**
 * 获取优先级的显示名称
 */
export function getPriorityDisplayName(priority: PriorityLevel): string {
  const priorityNames: Record<PriorityLevel, string> = {
    [PRIORITY_LEVELS.HIGH]: '高',
    [PRIORITY_LEVELS.MEDIUM]: '中',
    [PRIORITY_LEVELS.LOW]: '低'
  };
  return priorityNames[priority] || priority;
}

/**
 * 获取任务状态的显示名称
 */
export function getTaskStatusDisplayName(status: TaskStatus): string {
  const statusNames: Record<TaskStatus, string> = {
    [TASK_STATUS.PENDING]: '等待中',
    [TASK_STATUS.RUNNING]: '运行中',
    [TASK_STATUS.COMPLETED]: '已完成',
    [TASK_STATUS.FAILED]: '失败',
    [TASK_STATUS.CANCELLED]: '已取消'
  };
  return statusNames[status] || status;
}

/**
 * 获取优先级的颜色
 */
export function getPriorityColor(priority: PriorityLevel): string {
  const priorityColors: Record<PriorityLevel, string> = {
    [PRIORITY_LEVELS.HIGH]: '#ff4d4f',
    [PRIORITY_LEVELS.MEDIUM]: '#fa8c16',
    [PRIORITY_LEVELS.LOW]: '#52c41a'
  };
  return priorityColors[priority] || '#d9d9d9';
}

// getStatusColor function removed due to type conflicts - will be refactored later