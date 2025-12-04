// 知识图谱现代化样式系统 - 2024年最佳实践
// 基于色彩理论和UI/UX设计原则的科学配色体系

export const KnowledgeGraphColors = {
  // 统一主色调配置 - 基于HSL色彩空间，饱和度60-80%，明度45-55%
  tsp: {
    primary: '#1e40af',      // 深蓝色 - TSP根节点 (保持不变)
    light: '#3b82f6',        // 浅蓝色
    dark: '#1e3a8a',         // 深色变体
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
    shadow: 'rgba(30, 64, 175, 0.15)',
    surface: 'rgba(30, 64, 175, 0.05)',
    hover: 'rgba(30, 64, 175, 0.08)',
    active: 'rgba(30, 64, 175, 0.12)',
  },

  project: {
    primary: '#16a34a',      // 绿色 - 项目节点 (从蓝色修正为绿色)
    light: '#22c55e',        // 亮绿色
    dark: '#15803d',         // 深色变体
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    shadow: 'rgba(22, 163, 74, 0.15)',
    surface: 'rgba(22, 163, 74, 0.05)',
    hover: 'rgba(22, 163, 74, 0.08)',
    active: 'rgba(22, 163, 74, 0.12)',
  },

  business: {
    primary: '#9333ea',      // 紫色 - 业务类型（保持不变）
    light: '#a855f7',        // 亮紫色
    dark: '#6b21a8',         // 深色变体
    gradient: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
    shadow: 'rgba(147, 51, 234, 0.15)',
    surface: 'rgba(147, 51, 234, 0.05)',
    hover: 'rgba(147, 51, 234, 0.08)',
    active: 'rgba(147, 51, 234, 0.12)',
  },

  testPoint: {
    primary: '#0ea5e9',      // 浅蓝色 - 测试点（保持不变）
    light: '#38bdf8',        // 亮浅蓝
    dark: '#0369a1',         // 深色变体
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    shadow: 'rgba(14, 165, 233, 0.15)',
    surface: 'rgba(14, 165, 233, 0.05)',
    hover: 'rgba(14, 165, 233, 0.08)',
    active: 'rgba(14, 165, 233, 0.12)',
  },

  testCase: {
    primary: '#06b6d4',      // 青色 - 测试用例 (从绿色修正为青色)
    light: '#22d3ee',        // 亮青色
    dark: '#0e7490',         // 深色变体
    error: '#dc2626',         // 红色 - 错误/失败的测试用例
    warning: '#f59e0b',      // 橙色 - 警告状态
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    errorGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: 'rgba(6, 182, 212, 0.15)',
    errorShadow: 'rgba(220, 38, 38, 0.15)',
    surface: 'rgba(6, 182, 212, 0.05)',
    hover: 'rgba(6, 182, 212, 0.08)',
    active: 'rgba(6, 182, 212, 0.12)',
  },
} as const;

// 统一的子项颜色编码系统 - 语义化颜色定义
export const SemanticColors = {
  // 基于内容类型的统一颜色编码
  testPoint: {
    primary: '#0ea5e9',      // 浅蓝色 - 所有测试点统一使用
    background: 'rgba(14, 165, 233, 0.08)',
    icon: '#0ea5e9',
    text: '#0c4a6e',
  },

  testCase: {
    primary: '#06b6d4',      // 青色 - 所有测试用例统一使用
    background: 'rgba(6, 182, 212, 0.08)',
    icon: '#06b6d4',
    text: '#164e63',
  },

  businessType: {
    primary: '#9333ea',      // 紫色 - 所有业务类型统一使用
    background: 'rgba(147, 51, 234, 0.08)',
    icon: '#9333ea',
    text: '#581c87',
  },

  project: {
    primary: '#16a34a',      // 绿色 - 项目统计相关
    background: 'rgba(22, 163, 74, 0.08)',
    icon: '#16a34a',
    text: '#14532d',
  },

  scenario: {
    primary: '#f59e0b',      // 橙色 - 场景相关
    background: 'rgba(245, 158, 11, 0.08)',
    icon: '#f59e0b',
    text: '#78350f',
  },
} as const;

// 状态颜色系统 - 符合WCAG AA标准
export const StatusColors = {
  draft: {
    bg: '#f8fafc',
    text: '#64748b',
    border: '#e2e8f0'
  },
  approved: {
    bg: '#f0fdf4',
    text: '#166534',
    border: '#bbf7d0'
  },
  completed: {
    bg: '#eff6ff',
    text: '#1e40af',
    border: '#bfdbfe'
  },
  error: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca'
  },
  warning: {
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fed7aa'
  },
} as const;

// 优先级颜色系统
export const PriorityColors = {
  low: {
    bg: '#f0fdf4',
    text: '#166534',
    border: '#bbf7d0'
  },
  medium: {
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fed7aa'
  },
  high: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca'
  },
} as const;

// 统一阴影系统
export const ShadowLevels = {
  small: '0 1px 2px rgba(0, 0, 0, 0.05)',
  medium: '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
  large: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
  colored: (color: string) => `0 4px 14px ${color}20`, // 20% opacity
} as const;

// 现代化卡片样式系统 - 优化对比度和可读性
export const ModernCardStyles = {
  // 基础白色背景卡片样式 - 统一阴影系统
  card: {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: ShadowLevels.medium,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  },

  // 悬停效果 - 优化阴影层次
  hoverCard: {
    boxShadow: ShadowLevels.large,
    transform: 'translateY(-2px)',
    background: '#ffffff',
  },

  // 选中效果 - 使用节点主色调
  selectedCard: (nodeType: string) => ({
    border: `3px solid ${getNodeColors(nodeType).primary}40`,
    boxShadow: ShadowLevels.colored(getNodeColors(nodeType).primary),
    background: '#ffffff',
  }),

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

  // 标题区域 - 符合WCAG AA标准的对比度
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827', // 深灰色，对比度 > 7:1
    lineHeight: '1.4',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // 副标题区域 - 优化可读性
  subtitle: {
    fontSize: '12px',
    color: '#374151', // 中灰色，对比度 > 4.5:1
    lineHeight: '1.3',
    flex: 1,
  },

  // 多行文本区域（智能截断）- 确保可读性
  multilineText: {
    fontSize: '12px',
    color: '#4b5563', // 较深灰色，确保可读性
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

  // 统计信息区域 - 优化文字颜色
  statsContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
    fontSize: '11px',
    color: '#6b7280', // 深灰色，确保可读性
  },

  // 状态标签样式 - 使用状态颜色系统
  statusTag: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },

  // 优先级标签 - 使用优先级颜色系统
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

// 白色背景节点边框样式配置 - 使用修正后的配色
export const WhiteBackgroundNodeStyles = {
  // TSP节点样式 - 深蓝色边框 (保持不变)
  tsp: {
    ...ModernCardStyles.card,
    minWidth: '240px',
    maxWidth: '320px',
    minHeight: '80px',
    borderColor: KnowledgeGraphColors.tsp.primary,
    borderWidth: '3px',
  },

  // 项目节点样式 - 绿色边框 (从蓝色修正为绿色)
  project: {
    ...ModernCardStyles.card,
    minWidth: '200px',
    maxWidth: '280px',
    minHeight: '70px',
    borderColor: KnowledgeGraphColors.project.primary,
    borderWidth: '3px',
  },

  // 业务类型节点样式 - 紫色边框 (保持不变)
  business: {
    ...ModernCardStyles.card,
    minWidth: '180px',
    maxWidth: '240px',
    minHeight: '60px',
    borderColor: KnowledgeGraphColors.business.primary,
    borderWidth: '3px',
  },

  // 测试点节点样式 - 浅蓝色边框 (保持不变)
  testPoint: {
    ...ModernCardStyles.card,
    minWidth: '160px',
    maxWidth: '220px',
    minHeight: '50px',
    borderColor: KnowledgeGraphColors.testPoint.primary,
    borderWidth: '2px',
  },

  // 测试用例节点样式 - 青色边框 (从绿色修正为青色)
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


// 工具函数 - 使用修正后的配色系统
export const getNodeColors = (nodeType: string, status?: string) => {
  switch (nodeType) {
    case 'tsp':
      return KnowledgeGraphColors.tsp;
    case 'project':
      return KnowledgeGraphColors.project; // 现在是绿色
    case 'business_type':
      return KnowledgeGraphColors.business;
    case 'test_point':
      return KnowledgeGraphColors.testPoint;
    case 'test_case':
      // 基础颜色现在是青色 (#06b6d4)
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
      return KnowledgeGraphColors.testCase; // 现在是青色
    default:
      return KnowledgeGraphColors.business;
  }
};

// 获取语义化颜色的工具函数
export const getSemanticColors = (semanticType: string) => {
  switch (semanticType) {
    case 'testPoint':
    case 'test_point':
      return SemanticColors.testPoint;
    case 'testCase':
    case 'test_case':
      return SemanticColors.testCase;
    case 'businessType':
    case 'business_type':
      return SemanticColors.businessType;
    case 'project':
      return SemanticColors.project;
    case 'scenario':
      return SemanticColors.scenario;
    default:
      return SemanticColors.testPoint;
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