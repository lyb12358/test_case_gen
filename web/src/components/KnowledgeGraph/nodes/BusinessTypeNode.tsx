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
  Statistic,
  Divider
} from 'antd';
import { registerNode } from '../NodeRegistry';
import {
  AppstoreOutlined,
  ExpandOutlined,
  CompressOutlined,
  EyeOutlined,
  SettingOutlined,
  BookOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  CarOutlined,
  SettingOutlined as SettingIcon,
  SafetyOutlined,
  MobileOutlined,
  EnvironmentOutlined,
  LockOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Text } = Typography;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface BusinessTypeNodeProps {
  id: string;
  data: {
    id: string;
    label: string;
    type: 'business';
    description?: string;
    businessType?: string;
    projectId?: number;
    // 业务类型统计数据
    stats?: {
      testPointCount: number;
      testCaseCount: number;
      completionRate: number; // 完成率 (test_case / (test_point + test_case))
      totalTestCount: number;
    };
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

// 业务类型图标映射
const getBusinessTypeIcon = (businessType: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'RCC': <ThunderboltOutlined />,  // 远程空调控制
    'RFD': <CarOutlined />,          // 远程车门控制
    'ZAB': <SettingIcon />,          // 通用设置
    'RCE': <SettingOutlined />,      // 远程引擎控制
    'RES': <SafetyOutlined />,       // 远程座椅控制
    'RHL': <EnvironmentOutlined />,  // 远程灯光控制
    'RPP': <LockOutlined />,         // 远程门锁控制
    'RSM': <MobileOutlined />,       // 远程座椅控制
    'RWS': <MobileOutlined />,       // 远程窗户控制
    'PAI': <TeamOutlined />,         // 车载信息娱乐
    'PAE': <AppstoreOutlined />,     // 车载应用
    'PAB': <MobileOutlined />,       // 个人助理按钮
  };
  return iconMap[businessType] || <AppstoreOutlined />;
};

// 业务类型名称映射
const getBusinessTypeName = (businessType: string) => {
  const nameMap: Record<string, string> = {
    'RCC': '远程空调控制',
    'RFD': '远程车门控制',
    'ZAB': '车身控制',
    'RCE': '远程引擎控制',
    'RES': '远程座椅控制',
    'RHL': '远程灯光控制',
    'RPP': '远程门锁控制',
    'RSM': '座椅模块',
    'RWS': '窗户控制',
    'PAI': '车载信息',
    'PAE': '车载应用',
    'PAB': '个人助理',
    // 可以继续添加其他业务类型的全称
  };
  return nameMap[businessType] || businessType;
};

const BusinessTypeNode: React.FC<BusinessTypeNodeProps> = ({ data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const { label, description, businessType, stats } = data;

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
          icon={getBusinessTypeIcon(businessType || label)}
          style={{
            backgroundColor: '#722ed1',
            border: 'none'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Text
            strong
            style={{
              fontSize: '14px',
              color: '#262626',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </Text>
          {businessType && (
            <Text
              style={{
                fontSize: '11px',
                color: '#8c8c8c'
              }}
            >
              ({getBusinessTypeName(businessType)})
            </Text>
          )}
        </div>
        <Badge
          status="processing"
          text="激活"
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
        border: `2px solid ${data.selected ? '#13c2c2' : '#722ed1'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(19, 194, 194, 0.2)'
          : '0 2px 8px rgba(114, 46, 209, 0.15)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fff',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      }}
      styles={{
        body: {
          padding: expanded ? '14px' : '10px 14px',
        },
        header: {
          padding: '10px 14px',
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        }
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {/* 业务类型标签 */}
        <Space size={4}>
          <Tag color="purple" style={{ margin: 0, fontSize: '12px' }}>
            业务类型
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
        {expanded && stats && (
          <>
            <Divider style={{ margin: '8px 0' }} />

            {/* 统计数据 */}
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <div style={{
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: 6,
                  padding: '12px',
                  textAlign: 'center'
                }}>
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
                </div>
              </Col>
              <Col span={12}>
                <div style={{
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                  padding: '12px',
                  textAlign: 'center'
                }}>
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
                </div>
              </Col>
              <Col span={24}>
                <div style={{
                  background: '#f9f0ff',
                  border: '1px solid #d3adf7',
                  borderRadius: 6,
                  padding: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space size={8}>
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
                      <div>
                        <Text style={{ fontSize: '12px', color: '#666' }}>编写完成率</Text>
                        <div>
                          <Text style={{ fontSize: '11px', color: '#262626' }}>
                            {stats.testCaseCount} / {stats.totalTestCount}
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </div>
                </div>
              </Col>
            </Row>

            {/* 完成率进度条 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text style={{ fontSize: '12px', color: '#666' }}>测试用例编写进度</Text>
                <Text style={{ fontSize: '12px', color: '#262626', fontWeight: 'bold' }}>
                  {stats.testCaseCount} / {stats.totalTestCount}
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
          <Tooltip title="查看业务类型详情">
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
          <Tooltip title="业务类型配置">
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
              配置
            </Button>
          </Tooltip>
        </Space>
      </Space>
    </Card>
  );
};

// Register the component with the node registry
registerNode('business', 'Business Type Node', {
  displayName: 'Business Type Node',
  description: 'Business type node with configuration and statistics',
  defaultSize: { width: 340, height: 220 },
  minSize: { width: 260, height: 160 },
  maxSize: { width: 420, height: 280 }
})(BusinessTypeNode);

export default BusinessTypeNode;