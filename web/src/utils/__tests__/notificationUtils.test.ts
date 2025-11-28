/**
 * 通知工具测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  showOperationResult,
  showDetailedError,
  showNetworkError,
  showApiError,
  showValidationErrors,
  showConfirmDialog,
  showHttpError,
  showBatchOperationResult
} from '../notificationUtils';

// Mock antd components
vi.mock('antd', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn()
  },
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    open: vi.fn()
  },
  Modal: {
    confirm: vi.fn(),
    info: vi.fn()
  }
}));

describe('Notification Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Notifications', () => {
    it('should show success message', () => {
      const { message } = require('antd');
      showSuccess('操作成功');

      expect(message.success).toHaveBeenCalledWith({
        content: '操作成功',
        duration: 3,
        icon: expect.any(Object)
      });
    });

    it('should show error message', () => {
      const { message } = require('antd');
      showError('操作失败');

      expect(message.error).toHaveBeenCalledWith({
        content: '操作失败',
        duration: 5,
        icon: expect.any(Object)
      });
    });

    it('should show warning message', () => {
      const { message } = require('antd');
      showWarning('警告信息');

      expect(message.warning).toHaveBeenCalledWith({
        content: '警告信息',
        duration: 4,
        icon: expect.any(Object)
      });
    });

    it('should show info message', () => {
      const { message } = require('antd');
      showInfo('提示信息');

      expect(message.info).toHaveBeenCalledWith({
        content: '提示信息',
        duration: 3,
        icon: expect.any(Object)
      });
    });

    it('should show loading message', () => {
      const { message } = require('antd');
      showLoading('加载中...');

      expect(message.loading).toHaveBeenCalledWith({
        content: '加载中...',
        duration: 0
      });
    });
  });

  describe('showOperationResult', () => {
    it('should show success notification', () => {
      const { message } = require('antd');
      showOperationResult(true, '保存成功', '保存失败');

      expect(message.success).toHaveBeenCalledWith('保存成功');
      expect(message.error).not.toHaveBeenCalled();
    });

    it('should show error notification', () => {
      const { message } = require('antd');
      showOperationResult(false, '保存成功', '保存失败');

      expect(message.error).toHaveBeenCalledWith('保存失败');
      expect(message.success).not.toHaveBeenCalled();
    });

    it('should show detailed error notification', () => {
      const { message, notification } = require('antd');
      showOperationResult(false, '保存成功', '保存失败', '详细错误信息');

      expect(notification.error).toHaveBeenCalledWith({
        message: '保存失败',
        description: '详细错误信息',
        duration: 6,
        icon: expect.any(Object)
      });
    });
  });

  describe('showDetailedError', () => {
    it('should handle string error', () => {
      const { notification } = require('antd');
      showDetailedError({ error: 'String error message' });

      expect(notification.error).toHaveBeenCalledWith({
        message: '操作失败',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });

    it('should handle Error object', () => {
      const { notification } = require('antd');
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      showDetailedError({ error });

      expect(notification.error).toHaveBeenCalledWith({
        message: '操作失败',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });

    it('should handle UnifiedErrorResponse', () => {
      const { notification } = require('antd');
      const errorResponse = {
        error: 'API Error',
        details: 'Error details',
        field: 'username',
        trace_id: 'trace-123'
      };

      showDetailedError({ error: errorResponse });

      expect(notification.error).toHaveBeenCalledWith({
        message: '操作失败',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });
  });

  describe('showValidationErrors', () => {
    it('should show validation errors', () => {
      const { notification } = require('antd');
      const errors = {
        username: ['用户名不能为空', '用户名长度太短'],
        password: ['密码不能为空']
      };

      showValidationErrors(errors);

      expect(notification.error).toHaveBeenCalledWith({
        message: '表单验证失败',
        description: expect.any(Object),
        duration: 6,
        icon: expect.any(Object)
      });
    });

    it('should handle empty errors', () => {
      const { message } = require('antd');
      showValidationErrors({});

      expect(message.error).toHaveBeenCalledWith('表单验证失败，请检查输入');
    });
  });

  describe('showConfirmDialog', () => {
    it('should show confirmation dialog', () => {
      const { Modal } = require('antd');
      const onConfirm = vi.fn();

      showConfirmDialog('确认删除', '确定要删除这个项目吗？', onConfirm);

      expect(Modal.confirm).toHaveBeenCalledWith({
        title: '确认删除',
        content: '确定要删除这个项目吗？',
        icon: expect.any(Object),
        okText: '确认',
        cancelText: '取消',
        okType: 'primary',
        onOk: onConfirm,
        onCancel: expect.any(Function)
      });
    });

    it('should show danger dialog', () => {
      const { Modal } = require('antd');
      const onConfirm = vi.fn();

      showConfirmDialog('确认删除', '此操作不可恢复！', onConfirm, undefined, 'danger');

      expect(Modal.confirm).toHaveBeenCalledWith({
        title: '确认删除',
        content: '此操作不可恢复！',
        icon: expect.any(Object),
        okText: '确认',
        cancelText: '取消',
        okType: 'danger',
        onOk: onConfirm,
        onCancel: expect.any(Function)
      });
    });
  });

  describe('showHttpError', () => {
    it('should handle 400 error', () => {
      const { notification } = require('antd');
      showHttpError(400);

      expect(notification.error).toHaveBeenCalledWith({
        message: '请求参数错误',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });

    it('should handle 404 error', () => {
      const { notification } = require('antd');
      showHttpError(404);

      expect(notification.error).toHaveBeenCalledWith({
        message: '资源不存在',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });

    it('should handle 500 error with retry', () => {
      const { notification } = require('antd');
      showHttpError(500);

      expect(notification.error).toHaveBeenCalledWith({
        message: '服务器内部错误',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });
  });

  describe('showBatchOperationResult', () => {
    it('should show success result', () => {
      const { message } = require('antd');
      showBatchOperationResult(10, 10, 0);

      expect(message.success).toHaveBeenCalledWith('成功处理 10 项');
    });

    it('should show mixed result', () => {
      const { notification } = require('antd');
      const failedItems = [
        { item: { id: 1 }, error: 'Error 1' },
        { item: { id: 2 }, error: 'Error 2' }
      ];

      showBatchOperationResult(5, 3, 2, failedItems);

      expect(notification.warning).toHaveBeenCalledWith({
        message: '批量操作完成',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });
  });

  describe('Network and API Errors', () => {
    it('should show network error with retry', () => {
      const { notification } = require('antd');
      const retryAction = vi.fn();
      const error = { message: 'Network error' };

      showNetworkError(error, retryAction);

      expect(notification.error).toHaveBeenCalledWith({
        message: '网络连接错误',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });

    it('should show API error', () => {
      const { notification } = require('antd');
      const response = {
        data: { error: 'API Error' },
        config: { method: 'GET', url: '/api/test' }
      };

      showApiError(response);

      expect(notification.error).toHaveBeenCalledWith({
        message: 'API调用失败',
        description: expect.any(Object),
        duration: 0,
        icon: expect.any(Object)
      });
    });
  });
});