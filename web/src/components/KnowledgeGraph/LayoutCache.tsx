import { useMemo, useCallback } from 'react';

/**
 * Layout configuration types
 */
export type LayoutType = 'force-directed' | 'mindmap';
export type DensityLevel = 'compact' | 'normal' | 'spacious';

interface LayoutConfig {
  type: LayoutType;
  density: DensityLevel;
  nodeCount: number;
  edgeCount: number;
  timestamp: number;
}

interface CachedLayout {
  config: LayoutConfig;
  layout: any;
  positions: Map<string, { x: number; y: number }>;
}

/**
 * Layout caching system for performance optimization
 * Reduces layout calculations for repeated graph configurations
 */
class LayoutCacheManager {
  private cache = new Map<string, CachedLayout>();
  private maxCacheSize = 50;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from layout configuration
   */
  private generateCacheKey(config: LayoutConfig): string {
    return `${config.type}-${config.density}-${config.nodeCount}-${config.edgeCount}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CachedLayout): boolean {
    return Date.now() - entry.config.timestamp < this.defaultTTL;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.config.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }

    // Remove oldest entries if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].config.timestamp - b[1].config.timestamp);

      const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached layout for given configuration
   */
  get(config: LayoutConfig): any | null {
    const key = this.generateCacheKey(config);
    const entry = this.cache.get(key);

    if (!entry || !this.isCacheValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.layout;
  }

  /**
   * Store layout in cache
   */
  set(config: LayoutConfig, layout: any, positions?: Map<string, { x: number; y: number }>): void {
    const key = this.generateCacheKey(config);

    const entry: CachedLayout = {
      config: {
        ...config,
        timestamp: Date.now()
      },
      layout,
      positions: positions || new Map()
    };

    this.cache.set(key, entry);
    this.cleanupCache();
  }

  /**
   * Get cached node positions
   */
  getPositions(config: LayoutConfig): Map<string, { x: number; y: number }> | null {
    const key = this.generateCacheKey(config);
    const entry = this.cache.get(key);

    if (!entry || !this.isCacheValid(entry)) {
      return null;
    }

    return entry.positions;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      memoryUsage: this.cache.size * 1024 // Rough estimate
    };
  }

  /**
   * Precompute layout for common configurations
   */
  async precomputeLayouts(
    nodeTypes: string[],
    commonSizes: { nodes: number; edges: number }[]
  ): Promise<void> {
    const layoutTypes: LayoutType[] = ['mindmap', 'force-directed'];
    const densities: DensityLevel[] = ['compact', 'normal', 'spacious'];

    for (const layoutType of layoutTypes) {
      for (const density of densities) {
        for (const size of commonSizes) {
          const config: LayoutConfig = {
            type: layoutType,
            density,
            nodeCount: size.nodes,
            edgeCount: size.edges,
            timestamp: Date.now()
          };

          const key = this.generateCacheKey(config);

          // Only precompute if not already cached
          if (!this.cache.has(key)) {
            try {
              // This would be async in a real implementation
              const layout = await this.computeLayout(config);
              this.set(config, layout);
            } catch (error) {
              console.warn('Failed to precompute layout:', config, error);
            }
          }
        }
      }
    }
  }

  /**
   * Compute layout (placeholder - would integrate with actual layout algorithms)
   */
  private async computeLayout(config: LayoutConfig): Promise<any> {
    // This would integrate with actual G6 layout computation
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          type: config.type,
          nodeCount: config.nodeCount,
          computed: true
        });
      }, 10);
    });
  }
}

/**
 * Singleton instance of the layout cache manager
 */
export const layoutCache = new LayoutCacheManager();

/**
 * Hook for using layout cache in React components
 */
export const useLayoutCache = () => {
  const getCachedLayout = useCallback((
    type: LayoutType,
    density: DensityLevel,
    nodeCount: number,
    edgeCount: number
  ) => {
    const config: LayoutConfig = {
      type,
      density,
      nodeCount,
      edgeCount,
      timestamp: Date.now()
    };

    return layoutCache.get(config);
  }, []);

  const cacheLayout = useCallback((
    type: LayoutType,
    density: DensityLevel,
    nodeCount: number,
    edgeCount: number,
    layout: any,
    positions?: Map<string, { x: number; y: number }>
  ) => {
    const config: LayoutConfig = {
      type,
      density,
      nodeCount,
      edgeCount,
      timestamp: Date.now()
    };

    layoutCache.set(config, layout, positions);
  }, []);

  const getCachedPositions = useCallback((
    type: LayoutType,
    density: DensityLevel,
    nodeCount: number,
    edgeCount: number
  ) => {
    const config: LayoutConfig = {
      type,
      density,
      nodeCount,
      edgeCount,
      timestamp: Date.now()
    };

    return layoutCache.getPositions(config);
  }, []);

  const clearCache = useCallback(() => {
    layoutCache.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return layoutCache.getStats();
  }, []);

  return {
    getCachedLayout,
    cacheLayout,
    getCachedPositions,
    clearCache,
    getCacheStats
  };
};

/**
 * Performance optimization utilities for graph layouts
 */
export const LayoutOptimizer = {
  /**
   * Optimize node data for layout computation
   */
  optimizeNodeData: (nodes: any[]) => {
    return nodes.map(node => ({
      id: node.id,
      type: node.data?.type || node.type,
      size: {
        width: node.size?.width || 100,
        height: node.size?.height || 80
      },
      // Only include essential properties for layout
      essential: {
        isRoot: node.data?.isRoot || false,
        businessType: node.data?.businessType
      }
    }));
  },

  /**
   * Check if layout should be recomputed
   */
  shouldRecomputeLayout: (
    currentData: { nodes: any[]; edges: any[] },
    previousData: { nodes: any[]; edges: any[] } | null,
    layoutType: LayoutType,
    density: DensityLevel
  ): boolean => {
    if (!previousData) return true;

    const currentNodes = currentData.nodes.length;
    const previousNodes = previousData.nodes.length;
    const currentEdges = currentData.edges.length;
    const previousEdges = previousData.edges.length;

    // Significant size change requires recompute
    if (Math.abs(currentNodes - previousNodes) > 5 ||
        Math.abs(currentEdges - previousEdges) > 10) {
      return true;
    }

    // Check if we have a cached layout
    const cached = layoutCache.get({
      type: layoutType,
      density,
      nodeCount: currentNodes,
      edgeCount: currentEdges,
      timestamp: Date.now()
    });

    return !cached;
  },

  /**
   * Create incremental layout update
   */
  createIncrementalUpdate: (
    baseLayout: any,
    addedNodes: any[],
    removedNodes: any[]
  ): any => {
    // This would create an incremental update to the base layout
    return {
      ...baseLayout,
      incremental: {
        added: addedNodes.map(node => node.id),
        removed: removedNodes.map(node => node.id)
      }
    };
  }
};

export default layoutCache;