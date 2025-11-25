import React from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Spin,
  message,
  Tooltip,
  Alert
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { businessService } from '@/services/businessService';

const { Title, Text, Paragraph } = Typography;

interface InlineCombinationDetailsProps {
  combinationId: number;
  businessType: string;
  businessTypeName: string;
  stage: 'test_point' | 'test_case';
  onPreview?: (combinationId: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  height?: number;
}

const InlineCombinationDetails: React.FC<InlineCombinationDetailsProps> = ({
  combinationId,
  businessType,
  businessTypeName,
  stage,
  onPreview,
  onEdit,
  onDelete,
  height = 180
}) => {
  // 获取组合详情
  const { data: combination, isLoading, error, refetch } = useQuery({
    queryKey: ['promptCombination', combinationId],
    queryFn: () => businessService.getPromptCombination(combinationId),
    enabled: !!combinationId,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: `${height}px`,
        flexDirection: 'column',
        gap: '12px'
      }}>
        <Spin size="large" />
        <Text type="secondary">加载组合详情...</Text>
      </div>
    );
  }

  if (error || !combination) {
    return (
      <div style={{ height: `${height}px`, padding: '16px' }}>
        <Alert
          message="加载失败"
          description="无法加载提示词组合详情"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview(combinationId);
    }
  };

  // 统计信息
  const stats = {
    total: combination.items?.length || 0,
    system: combination.items?.filter(item => item.prompt_type === 'system').length || 0,
    business: combination.items?.filter(item => item.prompt_type !== 'system').length || 0
  };

  return (
    <div style={{ height: `${height}px`, overflow: 'hidden' }}>
      {/* 头部信息 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
            <Title level={5} style={{
              margin: 0,
              marginBottom: '16px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#222',
              lineHeight: '1.4'
            }}>
              {combination.name}
            </Title>
            {combination.description && (
              <Text
                type="secondary"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#666',
                  display: 'block'
                }}
              >
                {combination.description}
              </Text>
            )}
          </div>
          <Space size="small" style={{ flexShrink: 0 }}>
            <Tooltip title="预览组合">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                style={{ color: '#999', borderColor: '#d9d9d9' }}
              />
            </Tooltip>
            <Tooltip title="刷新">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
                style={{ color: '#999', borderColor: '#d9d9d9' }}
              />
            </Tooltip>
            {onEdit && (
              <Tooltip title="编辑">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onEdit}
                  style={{ color: '#999', borderColor: '#d9d9d9' }}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="删除">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={onDelete}
                  style={{ color: '#999', borderColor: '#d9d9d9' }}
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </div>

      {/* 统计信息 */}
      <div style={{
        padding: '12px 16px',
        background: '#fff',
        marginTop: '0px'
      }}>
        <Tag color="blue" style={{ fontSize: '13px', padding: '4px 12px' }}>
          总计 {stats.total} (系统{stats.system}, 业务{stats.business})
        </Tag>
      </div>

    </div>
  );
};

export default InlineCombinationDetails;