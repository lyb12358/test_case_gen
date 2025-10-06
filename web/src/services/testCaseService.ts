import apiClient from './api';
import {
  TestCaseResponse,
  TestCasesListResponse,
  GenerateTestCaseRequest,
  GenerateResponse,
  BusinessTypeResponse,
} from '@/types/testCases';

export const testCaseService = {
  // 获取所有测试用例
  getAllTestCases: async (): Promise<TestCasesListResponse> => {
    const response = await apiClient.get<TestCasesListResponse>('/test-cases');
    return response.data;
  },

  // 根据业务类型获取测试用例
  getTestCasesByBusinessType: async (businessType: string): Promise<TestCasesListResponse> => {
    const response = await apiClient.get<TestCasesListResponse>(`/test-cases/${businessType}`);
    return response.data;
  },

  // 根据ID获取单个测试用例
  getTestCaseById: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/test-cases`);
    const allTestCases = response.data.test_cases || [];
    const testCase = allTestCases.find((tc: any) => tc.id === id);
    if (!testCase) {
      throw new Error(`Test case with ID ${id} not found`);
    }
    return testCase;
  },

  // 生成测试用例
  generateTestCases: async (request: GenerateTestCaseRequest): Promise<GenerateResponse> => {
    const response = await apiClient.post<GenerateResponse>('/generate-test-cases', request);
    return response.data;
  },

  // 删除测试用例（根据业务类型）
  deleteTestCasesByBusinessType: async (businessType: string): Promise<void> => {
    await apiClient.delete(`/test-cases/${businessType}`);
  },

  // 获取业务类型列表
  getBusinessTypes: async (): Promise<BusinessTypeResponse> => {
    const response = await apiClient.get<BusinessTypeResponse>('/business-types');
    return response.data;
  },
};

export default testCaseService;