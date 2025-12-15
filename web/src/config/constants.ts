/**
 * 应用程序常量配置
 * 集中管理所有常量，避免重复定义
 */

// API配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// WebSocket配置
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

// API端点路径
// 注意：这些路径会与 API_BASE_URL 拼接，所以不包含 /api 前缀
export const API_ENDPOINTS = {
  // 生成相关
  GENERATION: {
    TEST_POINTS: '/v1/generation/test-points',
    TEST_CASES: '/v1/generation/test-cases',
    BATCH: '/v1/generation/batch',
    STATUS: '/v1/generation/status',
    CANCEL: '/v1/generation/cancel',
    HEALTH: '/v1/generation/health',
    STATISTICS: '/v1/generation/statistics'
  },

  // 知识图谱相关
  KNOWLEDGE_GRAPH: {
    DATA: '/v1/knowledge-graph/data',
    STATS: '/v1/knowledge-graph/stats',
    ENTITIES: '/v1/knowledge-graph/entities',
    RELATIONS: '/v1/knowledge-graph/relations',
    INITIALIZE: '/v1/knowledge-graph/initialize',
    CLEAR: '/v1/knowledge-graph/clear',
    ENTITY_DETAILS: '/v1/knowledge-graph/entities',
    BUSINESS_DESCRIPTION: '/v1/knowledge-graph/entities',
    TEST_CASES: '/v1/knowledge-graph/entities'
  },

  // 统一测试用例相关 (两阶段统一系统)
  UNIFIED_TEST_CASES: {
    LIST: '/v1/unified-test-cases',
    DETAIL: '/v1/unified-test-cases',
    CREATE: '/v1/unified-test-cases',
    UPDATE: '/v1/unified-test-cases',
    DELETE: '/v1/unified-test-cases',
    BATCH: '/v1/unified-test-cases/batch',
    STATISTICS: '/v1/unified-test-cases/statistics/overview',
    GENERATE_TEST_CASES: '/v1/unified-test-cases/generate/test-cases',
    GENERATE_FULL_TWO_STAGE: '/v1/unified-test-cases/generate/full-two-stage',
    GENERATE_STATUS: '/v1/unified-test-cases/generate/status'
  },

  // 测试用例相关 (已弃用，请使用UNIFIED_TEST_CASES)
  TEST_CASES: {
    LIST: '/v1/test-cases',
    DETAIL: '/v1/test-cases',
    GENERATE: '/v1/test-cases/generate',
    EXPORT: '/v1/test-cases/export',
    DELETE: '/v1/test-cases'
  },

  // 测试点相关 (已弃用，请使用UNIFIED_TEST_CASES)
  TEST_POINTS: {
    LIST: '/v1/test-points',
    DETAIL: '/v1/test-points',
    GENERATE: '/v1/test-points/generate',
    DELETE: '/v1/test-points'
  },

  // 业务类型相关
  BUSINESS_TYPES: {
    LIST: '/v1/business/business-types',
    CONFIG: '/v1/business-types/config'
  },

  // 项目相关
  PROJECTS: {
    LIST: '/v1/projects',
    DETAIL: '/v1/projects',
    CREATE: '/v1/projects',
    UPDATE: '/v1/projects',
    DELETE: '/v1/projects'
  },

  // 任务相关
  TASKS: {
    LIST: '/v1/tasks',
    DETAIL: '/v1/tasks',
    STATUS: '/v1/tasks/status',
    CANCEL: '/v1/tasks/cancel'
  },

  // 提示词相关
  PROMPTS: {
    LIST: '/v1/prompts',
    DETAIL: '/v1/prompts',
    CREATE: '/v1/prompts',
    UPDATE: '/v1/prompts',
    DELETE: '/v1/prompts',
    CATEGORIES: '/v1/prompts/categories',
    TEMPLATES: '/v1/prompts/templates',
    SEARCH: '/v1/prompts/search',
    VALIDATE: '/v1/prompts/validate',
    BUILD: '/v1/prompts/build',
    STATS: '/v1/prompts/stats/overview'
  },

  // 配置相关
  CONFIG: {
    BUSINESS_TYPES: '/v1/config/business-types',
    PROMPT_TYPES: '/v1/config/prompt-types',
    SYSTEM_INFO: '/v1/config/system-info'
  }
} as const;

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// 任务状态
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// 业务类型配置 - 现在从后端API动态获取
// 使用: configService.getBusinessTypes() 或 useBusinessTypeMapping() hook

// 优先级级别
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

// 通知类型
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

// 缓存键名
export const CACHE_KEYS = {
  BUSINESS_TYPES: 'business_types',
  USER_PREFERENCES: 'user_preferences',
  PROJECT_CACHE: 'project_cache',
  GENERATION_HISTORY: 'generation_history'
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_info',
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  LAST_PROJECT: 'last_project_id'
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
} as const;

// 超时配置 (毫秒)
export const TIMEOUTS = {
  API_REQUEST: 30000,      // 30秒
  WEBSOCKET_CONNECT: 10000, // 10秒
  NOTIFICATION_AUTO_CLOSE: 5000, // 5秒
  TASK_STATUS_POLL: 2000   // 2秒
} as const;

// 重试配置
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,        // 1秒
  MAX_DELAY: 30000,        // 30秒
  JITTER_FACTOR: 0.1
} as const;

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
} as const;

// 导出配置
export const EXPORT_CONFIG = {
  SUPPORTED_FORMATS: ['xlsx', 'json', 'csv'],
  DEFAULT_FORMAT: 'xlsx',
  MAX_EXPORT_RECORDS: 10000
} as const;

// WebSocket事件类型
export const WS_EVENTS = {
  CONNECTION: {
    OPEN: 'open',
    CLOSE: 'close',
    ERROR: 'error'
  },
  TASK: {
    UPDATE: 'task_update',
    PROGRESS: 'task_progress',
    COMPLETED: 'task_completed',
    FAILED: 'task_failed'
  },
  SYSTEM: {
    NOTIFICATION: 'system_notification',
    BROADCAST: 'system_broadcast'
  }
} as const;