// 知识图谱设计系统 - 5色配色方案和玻璃拟态效果

export const KnowledgeGraphColors = {
  // 5色配色系统
  tsp: {
    primary: '#1e40af',      // 深蓝色 - TSP根节点
    light: '#3b82f6',        // 浅蓝色
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
    shadow: 'rgba(30, 64, 175, 0.3)',
  },

  project: {
    primary: '#2563eb',      // 蓝色 - 项目节点
    light: '#3b82f6',        // 亮蓝色
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    shadow: 'rgba(37, 99, 235, 0.3)',
  },

  business: {
    primary: '#9333ea',      // 紫色 - 业务类型（统一）
    light: '#a855f7',        // 亮紫色
    gradient: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
    shadow: 'rgba(147, 51, 234, 0.3)',
  },

  testPoint: {
    primary: '#0ea5e9',      // 浅蓝色 - 测试点
    light: '#38bdf8',        // 亮浅蓝
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    shadow: 'rgba(14, 165, 233, 0.3)',
  },

  testCase: {
    primary: '#16a34a',      // 深绿色 - 完成的测试用例
    light: '#22c55e',        // 亮绿色
    error: '#dc2626',         // 红色 - 错误/失败的测试用例
    warning: '#f59e0b',      // 橙色 - 警告状态
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    errorGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: 'rgba(22, 163, 74, 0.3)',
    errorShadow: 'rgba(220, 38, 38, 0.3)',
  },
} as const;

// 基础样式定义 - 避免循环引用
const baseGlassCard = {
  backdropFilter: 'blur(10px)',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
};

const baseHoverEffect = {
  transform: 'scale(1.05) translateY(-2px)',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
  background: 'rgba(255, 255, 255, 0.15)',
};

const baseShimmerAfter = {
  content: '""',
  position: 'absolute' as const,
  top: 0,
  left: '-100%',
  width: '100%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
  transition: 'left 0.6s ease-out',
};

// 玻璃拟态效果样式 - 增强版
export const GlassStyles = {
  // 基础玻璃卡片
  glassCard: baseGlassCard,

  // 分层玻璃效果 - 根据节点层级调整透明度
  layeredGlass: (level: number) => ({
    backdropFilter: 'blur(10px)',
    background: `rgba(255, 255, 255, ${0.15 - level * 0.02})`, // 层级越高透明度越低
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: `${12 - level}px`, // 层级越高圆角越小
    boxShadow: `0 ${8 + level * 2}px ${32 + level * 8}px rgba(0, 0, 0, ${0.1 + level * 0.05})`,
  }),

  // 悬停效果
  hoverEffect: baseHoverEffect,

  // 选中效果
  selectedEffect: {
    transform: 'scale(1.08) translateY(-4px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    background: 'rgba(255, 255, 255, 0.2)',
  },

  // 标签玻璃效果
  glassLabel: {
    backdropFilter: 'blur(8px)',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  // 连接线样式
  connectionLine: {
    strokeWidth: 2,
    stroke: 'rgba(255, 255, 255, 0.4)',
    strokeDasharray: '0',
  },

  // 动画过渡
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

  // 悬停光晕效果
  hoverGlow: {
    '&:hover': {
      ...baseHoverEffect,
      '&::before': {
        content: '""',
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'inherit',
        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
        animation: 'pulse 2s ease-in-out infinite',
        pointerEvents: 'none' as const,
        zIndex: -1,
      },
    },
  },

  // 脉冲动画
  pulse: {
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 1,
      },
      '50%': {
        transform: 'scale(1.05)',
        opacity: 0.8,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
  },

  // 微光扫描动画
  shimmerScan: {
    '&:hover::after': {
      ...baseShimmerAfter,
      left: '100%',
    },
  },

  // 微光效果
  shimmer: {
    position: 'relative' as const,
    overflow: 'hidden',
  },

  shimmerAfter: baseShimmerAfter,
};

// 节点尺寸配置 - 优化字体大小提高可读性
export const NodeSizes = {
  tsp: { width: 280, height: 140, fontSize: 16, iconSize: 24, labelFontSize: 14 },
  project: { width: 220, height: 120, fontSize: 14, iconSize: 20, labelFontSize: 12 },
  business: { width: 180, height: 100, fontSize: 12, iconSize: 18, labelFontSize: 11 },
  testCase: { width: 160, height: 80, fontSize: 10, iconSize: 16, labelFontSize: 9 },
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