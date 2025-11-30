/**
 * 统一的测试生成服务，整合了testCaseService、unifiedTestCaseService和testPointService的功能
 * 这是唯一应该被使用的测试生成相关服务，其他服务文件将被弃用
 */

import apiClient from './api';
import { errorHandlerService } from './errorHandlerService';
import { API_ENDPOINTS } from '@/config/constants';
import { createTaskWebSocketService } from './websocketService';
import {
  GenerateTestCaseRequest,
  GenerateResponse,
} from '@/types';
import type { components } from '@/types/api';
import {
  UnifiedTestCaseResponse,
  UnifiedTestCaseListResponse,
  UnifiedTestCaseCreate,
  UnifiedTestCaseUpdate,
  UnifiedTestCaseFilter,
  UnifiedTestCaseStatistics,
  UnifiedTestCaseBatchOperation,
  UnifiedTestCaseBatchResponse,
  UnifiedTestCaseGenerationRequest,
  UnifiedTestCaseGenerationResponse,
  UnifiedTestCaseStage,
  UnifiedTestCaseStatus
} from '../types/unifiedTestCase';
import { BusinessType, PriorityLevel } from '../types/common';

class UnifiedGenerationService {
  private readonly basePath = '/api/v1';

  // ========== 测试用例管理（原testCaseService功能）==========

  /**
   * 获取所有测试用例
   */
  async getAllTestCases(projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/api/v1/test-cases', { params });
    return response.data;
  }

  /**
   * 根据业务类型获取测试用例
   */
  async getTestCasesByBusinessType(businessType: string, projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`/api/v1/test-cases/${businessType}`, { params });
    return response.data;
  }

  /**
   * 根据ID获取单个测试用例
   */
  async getTestCaseById(id: number): Promise<any> {
    const response = await apiClient.get(`/api/v1/unified-test-cases/${id}`);
    return response.data;
  }

  /**
   * 导出测试用例到Excel
   */
  async exportTestCasesToExcel(businessType: string, projectId?: number): Promise<Blob> {
    const params: any = { business_type: businessType };
    if (projectId) {
      params.project_id = projectId;
    }
    const response = await apiClient.get(API_ENDPOINTS.TEST_CASES.EXPORT, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 获取业务类型列表
   */
  async getBusinessTypes(projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(API_ENDPOINTS.BUSINESS_TYPES.LIST, { params });
    return response.data;
  }

  /**
   * 获取业务类型映射
   */
  async getBusinessTypesMapping(): Promise<any> {
    const response = await apiClient.get(API_ENDPOINTS.CONFIG.BUSINESS_TYPES);
    return response.data;
  }

  // ========== 测试点管理（原testPointService功能）==========

  /**
   * 获取测试点列表（带分页和过滤）
   */
  async getTestPoints(params?: {
    page?: number;
    size?: number;
    business_type?: string;
    project_id?: number;
    // status field removed - test points no longer have status
    priority?: PriorityLevel;
    keyword?: string;
    test_point_ids?: number[];
  }): Promise<any> {
    try {
      // 参数验证和标准化
      const validatedParams = this.validateAndNormalizeTestPointParams(params || {});

      // 使用统一测试用例端点，通过stage筛选获取测试点
      const paramsWithStage = { ...validatedParams, stage: 'test_point' };
      const response = await apiClient.get(`${this.basePath}/unified-test-cases`, { params: paramsWithStage });
      return this.transformTestPointResponse(response.data);
    } catch (error) {
      throw errorHandlerService.handleApiError(error, {
        customMessage: '获取测试点列表失败',
        fallbackMessage: '无法加载测试点数据，请稍后重试'
      });
    }
  }

  /**
   * 转换测试点响应数据格式
   */
  private transformTestPointResponse(data: any): components['schemas']['TestPointListResponse'] {
    // 统一端点返回的数据格式已经兼容，只需要做小的调整
    const items = (data.items || []).map((item: any) => ({
      ...item,
      // 确保business_type为字符串
      business_type: typeof item.business_type === 'string'
        ? item.business_type
        : item.business_type?.value || item.business_type,
      // 统一端点返回的是stage而不是status，对于测试点stage='test_point'
      // 处理可选字段
      description: item.description || '',
      test_case_count: item.test_case_count || 0
    }));

    return {
      items,
      total: data.total || 0,
      page: data.page || 1,
      size: data.size || 20,
      pages: data.pages || Math.ceil((data.total || 0) / (data.size || 20))
    };
  }

  /**
   * 根据ID获取测试点
   */
  async getTestPointById(id: number, projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    // 使用统一测试用例端点，通过stage筛选获取测试点
    const paramsWithStage = { ...params, stage: 'test_point' };
    const response = await apiClient.get(`/api/v1/unified-test-cases/${id}`, { params: paramsWithStage });
    return response.data;
  }

  /**
   * 创建测试点
   */
  async createTestPoint(testPoint: UnifiedTestCaseCreate): Promise<UnifiedTestCaseResponse> {
    // 确保创建的是测试点阶段的条目
    const testPointData = {
      ...testPoint,
      stage: 'test_point',
      // 将 case_id 映射为 test_case_id，以匹配后端 Pydantic alias
      test_case_id: testPoint.case_id
    };
    // 删除内部字段 case_id，避免发送多余字段
    delete (testPointData as any).case_id;

    const response = await apiClient.post('/api/v1/unified-test-cases', testPointData);
    return response.data;
  }

  /**
   * 更新测试点
   */
  async updateTestPoint(id: number, testPoint: UnifiedTestCaseUpdate): Promise<UnifiedTestCaseResponse> {
    const response = await apiClient.put(`/api/v1/unified-test-cases/${id}`, testPoint);
    return response.data;
  }

  /**
   * 删除测试点
   */
  async deleteTestPoint(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/unified-test-cases/${id}`);
  }

  /**
   * 批量操作测试点
   */
  async batchTestPointOperation(operation: any): Promise<any> {
    const response = await apiClient.post('/api/v1/test-points/batch', operation);
    return response.data;
  }

  /**
   * 根据业务类型获取测试点
   */
  async getTestPointsByBusinessType(businessType: string, projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`/api/v1/test-points/by-business/${businessType}`, { params });
    return response.data;
  }

  /**
   * 获取测试点统计信息
   */
  async getTestPointStatistics(projectId?: number): Promise<any> {
    try {
      const params = projectId ? { project_id: projectId } : {};
      const response = await apiClient.get('/api/v1/test-points/stats/overview', { params });
      return response.data;
    } catch (error) {
      throw errorHandlerService.handleApiError(error, {
        customMessage: '获取测试点统计信息失败',
        fallbackMessage: '无法加载统计数据，请稍后重试'
      });
    }
  }

  /**
   * 验证测试点
   */
  async validateTestPoint(testPoint: UnifiedTestCaseCreate): Promise<any> {
    const response = await apiClient.post('/api/v1/test-points/validate', testPoint);
    return response.data;
  }

  // ========== 统一测试用例管理（原unifiedTestCaseService功能）==========

  /**
   * 获取统一测试用例列表
   */
  async getUnifiedTestCases(filter: UnifiedTestCaseFilter): Promise<UnifiedTestCaseListResponse> {
    // 参数验证和默认值设置
    const validatedFilter = this.validateAndNormalizeFilter(filter);

    // 构建查询参数对象
    const params: any = {};

    // 过滤参数
    if (validatedFilter.project_id) params.project_id = validatedFilter.project_id;
    if (validatedFilter.business_type) params.business_type = validatedFilter.business_type;
    if (validatedFilter.stage) params.stage = validatedFilter.stage;
    if (validatedFilter.priority) params.priority = validatedFilter.priority;
    if (validatedFilter.keyword) params.keyword = validatedFilter.keyword;
    if (validatedFilter.test_point_ids && validatedFilter.test_point_ids.length > 0) {
      params.test_point_ids = validatedFilter.test_point_ids;
    }

    // 分页参数
    params.page = validatedFilter.page;
    params.size = validatedFilter.size;

    const response = await apiClient.get(`${this.basePath}/unified-test-cases`, { params });
    return response.data;
  }

  /**
   * 根据ID获取统一测试用例
   */
  async getUnifiedTestCaseById(id: number, projectId?: number): Promise<UnifiedTestCaseResponse> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`${this.basePath}/unified-test-cases/${id}`, { params });
    return response.data;
  }

  /**
   * 创建统一测试用例
   */
  async createUnifiedTestCase(testCase: UnifiedTestCaseCreate): Promise<UnifiedTestCaseResponse> {
    const response = await apiClient.post(`${this.basePath}/unified-test-cases`, testCase);
    return response.data;
  }

  /**
   * 更新统一测试用例
   */
  async updateUnifiedTestCase(id: number, testCase: UnifiedTestCaseUpdate): Promise<UnifiedTestCaseResponse> {
    const response = await apiClient.put(`${this.basePath}/unified-test-cases/${id}`, testCase);
    return response.data;
  }

  /**
   * 删除统一测试用例
   */
  async deleteUnifiedTestCase(id: number): Promise<void> {
    try {
      if (!this.basePath) {
        throw new Error('服务实例初始化不完整，basePath 未定义');
      }

      const deleteUrl = `${this.basePath}/unified-test-cases/${id}`;

      if (!id || id <= 0) {
        throw new Error(`无效的测试用例ID: ${id}`);
      }

      await apiClient.delete(deleteUrl);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('测试用例不存在，可能已被删除');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.detail || '删除失败：参数错误');
      } else if (error.response?.status === 500) {
        throw new Error('服务器内部错误，请稍后重试');
      } else {
        throw new Error(`删除失败: ${error.message || '网络错误'}`);
      }
    }
  }

  /**
   * 批量操作统一测试用例
   */
  async batchUnifiedTestCaseOperation(operation: UnifiedTestCaseBatchOperation): Promise<UnifiedTestCaseBatchResponse> {
    const response = await apiClient.post(`${this.basePath}/unified-test-cases/batch`, operation);
    return response.data;
  }

  /**
   * 获取统一测试用例统计信息
   */
  async getUnifiedTestCaseStatistics(projectId?: number): Promise<UnifiedTestCaseStatistics> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`${this.basePath}/unified-test-cases/statistics/overview`, { params });
    return response.data;
  }

  /**
   * 获取测试用例统计信息 (兼容性方法)
   */
  async getStatistics(projectId?: number, businessType?: string): Promise<UnifiedTestCaseStatistics> {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    if (businessType) params.business_type = businessType;

    const response = await apiClient.get(`${this.basePath}/unified-test-cases/statistics`, { params });
    return response.data;
  }

  // ========== 两阶段生成功能 ==========

  // 注意：旧版本的 generateTestPoints 方法已移除，统一使用下面新版本的方法

  /**
   * 从测试点生成测试用例（第二阶段）
   * 优化版本，内部使用简化的API
   */
  async generateTestCasesFromPoints(
    businessType: string,
    testPoints: any[],
    options?: {
      additionalContext?: Record<string, any>;
      saveToDatabase?: boolean;
      projectId?: number;
    }
  ): Promise<any> {
    // 提取测试点ID
    const testPointIds = testPoints.map(tp => tp.id || tp.test_point_id).filter(Boolean);

    // 转换additional_context为字符串格式
    let additionalContextString = '';
    if (options?.additionalContext) {
      if (typeof options.additionalContext === 'string') {
        additionalContextString = options.additionalContext;
      } else {
        additionalContextString = JSON.stringify(options.additionalContext);
      }
    }

    return this.generateUnified({
      business_type: businessType,
      project_id: options?.projectId || 0,
      generation_mode: 'test_cases_only',
      test_point_ids: testPointIds,
      additional_context: additionalContextString
    });
  }

  /**
   * 批量生成（优化版本，使用简化的API）
   */
  async batchGenerate(request: {
    business_type: string;
    project_id: number;
    generation_mode: 'test_points_only' | 'test_cases_only';
    test_point_ids?: number[];
    additional_context?: string;
  }): Promise<any> {
    return this.generateUnified(request);
  }

  /**
   * 查询生成任务状态
   */
  async getGenerationStatus(taskId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/generation/status/${taskId}`);
    return response.data;
  }

  /**
   * 取消生成任务
   */
  async cancelGenerationTask(taskId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/generation/cancel/${taskId}`);
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<any> {
    const response = await apiClient.get('/api/v1/generation/health');
    return response.data;
  }

  /**
   * 获取生成统计信息
   */
  async getGenerationStatistics(projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/api/v1/generation/statistics', { params });
    return response.data;
  }

  // ========== WebSocket增强功能 ==========

  /**
   * 建立WebSocket连接用于实时任务监控
   */
  createWebSocketConnection(taskId: string, options?: {
    autoReconnect?: boolean;
    heartbeatInterval?: number;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onProgress?: (data: any) => void;
  }) {
    // 使用标准WebSocket服务（增强版已删除）
    const wsService = createTaskWebSocketService(taskId, {
      autoReconnect: options?.autoReconnect ?? true,
      enableHeartbeat: true,
      enableMessageQueue: true
    });

      // 设置事件处理器
      if (options?.onConnect) {
        wsService.onConnectionStateChange((connected) => {
          if (connected) options.onConnect!();
        });
      }

      if (options?.onDisconnect) {
        wsService.onConnectionStateChange((connected) => {
          if (!connected) options.onDisconnect!();
        });
      }

      if (options?.onError) {
        wsService.onError((error) => {
          options.onError!(error);
        });
      }

      if (options?.onProgress) {
        wsService.subscribeToTask(taskId, (taskId, data) => {
          options.onProgress!(data);
        });
      }

      // 连接WebSocket
      wsService.connect().catch(error => {
        console.error('WebSocket连接失败:', error);
        options?.onError?.(error);
      });

      return wsService;
  }

  /**
   * 批量WebSocket连接管理
   */
  manageMultipleWebSocketConnections(taskConfigs: Array<{
    taskId: string;
    onProgress?: (data: any) => void;
    onError?: (error: Error) => void;
  }>) {
    const connections = new Map();

    const promises = taskConfigs.map(async (config) => {
      try {
        const wsService = await this.createWebSocketConnection(config.taskId, {
          onProgress: config.onProgress,
          onError: config.onError
        });
        connections.set(config.taskId, wsService);
        return { taskId: config.taskId, success: true };
      } catch (error) {
        console.error(`任务 ${config.taskId} WebSocket连接失败:`, error);
        config.onError?.(error as Error);
        return { taskId: config.taskId, success: false, error };
      }
    });

    return Promise.all(promises).then(results => ({
      results,
      connections,
      disconnectAll: () => {
        connections.forEach((service, taskId) => {
          service.destroy();
          connections.delete(taskId);
        });
      },
      getConnection: (taskId: string) => connections.get(taskId)
    }));
  }

  // ========== 名称同步功能 ==========

  /**
   * 同步单个名称
   */
  async syncName(request: any): Promise<any> {
    const response = await apiClient.post(`/api/v1/test-points/${request.testPointId}/sync-test-case-names`, request);
    return response.data;
  }

  /**
   * 批量同步名称
   */
  async batchSyncNames(request: any): Promise<any[]> {
    const response = await apiClient.post('/api/v1/test-points/batch-sync-test-case-names', request);
    return response.data;
  }

  /**
   * 获取名称同步预览
   * 分析当前项目中测试点和测试用例的名称不一致情况
   */
  async getNameSyncPreview(projectId?: number, businessType?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (projectId) params.project_id = projectId;
      if (businessType) params.business_type = businessType;

      const response = await apiClient.get('/api/v1/test-points/name-sync-preview', { params });
      return response.data;
    } catch (error) {
      console.warn('getNameSyncPreview: API调用失败，返回空数组', error);
      // 如果后端尚未实现该API，返回空数组而不是抛出错误
      return [];
    }
  }

  /**
   * 验证名称
   */
  async validateName(request: any): Promise<any> {
    const response = await apiClient.post('/api/v1/test-points/validate-name', request);
    return response.data;
  }

  // ========== 向后兼容的方法（保留原有API）==========

  /**
   * Generate test points using the unified endpoint.
   * 优化版本，内部使用简化的API
   */
  async generateTestPoints(
    businessType: string,
    options?: {
      additionalContext?: Record<string, any>;
      saveToDatabase?: boolean;
      projectId?: number;
      asyncMode?: boolean;
    }
  ): Promise<any> {
    // 转换additional_context为字符串格式
    let additionalContextString = '';
    if (options?.additionalContext) {
      if (typeof options.additionalContext === 'string') {
        additionalContextString = options.additionalContext;
      } else {
        additionalContextString = JSON.stringify(options.additionalContext);
      }
    }

    return this.generateUnified({
      business_type: businessType,
      project_id: options?.projectId || 0,
      generation_mode: 'test_points_only',
      additional_context: additionalContextString
    });
  }

  
  
  // ========== 补充的缺失方法 ==========

  /**
   * 批量生成测试点（优化版本，使用简化的API）
   */
  async batchGenerateTestPoints(businessTypes: string[], options: {
    projectId?: number;
    additionalContext?: string;
  }): Promise<any> {
    // 为每个业务类型生成测试点
    const promises = businessTypes.map(businessType =>
      this.generateUnified({
        business_type: businessType,
        project_id: options?.projectId || 0,
        generation_mode: 'test_points_only',
        additional_context: options?.additionalContext
      })
    );

    return Promise.all(promises);
  }

  /**
   * 批量生成测试用例（优化版本，使用简化的API）
   */
  async batchGenerateTestCases(businessTypes: string[], options: {
    projectId?: number;
    additionalContext?: string;
  }): Promise<any> {
    // 为每个业务类型生成测试用例
    const promises = businessTypes.map(businessType =>
      this.generateUnified({
        business_type: businessType,
        project_id: options?.projectId || 0,
        generation_mode: 'test_cases_only',
        additional_context: options?.additionalContext
      })
    );

    return Promise.all(promises);
  }

  /**
   * 统一的AI生成方法（简化的新版本）
   * 支持test_points_only和test_cases_only两种模式
   */
  async generateUnified(request: {
    business_type: string;
    project_id: number;
    generation_mode: 'test_points_only' | 'test_cases_only';
    test_point_ids?: number[];
    additional_context?: string;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/unified-test-cases/generate', request);
    return response.data;
  }

  /**
   * 完整的两阶段生成（已废弃，端点已移除）
   * 请使用generateUnified方法分别进行两阶段生成
   */
  async generateFullTwoStage(request: {
    business_type: string;
    project_id: number;
    additional_context?: Record<string, any>;
  }): Promise<any> {
    throw new Error('generateFullTwoStage方法已废弃，请使用generateUnified方法。端点 /api/v1/unified-test-cases/generate/full-two-stage 已被移除。');
  }

  // ========== 变量预览功能 ==========

  /**
   * 预览业务类型的变量解析
   */
  async previewVariables(
    businessType: string,
    templateContent?: string,
    additionalContext?: Record<string, any>,
    generationStage?: string,
    projectId?: number
  ): Promise<any> {
    const params: any = {};
    if (templateContent) {
      params.template_content = templateContent;
    }
    if (additionalContext) {
      params.additional_context = JSON.stringify(additionalContext);
    }
    if (generationStage) {
      params.generation_stage = generationStage;
    }
    if (projectId) {
      params.project_id = projectId;
    }

    const response = await apiClient.get(`/api/v1/generation/variables/preview/${businessType}`, { params });
    return response.data;
  }

  /**
   * 测试变量解析
   */
  async testResolveVariables(requestData: {
    business_type: string;
    template_content?: string;
    additional_context?: Record<string, any>;
    generation_stage?: string;
    project_id?: number;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/generation/variables/resolve', requestData);
    return response.data;
  }

  /**
   * 获取测试点（别名方法，保持向后兼容）
   */
  async getTestPoint(id: number): Promise<any> {
    return this.getTestPointById(id);
  }

  /**
   * 获取统一测试用例（重载版本，支持更灵活的参数）
   */
  async getUnifiedTestCasesFlexible(params: {
    test_point_ids?: number[];
    page?: number;
    size?: number;
    sort_by?: string;
    sort_order?: string;
    [key: string]: any;
  }): Promise<any> {
    const response = await apiClient.get(`${this.basePath}/unified-test-cases`, { params });
    return response.data;
  }

  // ========== 参数验证工具方法 ==========

  /**
   * 验证和标准化测试点参数
   * 确保参数符合后端API限制，防止422错误
   */
  private validateAndNormalizeTestPointParams(params: {
    page?: number;
    size?: number;
    business_type?: string;
    project_id?: number;
    // status field removed - test points no longer have status
    priority?: PriorityLevel;
    keyword?: string;
    test_point_ids?: number[];
  }): any {
    // 创建副本避免修改原对象
    const validatedParams = { ...params };

    // 验证和修复分页参数
    if (!validatedParams.page || validatedParams.page < 1) {
      validatedParams.page = 1;
    }
    if (!validatedParams.size || validatedParams.size < 1) {
      validatedParams.size = 20;
    }
    // 根据后端Pydantic模型限制，最大页面大小为100
    if (validatedParams.size > 100) {
      if (validatedParams.size !== params.size) {
        // 只有实际调整时才记录
        console.info(`测试点页面大小已从 ${params.size} 调整为 ${validatedParams.size}（后端限制：100）`);
      }
      validatedParams.size = 100;
    }

    // 验证数值型参数
    if (validatedParams.project_id && (validatedParams.project_id < 1 || !Number.isInteger(validatedParams.project_id))) {
      // 静默忽略无效的项目ID，这是正常的参数清理
      delete validatedParams.project_id;
    }

    // 验证test_point_ids数组
    if (validatedParams.test_point_ids) {
      if (!Array.isArray(validatedParams.test_point_ids)) {
        // 静默忽略无效的test_point_ids格式，这是正常的参数清理
        delete validatedParams.test_point_ids;
      } else {
        // 过滤掉无效ID
        validatedParams.test_point_ids = validatedParams.test_point_ids
          .filter(id => id && Number.isInteger(id) && id > 0)
          .slice(0, 100); // 限制数组长度防止请求过大

        if (validatedParams.test_point_ids.length === 0) {
          delete validatedParams.test_point_ids;
        }
      }
    }

    // 验证字符串参数长度
    const stringFields = ['business_type', 'priority', 'keyword'];
    stringFields.forEach(field => {
      const value = validatedParams[field as keyof typeof validatedParams];
      if (value && typeof value === 'string') {
        // 限制字符串长度防止过长的请求
        if (value.length > 100) {
          // 静默截断过长的参数，这是正常的数据清理
          (validatedParams as any)[field] = value.substring(0, 100);
        }
        // 清理空白字符
        (validatedParams as any)[field] = value.trim();
      }
    });

    return validatedParams;
  }

  /**
   * 验证和标准化过滤器参数
   * 确保参数符合后端API限制，防止422错误
   */
  private validateAndNormalizeFilter(filter: UnifiedTestCaseFilter): UnifiedTestCaseFilter {
    // 创建副本避免修改原对象
    const validatedFilter = { ...filter };

    // 验证和修复分页参数
    if (!validatedFilter.page || validatedFilter.page < 1) {
      validatedFilter.page = 1;
    }
    if (!validatedFilter.size || validatedFilter.size < 1) {
      validatedFilter.size = 20;
    }
    // 根据后端Pydantic模型限制，最大页面大小为100
    if (validatedFilter.size > 100) {
      if (validatedFilter.size !== filter.size) {
      // 只有实际调整时才记录
      console.info(`测试用例页面大小已从 ${filter.size} 调整为 ${validatedFilter.size}（后端限制：100）`);
    }
      validatedFilter.size = 100;
    }

    // 验证数值型参数
    if (validatedFilter.project_id && (validatedFilter.project_id < 1 || !Number.isInteger(validatedFilter.project_id))) {
      // 静默忽略无效的项目ID，这是正常的参数清理
      delete validatedFilter.project_id;
    }

    // 验证test_point_ids数组
    if (validatedFilter.test_point_ids) {
      if (!Array.isArray(validatedFilter.test_point_ids)) {
        // 静默忽略无效的test_point_ids格式，这是正常的参数清理
        delete validatedFilter.test_point_ids;
      } else {
        // 过滤掉无效ID
        validatedFilter.test_point_ids = validatedFilter.test_point_ids
          .filter(id => id && Number.isInteger(id) && id > 0)
          .slice(0, 100); // 限制数组长度防止请求过大

        if (validatedFilter.test_point_ids.length === 0) {
          delete validatedFilter.test_point_ids;
        }
      }
    }

    // 验证字符串参数长度
    const stringFields = ['business_type', 'status', 'stage', 'priority', 'keyword'];
    stringFields.forEach(field => {
      const value = validatedFilter[field as keyof UnifiedTestCaseFilter];
      if (value && typeof value === 'string') {
        // 限制字符串长度防止过长的请求
        if (value.length > 100) {
          // 静默截断过长的参数，这是正常的数据清理
          (validatedFilter as any)[field] = value.substring(0, 100);
        }
        // 清理空白字符
        (validatedFilter as any)[field] = value.trim();
      }
    });

    return validatedFilter;
  }

  // ========== 状态和优先级工具方法 ==========

  /**
   * 获取状态对应的颜色
   */
  getStatusColor(status: UnifiedTestCaseStatus): string {
    const colorMap: Record<UnifiedTestCaseStatus, string> = {
      [UnifiedTestCaseStatus.DRAFT]: 'default',
      [UnifiedTestCaseStatus.APPROVED]: 'processing',
      [UnifiedTestCaseStatus.COMPLETED]: 'success'
    };
    return colorMap[status] || 'default';
  }

  /**
   * 获取状态对应的标签
   */
  getStatusLabel(status: UnifiedTestCaseStatus): string {
    const labelMap: Record<UnifiedTestCaseStatus, string> = {
      [UnifiedTestCaseStatus.DRAFT]: '草稿',
      [UnifiedTestCaseStatus.APPROVED]: '已批准',
      [UnifiedTestCaseStatus.COMPLETED]: '已完成'
    };
    return labelMap[status] || status;
  }

  /**
   * 获取优先级对应的颜色
   */
  getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colorMap[priority] || 'default';
  }

  /**
   * 获取优先级对应的标签
   */
  getPriorityLabel(priority: string): string {
    const labelMap: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return labelMap[priority] || priority;
  }

  /**
   * 批量批准测试用例
   */
  async approveTestCases(testCaseIds: number[]): Promise<void> {
    await this.batchUnifiedTestCaseOperation({
      test_case_ids: testCaseIds,
      operation: 'update_status',
      status: UnifiedTestCaseStatus.APPROVED
    });
  }

  /**
   * 批量完成测试用例
   */
  async completeTestCases(testCaseIds: number[]): Promise<void> {
    await this.batchUnifiedTestCaseOperation({
      test_case_ids: testCaseIds,
      operation: 'update_status',
      status: UnifiedTestCaseStatus.COMPLETED
    });
  }

  /**
   * 获取测试用例（兼容性方法，映射到getUnifiedTestCases）
   */
  async getTestCases(filter: UnifiedTestCaseFilter): Promise<UnifiedTestCaseListResponse> {
    return this.getUnifiedTestCases(filter);
  }

  /**
   * 批量删除测试用例
   */
  async batchDelete(testCaseIds: number[]): Promise<void> {
    await this.batchUnifiedTestCaseOperation({
      test_case_ids: testCaseIds,
      operation: 'delete'
    });
  }
}

// 创建单例实例
const unifiedGenerationService = new UnifiedGenerationService();

export default unifiedGenerationService;

// 同时导出类和实例，以便测试和扩展使用
export { UnifiedGenerationService, unifiedGenerationService };