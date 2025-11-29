/**
 * 服务模块统一导出
 * 提供所有服务模块的便捷导入
 *
 * 重构说明：原有的testCaseService、testPointService和unifiedTestCaseService已合并为unifiedGenerationService
 * 请使用unifiedGenerationService进行所有测试生成相关的操作
 */

// 核心服务导出
export * from './api';
// apiWrapper removed - using unified generation service
export * from './errorHandlerService';
export * from './configService';
export * from './businessService';
export * from './knowledgeGraphService';
export * from './promptService';
export * from './taskService';
export * from './projectService';
export * from './websocketService';

// 统一生成服务
export { default as unifiedGenerationService } from './unifiedGenerationService';

// ========== 已弃用的服务（请使用unifiedGenerationService）==========
// 原有的testCaseService、testPointService、unifiedTestCaseService已合并为unifiedGenerationService
// simplifiedUnifiedGenerationService 和 generationServiceBase 已移除，冗余功能已整合到 unifiedGenerationService