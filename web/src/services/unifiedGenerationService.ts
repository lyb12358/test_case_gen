/**
 * 统一的测试生成服务，整合了testCaseService、unifiedTestCaseService和testPointService的功能
 * 这是唯一应该被使用的测试生成相关服务，其他服务文件将被弃用
 */

import apiClient from './api';
import { errorHandlerService } from './errorHandlerService';
import { API_ENDPOINTS } from '@/config/constants';
import {
  GenerateTestCaseRequest,
  GenerateResponse,
} from '@/types';
import type { components } from '@/types/api';
import {
  TestPoint,
  TestPointSummary,
  TestPointCreate,
  TestPointUpdate,
  TestPointSearchRequest,
  TestPointListResponse,
  TestPointValidationResponse,
  TestPointStatistics,
  Priority,
  BusinessType,
  BatchTestPointOperation,
  BatchTestPointOperationResponse,
  TestPointGenerationRequest,
  TestPointGenerationResponse,
  TestCaseFromTestPointRequest,
  TestCaseFromTestPointResponse,
  NameSyncRequest,
  BatchNameSyncRequest,
  NameSyncResult,
  NameChange,
  NameSyncPreview,
  NameValidationRequest,
  NameValidationResponse
} from '../types/testPoints';
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
    business_type?: BusinessType;
    project_id?: number;
    // status field removed - test points no longer have status
    priority?: Priority;
    keyword?: string;
    test_point_ids?: number[];
  }): Promise<TestPointListResponse> {
    try {
      // 参数验证和标准化
      const validatedParams = this.validateAndNormalizeTestPointParams(params || {});

      const response = await apiClient.get('/api/v1/test-points', { params: validatedParams });
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
  private transformTestPointResponse(data: any): TestPointListResponse {
    // 确保数据格式正确
    const items = (data.items || data.test_points || []).map((item: any) => ({
      ...item,
      // 确保business_type为字符串
      business_type: typeof item.business_type === 'string'
        ? item.business_type
        : item.business_type?.value || item.business_type,
      // status field removed - test points no longer have status
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
  async getTestPointById(id: number, projectId?: number): Promise<TestPoint> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`/api/v1/test-points/${id}`, { params });
    return response.data;
  }

  /**
   * 创建测试点
   */
  async createTestPoint(testPoint: TestPointCreate): Promise<TestPoint> {
    const response = await apiClient.post('/api/v1/test-points', testPoint);
    return response.data;
  }

  /**
   * 更新测试点
   */
  async updateTestPoint(id: number, testPoint: TestPointUpdate): Promise<TestPoint> {
    const response = await apiClient.put(`/api/v1/test-points/${id}`, testPoint);
    return response.data;
  }

  /**
   * 删除测试点
   */
  async deleteTestPoint(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/test-points/${id}`);
  }

  /**
   * 批量操作测试点
   */
  async batchTestPointOperation(operation: BatchTestPointOperation): Promise<BatchTestPointOperationResponse> {
    const response = await apiClient.post('/api/v1/test-points/batch', operation);
    return response.data;
  }

  /**
   * 根据业务类型获取测试点
   */
  async getTestPointsByBusinessType(businessType: string, projectId?: number): Promise<TestPointListResponse> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(`/api/v1/test-points/by-business/${businessType}`, { params });
    return response.data;
  }

  /**
   * 获取测试点统计信息
   */
  async getTestPointStatistics(projectId?: number): Promise<TestPointStatistics> {
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
  async validateTestPoint(testPoint: TestPointCreate): Promise<TestPointValidationResponse> {
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

    const params = new URLSearchParams();

    // 过滤参数
    if (validatedFilter.project_id) params.append('project_id', validatedFilter.project_id.toString());
    if (validatedFilter.business_type) params.append('business_type', validatedFilter.business_type);
    if (validatedFilter.stage) params.append('stage', validatedFilter.stage);
    if (validatedFilter.priority) params.append('priority', validatedFilter.priority);
    if (validatedFilter.keyword) params.append('keyword', validatedFilter.keyword);
    if (validatedFilter.test_point_ids && validatedFilter.test_point_ids.length > 0) {
      validatedFilter.test_point_ids.forEach((id, index) => {
        params.append(`test_point_ids[${index}]`, id.toString());
      });
    }

    // 分页参数
    params.append('page', validatedFilter.page.toString());
    params.append('size', validatedFilter.size.toString());

    const response = await apiClient.get(`${this.basePath}/unified-test-cases?${params}`);
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
      await apiClient.delete(`${this.basePath}/unified-test-cases/${id}`);
    } catch (error: any) {
      console.error('删除测试用例失败:', error);

      // 根据错误类型提供详细的错误信息
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
   * 使用标准化的生成API端点
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
    const request = {
      business_type: businessType,
      test_points: testPoints,
      additional_context: options?.additionalContext || {},
      save_to_database: options?.saveToDatabase ?? true,
      project_id: options?.projectId
    };

    const response = await apiClient.post('/api/v1/generation/test-cases', request);
    return response.data;
  }

  /**
   * 批量生成测试点和测试用例
   */
  async batchGenerate(request: any): Promise<any> {
    const response = await apiClient.post('/api/v1/generation/batch', request);
    return response.data;
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

  // ========== 名称同步功能 ==========

  /**
   * 同步单个名称
   */
  async syncName(request: NameSyncRequest): Promise<NameSyncResult> {
    const response = await apiClient.post(`/api/v1/test-points/${request.testPointId}/sync-test-case-names`, request);
    return response.data;
  }

  /**
   * 批量同步名称
   */
  async batchSyncNames(request: BatchNameSyncRequest): Promise<NameSyncResult[]> {
    const response = await apiClient.post('/api/v1/test-points/batch-sync-test-case-names', request);
    return response.data;
  }

  /**
   * 获取名称同步预览
   * TODO: 等待后端实现
   */
  async getNameSyncPreview(projectId?: number, businessType?: string): Promise<NameSyncPreview[]> {
    // 临时返回空数组，等待后端实现
    console.warn('getNameSyncPreview: 后端API尚未实现');
    return [];
  }

  /**
   * 验证名称
   */
  async validateName(request: NameValidationRequest): Promise<NameValidationResponse> {
    const response = await apiClient.post('/api/v1/test-points/validate-name', request);
    return response.data;
  }

  // ========== 向后兼容的方法（保留原有API）==========

  /**
   * Generate test points using the unified endpoint.
   *
   * This replaces the old sync-generate endpoint and provides a clean,
   * consistent interface for test point generation.
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
    const request = {
      business_type: businessType,
      additional_context: options?.additionalContext || {},
      save_to_database: options?.saveToDatabase ?? false,
      project_id: options?.projectId,
      async_mode: options?.asyncMode ?? false
    };

    // Use the new unified generate endpoint
    const response = await apiClient.post('/api/v1/test-points/generate', request);
    return response.data;
  }

  
  
  // ========== 补充的缺失方法 ==========

  /**
   * 批量生成测试点
   */
  async batchGenerateTestPoints(businessTypes: string[], options: {
    projectId?: number;
  }): Promise<any> {
    const request = {
      business_types: businessTypes,
      project_id: options?.projectId
    };

    const response = await apiClient.post('/api/v1/generation/batch', request);
    return response.data;
  }

  /**
   * 批量生成测试用例
   */
  async batchGenerateTestCases(businessTypes: string[], options: {
    projectId?: number;
  }): Promise<any> {
    const request = {
      business_types: businessTypes,
      project_id: options?.projectId
    };

    const response = await apiClient.post('/api/v1/generation/batch', request);
    return response.data;
  }

  /**
   * 完整的两阶段生成
   */
  async generateFullTwoStage(request: {
    business_type: string;
    project_id: number;
    additional_context?: Record<string, any>;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/unified-test-cases/generate/full-two-stage', request);
    return response.data;
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
  async getTestPoint(id: number): Promise<TestPoint> {
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
    const response = await apiClient.get('/api/v1/unified-test-cases', { params });
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
    business_type?: BusinessType;
    project_id?: number;
    // status field removed - test points no longer have status
    priority?: Priority;
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
      console.warn(`测试点页面大小 ${validatedParams.size} 超过后端限制(100)，自动调整为100`);
      validatedParams.size = 100;
    }

    // 验证数值型参数
    if (validatedParams.project_id && (validatedParams.project_id < 1 || !Number.isInteger(validatedParams.project_id))) {
      console.warn('无效的项目ID，将被忽略');
      delete validatedParams.project_id;
    }

    // 验证test_point_ids数组
    if (validatedParams.test_point_ids) {
      if (!Array.isArray(validatedParams.test_point_ids)) {
        console.warn('test_point_ids必须是数组格式，将被忽略');
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
          console.warn(`测试点${field} 参数过长，将被截断`);
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
      console.warn(`页面大小 ${validatedFilter.size} 超过后端限制(100)，自动调整为100`);
      validatedFilter.size = 100;
    }

    // 验证数值型参数
    if (validatedFilter.project_id && (validatedFilter.project_id < 1 || !Number.isInteger(validatedFilter.project_id))) {
      console.warn('无效的项目ID，将被忽略');
      delete validatedFilter.project_id;
    }

    // 验证test_point_ids数组
    if (validatedFilter.test_point_ids) {
      if (!Array.isArray(validatedFilter.test_point_ids)) {
        console.warn('test_point_ids必须是数组格式，将被忽略');
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
          console.warn(`${field} 参数过长，将被截断`);
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