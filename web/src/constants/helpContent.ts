// 帮助内容配置

import type { components } from '../types/api';

// 从生成的API类型中提取业务类型
export type BusinessType = components['schemas']['BusinessType'];

export interface HelpContent {
  title: string;
  description: string;
  example?: string;
  validation?: string;
  tips?: string[];
  links?: Array<{
    title: string;
    url: string;
    type?: 'doc' | 'video';
  }>;
}

export interface ShortcutConfig {
  key: string;
  description: string;
  category?: string;
}

// 业务类型帮助配置 - 使用生成的API类型
export const BUSINESS_TYPE_HELP: Record<BusinessType, HelpContent> = {
  rcc: {
    title: '远程净化控制 (RCC)',
    description: '远程控制车内空气净化系统，包括开启/关闭净化、调节净化强度等功能。',
    tips: [
      '需要确保车辆处于通电状态',
      '净化等级分为1-5级，数字越大净化能力越强',
      '支持定时净化功能'
    ],
    links: [
      {
        title: 'RCC功能详细说明',
        url: '/docs/business/rcc',
        type: 'doc'
      }
    ]
  },
  rfd: {
    title: '远程香氛控制 (RFD)',
    description: '远程控制车载香氛系统，包括香氛开启/关闭、浓度调节等功能。',
    tips: [
      '需要车辆配备香氛系统',
      '支持多种香氛类型选择',
      '浓度调节分为低、中、高三档'
    ]
  },
  zab: {
    title: '远程恒温座舱设置 (ZAB)',
    description: '远程设置车内目标温度，实现座舱恒温控制。',
    tips: [
      '温度设置范围：16°C - 32°C',
      '支持快速制热/制冷模式',
      '可设置左右分区温度'
    ]
  }
};

// 表单字段帮助
export const FORM_FIELD_HELP: Record<string, HelpContent> = {
  business_type: {
    title: '业务类型',
    description: '选择要生成测试用例的TSP业务类型。不同业务类型对应不同的远程控制功能。',
    example: 'RCC - 远程净化控制',
    tips: [
      '首次使用建议选择简单的业务类型',
      '确保业务描述完整准确',
      '复杂业务建议使用两阶段生成'
    ]
  },
  two_stage_generation: {
    title: '两阶段生成',
    description: '系统采用两阶段生成流程：先生成测试点，再基于测试点生成详细测试用例。',
    tips: [
      '阶段1：生成结构化的测试点',
      '阶段2：基于测试点生成详细的测试用例',
      '建议先检查测试点和测试用例的提示词组合配置是否完整'
    ]
  },
  prompt_content: {
    title: '提示词内容',
    description: '用于指导AI生成测试用例的指令文本。提示词质量直接影响生成结果。',
    validation: '长度应在50-2000字符之间',
    tips: [
      '明确指定测试场景和边界条件',
      '包含具体的输入输出要求',
      '添加异常处理说明'
    ],
    example: '请为远程净化控制功能生成测试用例，包括正常场景、边界场景和异常场景。'
  },
  generation_stage: {
    title: '生成阶段',
    description: '指定提示词适用的生成阶段，确保在正确的阶段使用对应的提示词。',
    tips: [
      'single_stage：用于一次性生成完整测试用例',
      'two_stage_test_point：用于两阶段生成中的测试点生成',
      'two_stage_test_case：用于两阶段生成中的测试用例生成'
    ]
  }
};

// 页面级帮助
export const PAGE_HELP: Record<string, {
  title: string;
  description: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  shortcuts?: ShortcutConfig[];
  links?: Array<{
    title: string;
    url: string;
    type?: 'doc' | 'video';
  }>;
}> = {
  dashboard: {
    title: '仪表盘',
    description: '系统概览页面，显示测试用例生成状态、统计数据和系统健康状况。',
    sections: [
      {
        title: '功能概览',
        content: '仪表盘提供了系统的实时状态监控，包括：\n• 测试用例生成统计\n• 任务执行状态\n• 系统性能指标\n• 最近活动记录'
      },
      {
        title: '快速操作',
        content: '从仪表盘可以快速访问：\n• 创建新的测试用例生成任务\n• 查看最近生成的测试用例\n• 管理业务类型配置\n• 查看系统日志'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+N', description: '新建测试用例', category: '仪表盘' },
      { key: 'Ctrl+R', description: '刷新数据', category: '仪表盘' }
    ]
  },
  test_case_generation: {
    title: '测试用例生成',
    description: '配置和启动测试用例生成任务的核心页面。',
    sections: [
      {
        title: '生成流程',
        content: '1. 选择业务类型\n2. 检查配置状态\n3. 选择生成模式\n4. 启动生成任务\n5. 监控生成进度\n6. 查看生成结果'
      },
      {
        title: '配置检查',
        content: '启动生成前，系统会自动检查：\n• 提示词配置完整性\n• 业务描述文件有效性\n• 系统资源可用性\n• 网络连接状态'
      },
      {
        title: '进度监控',
        content: '生成过程中可以实时查看：\n• 当前执行步骤\n• 完成进度百分比\n• 预计剩余时间\n• 错误信息（如有）'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+S', description: '开始生成', category: '测试用例生成' },
      { key: 'Ctrl+P', description: '暂停生成', category: '测试用例生成' }
    ],
    links: [
      {
        title: '测试用例生成指南',
        url: '/docs/guide/test-case-generation',
        type: 'doc'
      },
      {
        title: '生成模式对比视频',
        url: '/videos/generation-modes',
        type: 'video'
      }
    ]
  },
  prompt_management: {
    title: '提示词管理',
    description: '管理AI生成测试用例所使用的提示词，包括创建、编辑、版本控制等功能。',
    sections: [
      {
        title: '提示词类型',
        content: '• 系统提示词：控制AI行为的基础指令\n• 业务提示词：特定业务场景的专业指令\n• 模板提示词：可复用的提示词框架\n• 共享内容：可在多个提示词中复用的内容'
      },
      {
        title: '版本管理',
        content: '每个提示词支持版本控制：\n• 自动保存历史版本\n• 支持版本对比\n• 可回滚到历史版本\n• 版本变更记录追踪'
      },
      {
        title: '分类组织',
        content: '使用分类系统组织提示词：\n• 按业务类型分类\n• 按功能分类\n• 按生成阶段分类\n• 自定义标签'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+E', description: '编辑提示词', category: '提示词管理' },
      { key: 'Ctrl+D', description: '复制提示词', category: '提示词管理' },
      { key: 'Ctrl+Shift+N', description: '新建版本', category: '提示词管理' }
    ]
  },
  business_management: {
    title: '业务管理',
    description: '配置和管理TSP业务类型，包括生成模式设置和提示词组合配置。',
    sections: [
      {
        title: '业务类型配置',
        content: '为每个业务类型配置：\n• 生成模式（单阶段/两阶段）\n• 提示词组合\n• 优先级和调度策略\n• 自定义参数'
      },
      {
        title: '配置模板',
        content: '使用预设模板快速配置：\n• 简单业务模板：适合基础功能\n• 复杂业务模板：适合多功能场景\n• 行业专用模板：针对特定行业优化'
      },
      {
        title: '批量操作',
        content: '支持批量配置多个业务类型：\n• 批量应用配置模板\n• 批量修改生成模式\n• 批量更新提示词组合'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+A', description: '全选业务类型', category: '业务管理' },
      { key: 'Ctrl+Shift+C', description: '批量配置', category: '业务管理' }
    ]
  }
};

// 错误信息帮助
export const ERROR_HELP: Record<string, {
  title: string;
  description: string;
  solutions: string[];
  preventions?: string[];
}> = {
  network_error: {
    title: '网络连接错误',
    description: '无法连接到服务器，可能是网络问题或服务器故障。',
    solutions: [
      '检查网络连接是否正常',
      '刷新页面重试',
      '检查防火墙设置',
      '联系系统管理员'
    ],
    preventions: [
      '确保网络连接稳定',
      '定期检查服务器状态'
    ]
  },
  generation_failed: {
    title: '测试用例生成失败',
    description: '测试用例生成过程中出现错误，可能是配置问题或系统资源不足。',
    solutions: [
      '检查业务类型配置是否完整',
      '确认提示词内容格式正确',
      '检查系统资源使用情况',
      '查看详细错误日志',
      '重新生成测试用例'
    ],
    preventions: [
      '启动前检查配置完整性',
      '定期维护系统资源',
      '备份重要配置数据'
    ]
  },
  prompt_invalid: {
    title: '提示词格式错误',
    description: '提示词内容不符合要求，可能导致生成结果不理想。',
    solutions: [
      '检查提示词长度是否符合要求',
      '确认内容格式正确',
      '移除特殊字符',
      '参考标准提示词模板'
    ],
    preventions: [
      '使用提示词编辑器实时验证',
      '定期检查提示词质量'
    ]
  }
};

// 快捷键配置
export const GLOBAL_SHORTCUTS: ShortcutConfig[] = [
  { key: 'Ctrl+/', description: '显示快捷键帮助', category: '通用' },
  { key: 'Ctrl+K', description: '全局搜索', category: '通用' },
  { key: 'Ctrl+Shift+P', description: '命令面板', category: '通用' },
  { key: 'F11', description: '全屏模式', category: '通用' },
  { key: 'Esc', description: '关闭弹窗/取消操作', category: '通用' },
  { key: 'Ctrl+S', description: '保存当前内容', category: '通用' },
  { key: 'Ctrl+Z', description: '撤销操作', category: '通用' },
  { key: 'Ctrl+Y', description: '重做操作', category: '通用' }
];

// 引导步骤配置
export const GUIDED_TOURS: Record<string, Array<{
  title: string;
  content: string;
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}>> = {
  first_time_user: [
    {
      title: '欢迎使用TSP测试用例生成系统',
      content: '这是一个智能的测试用例生成平台，帮助您快速创建高质量的测试用例。',
      target: '.app-layout',
      placement: 'bottom'
    },
    {
      title: '选择项目',
      content: '首先选择您要工作的项目，不同项目有独立的配置和数据。',
      target: '.project-switcher',
      placement: 'bottom'
    },
    {
      title: '仪表盘概览',
      content: '仪表盘显示系统状态和统计信息，您可以快速了解当前情况。',
      target: '.dashboard-content',
      placement: 'top'
    },
    {
      title: '开始生成测试用例',
      content: '点击这里开始生成测试用例，系统会引导您完成配置。',
      target: '.nav-test-cases',
      placement: 'right'
    }
  ],
  test_case_generation: [
    {
      title: '选择业务类型',
      content: '选择要生成测试用例的业务类型，系统会显示推荐的配置。',
      target: '.business-type-selector',
      placement: 'bottom'
    },
    {
      title: '配置检查',
      content: '系统会自动检查配置完整性，如果配置不全会给出提示。',
      target: '.config-check',
      placement: 'top'
    },
    {
      title: '生成模式',
      content: '根据业务复杂度选择合适的生成模式，复杂业务建议使用两阶段生成。',
      target: '.generation-mode',
      placement: 'right'
    },
    {
      title: '进度监控',
      content: '生成过程中可以实时查看进度，了解当前执行步骤。',
      target: '.progress-monitor',
      placement: 'left'
    }
  ]
};

export default {
  BUSINESS_TYPE_HELP,
  FORM_FIELD_HELP,
  PAGE_HELP,
  ERROR_HELP,
  GLOBAL_SHORTCUTS,
  GUIDED_TOURS
};