/**
 * generationUtils 工具函数单元测试
 * 测试生成处理中的通用功能，确保重构后的逻辑正确性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleBatchGeneration,
  createProgressManager,
  formatGenerationResults,
  createGenerationConfig,
  GenerationResult,
  handleGenerationError
} from '../../utils/generationUtils';

describe('generationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleBatchGeneration', () => {
    it('应该成功处理批量生成', async () => {
      const businessTypes = ['RCC', 'RFD', 'ZAB'];
      const mockGenerateFunction = vi.fn().mockResolvedValue({ success: true, data: 'test-data' });

      const results = await handleBatchGeneration(
        businessTypes,
        mockGenerateFunction,
        {
          onSuccess: vi.fn(),
          onError: vi.fn(),
          onProgress: vi.fn(),
          stepInfo: { start: 1, end: 2 }
        }
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockGenerateFunction).toHaveBeenCalledTimes(3);
      expect(mockGenerateFunction).toHaveBeenCalledWith('RCC');
      expect(mockGenerateFunction).toHaveBeenCalledWith('RFD');
      expect(mockGenerateFunction).toHaveBeenCalledWith('ZAB');
    });

    it('应该正确处理部分失败的批量生成', async () => {
      const businessTypes = ['RCC', 'RFD', 'ZAB'];
      const mockGenerateFunction = vi.fn()
        .mockResolvedValueOnce({ success: true, data: 'test-data-1' })
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({ success: true, data: 'test-data-3' });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const results = await handleBatchGeneration(
        businessTypes,
        mockGenerateFunction,
        {
          onSuccess,
          onError,
          onProgress: vi.fn(),
          stepInfo: { start: 1, end: 2 }
        }
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('应该正确调用进度回调', async () => {
      const businessTypes = ['RCC', 'RFD'];
      const mockGenerateFunction = vi.fn().mockResolvedValue({ success: true });
      const onProgress = vi.fn();

      await handleBatchGeneration(
        businessTypes,
        mockGenerateFunction,
        {
          onProgress,
          onSuccess: vi.fn(),
          onError: vi.fn(),
          stepInfo: { start: 1, end: 3 }
        }
      );

      expect(onProgress).toHaveBeenCalledWith(1, 2, 1);
      expect(onProgress).toHaveBeenCalledWith(2, 2, 3);
    });

    it('应该处理空的业务类型列表', async () => {
      const mockGenerateFunction = vi.fn();
      const onSuccess = vi.fn();

      const results = await handleBatchGeneration(
        [],
        mockGenerateFunction,
        { onSuccess }
      );

      expect(results).toHaveLength(0);
      expect(mockGenerateFunction).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith([]);
    });
  });

  describe('createProgressManager', () => {
    it('应该创建进度管理器并提供正确的方法', () => {
      const setCurrentStep = vi.fn();
      const setIsGenerating = vi.fn();
      const showNotification = vi.fn();

      const manager = createProgressManager(setCurrentStep, setIsGenerating, showNotification);

      expect(typeof manager.start).toBe('function');
      expect(typeof manager.setStep).toBe('function');
      expect(typeof manager.complete).toBe('function');
      expect(typeof manager.error).toBe('function');
    });

    it('start 方法应该设置正确的状态', () => {
      const setCurrentStep = vi.fn();
      const setIsGenerating = vi.fn();

      const manager = createProgressManager(setCurrentStep, setIsGenerating);
      manager.start(2);

      expect(setIsGenerating).toHaveBeenCalledWith(true);
      expect(setCurrentStep).toHaveBeenCalledWith(2);
    });

    it('complete 方法应该重置状态并显示通知', () => {
      const setCurrentStep = vi.fn();
      const setIsGenerating = vi.fn();
      const showNotification = vi.fn();

      const manager = createProgressManager(setCurrentStep, setIsGenerating, showNotification);
      manager.complete('测试完成');

      expect(setCurrentStep).toHaveBeenCalledWith(0);
      expect(setIsGenerating).toHaveBeenCalledWith(false);
      expect(showNotification).toHaveBeenCalledWith('生成完成', '测试完成', 'success');
    });

    it('error 方法应该处理错误并返回错误消息', () => {
      const setCurrentStep = vi.fn();
      const setIsGenerating = vi.fn();
      const showNotification = vi.fn();
      const error = new Error('测试错误');

      const manager = createProgressManager(setCurrentStep, setIsGenerating, showNotification);
      const errorMessage = manager.error(error);

      expect(setCurrentStep).toHaveBeenCalledWith(0);
      expect(setIsGenerating).toHaveBeenCalledWith(false);
      expect(showNotification).toHaveBeenCalledWith('生成失败', '测试错误', 'error');
      expect(errorMessage).toBe('测试错误');
    });
  });

  describe('formatGenerationResults', () => {
    it('应该正确格式化测试点和测试用例结果', () => {
      const testPointsData = {
        test_points: [
          { id: 1, name: '测试点1' },
          { id: 2, name: '测试点2' }
        ],
        test_points_generated: 2
      };

      const testCasesData = {
        test_cases: [
          { id: 1, name: '测试用例1', steps: [] },
          { id: 2, name: '测试用例2', steps: [] }
        ],
        test_cases_generated: 2
      };

      const results = formatGenerationResults(testPointsData, testCasesData);

      expect(results).toHaveProperty('testPoints');
      expect(results).toHaveProperty('testCases');
      expect(results).toHaveProperty('summary');
      expect(results.summary.testPointsCount).toBe(2);
      expect(results.summary.testCasesCount).toBe(2);
    });

    it('应该正确处理批量结果', () => {
      const batchResults: GenerationResult[] = [
        { businessType: 'RCC', success: true, result: { data: 'test1' } },
        { businessType: 'RFD', success: false, error: new Error('test error') },
        { businessType: 'ZAB', success: true, result: { data: 'test3' } }
      ];

      const results = formatGenerationResults(null, null, batchResults);

      expect(results).toHaveProperty('stage1Results');
      expect(results).toHaveProperty('stage2Results');
      expect(results.stage1Results.successful).toHaveLength(2);
      expect(results.stage2Results.successful).toHaveLength(2);
    });

    it('应该处理空数据', () => {
      const results = formatGenerationResults({}, {});

      expect(results.testPoints.test_points).toEqual([]);
      expect(results.testCases.test_cases).toEqual([]);
      expect(results.summary.testPointsCount).toBe(0);
      expect(results.summary.testCasesCount).toBe(0);
    });

    it('应该处理不同格式的数据', () => {
      // 测试不同的数据结构
      const testPointsData1 = { count: 5 };
      const testPointsData2 = { items: [{ id: 1 }, { id: 2 }] }; // items用于数据，不用于计数
      const testPointsData3 = { test_points_generated: 3 };

      const results1 = formatGenerationResults(testPointsData1);
      const results2 = formatGenerationResults(testPointsData2);
      const results3 = formatGenerationResults(testPointsData3);

      expect(results1.summary.testPointsCount).toBe(5);
      expect(results2.summary.testPointsCount).toBe(0); // items不用于计数
      expect(results3.summary.testPointsCount).toBe(3);
    });
  });

  describe('createGenerationConfig', () => {
    it('应该创建基本的生成配置', () => {
      const baseConfig = {
        business_type: 'RCC',
        project_id: 1
      };

      const config = createGenerationConfig(baseConfig);

      expect(config.business_type).toBe('RCC');
      expect(config.project_id).toBe(1);
      expect(config.complexity_level).toBe('standard');
      expect(config.include_negative_cases).toBe(true);
      expect(config.save_to_database).toBe(true);
      expect(config.async_mode).toBe(true);
    });

    it('应该应用覆盖配置', () => {
      const baseConfig = {
        business_type: 'RCC'
      };
      const overrides = {
        complexity_level: 'comprehensive',
        include_negative_cases: false,
        async_mode: false
      };

      const config = createGenerationConfig(baseConfig, overrides);

      expect(config.complexity_level).toBe('comprehensive');
      expect(config.include_negative_cases).toBe(false);
      expect(config.async_mode).toBe(false);
    });

    it('应该保留基础配置不被默认值覆盖', () => {
      const baseConfig = {
        business_type: 'RCC',
        complexity_level: 'simple',
        include_negative_cases: false
      };

      const config = createGenerationConfig(baseConfig);

      expect(config.complexity_level).toBe('simple');
      expect(config.include_negative_cases).toBe(false);
    });
  });

  describe('handleGenerationError', () => {
    it('应该正确处理标准错误', () => {
      const error = new Error('测试错误');
      const showNotification = vi.fn();

      const errorMessage = handleGenerationError(error, '测试上下文', showNotification);

      expect(errorMessage).toBe('测试错误');
      expect(showNotification).toHaveBeenCalledWith('生成失败', '测试错误', 'error');
    });

    it('应该处理带有detail属性的错误', () => {
      const error = { detail: '详细错误信息' };
      const showNotification = vi.fn();

      const errorMessage = handleGenerationError(error, '测试上下文', showNotification);

      expect(errorMessage).toBe('详细错误信息');
    });

    it('应该处理空错误对象', () => {
      const error = {};
      const showNotification = vi.fn();

      const errorMessage = handleGenerationError(error, '测试上下文', showNotification);

      expect(errorMessage).toBe('生成过程中发生未知错误');
    });

    it('应该在没有通知函数时不报错', () => {
      const error = new Error('测试错误');

      expect(() => {
        handleGenerationError(error, '测试上下文');
      }).not.toThrow();
    });
  });
});