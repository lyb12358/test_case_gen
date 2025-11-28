/**
 * 前端表单验证工具
 * 与后端JSON验证器保持一致的验证逻辑
 */

export interface ValidationError {
  field: string;
  index?: number;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface StepItem {
  id: number;
  step_number: number;
  action: string;
  expected: string;
}

/**
 * 验证前置条件
 */
export const validatePreconditions = (preconditions: string[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (preconditions.length > 50) {
    errors.push({
      field: 'preconditions',
      message: '前置条件数量不能超过50个',
      type: 'error'
    });
  }

  if (preconditions.length > 40) {
    warnings.push({
      field: 'preconditions',
      message: '前置条件数量较多，建议精简至40个以内',
      type: 'warning'
    });
  }

  preconditions.forEach((condition, index) => {
    if (!condition || condition.trim() === '') {
      errors.push({
        field: 'preconditions',
        index,
        message: `前置条件 ${index + 1} 不能为空`,
        type: 'error'
      });
    } else if (condition.length > 500) {
      errors.push({
        field: 'preconditions',
        index,
        message: `前置条件 ${index + 1} 长度不能超过500字符`,
        type: 'error'
      });
    } else if (condition.length > 300) {
      warnings.push({
        field: 'preconditions',
        index,
        message: `前置条件 ${index + 1} 长度较长，建议精简`,
        type: 'warning'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 验证执行步骤
 */
export const validateSteps = (steps: StepItem[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const stepNumbers = new Set<number>();

  if (steps.length > 100) {
    errors.push({
      field: 'steps',
      message: '执行步骤数量不能超过100个',
      type: 'error'
    });
  }

  if (steps.length > 50) {
    warnings.push({
      field: 'steps',
      message: '执行步骤数量较多，建议拆分为多个测试用例',
      type: 'warning'
    });
  }

  steps.forEach((step, index) => {
    // 检查步骤序号
    if (!step.step_number || step.step_number < 1) {
      errors.push({
        field: 'step_number',
        index,
        message: `步骤 ${index + 1} 的序号必须大于0`,
        type: 'error'
      });
    } else if (step.step_number > 999) {
      errors.push({
        field: 'step_number',
        index,
        message: `步骤 ${index + 1} 的序号不能超过999`,
        type: 'error'
      });
    } else if (stepNumbers.has(step.step_number)) {
      errors.push({
        field: 'step_number',
        index,
        message: `步骤序号 ${step.step_number} 重复`,
        type: 'error'
      });
    } else {
      stepNumbers.add(step.step_number);
    }

    // 检查动作描述
    if (!step.action || step.action.trim() === '') {
      errors.push({
        field: 'action',
        index,
        message: `步骤 ${index + 1} 的动作描述不能为空`,
        type: 'error'
      });
    } else {
      if (step.action.length > 2000) {
        errors.push({
          field: 'action',
          index,
          message: `步骤 ${index + 1} 的动作描述长度不能超过2000字符`,
          type: 'error'
        });
      } else if (step.action.length < 5) {
        warnings.push({
          field: 'action',
          index,
          message: `步骤 ${index + 1} 的动作描述过短，建议添加更多细节`,
          type: 'warning'
        });
      }
    }

    // 检查预期结果
    if (step.expected && step.expected.length > 1000) {
      errors.push({
        field: 'expected',
        index,
        message: `步骤 ${index + 1} 的预期结果长度不能超过1000字符`,
        type: 'error'
      });
    }
  });

  // 检查步骤序号连续性
  const sortedNumbers = Array.from(stepNumbers).sort((a, b) => a - b);
  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] - sortedNumbers[i - 1] > 1) {
      warnings.push({
        field: 'step_number',
        message: `步骤序号不连续，建议使用连续的序号`,
        type: 'warning'
      });
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 验证预期结果
 */
export const validateExpectedResults = (expectedResults: string[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (expectedResults.length > 20) {
    errors.push({
      field: 'expected_result',
      message: '预期结果数量不能超过20个',
      type: 'error'
    });
  }

  if (expectedResults.length > 15) {
    warnings.push({
      field: 'expected_result',
      message: '预期结果数量较多，建议精简至15个以内',
      type: 'warning'
    });
  }

  expectedResults.forEach((result, index) => {
    if (!result || result.trim() === '') {
      errors.push({
        field: 'expected_result',
        index,
        message: `预期结果 ${index + 1} 不能为空`,
        type: 'error'
      });
    } else if (result.length > 1000) {
      errors.push({
        field: 'expected_result',
        index,
        message: `预期结果 ${index + 1} 长度不能超过1000字符`,
        type: 'error'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 验证测试用例名称
 */
export const validateTestCaseName = (name: string, businessType: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!name || name.trim() === '') {
    errors.push({
      field: 'name',
      message: '测试用例名称不能为空',
      type: 'error'
    });
  } else {
    if (name.length > 200) {
      errors.push({
        field: 'name',
        message: '测试用例名称长度不能超过200字符',
        type: 'error'
      });
    } else if (name.length < 5) {
      warnings.push({
        field: 'name',
        message: '测试用例名称过短，建议添加更多描述信息',
        type: 'warning'
      });
    }

    // 检查是否包含业务类型
    if (!name.includes(businessType)) {
      warnings.push({
        field: 'name',
        message: `建议在测试用例名称中包含业务类型 "${businessType}"`,
        type: 'warning'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 验证测试用例描述
 */
export const validateTestCaseDescription = (description: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (description && description.length > 2000) {
    errors.push({
      field: 'description',
      message: '测试用例描述长度不能超过2000字符',
      type: 'error'
    });
  }

  if (!description || description.trim() === '') {
    warnings.push({
      field: 'description',
      message: '建议添加测试用例描述以便更好地理解测试目的',
      type: 'warning'
    });
  } else if (description.length < 20) {
    warnings.push({
      field: 'description',
      message: '测试用例描述过短，建议添加更多详细信息',
      type: 'warning'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 验证模块信息
 */
export const validateModuleInfo = (module: string, functionalModule?: string, functionalDomain?: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (module && module.length > 100) {
    errors.push({
      field: 'module',
      message: '功能模块名称长度不能超过100字符',
      type: 'error'
    });
  }

  if (functionalModule && functionalModule.length > 100) {
    errors.push({
      field: 'functional_module',
      message: '功能子模块名称长度不能超过100字符',
      type: 'error'
    });
  }

  if (functionalDomain && functionalDomain.length > 100) {
    errors.push({
      field: 'functional_domain',
      message: '功能域名称长度不能超过100字符',
      type: 'error'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * 综合验证测试用例数据
 */
export const validateTestCaseData = (data: {
  name: string;
  description: string;
  businessType: string;
  module?: string;
  functionalModule?: string;
  functionalDomain?: string;
  preconditions?: string[];
  steps?: StepItem[];
  expectedResult?: string[];
}): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // 验证基本信息
  const nameValidation = validateTestCaseName(data.name, data.businessType);
  allErrors.push(...nameValidation.errors);
  allWarnings.push(...nameValidation.warnings);

  const descValidation = validateTestCaseDescription(data.description);
  allErrors.push(...descValidation.errors);
  allWarnings.push(...descValidation.warnings);

  const moduleValidation = validateModuleInfo(data.module, data.functionalModule, data.functionalDomain);
  allErrors.push(...moduleValidation.errors);
  allWarnings.push(...moduleValidation.warnings);

  // 验证前置条件
  if (data.preconditions && data.preconditions.length > 0) {
    const preconditionsValidation = validatePreconditions(data.preconditions);
    allErrors.push(...preconditionsValidation.errors);
    allWarnings.push(...preconditionsValidation.warnings);
  }

  // 验证执行步骤
  if (data.steps && data.steps.length > 0) {
    const stepsValidation = validateSteps(data.steps);
    allErrors.push(...stepsValidation.errors);
    allWarnings.push(...stepsValidation.warnings);
  }

  // 验证预期结果
  if (data.expectedResult && data.expectedResult.length > 0) {
    const expectedValidation = validateExpectedResults(data.expectedResult);
    allErrors.push(...expectedValidation.errors);
    allWarnings.push(...expectedValidation.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * 格式化验证错误消息
 */
export const formatValidationMessage = (validation: ValidationResult): {
  summary: string;
  details: string[];
} => {
  const details: string[] = [];

  // 格式化错误信息
  validation.errors.forEach(error => {
    if (error.index !== undefined) {
      details.push(`❌ ${error.message} (第${error.index + 1}项)`);
    } else {
      details.push(`❌ ${error.message}`);
    }
  });

  // 格式化警告信息
  validation.warnings.forEach(warning => {
    if (warning.index !== undefined) {
      details.push(`⚠️ ${warning.message} (第${warning.index + 1}项)`);
    } else {
      details.push(`⚠️ ${warning.message}`);
    }
  });

  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;

  let summary = '';
  if (errorCount > 0 && warningCount > 0) {
    summary = `发现 ${errorCount} 个错误和 ${warningCount} 个警告`;
  } else if (errorCount > 0) {
    summary = `发现 ${errorCount} 个错误需要修复`;
  } else if (warningCount > 0) {
    summary = `发现 ${warningCount} 个警告建议优化`;
  } else {
    summary = '验证通过，数据格式正确';
  }

  return { summary, details };
};