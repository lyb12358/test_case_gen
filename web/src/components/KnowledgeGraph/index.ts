// Core components - React 19 compatible
export { default as Graph } from './Graph';
export { default as BaseNode } from './BaseNode';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as OptimizedKnowledgeGraph } from './OptimizedKnowledgeGraph';

// Node system
export { nodeRegistry, useNodeRegistry, registerNode } from './NodeRegistry';
export { withKnowledgeGraphErrorBoundary, useKnowledgeGraphErrorBoundary } from './ErrorBoundary';

// 新架构节点组件 - React 19 compatible
// Import all nodes to ensure they register themselves
import './nodes/TSPRootNode';
import './nodes/ProjectNode';
import './nodes/BusinessTypeNode';
import './nodes/UnifiedTestNode';
import './nodes/InterfaceNode';

export { default as TSPRootNode } from './nodes/TSPRootNode';
export { default as ProjectNode } from './nodes/ProjectNode';
export { default as BusinessTypeNode } from './nodes/BusinessTypeNode';
export { default as UnifiedTestNode } from './nodes/UnifiedTestNode';
export { default as InterfaceNode } from './nodes/InterfaceNode';

// 保留一些可能还在使用的旧组件（如有需要可后续移除）
export { default as BusinessCardNode } from './nodes/BusinessCardNode';