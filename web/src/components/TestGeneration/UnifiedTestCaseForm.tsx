import React, { useState, useCallback, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  Row,
  Col,
  Alert,
  Divider,
  Typography,
  Tag,
  message,
  Tooltip
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ValidatedStepEditor from './ValidatedStepEditor';
import {
  validateTestCaseData,
  formatValidationMessage,
  ValidationResult,
  validatePreconditions,
  validateExpectedResults
} from '../../utils/validationUtils';
import { UnifiedTestCaseFormData, UnifiedTestCaseStatus } from '../../types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface UnifiedTestCaseFormProps {
  initialValues?: Partial<UnifiedTestCaseFormData>;
  onSubmit: (values: UnifiedTestCaseFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  businessType: string;
  showValidation?: boolean;
  autoValidate?: boolean;
}

const UnifiedTestCaseForm: React.FC<UnifiedTestCaseFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  disabled = false,
  businessType,
  showValidation = true,
  autoValidate = true
}) => {
  const [form] = Form.useForm();
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [preconditions, setPreconditions] = useState<string[]>([]);
  const [steps, setSteps] = useState<any[]>([]);

  // 初始化表单数据
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      // 处理后端返回的preconditions字符串格式，转换为数组
      let parsedPreconditions: string[] = [];
      if (initialValues.preconditions) {
        try {
          if (typeof initialValues.preconditions === 'string') {
            const str = initialValues.preconditions.trim();
            if (!str) {
              parsedPreconditions = [];
            } else if (str.startsWith('[') && str.endsWith(']')) {
              // JSON数组格式
              parsedPreconditions = JSON.parse(str);
            } else if (str.includes(',')) {
              // 逗号分隔的字符串，转为数组
              parsedPreconditions = str.split(',').map(item => item.trim()).filter(item => item);
            } else {
              // 单个字符串，转为单元素数组
              parsedPreconditions = [str];
            }
          } else if (Array.isArray(initialValues.preconditions)) {
            parsedPreconditions = initialValues.preconditions;
          }
        } catch (error) {
          console.error('Failed to parse preconditions:', error, 'Input:', initialValues.preconditions);
          // 解析失败时的安全处理
          const str = initialValues.preconditions.toString().trim();
          if (str.includes(',')) {
            parsedPreconditions = str.split(',').map(item => item.trim()).filter(item => item);
          } else if (str) {
            parsedPreconditions = [str];
          } else {
            parsedPreconditions = [];
          }
        }
      }
      setPreconditions(parsedPreconditions);

      // 后端返回的steps已经包含expected字段，直接使用
      const normalizedSteps = (initialValues.steps || []).map(step => ({
        id: step.id || Date.now() + Math.random(),
        step_number: step.step_number || 1,
        action: step.action || '',
        expected: step.expected || ''
      }));
      setSteps(normalizedSteps);

      console.log('Form initialized with steps:', normalizedSteps);
    }
  }, [initialValues, form]);

  // 实时验证
  const validateFormData = useCallback(() => {
    if (!autoValidate) return;

    const formData = form.getFieldsValue();
    const validationData = {
      name: formData.name || '',
      description: formData.description || '',
      businessType,
      module: formData.module,
      functionalModule: formData.functional_module,
      functionalDomain: formData.functional_domain,
      preconditions,
      steps: steps.map((step, index) => ({
        id: step.id || index + 1,
        step_number: step.step_number || index + 1,
        action: step.action || '',
        expected: step.expected || ''
      }))
    };

    const validationResult = validateTestCaseData(validationData);
    setValidation(validationResult);
    return validationResult;
  }, [form, businessType, preconditions, steps, autoValidate]);

  // 表单字段变化时触发验证
  const handleFieldsChange = useCallback(() => {
    if (autoValidate) {
      // 延迟验证，避免输入时频繁触发
      const timeoutId = setTimeout(() => {
        validateFormData();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [autoValidate, validateFormData]);

  // 前置条件变化
  const handlePreconditionsChange = useCallback((newPreconditions: string[]) => {
    setPreconditions(newPreconditions);
    if (autoValidate && showValidation) {
      const validation = validatePreconditions(newPreconditions);
      if (!validation.isValid && validation.errors.length > 0) {
        message.error('前置条件验证失败');
      }
    }
  }, [autoValidate, showValidation]);

  // 步骤变化
  const handleStepsChange = useCallback((newSteps: any[]) => {
    setSteps(newSteps);
    if (autoValidate) {
      const timeoutId = setTimeout(() => {
        validateFormData();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [autoValidate, validateFormData]);

  
  // 提交表单
  const handleSubmit = useCallback(async () => {
    // 🔍 立即输出调试日志 - 确保用户能看到
    console.log('🚀 [UnifiedTestCaseForm] handleSubmit 开始执行');
    console.log('📋 [UnifiedTestCaseForm] 当前 steps 状态:', steps);
    console.log('📋 [UnifiedTestCaseForm] 当前 preconditions:', preconditions);

    try {
      // 执行最终验证
      const finalValidation = validateFormData();

      if (!finalValidation.isValid) {
        const { summary, details } = formatValidationMessage(finalValidation);
        message.error(summary);
        setShowValidationDetails(true);
        return;
      }

      const values = await form.validateFields();
      console.log('✅ [UnifiedTestCaseForm] 表单验证通过，values:', values);

      const submitData: UnifiedTestCaseFormData = {
        ...values,
        preconditions: JSON.stringify(preconditions),  // 将数组转换为JSON字符串发送给后端
        steps: steps.map((step, index) => ({
          step_number: step.step_number || index + 1,
          action: step.action || '',
          expected: step.expected || ''
        })),
        // 不再发送单独的expected_result字段，因为预期结果已经包含在steps中
        // 这样避免了数据重复和不一致的问题
      };

      console.log('📤 [UnifiedTestCaseForm] 准备提交的完整数据:', submitData);
      console.log('📤 [UnifiedTestCaseForm] steps 数组:', submitData.steps);
      console.log('📤 [UnifiedTestCaseForm] 步骤中包含预期结果的数量:', steps.filter(s => s.expected?.trim()).length);
      console.log('🎯 [UnifiedTestCaseForm] 调用 onSubmit 提交数据...');

      onSubmit(submitData);
      console.log('✅ [UnifiedTestCaseForm] onSubmit 调用完成');
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('请检查表单填写是否正确');
    }
  }, [form, validateFormData, onSubmit, preconditions, steps]);

  // 重置表单
  const handleReset = useCallback(() => {
    form.resetFields();
    setPreconditions([]);
    setSteps([{ id: 1, step_number: 1, action: '', expected: '' }]);
    setValidation({ isValid: true, errors: [], warnings: [] });
    setShowValidationDetails(false);
  }, [form]);

  // 渲染验证摘要
  const renderValidationSummary = () => {
    if (!showValidation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
      return null;
    }

    const { summary } = formatValidationMessage(validation);
    const hasErrors = validation.errors.length > 0;
    const hasWarnings = validation.warnings.length > 0;

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
        type={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Space>
            <Button size="small" onClick={validateFormData}>
              重新验证
            </Button>
          </Space>
        }
      />
    );
  };

  // 渲染验证详情
  const renderValidationDetails = () => {
    if (!showValidationDetails || (validation.errors.length === 0 && validation.warnings.length === 0)) {
      return null;
    }

    const { details } = formatValidationMessage(validation);

    return (
      <Card
        size="small"
        title={
          <Space>
            <InfoCircleOutlined />
            <span>验证详情</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {details.map((detail, index) => (
          <div key={index} style={{ marginBottom: 4 }}>
            {detail}
          </div>
        ))}
      </Card>
    );
  };

  return (
    <div className="unified-test-case-form">
      <Form
        form={form}
        layout="vertical"
        onFieldsChange={handleFieldsChange}
        disabled={disabled}
      >
        {renderValidationSummary()}
        {renderValidationDetails()}

        {/* 基本信息 */}
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="测试用例名称"
                name="name"
                rules={[
                  { required: true, message: '请输入测试用例名称' },
                  { max: 200, message: '名称长度不能超过200字符' },
                  { min: 5, message: '名称长度至少5字符' }
                ]}
              >
                <Input
                  placeholder="请输入测试用例名称"
                  suffix={
                    businessType && (
                      <Tag color="blue">{businessType}</Tag>
                    )
                  }
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true, message: '请选择优先级' }]}
                initialValue="medium"
              >
                <Select>
                  <Select.Option value="low">低</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue={UnifiedTestCaseStatus.DRAFT}
              >
                <Select>
                  <Select.Option value={UnifiedTestCaseStatus.DRAFT}>草稿</Select.Option>
                  <Select.Option value={UnifiedTestCaseStatus.APPROVED}>已批准</Select.Option>
                  <Select.Option value={UnifiedTestCaseStatus.COMPLETED}>已完成</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="测试用例描述"
            name="description"
            rules={[{ max: 2000, message: '描述长度不能超过2000字符' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入测试用例描述"
              showCount
              maxLength={2000}
            />
          </Form.Item>
        </Card>

        {/* 模块信息 */}
        <Card title="模块信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="功能模块"
                name="module"
                rules={[{ max: 100, message: '模块名称长度不能超过100字符' }]}
              >
                <Input placeholder="请输入功能模块" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="功能子模块"
                name="functional_module"
                rules={[{ max: 100, message: '子模块名称长度不能超过100字符' }]}
              >
                <Input placeholder="请输入功能子模块" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="功能域"
                name="functional_domain"
                rules={[{ max: 100, message: '功能域名称长度不能超过100字符' }]}
              >
                <Input placeholder="请输入功能域" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 前置条件 */}
        <Card title="前置条件" size="small" style={{ marginBottom: 16 }}>
          <Form.Item label="前置条件列表">
            <Input.Tag
              value={preconditions}
              onChange={handlePreconditionsChange}
              placeholder="输入前置条件后按回车添加"
              style={{ width: '100%' }}
              max={50}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                已添加 {preconditions.length}/50 个前置条件
              </Text>
            </div>
          </Form.Item>
        </Card>

        {/* 执行步骤 */}
        <ValidatedStepEditor
          value={steps}
          onChange={handleStepsChange}
          showValidation={showValidation}
          autoValidate={autoValidate}
          maxSteps={50}
        />

        
        {/* 备注 */}
        <Card title="备注" size="small" style={{ marginBottom: 24 }}>
          <Form.Item
            label="备注信息"
            name="remarks"
            rules={[{ max: 2000, message: '备注长度不能超过2000字符' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              showCount
              maxLength={2000}
            />
          </Form.Item>
        </Card>

        {/* 操作按钮 */}
        <Row justify="center" gutter={16}>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={loading}
                disabled={!validation.isValid}
              >
                保存测试用例
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={loading}
              >
                重置表单
              </Button>
              {onCancel && (
                <Button onClick={onCancel} disabled={loading}>
                  取消
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default UnifiedTestCaseForm;