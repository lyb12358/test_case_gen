import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Popconfirm,
  Typography,
  Divider,
  Alert,
  Tooltip,
  Badge,
  message
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  validateSteps,
  formatValidationMessage,
  ValidationResult,
  StepItem
} from '../../utils/validationUtils';

const { TextArea } = Input;
const { Text } = Typography;

interface ValidatedStepEditorProps {
  value?: StepItem[];
  onChange?: (steps: StepItem[]) => void;
  placeholder?: {
    action?: string;
    expected?: string;
  };
  disabled?: boolean;
  maxSteps?: number;
  showValidation?: boolean;
  autoValidate?: boolean;
}

const ValidatedStepEditor: React.FC<ValidatedStepEditorProps> = ({
  value = [],
  onChange,
  placeholder = {
    action: '请输入执行动作',
    expected: '请输入预期结果'
  },
  disabled = false,
  maxSteps = 20,
  showValidation = true,
  autoValidate = true
}) => {
  const [steps, setSteps] = useState<StepItem[]>(() => {
    if (value && value.length > 0) {
      return value;
    }
    return [{ id: 1, step_number: 1, action: '', expected: '' }];
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });

  const [showValidationDetails, setShowValidationDetails] = useState(false);

  const triggerChange = useCallback((newSteps: StepItem[]) => {
    setSteps(newSteps);
    onChange?.(newSteps);
  }, [onChange]);

  const validateStepsData = useCallback((stepsToValidate: StepItem[]) => {
    if (!autoValidate) {
      return;
    }

    const validationResult = validateSteps(stepsToValidate);
    setValidation(validationResult);

    // 如果有错误，显示错误消息
    if (validationResult.errors.length > 0 && showValidation) {
      const { summary } = formatValidationMessage(validationResult);
      message.error(summary);
    }
  }, [autoValidate, showValidation]);

  const addStep = useCallback(() => {
    if (steps.length >= maxSteps) {
      message.warning(`最多只能添加 ${maxSteps} 个步骤`);
      return;
    }

    const nextStepNumber = steps.length > 0 ? Math.max(...steps.map(s => s.step_number)) + 1 : 1;
    const newStep: StepItem = {
      id: Date.now(),
      step_number: nextStepNumber,
      action: '',
      expected: ''
    };
    const newSteps = [...steps, newStep];
    triggerChange(newSteps);
    validateStepsData(newSteps);
  }, [steps, maxSteps, triggerChange, validateStepsData]);

  const removeStep = useCallback((index: number) => {
    if (steps.length <= 1) {
      message.warning('至少需要保留一个步骤');
      return;
    }

    const newSteps = steps.filter((_, i) => i !== index)
      .map((step, i) => ({
        ...step,
        step_number: i + 1
      }));
    triggerChange(newSteps);
    validateStepsData(newSteps);
  }, [steps, triggerChange, validateStepsData]);

  const updateStep = useCallback((index: number, field: 'action' | 'expected', fieldValue: string) => {
    const newSteps = steps.map((step, i) =>
      i === index ? { ...step, [field]: fieldValue } : step
    );
    triggerChange(newSteps);

    // 实时验证
    if (autoValidate) {
      // 延迟验证，避免输入时频繁触发
      const timeoutId = setTimeout(() => {
        validateStepsData(newSteps);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [steps, triggerChange, autoValidate, validateStepsData]);

  const updateStepNumber = useCallback((index: number, stepNumber: number) => {
    const newSteps = steps.map((step, i) =>
      i === index ? { ...step, step_number: stepNumber } : step
    );
    triggerChange(newSteps);
    validateStepsData(newSteps);
  }, [steps, triggerChange, validateStepsData]);

  // 同步外部value变化
  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(steps)) {
      const newSteps = value.length > 0 ? value : [{ id: 1, step_number: 1, action: '', expected: '' }];
      setSteps(newSteps);
      validateStepsData(newSteps);
    }
  }, [value, steps, validateStepsData]);

  // 初始验证
  useEffect(() => {
    if (autoValidate && steps.length > 0) {
      validateStepsData(steps);
    }
  }, []);

  const getStepValidationStatus = (index: number) => {
    const stepErrors = validation.errors.filter(e => e.index === index);
    const stepWarnings = validation.warnings.filter(w => w.index === index);

    if (stepErrors.length > 0) {
      return 'error';
    } else if (stepWarnings.length > 0) {
      return 'warning';
    }
    return steps[index].action || steps[index].expected ? 'success' : undefined;
  };

  const getStepValidationMessage = (index: number) => {
    const stepErrors = validation.errors.filter(e => e.index === index);
    const stepWarnings = validation.warnings.filter(w => w.index === index);

    const messages = [...stepErrors, ...stepWarnings];
    return messages.map(m => m.message).join('; ');
  };

  const renderValidationSummary = () => {
    if (!showValidation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
      return null;
    }

    const { summary, details } = formatValidationMessage(validation);
    const hasErrors = validation.errors.length > 0;

    return (
      <Alert
        message={
          <Space>
            <span>{summary}</span>
            <Button
              type="link"
              size="small"
              onClick={() => setShowValidationDetails(!showValidationDetails)}
            >
              {showValidationDetails ? '收起详情' : '查看详情'}
            </Button>
          </Space>
        }
        type={hasErrors ? 'error' : 'warning'}
        showIcon
        style={{ marginBottom: 16 }}
        description={showValidationDetails ? (
          <div style={{ marginTop: 8 }}>
            {details.map((detail, index) => (
              <div key={index} style={{ marginBottom: 4 }}>
                {detail}
              </div>
            ))}
          </div>
        ) : undefined}
      />
    );
  };

  return (
    <div className="validated-step-editor">
      {renderValidationSummary()}

      <Card
        size="small"
        title={
          <Space>
            <CheckCircleOutlined
              style={{
                color: validation.isValid ? '#52c41a' : '#ff4d4f'
              }}
            />
            <Text strong>执行步骤</Text>
            <Text type="secondary">({steps.length} 个步骤</Text>
            {!validation.isValid && (
              <Badge
                count={validation.errors.length}
                style={{ backgroundColor: '#ff4d4f' }}
                title={`${validation.errors.length} 个错误`}
              />
            )}
            {validation.warnings.length > 0 && (
              <Badge
                count={validation.warnings.length}
                style={{ backgroundColor: '#faad14' }}
                title={`${validation.warnings.length} 个警告`}
              />
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="验证所有步骤">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => validateStepsData(steps)}
              />
            </Tooltip>
          </Space>
        }
        headStyle={{
          background: validation.isValid
            ? 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)'
            : 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
          borderBottom: validation.isValid
            ? '1px solid #91d5ff'
            : '1px solid #ffa39e',
          fontSize: '14px',
          fontWeight: '600'
        }}
        styles={{
          body: {
            backgroundColor: disabled ? '#f5f5f5' : 'white'
          }
        }}
        style={{
          border: disabled
            ? '1px dashed #d9d9d9'
            : validation.isValid
              ? '1px solid #d9d9d9'
              : '1px solid #ffa39e'
        }}
      >
        {steps.map((step, index) => (
          <div key={step.id}>
            <Row gutter={16} style={{ marginBottom: 12, alignItems: 'center' }}>
              <Col span={2} style={{ textAlign: 'center' }}>
                <Input
                  type="number"
                  value={step.step_number}
                  onChange={(e) => updateStepNumber(index, parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  min={1}
                  max={999}
                  style={{
                    textAlign: 'center',
                    borderColor: getStepValidationStatus(index) === 'error' ? '#ff4d4f' :
                               getStepValidationStatus(index) === 'warning' ? '#faad14' : undefined
                  }}
                />
              </Col>

              <Col span={10}>
                <div style={{ position: 'relative' }}>
                  <TextArea
                    placeholder={placeholder.action}
                    value={step.action}
                    onChange={(e) => updateStep(index, 'action', e.target.value)}
                    disabled={disabled}
                    rows={2}
                    style={{
                      resize: 'none',
                      borderColor: getStepValidationStatus(index) === 'error' ? '#ff4d4f' :
                                 getStepValidationStatus(index) === 'warning' ? '#faad14' : undefined
                    }}
                    maxLength={500}
                    showCount
                  />
                  {step.action && getStepValidationStatus(index) === 'success' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#52c41a',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                    </div>
                  )}
                  {getStepValidationStatus(index) && getStepValidationStatus(index) !== 'success' && (
                    <Tooltip title={getStepValidationMessage(index)}>
                      <div
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          backgroundColor: getStepValidationStatus(index) === 'error' ? '#ff4d4f' : '#faad14',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'help'
                        }}
                      >
                        {getStepValidationStatus(index) === 'error' ? (
                          <ExclamationCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                        ) : (
                          <InfoCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                        )}
                      </div>
                    </Tooltip>
                  )}
                </div>
              </Col>

              <Col span={10}>
                <div style={{ position: 'relative' }}>
                  <TextArea
                    placeholder={placeholder.expected}
                    value={step.expected || ''}
                    onChange={(e) => updateStep(index, 'expected', e.target.value)}
                    disabled={disabled}
                    rows={2}
                    style={{
                      resize: 'none',
                      borderColor: getStepValidationStatus(index) === 'error' ? '#ff4d4f' :
                                 getStepValidationStatus(index) === 'warning' ? '#faad14' : undefined
                    }}
                    maxLength={500}
                    showCount
                  />
                  {step.expected && getStepValidationStatus(index) === 'success' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#52c41a',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                    </div>
                  )}
                </div>
              </Col>

              <Col span={2} style={{ textAlign: 'center' }}>
                {!disabled && (
                  <Popconfirm
                    title="确定删除这个步骤吗？"
                    onConfirm={() => removeStep(index)}
                    placement="left"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>
                )}
              </Col>
            </Row>

            {index < steps.length - 1 && (
              <Divider style={{ margin: '12px 0', borderColor: '#e8e8e8' }} />
            )}
          </div>
        ))}

        {!disabled && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button
              type="dashed"
              onClick={addStep}
              disabled={steps.length >= maxSteps}
              icon={<PlusOutlined />}
              style={{ width: '200px' }}
            >
              添加步骤 ({steps.length}/{maxSteps})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default memo(ValidatedStepEditor);