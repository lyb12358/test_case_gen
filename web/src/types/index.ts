// Type re-exports for backward compatibility
// Import from our type definition files

// Export common types first (primary types to use)
export * from './common';

// Legacy types - use unified types instead
export type { TestCaseItem, TaskStatusResponse, GenerateTestCaseRequest, GenerateResponse } from './testCases';
export type { Prompt, PromptCategory, PromptVersion, PromptTemplate } from './prompts';
// testPoints types removed - using unified test case system

// Export constants (runtime values) that are needed first
export { UnifiedTestCaseStage } from './unifiedTestCase';

// Unified test case types - primary types to use
export type {
  UnifiedTestCaseCreate,
  UnifiedTestCaseUpdate,
  UnifiedTestCaseResponse,
  UnifiedTestCaseFilter,
  UnifiedTestCaseListResponse,
  UnifiedTestCaseStatistics,
  UnifiedTestCaseBatchOperation,
  UnifiedTestCaseBatchResponse,
  UnifiedTestCaseGenerationRequest,
  UnifiedTestCaseGenerationResponse,
  UnifiedTestCaseFormData,
  UnifiedTestCaseListItem,
  TableColumnConfig,
  BatchAction,
  ExportConfig,
  ChartData,
  UnifiedTestCaseWebSocketMessage,
  FormRule
} from './unifiedTestCase';

// Export unified types as primary TestCase interface for compatibility
export type UnifiedTestCase = UnifiedTestCaseResponse;

// Legacy JobStatus - use TaskStatus from common instead (deprecated)
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];
export type JobStatusType = JobStatus; // Alias for backward compatibility

// Re-export useful helper types
// Note: paths and components should be imported from API schema generation when available
// export type ApiPaths = paths;
// export type ApiComponents = components;