import { UnifiedTestCaseResponse } from '../types/unifiedTestCase';

export interface TestCaseState {
  // 模态框状态
  createModalVisible: boolean;
  generateModalVisible: boolean;

  // 选择状态
  selectedRowKeys: React.Key[];
  selectedTestPointId?: number;

  // 表单状态
  editingTestCase: UnifiedTestCaseResponse | null;
  currentSelectedTestPoint: any;

  // UI状态
  activeTab: string;
  searchText: string;

  // 分页状态
  currentPage: number;
  pageSize: number;
}

export type TestCaseAction =
  | { type: 'OPEN_CREATE_MODAL'; payload?: { testCase?: UnifiedTestCaseResponse } }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_GENERATE_MODAL' }
  | { type: 'CLOSE_GENERATE_MODAL' }
  | { type: 'SELECT_TEST_POINT'; payload: number | undefined }
  | { type: 'SET_SELECTED_ROW_KEYS'; payload: React.Key[] }
  | { type: 'SET_EDITING_TEST_CASE'; payload: UnifiedTestCaseResponse | null }
  | { type: 'SET_CURRENT_SELECTED_TEST_POINT'; payload: any }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_SEARCH_TEXT'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'RESET_FORM_STATE' };

const initialState: TestCaseState = {
  createModalVisible: false,
  generateModalVisible: false,
  selectedRowKeys: [],
  selectedTestPointId: undefined,
  editingTestCase: null,
  currentSelectedTestPoint: null,
  activeTab: 'list',
  searchText: '',
  currentPage: 1,
  pageSize: 20,
};

export const testCaseReducer = (state: TestCaseState, action: TestCaseAction): TestCaseState => {
  switch (action.type) {
    case 'OPEN_CREATE_MODAL':
      return {
        ...state,
        createModalVisible: true,
        editingTestCase: action.payload?.testCase || null,
        currentSelectedTestPoint: null,
      };

    case 'CLOSE_CREATE_MODAL':
      return {
        ...state,
        createModalVisible: false,
        editingTestCase: null,
        currentSelectedTestPoint: null,
      };

    case 'OPEN_GENERATE_MODAL':
      return {
        ...state,
        generateModalVisible: true,
      };

    case 'CLOSE_GENERATE_MODAL':
      return {
        ...state,
        generateModalVisible: false,
      };

    case 'SELECT_TEST_POINT':
      return {
        ...state,
        selectedTestPointId: action.payload,
      };

    case 'SET_SELECTED_ROW_KEYS':
      return {
        ...state,
        selectedRowKeys: action.payload,
      };

    case 'SET_EDITING_TEST_CASE':
      return {
        ...state,
        editingTestCase: action.payload,
      };

    case 'SET_CURRENT_SELECTED_TEST_POINT':
      return {
        ...state,
        currentSelectedTestPoint: action.payload,
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };

    case 'SET_SEARCH_TEXT':
      return {
        ...state,
        searchText: action.payload,
        currentPage: 1, // 搜索时重置到第一页
      };

    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.payload,
      };

    case 'SET_PAGE_SIZE':
      return {
        ...state,
        pageSize: action.payload,
        currentPage: 1, // 改变页大小时重置到第一页
      };

    case 'RESET_FORM_STATE':
      return {
        ...state,
        createModalVisible: false,
        generateModalVisible: false,
        editingTestCase: null,
        currentSelectedTestPoint: null,
        selectedRowKeys: [],
      };

    default:
      return state;
  }
};

export default testCaseReducer;