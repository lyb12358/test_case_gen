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
export const API_ENDPOINTS = {
  // 生成相关
  GENERATION: {
    TEST_POINTS: '/api/v1/generation/test-points',
    TEST_CASES: '/api/v1/generation/test-cases',
    BATCH: '/api/v1/generation/batch',
    STATUS: '/api/v1/generation/status',
    CANCEL: '/api/v1/generation/cancel',
    HEALTH: '/api/v1/generation/health',
    STATISTICS: '/api/v1/generation/statistics'
  },

  // 知识图谱相关
  KNOWLEDGE_GRAPH: {
    DATA: '/api/v1/knowledge-graph/data',
    STATS: '/api/v1/knowledge-graph/stats',
    ENTITIES: '/api/v1/knowledge-graph/entities',
    RELATIONS: '/api/v1/knowledge-graph/relations',
    INITIALIZE: '/api/v1/knowledge-graph/initialize',
    CLEAR: '/api/v1/knowledge-graph/clear',
    ENTITY_DETAILS: '/api/v1/knowledge-graph/entities',
    BUSINESS_DESCRIPTION: '/api/v1/knowledge-graph/entities',
    TEST_CASES: '/api/v1/knowledge-graph/entities'
  },

  // 测试用例相关
  TEST_CASES: {
    LIST: '/api/v1/test-cases',
    DETAIL: '/api/v1/test-cases',
    GENERATE: '/api/v1/test-cases/generate',
    EXPORT: '/api/v1/test-cases/export',
    DELETE: '/api/v1/test-cases'
  },

  // 测试点相关
  TEST_POINTS: {
    LIST: '/api/v1/test-points',
    DETAIL: '/api/v1/test-points',
    GENERATE: '/api/v1/test-points/generate',
    DELETE: '/api/v1/test-points'
  },

  // 业务类型相关
  BUSINESS_TYPES: {
    LIST: '/api/v1/business/business-types',
    CONFIG: '/api/v1/business-types/config'
  },

  // 项目相关
  PROJECTS: {
    LIST: '/api/v1/projects',
    DETAIL: '/api/v1/projects',
    CREATE: '/api/v1/projects',
    UPDATE: '/api/v1/projects',
    DELETE: '/api/v1/projects'
  },

  // 任务相关
  TASKS: {
    LIST: '/api/v1/tasks',
    DETAIL: '/api/v1/tasks',
    STATUS: '/api/v1/tasks/status',
    CANCEL: '/api/v1/tasks/cancel'
  },

  // 提示词相关
  PROMPTS: {
    LIST: '/api/v1/prompts',
    DETAIL: '/api/v1/prompts',
    CREATE: '/api/v1/prompts',
    UPDATE: '/api/v1/prompts',
    DELETE: '/api/v1/prompts',
    CATEGORIES: '/api/v1/prompts/categories',
    TEMPLATES: '/api/v1/prompts/templates',
    SEARCH: '/api/v1/prompts/search',
    VALIDATE: '/api/v1/prompts/validate',
    BUILD: '/api/v1/prompts/build',
    STATS: '/api/v1/prompts/stats/overview'
  },

  // 配置相关
  CONFIG: {
    BUSINESS_TYPES: '/api/v1/config/business-types',
    PROMPT_TYPES: '/api/v1/config/prompt-types',
    SYSTEM_INFO: '/api/v1/config/system-info'
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