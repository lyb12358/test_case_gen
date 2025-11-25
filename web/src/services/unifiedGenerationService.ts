/**
 * 统一的测试生成服务，整合了testCaseService、unifiedTestCaseService和testPointService的功能
 * 这是唯一应该被使用的测试生成相关服务，其他服务文件将被弃用
 */

import apiClient from './api';
import { errorHandlerService } from './errorHandlerService';
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
  TestPointStatus,
  Priority,
  BusinessType,
  TestPointStatusUpdate,
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
    const response = await apiClient.get('/api/v1/test-cases/export', {
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
    const response = await apiClient.get('/api/v1/business/business-types', { params });
    return response.data;
  }

  /**
   * 获取业务类型映射
   */
  async getBusinessTypesMapping(): Promise<any> {
    const response = await apiClient.get('/api/v1/config/business-types');
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
    status?: TestPointStatus;
    priority?: Priority;
    keyword?: string;
    test_point_ids?: number[];
  }): Promise<TestPointListResponse> {
    try {
      const response = await apiClient.get('/api/v1/test-points', { params });
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
      // 确保status为字符串
      status: typeof item.status === 'string'
        ? item.status
        : item.status?.value || item.status,
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
    const params = new URLSearchParams();

    // 过滤参数
    if (filter.project_id) params.append('project_id', filter.project_id.toString());
    if (filter.business_type) params.append('business_type', filter.business_type);
    if (filter.status) params.append('status', filter.status);
    if (filter.stage) params.append('stage', filter.stage);
    if (filter.priority) params.append('priority', filter.priority);
    if (filter.keyword) params.append('keyword', filter.keyword);
    if (filter.test_point_ids && filter.test_point_ids.length > 0) {
      filter.test_point_ids.forEach((id, index) => {
        params.append(`test_point_ids[${index}]`, id.toString());
      });
    }

    // 分页参数
    params.append('page', filter.page.toString());
    params.append('size', filter.size.toString());

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
      complexityLevel?: string;
      includeNegativeCases?: boolean;
      additionalContext?: string;
      saveToDatabase?: boolean;
      projectId?: number;
    }
  ): Promise<any> {
    const request = {
      business_type: businessType,
      test_points: testPoints,
      additional_context: options?.additionalContext || '',
      save_to_database: options?.saveToDatabase ?? true,
      project_id: options?.projectId,
      complexity_level: options?.complexityLevel || 'standard',
      include_negative_cases: options?.includeNegativeCases ?? true
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
      additionalContext?: string;
      saveToDatabase?: boolean;
      projectId?: number;
      asyncMode?: boolean;
    }
  ): Promise<any> {
    const request = {
      business_type: businessType,
      additional_context: options?.additionalContext,
      save_to_database: options?.saveToDatabase ?? false,
      project_id: options?.projectId,
      async_mode: options?.asyncMode ?? false
    };

    // Use the new unified generate endpoint
    const response = await apiClient.post('/api/v1/test-points/generate', request);
    return response.data;
  }

  /**
   * @deprecated 使用 generateTestPoints 替代
   */
  async generateTestPointsLegacy(request: any): Promise<any> {
    console.warn('generateTestPointsLegacy is deprecated, use generateTestPoints instead');
    return this.generateTestPoints(request);
  }

  /**
   * @deprecated 使用 generateTestCasesFromPoints 替代
   */
  async generateTestCasesLegacy(request: GenerateTestCaseRequest, projectId?: number): Promise<GenerateResponse> {
    console.warn('generateTestCasesLegacy is deprecated, use generateTestCasesFromPoints instead');
    const payload = projectId ? { ...request, project_id: projectId } : request;
    const response = await apiClient.post('/api/v1/generate-test-cases', payload);
    return response.data;
  }

  // ========== 补充的缺失方法 ==========

  /**
   * 批量生成测试点
   */
  async batchGenerateTestPoints(businessTypes: string[], options: {
    projectId?: number;
    count?: number;
    complexityLevel?: string;
  }): Promise<any> {
    const request = {
      business_types: businessTypes,
      project_id: options?.projectId,
      count: options?.count || 50,
      complexity_level: options?.complexityLevel || 'standard'
    };

    const response = await apiClient.post('/api/v1/generation/batch-test-points', request);
    return response.data;
  }

  /**
   * 批量生成测试用例
   */
  async batchGenerateTestCases(businessTypes: string[], options: {
    projectId?: number;
    complexityLevel?: string;
    includeNegativeCases?: boolean;
  }): Promise<any> {
    const request = {
      business_types: businessTypes,
      project_id: options?.projectId,
      complexity_level: options?.complexityLevel || 'standard',
      include_negative_cases: options?.includeNegativeCases ?? true
    };

    const response = await apiClient.post('/api/v1/generation/batch-test-cases', request);
    return response.data;
  }

  /**
   * 完整的两阶段生成
   */
  async generateFullTwoStage(request: {
    business_type: string;
    project_id: number;
    test_point_count?: number;
    complexity_level?: string;
    include_negative_cases?: boolean;
    additional_context?: string;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/unified-test-cases/generate/full-two-stage', request);
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