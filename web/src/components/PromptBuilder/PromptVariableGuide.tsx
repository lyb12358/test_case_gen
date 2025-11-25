import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  Row,
  Col,
  Badge,
  Empty,
  Spin,
  Alert,
  Collapse,
  Divider
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  InsertRowAboveOutlined,
  InfoCircleOutlined,
  BookOutlined,
  FilterOutlined,
  BulbOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;

// Template variable interface
export interface TemplateVariableItem {
  name: string;
  type: string;
  business_type?: string;
  description?: string;
  default_value?: string;
  example?: string;
}

export interface TemplateVariablesResponse {
  variables: TemplateVariableItem[];
  total: number;
  business_type?: string;
}

interface PromptVariableGuideProps {
  businessType?: string;
  onInsertVariable?: (variable: string) => void;
  visible?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showExamples?: boolean;
}

// Variable type colors
const VARIABLE_TYPE_COLORS = {
  'project': 'blue',
  'business': 'green',
  'history_test_points': 'orange',
  'history_test_cases': 'purple',
  'system': 'red',
  'context': 'cyan',
  'custom': 'gray'
};

// Variable type labels
const VARIABLE_TYPE_LABELS = {
  'project': '项目变量',
  'business': '业务变量',
  'history_test_points': '历史测试点',
  'history_test_cases': '历史测试用例',
  'system': '系统变量',
  'context': '上下文变量',
  'custom': '自定义变量'
};

const PromptVariableGuide: React.FC<PromptVariableGuideProps> = ({
  businessType,
  onInsertVariable,
  visible = true,
  className,
  style,
  showExamples = true
}) => {
  const [variables, setVariables] = useState<TemplateVariableItem[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<TemplateVariableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Fetch template variables from API
  const fetchVariables = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (businessType) {
        queryParams.append('business_type', businessType);
      }
      if (showExamples) {
        queryParams.append('include_examples', 'true');
      }

      const response = await fetch(`/api/v1/config/template-variables?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TemplateVariablesResponse = await response.json();
      setVariables(data.variables);
      setFilteredVariables(data.variables);

    } catch (err) {
      console.error('Failed to fetch template variables:', err);
      setError('获取模板变量失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [businessType, showExamples]);

  // Fetch variables on component mount and when dependencies change
  useEffect(() => {
    if (visible) {
      fetchVariables();
    }
  }, [fetchVariables, visible]);

  // Filter variables based on search and type
  useEffect(() => {
    let filtered = variables;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(variable =>
        variable.name.toLowerCase().includes(term) ||
        variable.description?.toLowerCase().includes(term) ||
        variable.type.toLowerCase().includes(term)
      );
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(variable => variable.type === selectedType);
    }

    setFilteredVariables(filtered);
  }, [variables, searchTerm, selectedType]);

  // Group variables by type
  const variablesByType = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.type]) {
      acc[variable.type] = [];
    }
    acc[variable.type].push(variable);
    return acc;
  }, {} as Record<string, TemplateVariableItem[]>);

  const handleInsertVariable = useCallback((variableName: string) => {
    if (onInsertVariable) {
      onInsertVariable(variableName);
    } else {
      // Default behavior: copy to clipboard
      navigator.clipboard.writeText(variableName).then(() => {
        // Could show success message here
      });
    }
  }, [onInsertVariable]);

  const handleCopyVariable = useCallback((variableName: string) => {
    navigator.clipboard.writeText(variableName).then(() => {
      // Could show success message here
    });
  }, []);

  const renderVariableCard = useCallback((variable: TemplateVariableItem) => (
    <Card
      key={variable.name}
      size="small"
      hoverable
      style={{ marginBottom: 8 }}
      actions={[
        <Tooltip title="复制变量名">
          <CopyOutlined
            key="copy"
            onClick={() => handleCopyVariable(variable.name)}
          />
        </Tooltip>,
        <Tooltip title="插入到编辑器">
          <InsertRowAboveOutlined
            key="insert"
            onClick={() => handleInsertVariable(variable.name)}
          />
        </Tooltip>
      ]}
    >
      <Card.Meta
        title={
          <Space>
            <Text code copyable={{ text: variable.name }}>
              {variable.name}
            </Text>
            <Tag color={VARIABLE_TYPE_COLORS[variable.type as keyof typeof VARIABLE_TYPE_COLORS] || 'default'}>
              {VARIABLE_TYPE_LABELS[variable.type as keyof typeof VARIABLE_TYPE_LABELS] || variable.type}
            </Tag>
          </Space>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {variable.description && (
              <Text type="secondary">{variable.description}</Text>
            )}

            {showExamples && variable.example && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>示例：</Text>
                <div style={{
                  background: '#f5f5f5',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  marginTop: '4px'
                }}>
                  {variable.example}
                </div>
              </div>
            )}

            {variable.business_type && (
              <Tag color="blue" style={{ fontSize: '11px' }}>
                业务类型: {variable.business_type}
              </Tag>
            )}
          </Space>
        }
      />
    </Card>
  ), [handleCopyVariable, handleInsertVariable, showExamples]);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">加载模板变量中...</Text>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchVariables}>
              重试
            </Button>
          }
        />
      );
    }

    if (filteredVariables.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="未找到匹配的模板变量"
        >
          {(searchTerm || selectedType) && (
            <Button onClick={() => {
              setSearchTerm('');
              setSelectedType('');
            }}>
              清除筛选条件
            </Button>
          )}
        </Empty>
      );
    }

    return (
      <Collapse
        activeKey={activeCategories}
        onChange={setActiveCategories}
        ghost
        size="small"
      >
        {Object.entries(variablesByType).map(([type, typeVariables]) => (
          <Panel
            key={type}
            header={
              <Space>
                <Tag color={VARIABLE_TYPE_COLORS[type as keyof typeof VARIABLE_TYPE_COLORS] || 'default'}>
                  {VARIABLE_TYPE_LABELS[type as keyof typeof VARIABLE_TYPE_LABELS] || type}
                </Tag>
                <Text type="secondary">
                  {typeVariables.length} 个变量
                </Text>
              </Space>
            }
          >
            {typeVariables.map(renderVariableCard)}
          </Panel>
        ))}
      </Collapse>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          <span>模板变量指导</span>
          <Text type="secondary">({filteredVariables.length})</Text>
          {businessType && (
            <Tag color="blue">{businessType}</Tag>
          )}
        </Space>
      }
      size="small"
      className={className}
      style={style}
      extra={
        <Tooltip title="使用 {{variable_name}} 语法在提示词中引用变量">
          <InfoCircleOutlined />
        </Tooltip>
      }
    >
      {/* Search and Filters */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="small">
        <Row gutter={8}>
          <Col flex="auto">
            <Search
              placeholder="搜索变量名、描述或类型"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="small"
            />
          </Col>
          <Col>
            <Select
              placeholder="筛选类型"
              value={selectedType}
              onChange={setSelectedType}
              allowClear
              size="small"
              style={{ width: 120 }}
            >
              {Object.entries(VARIABLE_TYPE_LABELS).map(([type, label]) => (
                <Option key={type} value={type}>
                  <Space>
                    <Tag color={VARIABLE_TYPE_COLORS[type as keyof typeof VARIABLE_TYPE_COLORS] || 'default'} size="small">
                      {label}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Quick Tips */}
        <Alert
          message={
            <Space>
              <BulbOutlined />
              <span>快速提示</span>
            </Space>
          }
          description={
            <div>
              点击变量的<InsertRowAboveOutlined />图标可快速插入到编辑器，
              点击<CopyOutlined />图标可复制变量名到剪贴板
            </div>
          }
          type="info"
          showIcon={false}
          size="small"
        />
      </Space>

      <Divider style={{ margin: '12px 0' }} />

      {/* Variables List */}
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {renderContent()}
      </div>
    </Card>
  );
};

export default PromptVariableGuide;