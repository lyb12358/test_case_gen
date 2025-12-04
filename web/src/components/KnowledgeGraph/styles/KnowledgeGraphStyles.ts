// 知识图谱现代化样式系统 - 2024年最佳实践

export const KnowledgeGraphColors = {
  // 5色配色系统 - 优化后的现代配色
  tsp: {
    primary: '#1e40af',      // 深蓝色 - TSP根节点
    light: '#3b82f6',        // 浅蓝色
    dark: '#1e3a8a',         // 深色变体
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
    shadow: 'rgba(30, 64, 175, 0.15)',
    surface: 'rgba(30, 64, 175, 0.05)',
  },

  project: {
    primary: '#2563eb',      // 蓝色 - 项目节点
    light: '#60a5fa',        // 亮蓝色
    dark: '#1e40af',         // 深色变体
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    shadow: 'rgba(37, 99, 235, 0.15)',
    surface: 'rgba(37, 99, 235, 0.05)',
  },

  business: {
    primary: '#9333ea',      // 紫色 - 业务类型（统一）
    light: '#a855f7',        // 亮紫色
    dark: '#6b21a8',         // 深色变体
    gradient: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
    shadow: 'rgba(147, 51, 234, 0.15)',
    surface: 'rgba(147, 51, 234, 0.05)',
  },

  testPoint: {
    primary: '#0ea5e9',      // 浅蓝色 - 测试点
    light: '#38bdf8',        // 亮浅蓝
    dark: '#0369a1',         // 深色变体
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    shadow: 'rgba(14, 165, 233, 0.15)',
    surface: 'rgba(14, 165, 233, 0.05)',
  },

  testCase: {
    primary: '#16a34a',      // 深绿色 - 完成的测试用例
    light: '#22c55e',        // 亮绿色
    dark: '#15803d',         // 深色变体
    error: '#dc2626',         // 红色 - 错误/失败的测试用例
    warning: '#f59e0b',      // 橙色 - 警告状态
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    errorGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: 'rgba(22, 163, 74, 0.15)',
    errorShadow: 'rgba(220, 38, 38, 0.15)',
    surface: 'rgba(22, 163, 74, 0.05)',
  },
} as const;

// 现代化卡片样式系统
export const ModernCardStyles = {
  // 基础白色背景卡片样式
  card: {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  },

  // 悬停效果
  hoverCard: {
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
    transform: 'translateY(-2px)',
    background: '#ffffff',
  },

  // 选中效果
  selectedCard: {
    border: '3px solid rgba(59, 130, 246, 0.6)',
    boxShadow: '0 12px 32px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(59, 130, 246, 0.1)',
    background: '#ffffff',
  },

  // 内容容器
  contentContainer: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    minHeight: '60px',
  },

  // 头部区域
  header: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: '8px',
    marginBottom: '4px',
  },

  // 标题区域 - 白色背景适配
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    lineHeight: '1.4',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // 副标题区域 - 白色背景适配
  subtitle: {
    fontSize: '12px',
    color: '#4b5563',
    lineHeight: '1.3',
    flex: 1,
  },

  // 多行文本区域（智能截断）- 白色背景适配
  multilineText: {
    fontSize: '12px',
    color: '#374151',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    wordBreak: 'break-word' as const,
    hyphens: 'auto' as const,
  },

  // 标签容器
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '4px',
  },

  // 统计信息区域
  statsContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
    fontSize: '11px',
    color: '#6b7280',
  },

  // 状态标签样式
  statusTag: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },

  // 优先级标签
  priorityTag: {
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },

  // 图标样式
  icon: {
    fontSize: '16px',
    flexShrink: 0,
  },

  // 动画过渡
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

// 白色背景节点边框样式配置
export const WhiteBackgroundNodeStyles = {
  // TSP节点样式 - 深蓝色边框
  tsp: {
    ...ModernCardStyles.card,
    minWidth: '240px',
    maxWidth: '320px',
    minHeight: '80px',
    borderColor: KnowledgeGraphColors.tsp.primary,
    borderWidth: '3px',
  },

  // 项目节点样式 - 蓝色边框
  project: {
    ...ModernCardStyles.card,
    minWidth: '200px',
    maxWidth: '280px',
    minHeight: '70px',
    borderColor: KnowledgeGraphColors.project.primary,
    borderWidth: '3px',
  },

  // 业务类型节点样式 - 紫色边框
  business: {
    ...ModernCardStyles.card,
    minWidth: '180px',
    maxWidth: '240px',
    minHeight: '60px',
    borderColor: KnowledgeGraphColors.business.primary,
    borderWidth: '3px',
  },

  // 测试点节点样式 - 浅蓝色边框
  testPoint: {
    ...ModernCardStyles.card,
    minWidth: '160px',
    maxWidth: '220px',
    minHeight: '50px',
    borderColor: KnowledgeGraphColors.testPoint.primary,
    borderWidth: '2px',
  },

  // 测试用例节点样式 - 绿色边框
  testCase: {
    ...ModernCardStyles.card,
    minWidth: '160px',
    maxWidth: '220px',
    minHeight: '50px',
    borderColor: KnowledgeGraphColors.testCase.primary,
    borderWidth: '2px',
  },
};

// 节点特定样式（保持向后兼容）
export const NodeSpecificStyles = {
  // TSP节点样式
  tsp: {
    ...ModernCardStyles.card,
    minWidth: '240px',
    maxWidth: '320px',
    minHeight: '80px',
  },

  // 项目节点样式
  project: {
    ...ModernCardStyles.card,
    minWidth: '200px',
    maxWidth: '280px',
    minHeight: '70px',
  },

  // 业务类型节点样式
  business: {
    ...ModernCardStyles.card,
    minWidth: '180px',
    maxWidth: '240px',
    minHeight: '60px',
  },

  // 测试用例节点样式
  testCase: {
    ...ModernCardStyles.card,
    minWidth: '160px',
    maxWidth: '220px',
    minHeight: '50px',
  },
};

// 响应式断点
export const Breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

// 字体大小系统
export const FontSizes = {
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
} as const;

// 间距系统
export const Spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

// 文字截断工具类
export const TextTruncation = {
  // 单行截断
  singleLine: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // 两行截断
  twoLines: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },

  // 三行截断
  threeLines: {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },

  // 自定义行数截断
  customLines: (lines: number) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  }),
};

// 节点尺寸配置 - 优化现代化设计
export const NodeSizes = {
  tsp: {
    width: 280,
    height: 140,
    fontSize: 16,
    iconSize: 24,
    labelFontSize: 14,
    minWidth: 240,
    maxWidth: 320,
    minHeight: 80,
  },
  project: {
    width: 220,
    height: 120,
    fontSize: 14,
    iconSize: 20,
    labelFontSize: 12,
    minWidth: 200,
    maxWidth: 280,
    minHeight: 70,
  },
  business: {
    width: 180,
    height: 100,
    fontSize: 13,
    iconSize: 18,
    labelFontSize: 11,
    minWidth: 180,
    maxWidth: 240,
    minHeight: 60,
  },
  testCase: {
    width: 160,
    height: 80,
    fontSize: 12,
    iconSize: 16,
    labelFontSize: 10,
    minWidth: 160,
    maxWidth: 220,
    minHeight: 50,
  },
} as const;

// 状态颜色
export const StatusColors = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  approved: { bg: '#dcfce7', text: '#16a34a' },
  completed: { bg: '#dbeafe', text: '#2563eb' },
  error: { bg: '#fee2e2', text: '#dc2626' },
  warning: { bg: '#fef3c7', text: '#d97706' },
} as const;

// 优先级颜色
export const PriorityColors = {
  low: { bg: '#f3f4f6', text: '#6b7280' },
  medium: { bg: '#fef3c7', text: '#d97706' },
  high: { bg: '#fee2e2', text: '#dc2626' },
} as const;

// 工具函数
export const getNodeColors = (nodeType: string, status?: string) => {
  switch (nodeType) {
    case 'tsp':
      return KnowledgeGraphColors.tsp;
    case 'project':
      return KnowledgeGraphColors.project;
    case 'business_type':
      return KnowledgeGraphColors.business;
    case 'test_point':
      return KnowledgeGraphColors.testPoint;
    case 'test_case':
      if (status === 'error' || status === 'failed') {
        return {
          ...KnowledgeGraphColors.testCase,
          primary: KnowledgeGraphColors.testCase.error,
          gradient: KnowledgeGraphColors.testCase.errorGradient,
          shadow: KnowledgeGraphColors.testCase.errorShadow,
        };
      } else if (status === 'warning' || status === 'draft') {
        return {
          ...KnowledgeGraphColors.testCase,
          primary: KnowledgeGraphColors.testCase.warning,
          gradient: KnowledgeGraphColors.testCase.warningGradient,
        };
      }
      return KnowledgeGraphColors.testCase;
    default:
      return KnowledgeGraphColors.business;
  }
};

export const getNodeSize = (nodeType: string) => {
  switch (nodeType) {
    case 'tsp': return NodeSizes.tsp;
    case 'project': return NodeSizes.project;
    case 'business_type': return NodeSizes.business;
    case 'test_point':
    case 'test_case': return NodeSizes.testCase;
    default: return NodeSizes.business;
  }
};

// 智能文字截断函数
export const truncateText = (text: string, maxLength: number, lines: number = 1) => {
  if (!text || text.length <= maxLength) return text;

  if (lines === 1) {
    return text.slice(0, maxLength) + '...';
  }

  // 多行截断
  return TextTruncation.customLines(lines);
};

// 计算节点尺寸（基于内容）
export const calculateNodeSize = (
  nodeType: string,
  content: { title?: string; description?: string; tags?: string[] }
) => {
  const baseSize = getNodeSize(nodeType);
  let width = baseSize.width;
  let height = baseSize.height;

  // 基于内容动态调整宽度
  if (content.title && content.title.length > 15) {
    width = Math.min(width + content.title.length * 3, baseSize.maxWidth) as typeof baseSize.width;
  }

  if (content.tags && content.tags.length > 0) {
    width = Math.min(width + content.tags.length * 20, baseSize.maxWidth) as typeof baseSize.width;
  }

  // 基于内容动态调整高度
  if (content.description && content.description.length > 50) {
    height = Math.min(height + 20, baseSize.height + 40) as typeof baseSize.height;
  }

  return { width, height, ...baseSize };
};