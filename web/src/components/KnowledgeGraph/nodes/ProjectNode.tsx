import React, { useState } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Badge,
  Avatar,
  Progress,
  Tooltip,
  Row,
  Col,
  Statistic
} from 'antd';
import { registerNode } from '../NodeRegistry';
import {
  ProjectOutlined,
  ExpandOutlined,
  CompressOutlined,
  EyeOutlined,
  SettingOutlined,
  TeamOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  BookOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface ProjectNodeProps {
  id: string;
  data: {
    id: string;
    label: string;
    type: 'project';
    description?: string;
    projectId?: number;
    // 项目统计数据
    stats?: {
      businessTypeCount: number;
      testPointCount: number;
      testCaseCount: number;
      completionRate: number; // 完成率 (test_case / (test_point + test_case))
    };
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const ProjectNode: React.FC<ProjectNodeProps> = ({ data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const { label, description, stats } = data;

  // Get density-based width
  const getDensityWidth = (density: DensityLevel) => {
    switch (density) {
      case 'compact': return 300;
      case 'normal': return 340;
      case 'spacious':
      default: return 380;
    }
  };

  const cardWidth = getDensityWidth(density);

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

  // 获取完成率颜色
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return '#52c41a';
    if (rate >= 60) return '#faad14';
    if (rate >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

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
          icon={<ProjectOutlined />}
          style={{
            backgroundColor: '#1890ff',
            border: 'none'
          }}
        />
        <Text
          strong
          style={{
            fontSize: '15px',
            color: '#262626',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Text>
        <Badge
          status="processing"
          text="活跃"
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
        border: `2px solid ${data.selected ? '#13c2c2' : '#1890ff'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(19, 194, 194, 0.2)'
          : '0 2px 8px rgba(24, 144, 255, 0.15)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fff',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      }}
      styles={{
        body: {
          padding: expanded ? '16px' : '12px 16px',
        },
        header: {
          padding: '12px 16px',
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        }
      }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* 项目类型标签 */}
        <Space size={4}>
          <Tag color="blue" style={{ margin: 0, fontSize: '12px' }}>
            项目
          </Tag>
          <Tag
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#666',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9'
            }}
          >
            ID: {data.projectId}
          </Tag>
        </Space>

        {/* 描述 */}
        {description && (
          <Text
            type="secondary"
            style={{
              fontSize: '13px',
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
        {expanded && stats && (
          <>
            {/* 统计数据卡片 */}
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: '#f8f9ff',
                    border: '1px solid #e6f7ff',
                    borderRadius: 6
                  }}
                  styles={{ body: { padding: '12px', textAlign: 'center' } }}
                >
                  <AppstoreOutlined
                    style={{
                      fontSize: '18px',
                      color: '#1890ff',
                      marginBottom: '4px',
                      display: 'block'
                    }}
                  />
                  <Statistic
                    title={<Text style={{ fontSize: '11px', color: '#666' }}>业务类型</Text>}
                    value={stats.businessTypeCount}
                    valueStyle={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: 6
                  }}
                  styles={{ body: { padding: '12px', textAlign: 'center' } }}
                >
                  <BookOutlined
                    style={{
                      fontSize: '18px',
                      color: '#fa8c16',
                      marginBottom: '4px',
                      display: 'block'
                    }}
                  />
                  <Statistic
                    title={<Text style={{ fontSize: '11px', color: '#666' }}>测试点</Text>}
                    value={stats.testPointCount}
                    valueStyle={{ color: '#fa8c16', fontSize: '16px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6
                  }}
                  styles={{ body: { padding: '12px', textAlign: 'center' } }}
                >
                  <FileTextOutlined
                    style={{
                      fontSize: '18px',
                      color: '#52c41a',
                      marginBottom: '4px',
                      display: 'block'
                    }}
                  />
                  <Statistic
                    title={<Text style={{ fontSize: '11px', color: '#666' }}>测试用例</Text>}
                    value={stats.testCaseCount}
                    valueStyle={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: '#f9f0ff',
                    border: '1px solid #d3adf7',
                    borderRadius: 6
                  }}
                  styles={{ body: { padding: '12px', textAlign: 'center' } }}
                >
                  <Progress
                    type="circle"
                    size={40}
                    percent={Math.round(stats.completionRate)}
                    strokeColor={getProgressColor(stats.completionRate)}
                    format={percent => (
                      <Text style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        {percent}%
                      </Text>
                    )}
                  />
                  <Text style={{ fontSize: '11px', color: '#666', display: 'block', marginTop: '4px' }}>
                    完成率
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* 完成率进度条 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text style={{ fontSize: '12px', color: '#666' }}>测试用例编写进度</Text>
                <Text style={{ fontSize: '12px', color: '#262626', fontWeight: 'bold' }}>
                  {stats.testCaseCount} / {stats.testPointCount + stats.testCaseCount}
                </Text>
              </div>
              <Progress
                percent={Math.round(stats.completionRate)}
                strokeColor={getProgressColor(stats.completionRate)}
                size="small"
                showInfo={false}
              />
            </div>
          </>
        )}

        {/* 基础统计（未展开时） */}
        {!expanded && stats && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 0',
            borderTop: '1px solid #f0f0f0'
          }}>
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {stats.businessTypeCount}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <BookOutlined style={{ fontSize: '16px', color: '#fa8c16' }} />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {stats.testPointCount}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {stats.testCaseCount}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                size={28}
                percent={Math.round(stats.completionRate)}
                strokeColor={getProgressColor(stats.completionRate)}
                format={percent => (
                  <Text style={{ fontSize: '8px', fontWeight: 'bold' }}>
                    {percent}%
                  </Text>
                )}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <Space size={8}>
          <Tooltip title="查看项目详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '0 8px',
                height: '24px',
                fontSize: '12px'
              }}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="项目设置">
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '0 8px',
                height: '24px',
                fontSize: '12px'
              }}
            >
              设置
            </Button>
          </Tooltip>
        </Space>
      </Space>
    </Card>
  );
};

// Register the component with the node registry
registerNode('project', 'Project Node', {
  displayName: 'Project Node',
  description: 'Project node with statistics and business types',
  defaultSize: { width: 380, height: 240 },
  minSize: { width: 280, height: 180 },
  maxSize: { width: 480, height: 300 }
})(ProjectNode);

export default ProjectNode;