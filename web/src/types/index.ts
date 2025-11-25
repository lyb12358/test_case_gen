// Type re-exports for backward compatibility
// Import from our type definition files

export type { TestCase, TestCaseItem, TaskStatusResponse, GenerateTestCaseRequest, GenerateResponse } from './testCases';
export type { Prompt, PromptCategory, PromptVersion, PromptTemplate } from './prompts';
export type { TestPoint, BatchTestPointOperation, BatchTestPointOperationResponse } from './testPoints';

// Common types - centralized here to avoid duplication
export type BusinessType = string; // Dynamic business types

// Export common enums and constants
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