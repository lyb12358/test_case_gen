import React, { useState, useEffect, useCallback, FC } from 'react';
import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Space,
  Table,
  Alert,
  Divider,
  Typography,
  Tag,
  Tooltip,
  Collapse,
  Spin,
  Empty,
  message,
  Select
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { unifiedGenerationService } from '@/services/unifiedGenerationService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Option } = Select;

export interface VariablePreviewProps {
  businessType: string;
  templateContent?: string;
  additionalContext?: Record<string, unknown>;
  onChange?: (variables: Record<string, unknown>) => void;
  showDebugInfo?: boolean;
  readOnly?: boolean;
  projectId?: number;
  generationStage?: 'test_point' | 'test_case';
}

interface VariablePreviewData {
  business_type: string;
  has_variables?: boolean;
  has_template_variables?: boolean;
  used_variables?: string[];
  variable_count?: number;
  variable_values?: Record<string, unknown>;
  resolved_variables?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  preview_timestamp?: string;
  resolution_timestamp?: string;
  template_content?: string;
  resolved_content?: string;
  message?: string;
}

interface VariableDisplay {
  name: string;
  value: unknown;
  type: 'string' | 'object' | 'array';
  size: number; // for JSON data
}

const VariablePreview: FC<VariablePreviewProps> = ({
  businessType,
  templateContent,
  additionalContext = {},
  onChange,
  showDebugInfo = false,
  readOnly = false,
  projectId,
  generationStage
}) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<VariablePreviewData | null>(null);
  const [testTemplate, setTestTemplate] = useState(templateContent || '');
  const [testContext, setTestContext] = useState<Record<string, unknown>>(additionalContext);
  const [selectedGenerationStage, setSelectedGenerationStage] = useState<'test_point' | 'test_case' | undefined>(generationStage);
  const [copied, setCopied] = useState(false);

  // Load preview data when component mounts or dependencies change
  const loadPreviewData = useCallback(async () => {
    if (!businessType) return;

    setLoading(true);
    try {
      const data = await unifiedGenerationService.previewVariables(
        businessType,
        testTemplate,
        testContext,
        selectedGenerationStage,
        projectId
      );
      setPreviewData(data);

      if (onChange) {
        onChange(data.variable_values || {});
      }
    } catch (error) {
      console.error('Failed to load variable preview:', error);
      message.error('加载变量预览失败');
    } finally {
      setLoading(false);
    }
  }, [businessType, testTemplate, testContext, selectedGenerationStage, projectId, onChange]);

  // Test variable resolution
  const testVariableResolution = useCallback(async () => {
    if (!businessType) return;

    setLoading(true);
    try {
      const data = await unifiedGenerationService.testResolveVariables({
        business_type: businessType,
        template_content: testTemplate,
        additional_context: testContext,
        generation_stage: selectedGenerationStage,
        project_id: projectId
      });

      setPreviewData({
        business_type: businessType,
        has_variables: data.has_template_variables,
        used_variables: Object.keys(data.resolved_variables || {}),
        variable_count: data.variable_count,
        variable_values: data.resolved_variables,
        preview_timestamp: data.resolution_timestamp
      });

      if (onChange) {
        onChange(data.resolved_variables || {});
      }

      message.success('变量解析测试完成');
    } catch (error) {
      console.error('Failed to test variable resolution:', error);
      message.error('变量解析测试失败');
    } finally {
      setLoading(false);
    }
  }, [businessType, testTemplate, testContext, selectedGenerationStage, projectId, onChange]);

  // Load data on mount
  useEffect(() => {
    loadPreviewData();
  }, [loadPreviewData]);

  // Format variables for display (3 variables system)
  const formatVariablesForDisplay = useCallback((variables: Record<string, unknown>): VariableDisplay[] => {
    const display: VariableDisplay[] = [];

    // Process user_input
    if (variables.user_input !== undefined) {
      display.push({
        name: 'user_input',
        value: variables.user_input,
        type: 'string',
        size: String(variables.user_input).length
      });
    }

    // Process test_points
    if (variables.test_points !== undefined) {
      let parsedData = variables.test_points;
      let type: 'string' | 'object' | 'array' = 'string';

      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
          type = Array.isArray(parsedData) ? 'array' : 'object';
        } catch {
          type = 'string';
        }
      } else {
        type = Array.isArray(parsedData) ? 'array' : 'object';
      }

      display.push({
        name: 'test_points',
        value: parsedData,
        type: type,
        size: type === 'string' ? String(parsedData).length : Array.isArray(parsedData) ? parsedData.length : Object.keys(parsedData as Record<string, unknown>).length
      });
    }

    // Process test_cases
    if (variables.test_cases !== undefined) {
      let parsedData = variables.test_cases;
      let type: 'string' | 'object' | 'array' = 'string';

      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
          type = Array.isArray(parsedData) ? 'array' : 'object';
        } catch {
          type = 'string';
        }
      } else {
        type = Array.isArray(parsedData) ? 'array' : 'object';
      }

      display.push({
        name: 'test_cases',
        value: parsedData,
        type: type,
        size: type === 'string' ? String(parsedData).length : Array.isArray(parsedData) ? parsedData.length : Object.keys(parsedData as Record<string, unknown>).length
      });
    }

    return display;
  }, []);

  // Copy variables to clipboard
  const copyVariablesToClipboard = useCallback(async (variables: Record<string, unknown>) => {
    try {
      const formatted = JSON.stringify(variables, null, 2);
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      message.success('变量已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      message.error('复制失败');
    }
  }, []);

  // Render simplified variable display
  const renderSimplifiedVariables = useCallback((variables: Record<string, unknown>) => {
    const formattedVariables = formatVariablesForDisplay(variables);

    if (formattedVariables.length === 0) {
      return (
        <Empty
          description="暂无可用变量"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const columns = [
      {
        title: '变量名',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        render: (name: string) => (
          <Text code copyable={{ text: `{{${name}}}` }}>{`{${name}}`}</Text>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: string) => {
          const colorMap: Record<string, string> = {
            string: 'blue',
            object: 'orange',
            array: 'green'
          };
          return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
        },
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 80,
        render: (size: number, record: VariableDisplay) => {
          if (record.type === 'string') {
            return <Text type="secondary">{size} 字符</Text>;
          } else {
            return <Text type="secondary">{size} 项</Text>;
          }
        },
      },
      {
        title: '值预览',
        dataIndex: 'value',
        key: 'value',
        ellipsis: true,
        render: (value: unknown, record: VariableDisplay) => {
          if (record.type === 'string') {
            return (
              <Tooltip title={value}>
                <Text>{String(value).substring(0, 100)}...</Text>
              </Tooltip>
            );
          } else if (record.type === 'array' && Array.isArray(value)) {
            return (
              <Tooltip title={`数组，包含 ${value.length} 项`}>
                <Text>[{value.length} 项]</Text>
              </Tooltip>
            );
          } else if (record.type === 'object' && typeof value === 'object') {
            const keyCount = Object.keys(value).length;
            return (
              <Tooltip title={`对象，包含 ${keyCount} 个属性`}>
                <Text>{`{${keyCount} 属性}`}</Text>
              </Tooltip>
            );
          }
          return <Text>{String(value)}</Text>;
        },
      }
    ];

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5}>可用变量 ({formattedVariables.length})</Title>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyVariablesToClipboard(variables)}
            disabled={copied}
          >
            {copied ? '已复制' : '复制全部'}
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={formattedVariables}
          pagination={false}
          size="small"
          scroll={{ x: 500 }}
        />
      </div>
    );
  }, [formatVariablesForDisplay, copyVariablesToClipboard, copied]);

  // Render variable table (kept for compatibility)
  const renderVariableTable = useCallback((variables: Record<string, unknown>, title: string) => {
    return renderSimplifiedVariables(variables);
  }, [renderSimplifiedVariables]);

  if (!businessType) {
    return (
      <Alert
        message="请选择业务类型"
        description="需要选择业务类型才能预览变量"
        type="warning"
        showIcon
      />
    );
  }

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Header */}
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Title level={5} style={{ margin: 0 }}>
                <EyeOutlined /> 变量预览 - {businessType}
              </Title>
            </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadPreviewData}
                  size="small"
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<BugOutlined />}
                  onClick={testVariableResolution}
                  size="small"
                >
                  测试解析
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Test Controls */}
        <Card title="测试配置" size="small">
          <Row gutter={16}>
            <Col span={8}>
              <div>
                <Text strong>生成阶段</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    value={selectedGenerationStage}
                    onChange={setSelectedGenerationStage}
                    style={{ width: '100%' }}
                    placeholder="选择生成阶段"
                    allowClear
                  >
                    <Option value="test_point">测试点生成</Option>
                    <Option value="test_case">测试用例生成</Option>
                  </Select>
                </div>
              </div>
            </Col>
            <Col span={16}>
              <Row gutter={16}>
                <Col span={24}>
                  <div>
                    <Text strong>测试模板</Text>
                    <div style={{ marginTop: 8 }}>
                      <TextArea
                        placeholder="输入包含变量的模板内容，例如：用户输入：{{user_input}}，测试点数据：{{test_points}}"
                        value={testTemplate}
                        onChange={(e) => setTestTemplate(e.target.value)}
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <div>
                    <Text strong>额外上下文</Text>
                    <div style={{ marginTop: 8 }}>
                      <TextArea
                        placeholder="输入JSON格式的额外上下文，例如：{&quot;user_input&quot;: &quot;测试数据&quot;}"
                        value={JSON.stringify(testContext, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value || '{}');
                            setTestContext(parsed);
                          } catch (error) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Results */}
        {previewData && (
          <Card title="预览结果" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Always show available variables */}
              <div>
                <Text strong>可用变量：</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue" style={{ marginBottom: 4 }}>user_input</Tag>
                  <Tag color="green" style={{ marginBottom: 4 }}>test_points</Tag>
                  <Tag color="orange" style={{ marginBottom: 4 }}>
                    test_cases {selectedGenerationStage === 'test_point' ? '(测试点阶段为空)' : ''}
                  </Tag>
                </div>
                {selectedGenerationStage && (
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {selectedGenerationStage === 'test_point'
                      ? '测试点生成阶段：test_cases 变量将为空，符合两阶段生成逻辑'
                      : '测试用例生成阶段：test_cases 变量包含历史测试用例数据'
                    }
                  </Text>
                )}
              </div>

              {/* Show template analysis if template is provided */}
              {testTemplate && (
                <>
                  {(previewData.has_variables ?? previewData.has_template_variables) ? (
                    <Alert
                      message="发现模板变量"
                      description={`在模板中发现了 ${previewData.variable_count || 0} 个变量`}
                      type="success"
                      showIcon
                      icon={<CheckCircleOutlined />}
                    />
                  ) : (
                    <Alert
                      message="模板中无变量"
                      description="模板中不包含任何{{variable_name}}格式的变量"
                      type="info"
                      showIcon
                      icon={<InfoCircleOutlined />}
                    />
                  )}

                  {previewData.used_variables && previewData.used_variables.length > 0 && (
                    <div>
                      <Text strong>使用的变量：</Text>
                      <div style={{ marginTop: 8 }}>
                        {previewData.used_variables.map(varName => (
                          <Tag key={varName} color="blue" style={{ marginBottom: 4 }}>
                            {varName}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Always show variable values */}
              {(previewData.variable_values || previewData.variables) &&
               Object.keys(previewData.variable_values || previewData.variables || {}).length > 0 && (
                <div>
                  <Text strong>变量值：</Text>
                  <div style={{ marginTop: 8 }}>
                    {renderSimplifiedVariables(previewData.variable_values || previewData.variables || {})}
                  </div>
                </div>
              )}
            </Space>

            {(previewData.preview_timestamp || previewData.resolution_timestamp) && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  预览时间：{new Date(previewData.preview_timestamp || previewData.resolution_timestamp!).toLocaleString()}
                </Text>
              </div>
            )}
          </Card>
        )}
      </Space>
    </Spin>
  );
};

export default VariablePreview;