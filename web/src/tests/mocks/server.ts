import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
  BusinessTypeConfig,
  UnifiedTestCase,
  TestPoint,
  GenerationResponse,
  TaskStatusResponse
} from '@/types';

// Mock data
const mockBusinessTypes: BusinessTypeConfig[] = [
  {
    id: 1,
    code: 'RCC',
    name: '远程空调控制',
    description: '远程控制车辆空调系统',
    is_active: true,
    project_id: 1,
    test_point_combination_id: 1,
    test_case_combination_id: 2,
    template_config: {},
    additional_config: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    code: 'RFD',
    name: '远程车门控制',
    description: '远程控制车辆车门系统',
    is_active: true,
    project_id: 1,
    test_point_combination_id: 3,
    test_case_combination_id: 4,
    template_config: {},
    additional_config: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockTestPoints: TestPoint[] = [
  {
    id: 1,
    name: '开启空调测试',
    description: '测试远程开启空调功能',
    business_type: 'RCC',
    project_id: 1,
    status: 'active',
    priority: 'high',
    test_cases: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockUnifiedTestCases: UnifiedTestCase[] = [
  {
    id: 1,
    name: '远程开启空调-正常情况',
    description: '用户通过APP远程开启空调，车辆正常响应',
    business_type: 'RCC',
    project_id: 1,
    status: 'completed',
    stage: 'test_case',
    priority: 'high',
    test_point_id: 1,
    test_cases: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockGenerationResponse: GenerationResponse = {
  success: true,
  task_id: 'test-task-123',
  message: '生成任务已创建',
  data: {
    business_type: 'RCC',
    count: 10
  }
};

const mockTaskStatusResponse: TaskStatusResponse = {
  task_id: 'test-task-123',
  status: 'completed',
  progress: 100,
  message: '生成完成',
  result: {
    test_points: 10,
    test_cases: 50
  }
};

// API handlers
export const handlers = [
  // 业务类型相关API
  rest.get('/api/v1/config/business-types', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockBusinessTypes
      })
    );
  }),

  rest.get('/api/v1/business-types', (req, res, ctx) => {
    const projectId = req.url.searchParams.get('project_id');
    const filteredTypes = projectId
      ? mockBusinessTypes.filter(bt => bt.project_id === parseInt(projectId))
      : mockBusinessTypes;

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: filteredTypes
      })
    );
  }),

  // 测试点相关API
  rest.get('/api/v1/test-points', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTestPoints,
        pagination: {
          page: 1,
          size: 20,
          total: 1
        }
      })
    );
  }),

  rest.get('/api/v1/test-points/:id', (req, res, ctx) => {
    const { id } = req.params;
    const testPoint = mockTestPoints.find(tp => tp.id === parseInt(id as string));

    if (!testPoint) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Test point not found'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: testPoint
      })
    );
  }),

  // 统一测试用例相关API
  rest.get('/api/v1/unified-test-cases', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUnifiedTestCases,
        pagination: {
          page: 1,
          size: 20,
          total: 1
        }
      })
    );
  }),

  rest.get('/api/v1/unified-test-cases/:id', (req, res, ctx) => {
    const { id } = req.params;
    const testCase = mockUnifiedTestCases.find(tc => tc.id === parseInt(id as string));

    if (!testCase) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Test case not found'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: testCase
      })
    );
  }),

  // 生成相关API
  rest.post('/api/v1/generation/test-points', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockGenerationResponse)
    );
  }),

  rest.post('/api/v1/generation/test-cases', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockGenerationResponse)
    );
  }),

  rest.get('/api/v1/generation/status/:taskId', (req, res, ctx) => {
    const { taskId } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        ...mockTaskStatusResponse,
        task_id: taskId
      })
    );
  }),

  rest.post('/api/v1/generation/cancel/:taskId', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: '任务已取消'
      })
    );
  }),

  // 项目相关API
  rest.get('/api/v1/projects', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: 1,
            name: '测试项目1',
            description: '用于测试的项目',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      })
    );
  }),

  // 健康检查
  rest.get('/api/v1/generation/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    );
  }),

  // 错误处理测试
  rest.get('/api/v1/test/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误'
        }
      })
    );
  })
];

// 创建服务器
export const server = setupServer(...handlers);