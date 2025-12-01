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
  tempCombinationData?: {
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
      prompt_name?: string;
      prompt_type?: string;
      prompt_content?: string;
    }>;
  };
}

const InlineCombinationDetails: React.FC<InlineCombinationDetailsProps> = ({
  combinationId,
  businessType,
  businessTypeName,
  stage,
  onPreview,
  onEdit,
  onDelete,
  height = 180,
  tempCombinationData
}) => {
  // 获取组合详情
  const { data: combination, isLoading, error, refetch } = useQuery({
    queryKey: ['promptCombination', combinationId],
    queryFn: () => businessService.getPromptCombination(combinationId),
    enabled: !!combinationId && !tempCombinationData, // 如果有临时数据，不请求API
    staleTime: 5 * 60 * 1000
  });

  // 优先使用临时数据，否则使用API数据
  const displayData = tempCombinationData || combination;

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

  if (error || !displayData) {
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
              {displayData.name}
            </Title>
            {displayData.description && (
              <Text
                type="secondary"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#666',
                  display: 'block'
                }}
              >
                {displayData.description}
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

      {/* 提示词列表 */}
      <div style={{
        padding: '12px 16px',
        background: '#fff',
        marginTop: '0px'
      }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          包含的提示词：
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {displayData.items?.slice(0, 5).map((item, index) => {
            // Determine the best display name for the prompt
            let displayName = '';
            if (item.prompt_name && item.prompt_name.trim()) {
              displayName = item.prompt_name;
            } else {
              // Fallback to a more descriptive format
              const typeLabel = item.prompt_type ?
                (item.prompt_type === 'system' ? '系统' :
                 item.prompt_type === 'business_description' ? '业务' :
                 item.prompt_type === 'shared_content' ? '共享' :
                 item.prompt_type === 'template' ? '模板' : '提示') : '提示';
              displayName = `${typeLabel}${item.prompt_id}`;
            }

            return (
              <Tag
                key={index}
                color={item.prompt_type === 'system' ? 'blue' :
                       item.prompt_type === 'business_description' ? 'green' :
                       item.prompt_type === 'shared_content' ? 'orange' :
                       item.prompt_type === 'template' ? 'purple' : 'default'}
                style={{ fontSize: '11px' }}
              >
                {displayName}
              </Tag>
            );
          })}
          {(displayData.items?.length || 0) > 5 && (
            <Tag color="default" style={{ fontSize: '11px' }}>
              ...还有 {(displayData.items?.length || 0) - 5}个
            </Tag>
          )}
        </div>
      </div>

    </div>
  );
};

export default InlineCombinationDetails;