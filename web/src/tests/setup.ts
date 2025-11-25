// 测试环境设置文件
// 提供浏览器环境的模拟和全局配置

// Mock WebSocket for tests
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {}

  send(data: string): void {}
  close(code?: number, reason?: string): void {}
}

// Setup global browser-like environment
Object.defineProperty(global, 'window', {
  value: {
    location: {
      protocol: 'http:',
      hostname: 'localhost',
      host: 'localhost:8000'
    }
  },
  writable: true
});

Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

// Suppress console output for cleaner test output
global.console = {
  ...console,
  log: console.log || (() => {}),
  warn: console.warn || (() => {}),
  error: console.error || (() => {}),
  info: console.info || (() => {})
};

console.log('测试环境已初始化');