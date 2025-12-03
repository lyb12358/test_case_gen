import React from 'react';
import { Card, Typography } from 'antd';
import { BaseNodeData } from './BaseNode';

const { Text } = Typography;

/**
 * Node component type definition
 */
export type NodeComponentType = React.ComponentType<{
  id: string;
  data: BaseNodeData;
  density?: 'compact' | 'normal' | 'spacious';
  onClick?: (data: BaseNodeData) => void;
  className?: string;
  style?: React.CSSProperties;
}>;

/**
 * Node registry configuration
 */
interface NodeRegistration {
  component: NodeComponentType;
  displayName: string;
  description?: string;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
}

/**
 * Node Registry with factory pattern for dynamic node component management
 * Supports React 19 strict mode and provides memoization
 */
class NodeRegistry {
  private static instance: NodeRegistry;
  private registrations: Map<string, NodeRegistration> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Register a new node component
   */
  register(
    nodeType: string,
    registration: NodeRegistration
  ): void {
    this.registrations.set(nodeType, registration);
  }

  /**
   * Unregister a node component
   */
  unregister(nodeType: string): boolean {
    return this.registrations.delete(nodeType);
  }

  /**
   * Get a registered node component
   */
  getComponent(nodeType: string): NodeComponentType | null {
    const registration = this.registrations.get(nodeType);
    return registration?.component || null;
  }

  /**
   * Get node registration information
   */
  getRegistration(nodeType: string): NodeRegistration | null {
    return this.registrations.get(nodeType) || null;
  }

  /**
   * Check if a node type is registered
   */
  isRegistered(nodeType: string): boolean {
    return this.registrations.has(nodeType);
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get all registration information
   */
  getAllRegistrations(): Record<string, NodeRegistration> {
    const result: Record<string, NodeRegistration> = {};
    this.registrations.forEach((registration, nodeType) => {
      result[nodeType] = registration;
    });
    return result;
  }

  /**
   * Create a node component factory function
   */
  createNodeFactory() {
    return (nodeType: string, props: {
      id: string;
      data: BaseNodeData;
      density?: 'compact' | 'normal' | 'spacious';
      onClick?: (data: BaseNodeData) => void;
      className?: string;
      style?: React.CSSProperties;
    }) => {
      const Component = this.getComponent(nodeType);

      if (!Component) {
        console.warn(`Node type '${nodeType}' is not registered. Using fallback component.`);
        return this.createFallbackComponent(props);
      }

      return <Component {...props} />;
    };
  }

  /**
   * Create a fallback component for unregistered node types
   */
  private createFallbackComponent(props: {
    id: string;
    data: BaseNodeData;
    density?: 'compact' | 'normal' | 'spacious';
    onClick?: (data: BaseNodeData) => void;
    className?: string;
    style?: React.CSSProperties;
  }) {
    const FallbackComponent: React.FC = () => {

      return (
        <Card
          hoverable={!!props.onClick}
          className={props.className}
          style={{
            width: 200,
            minHeight: 80,
            borderRadius: 8,
            border: '1px solid #d9d9d9',
            cursor: props.onClick ? 'pointer' : 'default',
            ...props.style
          }}
          onClick={() => props.onClick?.(props.data)}
          size="small"
        >
          <div>
            <Text strong>{props.data.label || props.data.id}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {props.data.type} (未注册)
            </Text>
          </div>
        </Card>
      );
    };

    return <FallbackComponent />;
  }

  /**
   * Clear all registrations (useful for testing or reset)
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get node size information
   */
  getNodeSize(nodeType: string): { width: number; height: number } {
    const registration = this.registrations.get(nodeType);

    if (registration?.defaultSize) {
      return registration.defaultSize;
    }

    // Default sizes based on node type
    const defaultSizes: Record<string, { width: number; height: number }> = {
      tsp: { width: 320, height: 280 },
      project: { width: 380, height: 240 },
      business: { width: 340, height: 220 },
      test_case: { width: 340, height: 200 },
      interface: { width: 150, height: 95 },
      scenario: { width: 180, height: 120 }
    };

    return defaultSizes[nodeType] || { width: 200, height: 100 };
  }

  /**
   * Register multiple nodes at once
   */
  registerBatch(nodes: Record<string, NodeRegistration>): void {
    Object.entries(nodes).forEach(([nodeType, registration]) => {
      this.register(nodeType, registration);
    });
  }
}

/**
 * Export singleton instance
 */
export const nodeRegistry = NodeRegistry.getInstance();

/**
 * Export the NodeRegistry class for type definitions
 */
export { NodeRegistry };

/**
 * Higher-order component to register a node component
 */
export const registerNode = (
  nodeType: string,
  displayName?: string,
  options?: Omit<NodeRegistration, 'component'>
) => {
  return (Component: NodeComponentType) => {
    nodeRegistry.register(nodeType, {
      component: Component,
      displayName: displayName || nodeType,
      ...options
    });
    return Component;
  };
};

/**
 * Hook to access node registry in React components
 */
export const useNodeRegistry = () => {
  const createNode = React.useCallback(nodeRegistry.createNodeFactory(), []);

  return {
    createNode,
    getComponent: React.useCallback((nodeType: string) => nodeRegistry.getComponent(nodeType), []),
    isRegistered: React.useCallback((nodeType: string) => nodeRegistry.isRegistered(nodeType), []),
    getRegisteredTypes: React.useCallback(() => nodeRegistry.getRegisteredTypes(), []),
    getNodeSize: React.useCallback((nodeType: string) => nodeRegistry.getNodeSize(nodeType), []),
    register: React.useCallback((
      nodeType: string,
      registration: NodeRegistration
    ) => nodeRegistry.register(nodeType, registration), []),
    unregister: React.useCallback((nodeType: string) => nodeRegistry.unregister(nodeType), [])
  };
};

export default nodeRegistry;