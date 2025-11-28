/**
 * unifiedGenerationService 前端测试
 * 测试统一生成服务的所有主要功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import unifiedGenerationService from './unifiedGenerationService';

// Mock the apiClient
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

import apiClient from './api';

const mockApiClient = apiClient as any;

describe('UnifiedGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behavior
    mockApiClient.get.mockResolvedValue({ data: {} });
    mockApiClient.post.mockResolvedValue({ data: {} });
    mockApiClient.put.mockResolvedValue({ data: {} });
    mockApiClient.delete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础CRUD操作', () => {
    it('应该能够获取所有测试用例', async () => {
      const mockResponse = {
        data: {
          success: true,
          test_points: [
            { id: 1, business_type: 'RCC', name: '空调控制测试' },
            { id: 2, business_type: 'RFD', name: '车门控制测试' }
          ]
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getAllTestCases();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/test-cases', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够根据项目ID获取测试用例', async () => {
      const projectId = 1;
      const mockResponse = {
        data: {
          success: true,
          test_points: [
            { id: 1, business_type: 'RCC', project_id: projectId }
          ]
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getAllTestCases(projectId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/test-cases', {
        params: { project_id: projectId }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够根据业务类型获取测试用例', async () => {
      const businessType = 'RCC';
      const projectId = 1;
      const mockResponse = {
        data: {
          test_points: [
            { id: 1, business_type: businessType, name: '空调控制测试' }
          ]
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getTestCasesByBusinessType(
        businessType,
        projectId
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/test-cases/${businessType}`, {
        params: { project_id: projectId }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够根据ID获取单个测试用例', async () => {
      const testId = 1;
      const mockResponse = {
        data: {
          test_points: [
            { id: testId, name: '空调控制测试' },
            { id: 2, name: '车门控制测试' }
          ]
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getTestCaseById(testId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/unified-test-cases/1');
      expect(result).toEqual(mockResponse.data);
    });

    it('当测试用例不存在时应该返回空数据', async () => {
      const testId = 999;
      const mockResponse = {
        data: null
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getTestCaseById(testId);

      expect(result).toBeNull();
    });
  });

  describe('测试点管理', () => {
    it('应该能够获取测试点列表', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, name: '开启空调测试', business_type: 'RCC' },
            { id: 2, name: '关闭空调测试', business_type: 'RCC' }
          ],
          pagination: { page: 1, size: 20, total: 2 }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getTestPoints();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/test-points', {
        params: undefined
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够根据ID获取测试点', async () => {
      const testPointId = 1;
      const mockResponse = {
        data: {
          id: testPointId,
          name: '开启空调测试',
          business_type: 'RCC'
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getTestPointById(testPointId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/test-points/${testPointId}`, { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够创建测试点', async () => {
      const newTestPoint = {
        title: '新测试点',
        description: '测试描述',
        business_type: 'RCC',
        project_id: 1,
        priority: 'medium' as const
      };
      const mockResponse = {
        data: {
          id: 1,
          ...newTestPoint
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.createTestPoint(newTestPoint);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/test-points', newTestPoint);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够更新测试点', async () => {
      const testPointId = 1;
      const updateData = {
        name: '更新的测试点',
        description: '更新的描述'
      };
      const mockResponse = {
        data: {
          id: testPointId,
          ...updateData
        }
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.updateTestPoint(testPointId, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/api/v1/test-points/${testPointId}`, updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够删除测试点', async () => {
      const testPointId = 1;

      mockApiClient.delete.mockResolvedValue({});

      await unifiedGenerationService.deleteTestPoint(testPointId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/v1/test-points/${testPointId}`);
    });
  });

  describe('两阶段生成功能', () => {
    it('应该能够生成测试点（第一阶段）', async () => {
      const businessType = 'RCC';
      const options = {
        projectId: 1,
        additionalContext: undefined,
        saveToDatabase: false,
        asyncMode: false
      };
      const mockResponse = {
        data: {
          success: true,
          task_id: 'test-task-123',
          message: '测试点生成任务已创建'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.generateTestPoints(businessType, options);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/test-points/generate', {
        business_type: businessType,
        additional_context: options.additionalContext,
        save_to_database: options.saveToDatabase,
        project_id: options.projectId,
        async_mode: options.asyncMode
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够从测试点生成测试用例（第二阶段）', async () => {
      const businessType = 'RCC';
      const testPoints = [
        { id: 1, name: '开启空调测试' },
        { id: 2, name: '关闭空调测试' }
      ];
      const options = {
        complexityLevel: 'comprehensive',
        includeNegativeCases: true,
        saveToDatabase: true,
        projectId: 1
      };
      const mockResponse = {
        data: {
          success: true,
          task_id: 'test-task-456',
          message: '测试用例生成任务已创建'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.generateTestCasesFromPoints(
        businessType,
        testPoints,
        options
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/generation/test-cases', {
        business_type: businessType,
        test_points: testPoints,
        additional_context: '',
        save_to_database: true,
        project_id: 1
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够查询生成任务状态', async () => {
      const taskId = 'test-task-123';
      const mockResponse = {
        data: {
          task_id: taskId,
          status: 'completed',
          progress: 100,
          message: '生成完成',
          result: {
            test_points: 10,
            test_cases: 50
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getGenerationStatus(taskId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/generation/status/${taskId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够取消生成任务', async () => {
      const taskId = 'test-task-123';
      const mockResponse = {
        data: {
          success: true,
          message: '任务已取消'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.cancelGenerationTask(taskId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/v1/generation/cancel/${taskId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('业务类型管理', () => {
    it('应该能够获取业务类型列表', async () => {
      const projectId = 1;
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, code: 'RCC', name: '远程空调控制' },
            { id: 2, code: 'RFD', name: '远程车门控制' }
          ]
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getBusinessTypes(projectId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/business/business-types', {
        params: { project_id: projectId }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该能够获取业务类型映射', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            'RCC': '远程空调控制',
            'RFD': '远程车门控制',
            'ZAB': '座椅调节'
          }
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await unifiedGenerationService.getBusinessTypesMapping();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/config/business-types');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('错误处理', () => {
    it('应该处理API请求失败', async () => {
      const error = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(unifiedGenerationService.getAllTestCases())
        .rejects.toThrow('Network Error');
    });

    it('应该处理API响应错误', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal Server Error'
          }
        }
      };
      mockApiClient.get.mockRejectedValue(errorResponse);

      await expect(unifiedGenerationService.getAllTestCases())
        .rejects.toThrow();
    });
  });

  describe('导出功能', () => {
    it('应该能够导出测试用例到Excel', async () => {
      const businessType = 'RCC';
      const projectId = 1;
      const mockBlob = new Blob(['test data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      mockApiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await unifiedGenerationService.exportTestCasesToExcel(businessType, projectId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/test-cases/export`, {
        params: { business_type: businessType, project_id: projectId },
        responseType: 'blob'
      });
      expect(result).toEqual(mockBlob);
    });
  });
});