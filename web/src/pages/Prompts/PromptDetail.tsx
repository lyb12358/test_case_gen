/**
 * Prompt Detail Page - Beautiful read-only viewer with markdown rendering.
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Descriptions,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  message,
  Tooltip,
  Modal,
  Alert,
  Badge,
  Statistic,
  Typography,
  Spin
} from 'antd';
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  LeftOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

import {
  getPromptTypeName,
  getPromptStatusName,
  getBusinessTypeName
} from '../../types/prompts';
import promptService, { promptUtils } from '../../services/promptService';
import 'highlight.js/styles/github.css';

const { Title, Text } = Typography;

const PromptDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  // Fetch prompt data
  const {
    data: prompt,
    isPending,
    error,
    refetch
  } = useQuery({
    queryKey: ['prompt', id],
    queryFn: () => promptService.prompt.getPrompt(Number(id)),
    enabled: !!id && id !== 'undefined'
  });

  // Fetch validation
  const {
    data: validation
  } = useQuery({
    queryKey: ['prompt-validation', id],
    queryFn: () => promptService.search.validatePrompt(Number(id)),
    enabled: !!prompt && !!id && id !== 'undefined'
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: promptService.prompt.deletePrompt,
    onSuccess: () => {
      message.success('提示词删除成功');
      navigate('/prompts');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Clone prompt mutation
  const clonePromptMutation = useMutation({
    mutationFn: promptService.prompt.clonePrompt,
    onSuccess: (data: any) => {
      message.success('提示词克隆成功');
      navigate(`/prompts/${data.id}/edit`);
    },
    onError: (error: any) => {
      message.error(`克隆失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Handle actions
  const handleEdit = () => {
    if (id && id !== 'undefined') {
      navigate(`/prompts/${id}/edit`);
    }
  };

  const handleDelete = () => {
    if (id && id !== 'undefined') {
      Modal.confirm({
        title: '删除确认',
        content: '确定要删除这个提示词吗？此操作不可恢复。',
        okText: '确定',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => {
          deletePromptMutation.mutate(Number(id));
        }
      });
    }
  };

  const handleClone = () => {
    if (id && id !== 'undefined') {
      clonePromptMutation.mutate(Number(id));
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(prompt?.content || '');
      setCopiedContent(true);
      message.success('内容已复制到剪贴板');
      setTimeout(() => setCopiedContent(false), 2000);
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleExport = () => {
    if (!prompt) return;

    const blob = new Blob([prompt.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'draft':
        return <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />;
      case 'archived':
        return <ClockCircleOutlined style={{ color: '#999' }} />;
      case 'deprecated':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    return promptUtils.getTypeColor(type as any);
  };

  // Render markdown content
  const renderMarkdown = (content: string) => (
    <div style={{
      minHeight: '300px',
      lineHeight: '1.6',
      fontSize: '14px'
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          h1: ({ children, ...props }: any) => (
            <h1 style={{
              borderBottom: '2px solid #e8e8e8',
              paddingBottom: '8px',
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: 'bold'
            }} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 style={{
              borderBottom: '1px solid #e8e8e8',
              paddingBottom: '6px',
              marginTop: '24px',
              marginBottom: '12px',
              fontSize: '20px',
              fontWeight: 'bold'
            }} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 style={{
              marginTop: '20px',
              marginBottom: '10px',
              fontSize: '18px',
              fontWeight: 'bold'
            }} {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }: any) => (
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }} {...props}>
              {children}
            </p>
          ),
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code style={{
                  backgroundColor: '#f5f5f5',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.9em',
                  fontFamily: 'Consolas, Monaco, monospace'
                }} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div style={{
                backgroundColor: '#f6f8fa',
                border: '1px solid #e1e4e8',
                borderRadius: '6px',
                padding: '16px',
                margin: '16px 0',
                overflow: 'auto'
              }}>
                <code style={{
                  fontSize: '0.9em',
                  fontFamily: 'Consolas, Monaco, monospace'
                }} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          ul: ({ children, ...props }: any) => (
            <ul style={{ marginBottom: '12px', paddingLeft: '20px' }} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol style={{ marginBottom: '12px', paddingLeft: '20px' }} {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => (
            <li style={{ marginBottom: '4px' }} {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }: any) => (
            <blockquote style={{
              borderLeft: '4px solid #dfe2e5',
              padding: '0 16px',
              margin: '16px 0',
              color: '#6a737d',
              backgroundColor: '#f6f8fa'
            }} {...props}>
              {children}
            </blockquote>
          ),
          table: ({ children, ...props }: any) => (
            <table style={{
              borderCollapse: 'collapse',
              width: '100%',
              margin: '16px 0',
              fontSize: '14px'
            }} {...props}>
              {children}
            </table>
          ),
          th: ({ children, ...props }: any) => (
            <th style={{
              border: '1px solid #d0d7de',
              padding: '8px 12px',
              backgroundColor: '#f6f8fa',
              fontWeight: 'bold',
              textAlign: 'left'
            }} {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td style={{
              border: '1px solid #d0d7de',
              padding: '8px 12px'
            }} {...props}>
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  if (isPending) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description="无法加载提示词数据，请稍后重试"
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

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={() => navigate('/prompts')}
              >
                返回列表
              </Button>
              <Divider type="vertical" />
              <Space>
                {getStatusIcon(prompt.status)}
                <Title level={3} style={{ margin: 0 }}>
                  {prompt.name}
                </Title>
                <Tag color={getTypeColor(prompt.type)}>
                  {getPromptTypeName(prompt.type)}
                </Tag>
                {prompt.business_type && (
                  <Tag>{getBusinessTypeName(prompt.business_type)}</Tag>
                )}
              </Space>
            </Space>
          </Col>

          <Col>
            <Space>
              <Tooltip title="分享">
                <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                  分享
                </Button>
              </Tooltip>

              <Tooltip title="复制内容">
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyContent}
                  type={copiedContent ? 'primary' : 'default'}
                >
                  {copiedContent ? '已复制' : '复制'}
                </Button>
              </Tooltip>

              <Tooltip title="导出">
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  导出
                </Button>
              </Tooltip>

              <Tooltip title="全屏">
                <Button
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                />
              </Tooltip>

              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>

              <Button icon={<CopyOutlined />} onClick={handleClone} loading={clonePromptMutation.isPending}>
                克隆
              </Button>

              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={deletePromptMutation.isPending}
              >
                删除
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="内容长度"
              value={prompt.content.length}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="版本"
              value={prompt.version}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="状态"
              value={getPromptStatusName(prompt.status)}
              prefix={getStatusIcon(prompt.status)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={16}>
        <Col span={isFullscreen ? 24 : 16}>
          <Card
            title={
              <Space>
                <span>提示词内容</span>
                {prompt.variables && prompt.variables.length > 0 && (
                  <Badge count={prompt.variables.length} color="blue">
                    <span>模板变量</span>
                  </Badge>
                )}
              </Space>
            }
            style={{ height: isFullscreen ? 'calc(100vh - 280px)' : 'auto' }}
            bodyStyle={{ padding: '16px', height: isFullscreen ? 'calc(100vh - 336px)' : 'auto', overflow: 'auto' }}
          >
            {renderMarkdown(prompt.content)}

            {/* Template Variables */}
            {prompt.variables && prompt.variables.length > 0 && (
              <>
                <Divider>模板变量</Divider>
                <Space wrap>
                  {prompt.variables.map((variable: string) => (
                    <Tag key={variable} color="blue">
                      {'{{' + variable + '}}'}
                    </Tag>
                  ))}
                </Space>
              </>
            )}
          </Card>
        </Col>

        <Col span={isFullscreen ? 0 : 8}>
          {/* Metadata */}
          <Card title="详细信息" style={{ marginBottom: '16px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="ID">{prompt.id}</Descriptions.Item>
              <Descriptions.Item label="名称">{prompt.name}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={getTypeColor(prompt.type)}>
                  {getPromptTypeName(prompt.type)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Space>
                  {getStatusIcon(prompt.status)}
                  {getPromptStatusName(prompt.status)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {prompt.business_type ? (
                  <Tag>{getBusinessTypeName(prompt.business_type)}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="作者">{prompt.author || '-'}</Descriptions.Item>
              <Descriptions.Item label="版本">{prompt.version}</Descriptions.Item>
              <Descriptions.Item label="分类">
                {prompt.category ? prompt.category.name : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                {prompt.tags && prompt.tags.length > 0 ? (
                  <Space wrap>
                    {prompt.tags.map((tag: string) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {promptUtils.formatDate(prompt.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {promptUtils.formatDate(prompt.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Validation Results */}
          {validation && (
            <Card title="验证结果" style={{ marginBottom: '16px' }}>
              {validation.is_valid ? (
                <Alert
                  message="验证通过"
                  description="提示词内容格式正确"
                  type="success"
                  showIcon
                />
              ) : (
                <>
                  {validation.errors.length > 0 && (
                    <Alert
                      message="发现错误"
                      description={
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {validation.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      }
                      type="error"
                      showIcon
                      style={{ marginBottom: '8px' }}
                    />
                  )}

                  {validation.warnings.length > 0 && (
                    <Alert
                      message="注意事项"
                      description={
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {validation.warnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      }
                      type="warning"
                      showIcon
                    />
                  )}

                  {validation.suggestions.length > 0 && (
                    <Alert
                      message="改进建议"
                      description={
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {validation.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      }
                      type="info"
                      showIcon
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </>
              )}
            </Card>
          )}

          {/* File Path */}
          {prompt.file_path && (
            <Card title="原始文件路径" size="small">
              <Text code style={{ fontSize: '12px' }}>
                {prompt.file_path}
              </Text>
            </Card>
          )}
        </Col>
      </Row>

      {/* Share Modal */}
      <Modal
        title="分享提示词"
        open={showShareModal}
        onCancel={() => setShowShareModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowShareModal(false)}>
            关闭
          </Button>
        ]}
      >
        <p>分享链接：</p>
        <Text code copyable>
          {window.location.origin}/prompts/{prompt.id}
        </Text>
        <Divider />
        <p>提示：复制链接分享给其他用户查看此提示词。</p>
      </Modal>
    </div>
  );
};

export default PromptDetail;