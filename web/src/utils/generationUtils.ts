/**
 * 统一的生成处理工具函数
 * 提取重复的生成逻辑，消除代码重复
 */

// Notification function will be passed in from the component

// 生成处理结果的类型定义
export interface GenerationResult {
  businessType: string;
  success: boolean;
  result?: any;
  error?: any;
}

export interface BatchGenerationOptions {
  batchMode: boolean;
  selectedBusinessTypes: string[];
  activeProject: { id: number };
  onProgress?: (step: number, message: string) => void;
  onComplete?: (results: GenerationResult[]) => void;
}

export interface SingleGenerationOptions {
  businessType: string;
  activeProject: { id: number };
  onProgress?: (step: number, message: string) => void;
  onComplete?: (result: any) => void;
}

/**
 * 通用批量生成处理函数
 * 处理批量业务类型的生成逻辑，统一错误处理和进度跟踪
 */
export async function handleBatchGeneration<T>(
  businessTypes: string[],
  generateFunction: (businessType: string) => Promise<T>,
  options: {
    onProgress?: (current: number, total: number, step: number) => void;
    onStart?: (total: number) => void;
    onSuccess?: (results: GenerationResult[]) => void;
    onError?: (error: any) => void;
    stepInfo?: { start: number; end: number };
  }
): Promise<GenerationResult[]> {
  const { onProgress, onStart, onSuccess, onError, stepInfo = { start: 1, end: 2 } } = options;

  try {
    onStart?.(businessTypes.length);

    const batchResults: GenerationResult[] = [];

    for (let i = 0; i < businessTypes.length; i++) {
      const businessType = businessTypes[i];

      try {
        const result = await generateFunction(businessType);
        batchResults.push({ businessType, success: true, result });

        onProgress?.(i + 1, businessTypes.length, stepInfo.start);
      } catch (error) {
        batchResults.push({ businessType, success: false, error });
        console.error(`Generation failed for ${businessType}:`, error);
      }
    }

    onProgress?.(businessTypes.length, businessTypes.length, stepInfo.end);
    const successfulCount = batchResults.filter(r => r.success).length;

    onSuccess?.(batchResults);

    return batchResults;
  } catch (error) {
    onError?.(error);
    throw error;
  }
}

/**
 * 统一的错误处理函数
 */
export function handleGenerationError(
  error: any,
  context: string,
  showNotification?: (title: string, body: string, type: 'success' | 'error' | 'info') => void
) {
  console.error(`${context} failed:`, error);
  const errorMessage = error?.message || error?.detail || '生成过程中发生未知错误';
  showNotification?.('生成失败', errorMessage, 'error');
  return errorMessage;
}

/**
 * 统一的进度管理函数
 */
export function createProgressManager(
  setCurrentStep: (step: number) => void,
  setIsGenerating: (generating: boolean) => void,
  showNotification?: (title: string, body: string, type: 'success' | 'error' | 'info') => void
) {
  return {
    start: (step: number = 1) => {
      setIsGenerating(true);
      setCurrentStep(step);
    },

    setStep: (step: number, message: string) => {
      setCurrentStep(step);
      showNotification?.('进度更新', message, 'info');
    },

    complete: (message: string) => {
      setCurrentStep(0);
      setIsGenerating(false);
      showNotification?.('生成完成', message, 'success');
    },

    error: (error: any) => {
      setCurrentStep(0);
      setIsGenerating(false);
      return handleGenerationError(error, '生成过程', showNotification);
    }
  };
}

/**
 * 统一的结果格式化函数
 */
export function formatGenerationResults(
  testPointsData: any,
  testCasesData?: any,
  batchResults?: GenerationResult[]
) {
  if (batchResults) {
    const successful = batchResults.filter(r => r.success);
    return {
      stage1Results: { successful },
      stage2Results: { successful }
    };
  }

  const testPointsCount = testPointsData?.test_points?.length ||
                         testPointsData?.test_points_generated ||
                         testPointsData?.count || 0;

  const testCasesCount = testCasesData?.test_cases?.length ||
                        testCasesData?.test_cases_generated || 0;

  return {
    testPoints: {
      test_points: testPointsData?.test_points ||
                   testPointsData?.items || []
    },
    testCases: {
      test_cases: testCasesData?.test_cases || []
    },
    summary: {
      testPointsCount,
      testCasesCount
    }
  };
}

/**
 * 生成配置的通用函数
 */
export function createGenerationConfig(baseConfig: any, overrides: any = {}) {
  return {
    complexity_level: 'standard',
    include_negative_cases: true,
    save_to_database: true,
    async_mode: true,
    ...baseConfig,
    ...overrides
  };
}