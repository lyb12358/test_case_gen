import React, { useState } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Badge,
  Avatar
} from 'antd';
import {
  DatabaseOutlined,
  SettingOutlined,
  ApiOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  ExpandOutlined,
  CompressOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// Import density level type from parent component
type DensityLevel = 'compact' | 'normal' | 'spacious';

interface BusinessCardNodeProps {
  id: string;
  data: {
    label: string;
    type: 'scenario' | 'business' | 'service' | 'interface' | 'test_case';
    description?: string;
    businessType?: string;
    extra_data?: any;
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const BusinessCardNode: React.FC<BusinessCardNodeProps> = ({ id, data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const { label, type, description, businessType, extra_data } = data;

  // Get density-based sizing
  const getDensityConfig = (density: DensityLevel) => {
    switch (density) {
      case 'compact':
        return {
          width: 220,
          fontSize: 12,
          titleFontSize: 13,
          avatarSize: 'small' as const,
          padding: expanded ? '8px' : '6px 8px',
          headerPadding: '6px 8px',
          spacing: 2,
          tagSize: 11,
          descLines: 1
        };
      case 'normal':
        return {
          width: 250,
          fontSize: 13,
          titleFontSize: 14,
          avatarSize: 'small' as const,
          padding: expanded ? '10px' : '8px 10px',
          headerPadding: '8px 10px',
          spacing: 3,
          tagSize: 12,
          descLines: 2
        };
      case 'spacious':
      default:
        return {
          width: 280,
          fontSize: 14,
          titleFontSize: 14,
          avatarSize: 'small' as const,
          padding: expanded ? '12px' : '8px 12px',
          headerPadding: '8px 12px',
          spacing: 4,
          tagSize: 12,
          descLines: 2
        };
    }
  };

  const densityConfig = getDensityConfig(density);

  // 获取节点类型图标
  const getTypeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'scenario':
        return <ApartmentOutlined style={{ color: '#722ed1' }} />;
      case 'business':
        return <DatabaseOutlined style={{ color: '#1890ff' }} />;
      case 'service':
        return <SettingOutlined style={{ color: '#52c41a' }} />;
      case 'interface':
        return <ApiOutlined style={{ color: '#fa8c16' }} />;
      case 'test_case':
        return <FileTextOutlined style={{ color: '#13c2c2' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#999' }} />;
    }
  };

  // 获取节点类型颜色
  const getTypeColor = (nodeType: string): string => {
    switch (nodeType) {
      case 'scenario': return '#722ed1';
      case 'business': return '#1890ff';
      case 'service': return '#52c41a';
      case 'interface': return '#fa8c16';
      case 'test_case': return '#13c2c2';
      default: return '#999';
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    // 根据额外数据或业务逻辑返回状态
    if (extra_data?.status === 'error') return 'error';
    if (extra_data?.status === 'warning') return 'warning';
    if (extra_data?.status === 'success') return 'success';
    return 'default';
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

  const cardTitle = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
      <Space size={densityConfig.spacing}>
        <Avatar
          size={densityConfig.avatarSize}
          icon={getTypeIcon(type)}
          style={{
            backgroundColor: getTypeColor(type),
            border: 'none'
          }}
        />
        <Text
          strong
          style={{
            fontSize: `${densityConfig.titleFontSize}px`,
            color: '#262626',
            maxWidth: `${densityConfig.width - 100}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Text>
        <Badge
          status={getStatusColor() as any}
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
        width: densityConfig.width,
        borderRadius: 8,
        border: `2px solid ${data.selected ? getTypeColor(type) : '#f0f0f0'}`,
        boxShadow: data.selected
          ? `0 4px 12px ${getTypeColor(type)}20`
          : '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fff',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      }}
      styles={{
        body: {
          padding: densityConfig.padding,
        },
        header: {
          padding: densityConfig.headerPadding,
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        }
      }}
    >
      <Space direction="vertical" size={densityConfig.spacing} style={{ width: '100%' }}>
        {/* 类型标签 */}
        <Space size={densityConfig.spacing}>
          <Tag
            color={getTypeColor(type)}
            style={{
              margin: 0,
              fontSize: `${densityConfig.tagSize}px`,
              lineHeight: density === 'compact' ? '14px' : '16px'
            }}
          >
            {type}
          </Tag>
          {businessType && (
            <Tag
              style={{
                margin: 0,
                fontSize: `${densityConfig.tagSize - 1}px`,
                lineHeight: density === 'compact' ? '14px' : '16px',
                color: '#666',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d9d9d9'
              }}
            >
              {businessType}
            </Tag>
          )}
        </Space>

        {/* 描述信息 */}
        {description && (
          <Text
            type="secondary"
            style={{
              fontSize: `${densityConfig.fontSize}px`,
              lineHeight: density === 'compact' ? '1.3' : '1.4',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : densityConfig.descLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {description}
          </Text>
        )}

        {/* 展开时显示额外信息 */}
        {expanded && extra_data && (
          <div style={{
            marginTop: density === 'compact' ? '4px' : '8px',
            padding: density === 'compact' ? '6px' : '8px',
            backgroundColor: '#fafafa',
            borderRadius: '4px',
            border: '1px solid #f0f0f0'
          }}>
            <Text
              style={{
                fontSize: `${densityConfig.tagSize}px`,
                color: '#666',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {JSON.stringify(extra_data, null, 2)}
            </Text>
          </div>
        )}

        {/* 展开时的操作按钮 */}
        {expanded && (
          <Space size={densityConfig.spacing * 2} style={{ marginTop: density === 'compact' ? '4px' : '8px' }}>
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                style={{
                  padding: density === 'compact' ? '0 4px' : '0 8px',
                  height: density === 'compact' ? '20px' : '24px',
                  fontSize: `${densityConfig.tagSize}px`
                }}
              >
                详情
              </Button>
            </Tooltip>
            <Tooltip title="相关节点">
              <Button
                type="link"
                size="small"
                style={{
                  padding: density === 'compact' ? '0 4px' : '0 8px',
                  height: density === 'compact' ? '20px' : '24px',
                  fontSize: `${densityConfig.tagSize}px`
                }}
              >
                相关
              </Button>
            </Tooltip>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default BusinessCardNode;