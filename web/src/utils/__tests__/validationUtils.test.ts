/**
 * 前端验证工具测试
 */

import { describe, it, expect } from 'vitest';
import {
  validatePreconditions,
  validateSteps,
  validateExpectedResults,
  validateTestCaseName,
  validateTestCaseDescription,
  validateTestCaseData,
  formatValidationMessage
} from '../validationUtils';

describe('Validation Utils', () => {
  describe('validatePreconditions', () => {
    it('should pass validation for valid preconditions', () => {
      const preconditions = [
        '用户已登录系统',
        '数据库连接正常',
        '相关服务已启动'
      ];
      const result = validatePreconditions(preconditions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for too many preconditions', () => {
      const preconditions = Array(51).fill('test condition');
      const result = validatePreconditions(preconditions);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('50个'))).toBe(true);
    });

    it('should fail for empty precondition', () => {
      const preconditions = ['valid condition', '', 'another valid'];
      const result = validatePreconditions(preconditions);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('不能为空'))).toBe(true);
    });

    it('should warn for too long precondition', () => {
      const preconditions = ['x'.repeat(301)];
      const result = validatePreconditions(preconditions);
      expect(result.warnings.some(w => w.message.includes('建议精简'))).toBe(true);
    });
  });

  describe('validateSteps', () => {
    it('should pass validation for valid steps', () => {
      const steps = [
        { id: 1, step_number: 1, action: '打开登录页面', expected: '页面正常显示' },
        { id: 2, step_number: 2, action: '输入用户名和密码' }
      ];
      const result = validateSteps(steps);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for duplicate step numbers', () => {
      const steps = [
        { id: 1, step_number: 1, action: '第一步', expected: '结果1' },
        { id: 2, step_number: 1, action: '第二步', expected: '结果2' }
      ];
      const result = validateSteps(steps);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('重复'))).toBe(true);
    });

    it('should fail for empty action', () => {
      const steps = [
        { id: 1, step_number: 1, action: '', expected: '应该失败' }
      ];
      const result = validateSteps(steps);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('动作描述不能为空'))).toBe(true);
    });

    it('should fail for invalid step number', () => {
      const steps = [
        { id: 1, step_number: 0, action: '测试步骤' }
      ];
      const result = validateSteps(steps);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('必须大于0'))).toBe(true);
    });

    it('should warn for non-sequential step numbers', () => {
      const steps = [
        { id: 1, step_number: 1, action: '第一步' },
        { id: 2, step_number: 3, action: '第三步' }
      ];
      const result = validateSteps(steps);
      expect(result.warnings.some(e => e.message.includes('序号不连续'))).toBe(true);
    });
  });

  describe('validateExpectedResults', () => {
    it('should pass validation for valid expected results', () => {
      const expectedResults = [
        '操作成功完成',
        '页面显示正确内容',
        '数据保存成功'
      ];
      const result = validateExpectedResults(expectedResults);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for too many expected results', () => {
      const expectedResults = Array(21).fill('test result');
      const result = validateExpectedResults(expectedResults);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('20个'))).toBe(true);
    });

    it('should fail for empty expected result', () => {
      const expectedResults = ['valid result', ''];
      const result = validateExpectedResults(expectedResults);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('不能为空'))).toBe(true);
    });
  });

  describe('validateTestCaseName', () => {
    it('should pass validation for valid name with business type', () => {
      const result = validateTestCaseName('RCC登录功能测试', 'RCC');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn for name without business type', () => {
      const result = validateTestCaseName('登录功能测试', 'RCC');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('RCC'))).toBe(true);
    });

    it('should fail for empty name', () => {
      const result = validateTestCaseName('', 'RCC');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('不能为空'))).toBe(true);
    });

    it('should warn for short name', () => {
      const result = validateTestCaseName('测试', 'RCC');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('过短'))).toBe(true);
    });
  });

  describe('validateTestCaseDescription', () => {
    it('should pass validation for valid description', () => {
      const result = validateTestCaseDescription('这是一个详细的测试用例描述，包含了测试目的、测试范围和预期结果等信息。');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn for empty description', () => {
      const result = validateTestCaseDescription('');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('建议添加'))).toBe(true);
    });

    it('should fail for too long description', () => {
      const result = validateTestCaseDescription('x'.repeat(2001));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('2000字符'))).toBe(true);
    });
  });

  describe('validateTestCaseData', () => {
    it('should pass validation for complete valid data', () => {
      const data = {
        name: 'RCC用户登录测试',
        description: '测试用户登录功能的正常流程',
        businessType: 'RCC',
        module: '用户管理',
        preconditions: ['用户已注册'],
        steps: [
          { id: 1, step_number: 1, action: '打开登录页面', expected: '页面显示正常' },
          { id: 2, step_number: 2, action: '输入用户名密码', expected: '登录成功' }
        ],
        expectedResult: ['用户成功登录系统']
      };
      const result = validateTestCaseData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid steps', () => {
      const data = {
        name: 'RCC用户登录测试',
        description: '测试用户登录功能',
        businessType: 'RCC',
        steps: [
          { id: 1, step_number: 1, action: '', expected: '空的action应该失败' }
        ]
      };
      const result = validateTestCaseData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should collect multiple validation errors', () => {
      const data = {
        name: '', // 空名称
        description: '',
        businessType: 'RCC',
        preconditions: ['', ''], // 两个空前置条件
        steps: [
          { id: 1, step_number: 1, action: '' } // 空action
        ],
        expectedResult: Array(21).fill('test') // 超过限制
      };
      const result = validateTestCaseData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('formatValidationMessage', () => {
    it('should format validation results correctly', () => {
      const validation = {
        isValid: false,
        errors: [
          { field: 'name', message: '名称不能为空', type: 'error' as const },
          { field: 'steps', message: '步骤不能为空', type: 'error' as const }
        ],
        warnings: [
          { field: 'description', message: '建议添加描述', type: 'warning' as const }
        ]
      };

      const result = formatValidationMessage(validation);
      expect(result.summary).toContain('2 个错误');
      expect(result.summary).toContain('1 个警告');
      expect(result.details).toHaveLength(3);
      expect(result.details.some(d => d.includes('❌'))).toBe(true);
      expect(result.details.some(d => d.includes('⚠️'))).toBe(true);
    });

    it('should show success message when no errors', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const result = formatValidationMessage(validation);
      expect(result.summary).toBe('验证通过，数据格式正确');
      expect(result.details).toHaveLength(0);
    });

    it('should show only errors when no warnings', () => {
      const validation = {
        isValid: false,
        errors: [
          { field: 'name', message: '名称不能为空', type: 'error' as const }
        ],
        warnings: []
      };

      const result = formatValidationMessage(validation);
      expect(result.summary).toContain('1 个错误');
      expect(result.summary).not.toContain('警告');
    });

    it('should show only warnings when no errors', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [
          { field: 'name', message: '建议优化名称', type: 'warning' as const }
        ]
      };

      const result = formatValidationMessage(validation);
      expect(result.summary).toContain('1 个警告');
      expect(result.summary).not.toContain('错误');
    });
  });
});