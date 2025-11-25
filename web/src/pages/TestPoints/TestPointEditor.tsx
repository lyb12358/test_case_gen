/**
 * Test Point Editor Page
 * Provides comprehensive editing functionality for test points
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Spin,
  Alert,
  Switch,
  Tag
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';
import { configService } from '../../services/configService';
import {
  TestPoint,
  TestPointCreate,
  TestPointUpdate,
  TestPointStatus,
  Priority,
  BusinessType
} from '../../types/testPoints';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TestPointEditor: React.FC = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentProject } = useProject();

  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPoint, setTestPoint] = useState<TestPoint | null>(null);
  const [businessTypes, setBusinessTypes] = useState<Record<string, any>>({});
  const [previewMode, setPreviewMode] = useState(false);

  
  useEffect(() => {
    loadBusinessTypes();
    if (isEditing) {
      loadTestPoint();
    } else {
      // For new test points, set default values
      const businessType = searchParams.get('business_type');
      if (businessType) {
        form.setFieldValue('business_type', businessType);
      }
    }
  }, [id, isEditing]);

  const loadBusinessTypes = async () => {
    try {
      const businessTypes = await configService.getBusinessTypes();
      setBusinessTypes(businessTypes);
    } catch (error) {
      message.error('加载业务类型失败');
    }
  };

  const loadTestPoint = async () => {
    if (!id) return;

    const testPointId = parseInt(id);
    if (isNaN(testPointId) || testPointId <= 0) {
      message.error('无效的测试点ID');
      navigate('/test-points/list');
      return;
    }

    setLoading(true);
    try {
      const data = await unifiedGenerationService.getTestPoint(testPointId);
      setTestPoint(data);

  
      // Set form values
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        business_type: data.business_type,
        priority: data.priority,
        status: data.status
      });
    } catch (error) {
      message.error('加载测试点失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const testData: TestPointCreate | TestPointUpdate = {
        title: values.title,
        description: values.description || undefined,
        business_type: values.business_type,
        priority: values.priority
      };

      if (isEditing) {
        const testPointId = parseInt(id!);
        if (isNaN(testPointId) || testPointId <= 0) {
          message.error('无效的测试点ID');
          return;
        }
        await unifiedGenerationService.updateTestPoint(testPointId, testData);
        message.success('测试点更新成功');
      } else {
        await unifiedGenerationService.createTestPoint(testData);
        message.success('测试点创建成功');
        navigate('/test-points');
      }
    } catch (error) {
      message.error('保存失败，请检查输入');
    } finally {
      setSaving(false);
    }
  };

  
  const getStatusColor = (status: TestPointStatus) => {
    const colors = {
      draft: 'default',
      approved: 'success',
      modified: 'warning',
      completed: 'processing'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: TestPointStatus) => {
    const texts = {
      draft: '草稿',
      approved: '已批准',
      modified: '已修改',
      completed: '已完成'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>加载中...</Text>
        </div>
      </div>
    );
  }

  // 项目检查
  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Card style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Empty
            description={
              <div>
                <h3>请先选择一个项目</h3>
                <p>请在顶部导航栏选择一个项目后，即可编辑该项目的测试点。</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/projects')}>
              去选择项目
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3}>
              {isEditing ? '编辑测试点' : '创建测试点'}
            </Title>
            {testPoint && (
              <Space>
                <Tag color={getStatusColor(testPoint.status)}>
                  {getStatusText(testPoint.status)}
                </Tag>
                <Text type="secondary">
                  ID: {testPoint.test_point_id}
                </Text>
              </Space>
            )}
          </div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/test-points')}
            >
              返回列表
            </Button>
            <Switch
              checkedChildren={<EyeOutlined />}
              unCheckedChildren={<EditOutlined />}
              checked={previewMode}
              onChange={setPreviewMode}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              disabled={previewMode}
            >
              保存
            </Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          disabled={previewMode}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="标题"
                name="title"
                rules={[{ required: true, message: '请输入测试点标题' }]}
              >
                <Input placeholder="请输入测试点标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="业务类型"
                name="business_type"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select placeholder="请选择业务类型">
                  {Object.entries(businessTypes).map(([key, config]: [string, any]) => (
                    <Select.Option key={key} value={key}>
                      {config.name || key}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="优先级"
                name="priority"
                initialValue="medium"
              >
                <Select>
                  <Select.Option value="high">高</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="low">低</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="draft"
              >
                <Select>
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="approved">已批准</Select.Option>
                  <Select.Option value="modified">已修改</Select.Option>
                  <Select.Option value="completed">已完成</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入测试点描述" />
          </Form.Item>

          
          {testPoint && (
            <>
              <Divider>元数据</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">创建时间: </Text>
                  <Text>{new Date(testPoint.created_at).toLocaleString('zh-CN')}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">更新时间: </Text>
                  <Text>{new Date(testPoint.updated_at).toLocaleString('zh-CN')}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">生成任务: </Text>
                  <Text>{testPoint.generation_job_id || '无'}</Text>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default TestPointEditor;