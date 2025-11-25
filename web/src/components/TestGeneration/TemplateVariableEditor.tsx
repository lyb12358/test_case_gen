import React, { useState, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Row,
  Col,
  Space,
  Table,
  Modal,
  Tooltip,
  Tag,
  Alert,
  Divider,
  Typography,
  Popconfirm,
  message,
  Tabs,
  Collapse,
  Switch
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  BookOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

export interface TemplateVariable {
  id: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  required: boolean;
  category: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[];
  };
  metadata?: {
    source?: string;
    examples?: string[];
    documentation?: string;
  };
}

export interface TemplateConfig {
  variables: TemplateVariable[];
  categories: string[];
  description: string;
  version: string;
  lastModified: string;
}

interface TemplateVariableEditorProps {
  visible?: boolean;
  config?: TemplateConfig;
  onChange?: (config: TemplateConfig) => void;
  onSave?: (config: TemplateConfig) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  showPreview?: boolean;
  showValidation?: boolean;
}

const TemplateVariableEditor: React.FC<TemplateVariableEditorProps> = ({
  visible = true,
  config,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
  showPreview = true,
  showValidation = true
}) => {
  const [form] = Form.useForm();
  const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
  const [variableModalVisible, setVariableModalVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const [currentConfig, setCurrentConfig] = useState<TemplateConfig>(config || {
    variables: [],
    categories: [],
    description: '',
    version: '1.0.0',
    lastModified: new Date().toISOString()
  });

  // Variable types configuration
  const variableTypes = [
    { value: 'string', label: '字符串', description: '文本内容' },
    { value: 'number', label: '数字', description: '数值类型' },
    { value: 'boolean', label: '布尔值', description: 'true/false' },
    { value: 'object', label: '对象', description: 'JSON对象' },
    { value: 'array', label: '数组', description: '列表集合' }
  ];

  const defaultCategories = [
    '业务配置',
    '系统设置',
    '测试参数',
    '环境变量',
    '自定义'
  ];

  // Update config when prop changes
  React.useEffect(() => {
    if (config) {
      setCurrentConfig(config);
      setExpandedCategories(config.categories);
    }
  }, [config]);

  // Notify parent of changes
  React.useEffect(() => {
    if (onChange) {
      onChange(currentConfig);
    }
  }, [currentConfig, onChange]);

  const handleAddVariable = useCallback(() => {
    const newVariable: TemplateVariable = {
      id: `var_${Date.now()}`,
      name: '',
      description: '',
      type: 'string',
      required: false,
      category: defaultCategories[0]
    };
    setEditingVariable(newVariable);
    setVariableModalVisible(true);
  }, []);

  const handleEditVariable = useCallback((variable: TemplateVariable) => {
    setEditingVariable({ ...variable });
    setVariableModalVisible(true);
  }, []);

  const handleDeleteVariable = useCallback((variableId: string) => {
    setCurrentConfig(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== variableId)
    }));
    message.success('变量已删除');
  }, []);

  const handleSaveVariable = useCallback((variable: TemplateVariable) => {
    setCurrentConfig(prev => {
      const existingIndex = prev.variables.findIndex(v => v.id === variable.id);
      let newVariables;

      if (existingIndex >= 0) {
        newVariables = [...prev.variables];
        newVariables[existingIndex] = variable;
      } else {
        newVariables = [...prev.variables, variable];
      }

      // Update categories if needed
      const categories = Array.from(new Set([
        ...prev.categories,
        ...newVariables.map(v => v.category).filter(Boolean)
      ]));

      return {
        ...prev,
        variables: newVariables,
        categories,
        lastModified: new Date().toISOString()
      };
    });

    setVariableModalVisible(false);
    setEditingVariable(null);
    message.success('变量已保存');
  }, []);

  const handleDuplicateVariable = useCallback((variable: TemplateVariable) => {
    const duplicated: TemplateVariable = {
      ...variable,
      id: `var_${Date.now()}`,
      name: `${variable.name}_copy`
    };
    handleSaveVariable(duplicated);
  }, [handleSaveVariable]);

  const handleExportConfig = useCallback(() => {
    const configString = JSON.stringify(currentConfig, null, 2);
    const blob = new Blob([configString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-variables-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentConfig]);

  const handleImportConfig = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedConfig = JSON.parse(e.target?.result as string);
            setCurrentConfig({
              ...importedConfig,
              lastModified: new Date().toISOString()
            });
            message.success('配置导入成功');
          } catch (error) {
            message.error('配置文件格式错误');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const renderPreview = useCallback(() => {
    if (!showPreview) return null;

    const processTemplate = (template: string) => {
      let processed = template;
      currentConfig.variables.forEach(variable => {
        const regex = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
        const value = variable.defaultValue !== undefined ? variable.defaultValue : `[${variable.type}]`;
        processed = processed.replace(regex, String(value));
      });
      return processed;
    };

    return (
      <Card title="模板预览" size="small">
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            在下方输入模板内容，使用 {{variable_name}} 语法引用变量
          </Text>
        </div>
        <TextArea
          placeholder="例如：业务类型：{{business_type}}，测试环境：{{environment}}，并发数：{{concurrency_limit}}"
          value={previewTemplate}
          onChange={(e) => setPreviewTemplate(e.target.value)}
          rows={6}
        />
        <Divider />
        <div>
          <Text strong>处理结果：</Text>
          <div style={{
            marginTop: 8,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 6,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap'
          }}>
            {processTemplate(previewTemplate) || '请输入模板内容进行预览'}
          </div>
        </div>
      </Card>
    );
  }, [showPreview, currentConfig.variables, previewTemplate]);

  const renderVariablesTable = useCallback((category?: string) => {
    const filteredVariables = category
      ? currentConfig.variables.filter(v => v.category === category)
      : currentConfig.variables;

    const columns = [
      {
        title: '变量名',
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => (
          <Text code copyable>{name}</Text>
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: string) => {
          const typeConfig = variableTypes.find(t => t.value === type);
          return (
            <Tooltip title={typeConfig?.description}>
              <Tag color="blue">{typeConfig?.label || type}</Tag>
            </Tooltip>
          );
        },
      },
      {
        title: '默认值',
        dataIndex: 'defaultValue',
        key: 'defaultValue',
        width: 120,
        render: (value: any) => {
          if (value === undefined) return '-';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        },
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        width: 80,
        render: (required: boolean) => (
          <Tag color={required ? 'red' : 'default'}>
            {required ? '是' : '否'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record: TemplateVariable) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditVariable(record)}
                disabled={readOnly}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => handleDuplicateVariable(record)}
                disabled={readOnly}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除这个变量吗？"
              onConfirm={() => handleDeleteVariable(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  disabled={readOnly}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={filteredVariables}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无变量' }}
      />
    );
  }, [currentConfig.variables, readOnly, handleEditVariable, handleDuplicateVariable, handleDeleteVariable]);

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>模板变量编辑器</span>
          {readOnly && <Tag color="orange">只读模式</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Space key="actions">
          <Button onClick={handleImportConfig} disabled={readOnly}>
            导入配置
          </Button>
          <Button onClick={handleExportConfig}>
            导出配置
          </Button>
          <Button onClick={onCancel}>
            取消
          </Button>
          {onSave && !readOnly && (
            <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(currentConfig)}>
              保存配置
            </Button>
          )}
        </Space>
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="变量管理" key="editor">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Configuration Header */}
            <Card size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="配置描述">
                    <Input
                      value={currentConfig.description}
                      onChange={(e) => setCurrentConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="模板变量配置的描述信息"
                      disabled={readOnly}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="版本号">
                    <Input
                      value={currentConfig.version}
                      onChange={(e) => setCurrentConfig(prev => ({ ...prev, version: e.target.value }))}
                      disabled={readOnly}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="变量总数">
                    <Text strong>{currentConfig.variables.length}</Text>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Variables by Category */}
            <Card
              title="变量列表"
              size="small"
              extra={
                !readOnly && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddVariable}
                  >
                    添加变量
                  </Button>
                )
              }
            >
              {currentConfig.categories.length > 0 ? (
                <Collapse
                  activeKey={expandedCategories}
                  onChange={setExpandedCategories}
                  ghost
                >
                  {currentConfig.categories.map(category => (
                    <Panel
                      key={category}
                      header={
                        <Space>
                          <span>{category}</span>
                          <Tag>
                            {currentConfig.variables.filter(v => v.category === category).length} 个变量
                          </Tag>
                        </Space>
                      }
                    >
                      {renderVariablesTable(category)}
                    </Panel>
                  ))}
                </Collapse>
              ) : (
                renderVariablesTable()
              )}
            </Card>

            {showValidation && currentConfig.variables.length === 0 && (
              <Alert
                message="暂无变量"
                description="点击'添加变量'按钮开始创建模板变量"
                type="info"
                showIcon
              />
            )}
          </Space>
        </TabPane>

        {showPreview && (
          <TabPane tab="模板预览" key="preview">
            {renderPreview()}
          </TabPane>
        )}

        <TabPane tab="使用说明" key="help">
          <Card title="变量使用说明" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={5}>
                  <CodeOutlined /> 语法格式
                </Title>
                <Paragraph>
                  在模板中使用双花括号语法引用变量：{'{{variable_name}}'}
                </Paragraph>
                <Paragraph code>
                  示例：业务类型：{{business_type}}，测试环境：{{environment}}
                </Paragraph>
              </div>

              <div>
                <Title level={5}>
                  <BookOutlined /> 变量类型
                </Title>
                <ul>
                  {variableTypes.map(type => (
                    <li key={type.value}>
                      <Text strong>{type.label}</Text>：{type.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Title level={5}>
                  <InfoCircleOutlined /> 最佳实践
                </Title>
                <ul>
                  <li>使用描述性的变量名，如 api_endpoint 而不是 url</li>
                  <li>为每个变量提供清晰的描述和默认值</li>
                  <li>将相关变量分组到同一类别中</li>
                  <li>对必需的变量启用"必填"选项</li>
                  <li>使用验证规则确保变量值的正确性</li>
                </ul>
              </div>
            </Space>
          </Card>
        </TabPane>
      </Tabs>

      {/* Variable Edit Modal */}
      <Modal
        title={editingVariable?.id ? '编辑变量' : '添加变量'}
        open={variableModalVisible}
        onCancel={() => {
          setVariableModalVisible(false);
          setEditingVariable(null);
        }}
        onOk={() => {
          form.validateFields().then((values) => {
            if (editingVariable) {
              handleSaveVariable({
                ...editingVariable,
                ...values
              });
            }
          });
        }}
        width={600}
      >
        {editingVariable && (
          <Form
            form={form}
            layout="vertical"
            initialValues={editingVariable}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="变量名"
                  rules={[
                    { required: true, message: '请输入变量名' },
                    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '变量名只能包含字母、数字和下划线，且不能以数字开头' }
                  ]}
                >
                  <Input placeholder="例如：business_type" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="变量类型"
                  rules={[{ required: true, message: '请选择变量类型' }]}
                >
                  <Select>
                    {variableTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入变量描述' }]}
            >
              <Input placeholder="变量的详细描述信息" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="分类"
                  rules={[{ required: true, message: '请选择分类' }]}
                >
                  <Select
                    placeholder="选择或输入分类"
                    mode="combobox"
                    options={[
                      ...defaultCategories.map(cat => ({ label: cat, value: cat })),
                      ...currentConfig.categories
                        .filter(cat => !defaultCategories.includes(cat))
                        .map(cat => ({ label: cat, value: cat }))
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="required"
                  label="必填"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="defaultValue"
              label="默认值"
            >
              <Input placeholder="变量的默认值" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Modal>
  );
};

export default TemplateVariableEditor;