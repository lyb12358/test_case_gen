/**
 * Prompt Delete Preview Modal - Shows dependencies before deletion
 */

import React from 'react';
import {
  Modal,
  Descriptions,
  List,
  Tag,
  Alert,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Empty,
  Spin,
  Card
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  LinkOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface DeletePreviewData {
  prompt_id: number;
  prompt: {
    id: number;
    name: string;
    type: string;
    business_type?: string;
    status: string;
    version: string;
  } | null;
  combinations: Array<{
    id: number;
    name: string;
    business_type?: string;
    is_active: boolean;
    description?: string;
  }>;
  versions: Array<{
    id: number;
    version_number: string;
    created_at?: string;
  }>;
  business_configs: Array<{
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    project_id: number;
  }>;
  can_delete: boolean;
  block_reason?: string;
}

interface BatchDeletePreviewData {
  prompts: DeletePreviewData[];
  combined_dependencies: {
    combinations: Array<{
      id: number;
      name: string;
      business_type?: string;
      is_active: boolean;
      description?: string;
    }>;
    business_configs: Array<{
      id: number;
      code: string;
      name: string;
      is_active: boolean;
      project_id: number;
    }>;
  };
  can_delete_all: boolean;
  block_reason?: string;
}

interface PromptDeletePreviewProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  data?: DeletePreviewData | BatchDeletePreviewData | null;
  isBatch?: boolean;
}

const PromptDeletePreview: React.FC<PromptDeletePreviewProps> = ({
  visible,
  onCancel,
  onConfirm,
  loading = false,
  data,
  isBatch = false
}) => {
  if (!data || (!isBatch && !data.prompt)) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      draft: 'blue',
      archived: 'default',
      deprecated: 'orange'
    };
    return colors[status] || 'default';
  };

  const renderPromptInfo = (prompt: DeletePreviewData['prompt']) => (
    <Card size="small" title="提示词信息">
      <Descriptions column={2}>
        <Descriptions.Item label="名称">{prompt.name}</Descriptions.Item>
        <Descriptions.Item label="类型">
          <Tag color="blue">{prompt.type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="业务类型">
          {prompt.business_type ? <Tag>{prompt.business_type}</Tag> : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={getStatusColor(prompt.status)}>{prompt.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="版本" span={2}>{prompt.version}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const renderVersions = (versions: DeletePreviewData['versions']) => (
    <Card size="small" title={`版本历史 (${versions.length}个)`}>
      {versions.length === 0 ? (
        <Empty description="无版本历史" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={versions}
          renderItem={(version) => (
            <List.Item>
              <List.Item.Meta
                avatar={<InfoCircleOutlined />}
                title={version.version_number}
                description={
                  version.created_at
                    ? new Date(version.created_at).toLocaleString()
                    : '时间未知'
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const renderCombinations = (combinations: DeletePreviewData['combinations']) => (
    <Card size="small" title={`提示词组合 (${combinations.length}个)`}>
      {combinations.length === 0 ? (
        <Empty description="未使用在任何组合中" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={combinations}
          renderItem={(combo) => (
            <List.Item>
              <List.Item.Meta
                avatar={<LinkOutlined style={{ color: '#1890ff' }} />}
                title={
                  <Space>
                    {combo.name}
                    {combo.is_active ? (
                      <Tag color="green">活跃</Tag>
                    ) : (
                      <Tag>非活跃</Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {combo.business_type && (
                      <Text type="secondary">业务类型: {combo.business_type}</Text>
                    )}
                    {combo.description && (
                      <Text type="secondary">{combo.description}</Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const renderBusinessConfigs = (configs: DeletePreviewData['business_configs']) => (
    <Card size="small" title={`业务配置 (${configs.length}个)`}>
      {configs.length === 0 ? (
        <Empty description="无相关业务配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={configs}
          renderItem={(config) => (
            <List.Item>
              <List.Item.Meta
                avatar={<WarningOutlined style={{ color: '#fa8c16' }} />}
                title={
                  <Space>
                    {config.name}
                    {config.is_active ? (
                      <Tag color="green">活跃</Tag>
                    ) : (
                      <Tag>非活跃</Tag>
                    )}
                  </Space>
                }
                description={
                  <Space>
                    <Text type="secondary">代码: {config.code}</Text>
                    <Text type="secondary">项目ID: {config.project_id}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  const renderBatchPreview = (data: BatchDeletePreviewData) => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 批量提示词概览 */}
      <Card size="small" title={`将要删除的提示词 (${data.prompts.length}个)`}>
        <List
          size="small"
          dataSource={data.prompts}
          renderItem={(prompt) => (
            <List.Item>
              <List.Item.Meta
                avatar={<InfoCircleOutlined />}
                title={
                  <Space>
                    {prompt.prompt?.name}
                    <Tag color={getStatusColor(prompt.prompt?.status || '')}>
                      {prompt.prompt?.status}
                    </Tag>
                  </Space>
                }
                description={`类型: ${prompt.prompt?.type} | 版本: ${prompt.prompt?.version}`}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 聚合的依赖信息 */}
      {data.combined_dependencies.combinations.length > 0 && (
        <Card size="small" title={`受影响的提示词组合 (${data.combined_dependencies.combinations.length}个)`}>
          <List
            size="small"
            dataSource={data.combined_dependencies.combinations}
            renderItem={(combo) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<LinkOutlined style={{ color: '#1890ff' }} />}
                  title={
                    <Space>
                      {combo.name}
                      {combo.is_active ? (
                        <Tag color="green">活跃</Tag>
                      ) : (
                        <Tag>非活跃</Tag>
                      )}
                    </Space>
                  }
                  description={
                    combo.business_type ? (
                      <Text type="secondary">业务类型: {combo.business_type}</Text>
                    ) : null
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {data.combined_dependencies.business_configs.length > 0 && (
        <Card size="small" title={`受影响的业务配置 (${data.combined_dependencies.business_configs.length}个)`}>
          <List
            size="small"
            dataSource={data.combined_dependencies.business_configs}
            renderItem={(config) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<WarningOutlined style={{ color: '#fa8c16' }} />}
                  title={
                    <Space>
                      {config.name}
                      {config.is_active ? (
                        <Tag color="green">活跃</Tag>
                      ) : (
                        <Tag>非活跃</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">代码: {config.code}</Text>
                      <Text type="secondary">项目ID: {config.project_id}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </Space>
  );

  const singleData = data as DeletePreviewData;
  const batchData = data as BatchDeletePreviewData;

  return (
    <Modal
      title={
        <Space>
          <DeleteOutlined />
          {isBatch ? '批量删除提示词' : '删除提示词'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      width={800}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{
        danger: true,
        disabled: !data.can_delete && !isBatch,
        loading: loading
      }}
      cancelButtonProps={{
        disabled: loading
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在检查依赖关系...</Text>
          </div>
        </div>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 阻止删除的原因 */}
          {!data.can_delete && data.block_reason && (
            <Alert
              message="无法删除"
              description={data.block_reason}
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          )}

          {/* 确认删除的警告 */}
          {data.can_delete && (
            <Alert
              message="删除操作不可恢复"
              description={
                isBatch
                  ? `即将删除 ${batchData.prompts.length} 个提示词及其所有版本历史`
                  : '将删除此提示词及其所有版本历史，此操作不可恢复'
              }
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          )}

          <Divider />

          {/* 内容渲染 */}
          {isBatch ? (
            renderBatchPreview(batchData)
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {singleData.prompt && renderPromptInfo(singleData.prompt)}
              {renderVersions(singleData.versions)}
              {renderCombinations(singleData.combinations)}
              {renderBusinessConfigs(singleData.business_configs)}
            </Space>
          )}

          {/* 统计信息 */}
          <Divider />
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                  {isBatch ? batchData.prompts.length : 1}
                </Title>
                <Text type="secondary">提示词</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                  {isBatch
                    ? batchData.prompts.reduce((sum, p) => sum + p.versions.length, 0)
                    : singleData.versions.length
                  }
                </Title>
                <Text type="secondary">版本历史</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>
                  {isBatch
                    ? data.combined_dependencies.combinations.length
                    : singleData.combinations.length
                  }
                </Title>
                <Text type="secondary">提示词组合</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                  {isBatch
                    ? data.combined_dependencies.business_configs.length
                    : singleData.business_configs.length
                  }
                </Title>
                <Text type="secondary">业务配置</Text>
              </div>
            </Col>
          </Row>
        </Space>
      )}
    </Modal>
  );
};

export default PromptDeletePreview;