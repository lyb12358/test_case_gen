import apiClient from './api';
import {
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

  // 根据ID获取单个测试用例组
  getTestCaseById: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/test-cases`);
    const allTestGroups = response.data.test_case_groups || [];
    const testGroup = allTestGroups.find((tg: any) => tg.id === id);
    if (!testGroup) {
      throw new Error(`Test case group with ID ${id} not found`);
    }
    return testGroup;
  },

  // 根据ID获取单个测试用例项
  getTestCaseItemById: async (groupId: number, itemId: number): Promise<any> => {
    const response = await apiClient.get(`/test-cases`);
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