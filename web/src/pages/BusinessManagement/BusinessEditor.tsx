import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
  Typography,
  Divider,
  Alert,
  Tooltip,
  Tag,
  Progress
} from 'antd';
import { SaveOutlined, CloseOutlined, BuildOutlined, CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { businessService, BusinessType, BusinessTypeCreate, BusinessTypeUpdate } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BusinessEditorProps {
  business?: BusinessType | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const BusinessEditor: React.FC<BusinessEditorProps> = ({ business, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const { projects, currentProject } = useProject();
  const [lastError, setLastError] = useState<{ message: string; suggestions: string[] } | null>(null);

  // 错误恢复建议辅助函数
  const getRecoverySuggestion = (errorMessage: string) => {
    if (errorMessage.includes('业务编码') && errorMessage.includes('已存在')) {
      return [
        '建议1：尝试使用不同的业务编码（如：RCC_NEW, RCC_V2等）',
        '建议2：在编码后添加项目标识（如：RCC_PROJ1）',
        '建议3：查看现有业务类型列表，选择未使用的编码'
      ];
    }
    if (errorMessage.includes('业务名称') && errorMessage.includes('已存在')) {
      return [
        '建议1：使用更具描述性的名称（如："远程净化系统-高级版"）',
        '建议2：添加版本号或项目名称（如："远程净化 v2.0"）',
        '建议3：查看现有业务类型，确保名称唯一性'
      ];
    }
    if (errorMessage.includes('请选择')) {
      return [
        '建议1：确保已选择所属项目',
        '建议2：如果没有可用项目，请先创建项目',
        '建议3：联系管理员添加项目权限'
      ];
    }
    if (errorMessage.includes('网络') || errorMessage.includes('connection')) {
      return [
        '建议1：检查网络连接是否正常',
        '建议2：刷新页面后重试',
        '建议3：如果问题持续，请联系技术支持'
      ];
    }
    return [
      '建议1：检查输入信息是否完整',
      '建议2：刷新页面后重试操作',
      '建议3：如果问题持续，请联系技术支持'
    ];
  };

  // 创建业务类型
  const createMutation = useMutation({
    mutationFn: businessService.createBusinessType,
    onSuccess: () => {
      message.success({
        content: '业务类型创建成功',
        duration: 3,
        key: 'create-success'
      });
      setLastError(null); // 清除错误状态
      onSuccess();
    },
    onError: (error: any) => {
      // 提供更友好的错误提示
      const errorMessage = error.message || '创建业务类型失败';
      const suggestions = getRecoverySuggestion(errorMessage);

      // 设置错误详情用于显示恢复建议
      setLastError({
        message: errorMessage,
        suggestions: suggestions
      });

      if (errorMessage.includes('业务编码') && errorMessage.includes('已存在')) {
        message.error({
          content: '该业务编码在当前项目中已存在，请使用其他编码',
          duration: 5,
          key: 'create-error'
        });
      } else if (errorMessage.includes('业务名称') && errorMessage.includes('已存在')) {
        message.error({
          content: '该业务名称在当前项目中已存在，请使用其他名称',
          duration: 5,
          key: 'create-error'
        });
      } else if (errorMessage.includes('请选择')) {
        message.error({
          content: '请选择所属项目后再创建业务类型',
          duration: 4,
          key: 'create-error'
        });
      } else {
        message.error({
          content: `创建失败: ${errorMessage}`,
          duration: 5,
          key: 'create-error'
        });
      }
    },
  });

  // 更新业务类型
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BusinessTypeUpdate }) =>
      businessService.updateBusinessType(id, data),
    onSuccess: () => {
      message.success({
        content: '业务类型更新成功',
        duration: 3,
        key: 'update-success'
      });
      setLastError(null); // 清除错误状态
      onSuccess();
    },
    onError: (error: any) => {
      // 提供更友好的错误提示
      const errorMessage = error.message || '更新业务类型失败';
      const suggestions = getRecoverySuggestion(errorMessage);

      // 设置错误详情用于显示恢复建议
      setLastError({
        message: errorMessage,
        suggestions: suggestions
      });

      if (errorMessage.includes('业务编码') && errorMessage.includes('已存在')) {
        message.error({
          content: '该业务编码在当前项目中已存在，无法修改为重复编码',
          duration: 5,
          key: 'update-error'
        });
      } else if (errorMessage.includes('业务名称') && errorMessage.includes('已存在')) {
        message.error({
          content: '该业务名称在当前项目中已存在，请使用其他名称',
          duration: 5,
          key: 'update-error'
        });
      } else {
        message.error({
          content: `更新失败: ${errorMessage}`,
          duration: 5,
          key: 'update-error'
        });
      }
    },
  });

  useEffect(() => {
    if (business) {
      form.setFieldsValue({
        code: business.code,
        name: business.name,
        description: business.description || '',
        project_id: business.project_id,
      });
    } else {
      form.resetFields();
      // 默认设置为当前项目
      if (currentProject) {
        form.setFieldsValue({ project_id: currentProject.id });
      }
    }
  }, [business, form, currentProject]);

  const handleSubmit = (values: any) => {
    const submitData = {
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      project_id: values.project_id, // 现在是必填字段
    };

    if (business) {
      // 更新现有业务类型
      const updateData: BusinessTypeUpdate = {
        ...submitData,
      };

      // 清理undefined值
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof BusinessTypeUpdate] === undefined) {
          delete updateData[key as keyof BusinessTypeUpdate];
        }
      });

      updateMutation.mutate({ id: business.id, data: updateData });
    } else {
      // 创建新业务类型
      createMutation.mutate(submitData as BusinessTypeCreate);
    }
  };

  const isEditMode = !!business;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // 获取操作状态的描述
  const getOperationStatus = () => {
    if (isLoading) {
      return isEditMode ? '正在更新业务类型...' : '正在创建业务类型...';
    }
    return '';
  };

  return (
    <div>
      {/* 操作进度提示 */}
      {isLoading && (
        <Alert
          message={
            <Space>
              <LoadingOutlined />
              <span>{getOperationStatus()}</span>
            </Space>
          }
          description="请稍候，系统正在处理您的请求"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 错误恢复建议 */}
      {lastError && !isLoading && (
        <Alert
          message={
            <Space>
              <ExclamationCircleOutlined />
              <span>操作失败，请尝试以下解决方案：</span>
            </Space>
          }
          description={
            <div>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                错误信息：{lastError.message}
              </div>
              <div>
                {lastError.suggestions.map((suggestion, index) => (
                  <div key={index} style={{ marginBottom: 4 }}>
                    • {suggestion}
                  </div>
                ))}
              </div>
            </div>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setLastError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="业务编码"
              name="code"
              rules={[
                { required: true, message: '请输入业务编码' },
                { min: 1, max: 20, message: '业务编码长度应在1-20个字符之间' },
                { pattern: /^[A-Z0-9_]+$/, message: '业务编码只能包含大写字母、数字和下划线' }
              ]}
              extra="业务类型的唯一标识符，如：RCC、RFD等"
            >
              <Input
                placeholder="例如：RCC"
                disabled={isEditMode} // 编辑模式下不允许修改编码
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="业务名称"
              name="name"
              rules={[
                { required: true, message: '请输入业务名称' },
                { min: 1, max: 100, message: '业务名称长度应在1-100个字符之间' }
              ]}
            >
              <Input placeholder="例如：远程净化" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="所属项目"
              name="project_id"
              rules={[{ required: true, message: '请选择所属项目' }]}
            >
              <Select
                placeholder="选择项目"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="业务描述"
          name="description"
        >
          <TextArea
            placeholder="请描述业务类型的功能和用途..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 状态信息 */}
        {business && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>当前状态：</Text>
                {business.is_active ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>激活</Tag>
                ) : (
                  <Tag color="orange" icon={<BuildOutlined />}>未激活</Tag>
                )}
              </Col>
              <Col span={8}>
                <Text strong>提示词组合：</Text>
                {business.has_valid_prompt_combination ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>已配置</Tag>
                ) : (
                  <Tag color="red" icon={<BuildOutlined />}>未配置</Tag>
                )}
              </Col>
              <Col span={8}>
                <Text strong>创建时间：</Text>
                <Text>{new Date(business.created_at).toLocaleString()}</Text>
              </Col>
            </Row>
          </Card>
        )}

        {/* 提示信息 */}
        <Alert
          message="配置说明"
          description={
            <div>
              <p>• 业务编码创建后不可修改，请谨慎设置</p>
              <p>• 业务类型需要配置提示词组合才能激活使用</p>
              <p>• 项目归属为必选项，请选择合适的所属项目</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={isLoading ? <LoadingOutlined /> : <SaveOutlined />}
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditMode ? '更新' : '创建'}
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={onCancel}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BusinessEditor;
