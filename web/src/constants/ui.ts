// UI 相关常量和样式配置

// 页面间距常量
export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  XXL: '48px'
} as const;

// 圆角常量
export const BORDER_RADIUS = {
  SM: '4px',
  MD: '6px',
  LG: '8px',
  XL: '12px'
} as const;

// 字体大小常量
export const FONT_SIZES = {
  XS: '11px',
  SM: '12px',
  MD: '14px',
  LG: '16px',
  XL: '18px',
  XXL: '20px',
  TITLE: '24px',
  HEADER: '28px'
} as const;

// 卡片样式常量
export const CARD_STYLES = {
  DEFAULT: {
    marginBottom: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  COMPACT: {
    marginBottom: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    boxShadow: 'none'
  },
  ELEVATED: {
    marginBottom: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  }
} as const;

// 表格样式常量
export const TABLE_STYLES = {
  DEFAULT: {
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden'
  },
  COMPACT: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    fontSize: FONT_SIZES.SM
  }
} as const;

// 按钮样式常量
export const BUTTON_STYLES = {
  PRIMARY: {
    height: '36px',
    borderRadius: BORDER_RADIUS.MD
  },
  SMALL: {
    height: '28px',
    borderRadius: BORDER_RADIUS.SM,
    fontSize: FONT_SIZES.SM
  },
  LARGE: {
    height: '44px',
    borderRadius: BORDER_RADIUS.MD,
    fontSize: FONT_SIZES.LG
  }
} as const;

// 表单项样式常量
export const FORM_STYLES = {
  DEFAULT: {
    marginBottom: SPACING.MD
  },
  COMPACT: {
    marginBottom: SPACING.SM
  },
  LABEL: {
    fontWeight: 500,
    color: '#262626'
  },
  HELP_TEXT: {
    fontSize: FONT_SIZES.SM,
    color: '#8c8c8c',
    marginTop: SPACING.XS
  }
} as const;

// 颜色常量
export const COLORS = {
  PRIMARY: '#1890ff',
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#ff4d4f',
  INFO: '#722ed1',
  TEXT_PRIMARY: '#262626',
  TEXT_SECONDARY: '#8c8c8c',
  TEXT_DISABLED: '#bfbfbf',
  BORDER_DEFAULT: '#d9d9d9',
  BORDER_SPLIT: '#f0f0f0',
  BACKGROUND_LIGHT: '#fafafa'
} as const;

// 响应式断点
export const BREAKPOINTS = {
  XS: 480,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1600
} as const;

// 动画持续时间
export const ANIMATIONS = {
  FAST: '0.1s',
  NORMAL: '0.3s',
  SLOW: '0.5s'
} as const;

// 分页默认配置
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
  SHOW_SIZE_CHANGER: true,
  SHOW_QUICK_JUMPER: true,
  SHOW_TOTAL: (total: number) => `共 ${total} 条记录`
} as const;

// 通用样式类名
export const CSS_CLASSES = {
  CONTAINER: 'ui-container',
  CARD: 'ui-card',
  CARD_HEADER: 'ui-card-header',
  CARD_BODY: 'ui-card-body',
  TABLE_CONTAINER: 'ui-table-container',
  FORM_CONTAINER: 'ui-form-container',
  LOADING_OVERLAY: 'ui-loading-overlay',
  EMPTY_STATE: 'ui-empty-state',
  ERROR_STATE: 'ui-error-state',
  STATUS_INDICATOR: 'ui-status-indicator',
  BREADCRUMB: 'ui-breadcrumb',
  PAGE_HEADER: 'ui-page-header',
  ACTION_BAR: 'ui-action-bar'
} as const;

// 标准化消息文本
export const MESSAGES = {
  LOADING: '加载中...',
  SAVING: '保存中...',
  PROCESSING: '处理中...',
  SUCCESS: '操作成功',
  ERROR: '操作失败',
  NETWORK_ERROR: '网络连接失败',
  SERVER_ERROR: '服务器错误',
  PERMISSION_DENIED: '权限不足',
  DATA_NOT_FOUND: '未找到数据',
  CONFIRM_DELETE: '确定要删除这条数据吗？',
  CONFIRM_SAVE: '确定要保存修改吗？',
  REQUIRED_FIELD: '此字段为必填项',
  INVALID_FORMAT: '格式不正确',
  UPLOAD_SUCCESS: '上传成功',
  UPLOAD_FAILED: '上传失败',
  COPY_SUCCESS: '复制成功',
  COPY_FAILED: '复制失败'
} as const;

// 标准化工具提示文本
export const TOOLTIPS = {
  EDIT: '编辑',
  DELETE: '删除',
  VIEW: '查看详情',
  CONFIG: '配置',
  REFRESH: '刷新',
  SEARCH: '搜索',
  FILTER: '筛选',
  EXPORT: '导出',
  IMPORT: '导入',
  COPY: '复制',
  DOWNLOAD: '下载',
  SETTINGS: '设置',
  HELP: '帮助',
  CLOSE: '关闭',
  SAVE: '保存',
  CANCEL: '取消',
  CONFIRM: '确认',
  BACK: '返回',
  NEXT: '下一步',
  PREVIOUS: '上一步',
  FINISH: '完成',
  SUBMIT: '提交'
} as const;

// 业务相关状态
export const BUSINESS_STATUS = {
  ACTIVE: {
    text: '启用',
    color: COLORS.SUCCESS
  },
  INACTIVE: {
    text: '禁用',
    color: COLORS.ERROR
  },
  PENDING: {
    text: '待处理',
    color: COLORS.WARNING
  },
  PROCESSING: {
    text: '处理中',
    color: COLORS.INFO
  },
  COMPLETED: {
    text: '已完成',
    color: COLORS.SUCCESS
  },
  FAILED: {
    text: '失败',
    color: COLORS.ERROR
  }
} as const;

// 生成模式相关
export const GENERATION_MODES = {
  SINGLE_STAGE: {
    value: 'single_stage',
    label: '单阶段生成',
    description: '直接从业务描述生成测试用例',
    color: COLORS.SUCCESS,
    icon: '⚡'
  },
  TWO_STAGE: {
    value: 'two_stage',
    label: '两阶段生成',
    description: '先生成测试点，再生成测试用例',
    color: COLORS.PRIMARY,
    icon: '🔧'
  }
} as const;

// 标准化表格列配置
export const TABLE_COLUMN_DEFAULTS = {
  ALIGN: 'left',
  SORTABLE: true,
  FILTERABLE: true,
  RESIZABLE: true,
  ELLIPSIS: true,
  WIDTH: 120
} as const;

// 表格特殊列宽度
export const TABLE_COLUMN_WIDTHS = {
  ID: 80,
  STATUS: 100,
  ACTIONS: 150,
  DATE: 180,
  USER: 120,
  TYPE: 100,
  NAME: 200,
  DESCRIPTION: 250
} as const;

// 标准化抽屉/弹窗配置
export const MODAL_DEFAULTS = {
  WIDTH: {
    SMALL: 520,
    MEDIUM: 800,
    LARGE: 1000,
    EXTRA_LARGE: 1200
  },
  CENTERED: true,
  MASK_CLOSABLE: false,
  DESTROY_ON_CLOSE: true
} as const;

export default {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  CARD_STYLES,
  TABLE_STYLES,
  BUTTON_STYLES,
  FORM_STYLES,
  COLORS,
  BREAKPOINTS,
  ANIMATIONS,
  PAGINATION_DEFAULTS,
  CSS_CLASSES,
  MESSAGES,
  TOOLTIPS,
  BUSINESS_STATUS,
  GENERATION_MODES,
  TABLE_COLUMN_DEFAULTS,
  TABLE_COLUMN_WIDTHS,
  MODAL_DEFAULTS
};