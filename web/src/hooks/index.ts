/**
 * Hooks模块统一导出
 * 提供所有自定义Hook的便捷导入
 */

// 新增的共享Hooks导出
export * from './useNotifications';
export * from './useBusinessTypeMapping';
export * from './useWebSocket';
export * from './useTaskGeneration';

// 便捷导出
export {
  useNotifications,
  checkNotificationSupport
} from './useNotifications';

export {
  useBusinessTypeMapping,
  useStaticBusinessTypeMapping
} from './useBusinessTypeMapping';

export {
  useWebSocket,
  useTaskWebSocket,
  useMultiTaskWebSocket
} from './useWebSocket';

export {
  useTaskGeneration
} from './useTaskGeneration';

// 类型导出
export type {
  NotificationType,
  NotificationOptions
} from './useNotifications';

export type {
  BusinessTypeConfig,
  UseBusinessTypeMappingReturn,
  UseStaticBusinessTypeMappingReturn
} from './useBusinessTypeMapping';

export type {
  UseWebSocketOptions,
  UseWebSocketReturn,
  UseTaskWebSocketOptions
} from './useWebSocket';

export type {
  TaskGenerationStatus,
  UseTaskGenerationOptions
} from './useTaskGeneration';