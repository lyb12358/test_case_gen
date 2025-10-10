import React, { useState } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Badge,
  Avatar,
  List,
  Collapse
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  ExpandOutlined,
  CompressOutlined,
  EyeOutlined,
  EditOutlined,
  HistoryOutlined,
  CodeOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface TestCaseNodeProps {
  id: string;
  data: {
    label: string;
    type: 'test_case';
    description?: string;
    businessType?: string;
    extra_data?: {
      priority?: 'high' | 'medium' | 'low';
      status?: 'pass' | 'fail' | 'pending' | 'running' | 'skipped';
      automation?: 'manual' | 'automated' | 'semi-automated';
      estimatedTime?: number;
      actualTime?: number;
      lastRun?: string;
      runCount?: number;
      passRate?: number;
      tags?: string[];
      preconditions?: string[];
      steps?: Array<{
        step: number;
        action: string;
        expected: string;
        actual?: string;
        status?: 'pass' | 'fail' | 'not_run';
      }>;
      testData?: Record<string, any>;
      environment?: string;
      browser?: string;
      device?: string;
      module?: string;
      functionalDomain?: string;
      assignedTo?: string;
      createdAt?: string;
      updatedAt?: string;
      defects?: Array<{
        id: string;
        title: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        status: 'open' | 'closed' | 'in_progress';
      }>;
      coverage?: {
        requirements: number;
        scenarios: number;
        code?: number;
      };
    };
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const TestCaseNode: React.FC<TestCaseNodeProps> = ({ id, data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const { label, description, businessType, extra_data } = data;

  // Get density-based width
  const getDensityWidth = (density: DensityLevel) => {
    switch (density) {
      case 'compact': return 280;
      case 'normal': return 310;
      case 'spacious':
      default: return 340;
    }
  };

  const cardWidth = getDensityWidth(density);

  // 获取优先级颜色
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#8c8c8c';
    }
  };

  // 获取状态信息
  const getStatusInfo = () => {
    const status = extra_data?.status || 'pending';
    switch (status) {
      case 'pass':
        return { icon: <CheckCircleOutlined />, color: 'success', text: '通过' };
      case 'fail':
        return { icon: <CloseCircleOutlined />, color: 'error', text: '失败' };
      case 'running':
        return { icon: <PlayCircleOutlined />, color: 'processing', text: '运行中' };
      case 'skipped':
        return { icon: <ExclamationCircleOutlined />, color: 'warning', text: '跳过' };
      case 'pending':
        return { icon: <ClockCircleOutlined />, color: 'default', text: '待执行' };
      default:
        return { icon: <ClockCircleOutlined />, color: 'default', text: '未知' };
    }
  };

  // 获取自动化类型图标
  const getAutomationIcon = () => {
    switch (extra_data?.automation) {
      case 'automated':
        return <CodeOutlined style={{ color: '#1890ff' }} />;
      case 'semi-automated':
        return <EditOutlined style={{ color: '#722ed1' }} />;
      case 'manual':
      default:
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 切换展开/收缩状态
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
  };

  // 处理节点点击
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Graph interaction is handled at the graph level
  };

  const statusInfo = getStatusInfo();

  const cardTitle = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
      <Space size={8}>
        <Avatar
          size="small"
          icon={getAutomationIcon()}
          style={{
            backgroundColor: statusInfo.color === 'success' ? '#52c41a' :
                          statusInfo.color === 'error' ? '#ff4d4f' :
                          statusInfo.color === 'processing' ? '#1890ff' :
                          statusInfo.color === 'warning' ? '#faad14' : '#8c8c8c',
            border: 'none'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Text
            strong
            style={{
              fontSize: '14px',
              color: '#262626',
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </Text>
          {extra_data?.priority && (
            <Tag
              color={getPriorityColor(extra_data.priority)}
              style={{
                margin: 0,
                fontSize: '10px',
                fontWeight: 'bold',
                minWidth: '40px',
                textAlign: 'center'
              }}
            >
              {extra_data.priority.toUpperCase()}
            </Tag>
          )}
        </div>
        <Badge
          status={statusInfo.color as any}
          text={statusInfo.text}
          size="small"
        />
      </Space>

      <Button
        type="text"
        size="small"
        icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
        onClick={toggleExpand}
        style={{
          padding: '0 4px',
          minWidth: 'auto',
          height: '20px',
          lineHeight: '20px'
        }}
      />
    </div>
  );

  return (
    <Card
      size="small"
      title={cardTitle}
      hoverable
      onClick={handleNodeClick}
      style={{
        width: cardWidth,
        borderRadius: 8,
        border: `2px solid ${data.selected ? '#13c2c2' : '#f0f0f0'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(19, 194, 194, 0.2)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fff',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      }}
      styles={{
        body: {
          padding: expanded ? '12px' : '8px 12px',
        },
        header: {
          padding: '8px 12px',
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        }
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {/* 测试用例信息 */}
        <Space size={4}>
          <Tag color="cyan" style={{ margin: 0, fontSize: '12px' }}>
            测试用例
          </Tag>
          {businessType && (
            <Tag
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#666',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d9d9d9'
              }}
            >
              {businessType}
            </Tag>
          )}
          {extra_data?.automation && (
            <Tag
              color={
                extra_data.automation === 'automated' ? 'blue' :
                extra_data.automation === 'semi-automated' ? 'purple' : 'green'
              }
              style={{ margin: 0, fontSize: '11px' }}
            >
              {extra_data.automation === 'automated' ? '自动' :
               extra_data.automation === 'semi-automated' ? '半自动' : '手动'}
            </Tag>
          )}
        </Space>

        {/* 标签 */}
        {extra_data?.tags && extra_data.tags.length > 0 && (
          <Space wrap size={2}>
            {extra_data.tags.slice(0, expanded ? undefined : 3).map((tag, index) => (
              <Tag key={index} style={{ fontSize: '10px', margin: 0 }}>
                {tag}
              </Tag>
            ))}
            {!expanded && extra_data.tags.length > 3 && (
              <Tag style={{ fontSize: '10px', margin: 0 }}>
                +{extra_data.tags.length - 3}
              </Tag>
            )}
          </Space>
        )}

        {/* 模块和功能域 */}
        <Space size={8}>
          {extra_data?.module && (
            <Space size={4}>
              <Text style={{ fontSize: '11px', color: '#666' }}>模块:</Text>
              <Text style={{ fontSize: '11px' }}>{extra_data.module}</Text>
            </Space>
          )}
          {extra_data?.functionalDomain && (
            <Space size={4}>
              <Text style={{ fontSize: '11px', color: '#666' }}>领域:</Text>
              <Text style={{ fontSize: '11px' }}>{extra_data.functionalDomain}</Text>
            </Space>
          )}
        </Space>

        {/* 描述 */}
        {description && (
          <Text
            type="secondary"
            style={{
              fontSize: '12px',
              lineHeight: '1.4',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {description}
          </Text>
        )}

        {/* 展开时显示详细信息 */}
        {expanded && (
          <>
            {/* 执行统计 */}
            <div style={{
              padding: '8px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #f0f0f0'
            }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '12px' }}>执行统计</Text>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {extra_data?.runCount !== undefined && (
                    <Space size={4}>
                      <HistoryOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                      <Text style={{ fontSize: '11px' }}>执行次数: {extra_data.runCount}</Text>
                    </Space>
                  )}
                  {extra_data?.passRate !== undefined && (
                    <Space size={4}>
                      <CheckCircleOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                      <Text style={{ fontSize: '11px' }}>通过率: {extra_data.passRate}%</Text>
                    </Space>
                  )}
                  {extra_data?.estimatedTime && (
                    <Space size={4}>
                      <ClockCircleOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />
                      <Text style={{ fontSize: '11px' }}>
                        预估: {extra_data.estimatedTime}min
                      </Text>
                    </Space>
                  )}
                  {extra_data?.lastRun && (
                    <Space size={4}>
                      <ClockCircleOutlined style={{ fontSize: '12px', color: '#722ed1' }} />
                      <Text style={{ fontSize: '11px' }}>
                        最近: {new Date(extra_data.lastRun).toLocaleDateString()}
                      </Text>
                    </Space>
                  )}
                </div>

                {/* 环境信息 */}
                <Space wrap size={8}>
                  {extra_data?.environment && (
                    <Text style={{ fontSize: '11px' }}>
                      环境: <Tag style={{ fontSize: '10px' }}>{extra_data.environment}</Tag>
                    </Text>
                  )}
                  {extra_data?.browser && (
                    <Text style={{ fontSize: '11px' }}>
                      浏览器: <Tag style={{ fontSize: '10px' }}>{extra_data.browser}</Tag>
                    </Text>
                  )}
                  {extra_data?.device && (
                    <Text style={{ fontSize: '11px' }}>
                      设备: <Tag style={{ fontSize: '10px' }}>{extra_data.device}</Tag>
                    </Text>
                  )}
                </Space>
              </Space>
            </div>

            {/* 测试步骤 */}
            {extra_data?.steps && extra_data.steps.length > 0 && (
              <Collapse ghost size="small">
                <Panel
                  header={
                    <Text strong style={{ fontSize: '12px' }}>
                      测试步骤 ({extra_data.steps.length})
                    </Text>
                  }
                  key="steps"
                >
                  <List
                    size="small"
                    dataSource={extra_data.steps}
                    renderItem={(step) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space size={4}>
                            <Badge
                              count={step.step}
                              style={{
                                backgroundColor: step.status === 'pass' ? '#52c41a' :
                                               step.status === 'fail' ? '#ff4d4f' : '#d9d9d9'
                              }}
                            />
                            <Text style={{ fontSize: '11px' }}>{step.action}</Text>
                            {step.status && (
                              <Badge
                                status={step.status === 'pass' ? 'success' :
                                       step.status === 'fail' ? 'error' : 'default'}
                                size="small"
                              />
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: '10px', marginLeft: '20px' }}>
                            预期: {step.expected}
                          </Text>
                          {step.actual && (
                            <Text type="secondary" style={{ fontSize: '10px', marginLeft: '20px' }}>
                              实际: {step.actual}
                            </Text>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Panel>
              </Collapse>
            )}

            {/* 前置条件 */}
            {extra_data?.preconditions && extra_data.preconditions.length > 0 && (
              <Collapse ghost size="small">
                <Panel
                  header={
                    <Text strong style={{ fontSize: '12px' }}>
                      前置条件 ({extra_data.preconditions.length})
                    </Text>
                  }
                  key="preconditions"
                >
                  <List
                    size="small"
                    dataSource={extra_data.preconditions}
                    renderItem={(condition, index) => (
                      <List.Item style={{ padding: '2px 0' }}>
                        <Text style={{ fontSize: '11px' }}>
                          {index + 1}. {condition}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Panel>
              </Collapse>
            )}

            {/* 缺陷信息 */}
            {extra_data?.defects && extra_data.defects.length > 0 && (
              <div style={{
                padding: '8px',
                backgroundColor: '#fff2f0',
                borderRadius: '4px',
                border: '1px solid #ffccc7'
              }}>
                <Text strong style={{ fontSize: '12px', color: '#cf1322' }}>
                  关联缺陷 ({extra_data.defects.length})
                </Text>
                <Space wrap style={{ marginTop: '4px' }}>
                  {extra_data.defects.map((defect) => (
                    <Tag
                      key={defect.id}
                      color={
                        defect.severity === 'critical' ? 'red' :
                        defect.severity === 'high' ? 'orange' :
                        defect.severity === 'medium' ? 'gold' : 'green'
                      }
                      style={{ fontSize: '10px' }}
                    >
                      {defect.id}: {defect.title}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* 操作按钮 */}
            <Space size={8}>
              <Tooltip title="执行测试">
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  执行
                </Button>
              </Tooltip>
              <Tooltip title="查看详情">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  详情
                </Button>
              </Tooltip>
              <Tooltip title="编辑用例">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  编辑
                </Button>
              </Tooltip>
              <Tooltip title="执行历史">
                <Button
                  type="link"
                  size="small"
                  icon={<HistoryOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  历史
                </Button>
              </Tooltip>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
};

export default TestCaseNode;