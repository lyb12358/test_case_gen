/**
 * WebSocket状态监控组件导出
 */

export { default as WebSocketStatusIndicator } from './WebSocketStatusIndicator';
export {
  withWebSocketStatus,
  useWebSocketStatusMonitor,
  isWebSocketError,
  getWebSocketErrorMessage
} from './withWebSocketStatus';

export type { WithWebSocketStatusOptions } from './withWebSocketStatus';