import apiClient from './api';
import {
  TestCasesListResponse,
  GenerateTestCaseRequest,
  GenerateResponse,
  BusinessTypeResponse,
  BusinessTypeMappingResponse,
} from '@/types/testCases';

export const testCaseService = {
  // 获取所有测试用例
  getAllTestCases: async (projectId?: number): Promise<TestCasesListResponse> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<TestCasesListResponse>('/api/v1/test-cases', { params });
    return response.data;
  },

  // 根据业务类型获取测试用例
  getTestCasesByBusinessType: async (businessType: string, projectId?: number): Promise<TestCasesListResponse> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<TestCasesListResponse>(`/api/v1/test-cases/${businessType}`, { params });
    return response.data;
  },

  // 根据ID获取单个测试用例组
  getTestCaseById: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/api/v1/test-cases`);
    const allTestGroups = response.data.test_case_groups || [];
    const testGroup = allTestGroups.find((tg: any) => tg.id === id);
    if (!testGroup) {
      throw new Error(`Test case group with ID ${id} not found`);
    }
    return testGroup;
  },

  // 根据ID获取单个测试用例项
  getTestCaseItemById: async (groupId: number, itemId: number): Promise<any> => {
    const response = await apiClient.get(`/api/v1/test-cases`);
    const allTestGroups = response.data.test_case_groups || [];
    const testGroup = allTestGroups.find((tg: any) => tg.id === groupId);
    if (!testGroup) {
      throw new Error(`Test case group with ID ${groupId} not found`);
    }
    const testItem = testGroup.test_case_items.find((item: any) => item.id === itemId);
    if (!testItem) {
      throw new Error(`Test case item with ID ${itemId} not found`);
    }
    return testItem;
  },

  // 生成测试用例
  generateTestCases: async (request: GenerateTestCaseRequest, projectId?: number): Promise<GenerateResponse> => {
    const payload = projectId ? { ...request, project_id: projectId } : request;
    const response = await apiClient.post<GenerateResponse>('/api/v1/generate-test-cases', payload);
    return response.data;
  },

  // 删除测试用例（根据业务类型）
  deleteTestCasesByBusinessType: async (businessType: string): Promise<void> => {
    await apiClient.delete(`/api/v1/test-cases/${businessType}`);
  },

  // 获取业务类型列表
  getBusinessTypes: async (projectId?: number): Promise<BusinessTypeResponse> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<BusinessTypeResponse>('/api/v1/business-types', { params });
    return response.data;
  },

  // 获取业务类型映射（包含中文名称和描述）
  getBusinessTypesMapping: async (): Promise<BusinessTypeMappingResponse> => {
    const response = await apiClient.get<BusinessTypeMappingResponse>('/api/v1/business-types/mapping');
    return response.data;
  },

  // 导出测试用例到Excel
  exportToExcel: async (businessType?: string): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (businessType) {
        params.append('business_type', businessType);
      }

      const url = `/api/v1/test-cases/export${params.toString() ? '?' + params.toString() : ''}`;

      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'test_cases.xlsx';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      throw new Error(`导出失败: ${error.message}`);
    }
  },
};

export default testCaseService;