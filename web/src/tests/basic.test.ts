/**
 * 基础测试 - 验证测试配置是否正常工作
 */

import { describe, it, expect } from 'vitest';

describe('基础配置测试', () => {
  it('应该能够运行基础测试', () => {
    expect(true).toBe(true);
  });

  it('应该支持基本的数学运算', () => {
    expect(2 + 2).toBe(4);
    expect(5 * 3).toBe(15);
  });

  it('应该支持字符串操作', () => {
    const text = 'TSP测试用例生成系统';
    expect(text).toContain('TSP');
    expect(text.length).toBeGreaterThan(0);
  });

  it('应该支持对象操作', () => {
    const obj = {
      name: '测试用例',
      type: 'unit',
      status: 'passed'
    };

    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('测试用例');
    expect(obj.status).toBe('passed');
  });

  it('应该支持数组操作', () => {
    const array = ['RCC', 'RFD', 'ZAB'];
    expect(array).toHaveLength(3);
    expect(array).toContain('RCC');
  });

  it('应该支持异步操作', async () => {
    const fetchData = () => new Promise(resolve => {
      setTimeout(() => resolve('data'), 10);
    });

    const result = await fetchData();
    expect(result).toBe('data');
  });
});