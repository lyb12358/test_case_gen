import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Spin,
  Tabs,
  Alert,
  Tag,
  message
} from 'antd';
import {
  EyeOutlined,
  CopyOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { businessService, PromptCombination, PromptCombinationPreviewResponse } from '../../services/businessService';
import { configService } from '../../services/configService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface CombinationPreviewProps {
  combinationId?: number;
  businessType: string;
  businessTypeName: string;
  stage: 'test_point' | 'test_case';
  items: Array<{
    id: number;
    prompt_id: number;
    order: number;
    prompt_name: string;
    prompt_type: string;
    prompt_content: string;
    variable_name?: string;
    is_required: boolean;
  }>;
  visible: boolean;
  onClose: () => void;
}

const CombinationPreview: React.FC<CombinationPreviewProps> = ({
  combinationId,
  businessType,
  businessTypeName,
  stage,
  items,
  visible,
  onClose
}) => {
  const [previewData, setPreviewData] = useState<PromptCombinationPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [copiedText, setCopiedText] = useState<string>('');
  const [businessDescription, setBusinessDescription] = useState<string>('');

  // 获取业务描述
  useEffect(() => {
    const fetchBusinessDescription = async () => {
      if (businessType) {
        try {
          const description = configService.getBusinessTypeDescription(businessType);
          setBusinessDescription(description);
        } catch (error) {
          console.warn('Failed to fetch business description:', error);
          setBusinessDescription('');
        }
      }
    };

    fetchBusinessDescription();
  }, [businessType]);

  // 模板变量定义
  const templateVariables = {
    business_type: businessType,
    business_name: businessTypeName,
    business_description: businessDescription,
    stage: stage === 'test_point' ? '测试点生成' : '测试用例生成',
    timestamp: new Date().toLocaleString('zh-CN')
  };

  // 获取预览数据
  const fetchPreview = async () => {
    // 如果既没有 combinationId 也没有 items，则无法获取预览
    if (!combinationId && !items) {
      console.log('No combinationId and no items - cannot fetch preview');
      return;
    }

    setLoading(true);
    try {
      let itemsForPreview = items;

      // 如果没有 items 但有 combinationId，则需要先获取已保存的组合数据
      if (!items && combinationId) {
        console.log('Fetching combination data for ID:', combinationId);
        try {
          const combination = await businessService.getPromptCombination(combinationId);
          console.log('Fetched combination:', combination);

          if (combination && combination.items) {
            itemsForPreview = combination.items.map(item => ({
              id: item.id,
              prompt_id: item.prompt_id,
              order: item.order,
              prompt_name: item.prompt_name || '',
              prompt_type: item.prompt_type || '',
              prompt_content: item.prompt_content || '',
              variable_name: item.variable_name,
              is_required: item.is_required
            }));
            console.log('Transformed itemsForPreview:', itemsForPreview);
          }
        } catch (error) {
          console.error('Failed to fetch combination:', error);
          message.error('获取组合详情失败');
          setLoading(false);
          return;
        }
      }

      // 如果此时还是没有 items，则无法继续
      if (!itemsForPreview || itemsForPreview.length === 0) {
        console.log('No items available for preview');
        setPreviewData({
          combined_prompt: '',
          is_valid: false,
          validation_errors: ['没有可用的提示词'],
          used_prompts: [],
          variables: [],
          message: '没有可用的提示词'
        });
        setLoading(false);
        return;
      }

      console.log('Calling preview API with items:', itemsForPreview);
      console.log('Template variables:', templateVariables);

      const response = await businessService.previewPromptCombination({
        items: itemsForPreview.map(item => ({
          prompt_id: item.prompt_id,
          order: item.order,
          variable_name: item.variable_name,
          is_required: item.is_required
        })),
        variables: templateVariables
      });

      console.log('Preview API response:', response);
      setPreviewData(response);
    } catch (error: any) {
      console.error('Failed to fetch preview:', error);
      message.error('获取预览失败');
      setPreviewData({
        combined_prompt: '',
        is_valid: false,
        validation_errors: [error.message || '预览生成失败'],
        used_prompts: [],
        variables: [],
        message: '预览生成失败'
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取预览数据
  useEffect(() => {
    if (visible) {
      // 有 combinationId（保存的组合）或者有 items（预览模式）都可以获取预览
      if (combinationId || (items && items.length > 0)) {
        console.log('useEffect triggering fetchPreview:', { combinationId, itemsLength: items?.length });
        fetchPreview();
      }
    }
  }, [visible, combinationId, items]);

  // 复制到剪贴板
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(id);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopiedText(''), 2000);
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 应用模板变量
  const applyTemplateVariables = (content: string): string => {
    if (!content) return '';

    let result = content;
    Object.entries(templateVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  };

  // 统计信息
  const stats = {
    total: items?.length || 0,
    system: items?.filter(item => item.prompt_type === 'system').length || 0,
    user: items?.filter(item => item.prompt_type !== 'system').length || 0
  };

  if (!visible) return null;

  return (
    <div style={{ padding: '24px' }}>
      <Spin spinning={loading}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <EyeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              提示词组合预览
            </Title>
            <Space style={{ marginTop: '8px' }}>
              <Tag color="blue">{businessTypeName}</Tag>
              <Tag color="green">
                {stage === 'test_point' ? '测试点生成' : '测试用例生成'}
              </Tag>
              <Tag color="orange">
                {stats.total} 个提示词 (系统: {stats.system}, 业务: {stats.user})
              </Tag>
              {previewData?.message && (
                <Tag color={previewData.is_valid ? 'cyan' : 'orange'}>
                  {previewData.message}
                </Tag>
              )}
            </Space>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPreview}
              loading={loading}
            >
              刷新预览
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                const content = showVariables && previewData?.combined_prompt
                  ? applyTemplateVariables(previewData.combined_prompt)
                  : previewData?.combined_prompt || '';
                copyToClipboard(content, 'combined');
              }}
            >
              {copiedText === 'combined' ? '已复制' : '复制内容'}
            </Button>
          </Space>
        </div>

        <Tabs defaultActiveKey="preview">
          <TabPane
            tab={
              <span>
                <EyeOutlined />
                组合预览
              </span>
            }
            key="preview"
          >
            <Card>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Button
                    size="small"
                    type={showVariables ? 'primary' : 'default'}
                    onClick={() => setShowVariables(!showVariables)}
                    icon={showVariables ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                  >
                    {showVariables ? '显示原始内容' : '应用模板变量'}
                  </Button>
                  <Text type="secondary">
                    {showVariables ? '显示应用变量后的内容' : '显示原始提示词内容'}
                  </Text>
                </Space>
              </div>

              <div style={{
                maxHeight: '400px',
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}>
                <SyntaxHighlighter
                  language="text"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {showVariables && previewData?.combined_prompt
                    ? applyTemplateVariables(previewData.combined_prompt)
                    : previewData?.combined_prompt || '暂无内容'}
                </SyntaxHighlighter>
              </div>
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <CheckCircleOutlined />
                验证状态
              </span>
            }
            key="validation"
          >
            <Card>
              {previewData ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5}>
                      {previewData.is_valid ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                      )}
                      组合验证状态
                    </Title>
                    <Text>
                      {previewData.is_valid ? '提示词组合验证通过' : '提示词组合存在问题'}
                    </Text>
                  </div>

                  {previewData.validation_errors.length > 0 && (
                    <Alert
                      message="组合验证问题"
                      description={
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {previewData.validation_errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      }
                      type="warning"
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />
                  )}

                  {previewData.is_valid && (
                    <Alert
                      message="提示词组合验证通过"
                      description="当前提示词组合符合要求，可以正常使用。"
                      type="success"
                      showIcon
                    />
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px' }}>加载验证状态...</div>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined />
                使用的提示词
              </span>
            }
            key="prompts"
          >
            <Card>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>组合中的提示词</Title>
                <Text type="secondary">
                  按顺序显示当前组合中使用的所有提示词
                </Text>
              </div>

              {previewData?.used_prompts?.map((prompt, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{
                    marginBottom: '12px',
                    borderLeft: `4px solid ${
                      prompt.type === 'system' ? '#1890ff' :
                      prompt.type === 'business_description' ? '#52c41a' : '#faad14'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Space style={{ marginBottom: '8px' }}>
                        <Text strong>{prompt.name}</Text>
                        <Tag color={
                          prompt.type === 'system' ? 'blue' :
                          prompt.type === 'business_description' ? 'green' : 'orange'
                        }>
                          {prompt.type === 'system' ? '系统' :
                           prompt.type === 'business_description' ? '业务' : '共享'}
                        </Tag>
                        <Tag color="default">#{prompt.order}</Tag>
                        {prompt.is_required && <Tag color="red">必需</Tag>}
                      </Space>
                      {prompt.variable_name && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          变量名: {prompt.variable_name}
                        </Text>
                      )}
                    </div>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        const content = showVariables && previewData?.combined_prompt
                          ? applyTemplateVariables(previewData.combined_prompt)
                          : previewData?.combined_prompt || '';
                        copyToClipboard(content, 'combined');
                      }}
                    >
                      {copiedText === 'combined' ? '已复制' : '复制内容'}
                    </Button>
                  </div>
                </Card>
              ))}

              {(!previewData?.used_prompts || previewData.used_prompts.length === 0) && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  暂无使用的提示词
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined />
                模板变量
              </span>
            }
            key="variables"
          >
            <Card>
              <Title level={5}>可用模板变量</Title>
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary">
                  以下变量可以在提示词中使用，系统会在生成时自动替换为实际值：
                </Text>
              </div>

              {Object.entries(templateVariables).map(([key, value]) => (
                <div key={key} style={{
                  marginBottom: '12px',
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <Space>
                      <Text strong>{key}</Text>
                      <Tag color="blue">{`{{${key}}}`}</Tag>
                    </Space>
                    <Button
                      size="small"
                      onClick={() => copyToClipboard(`{{${key}}}`, `var-${key}`)}
                    >
                      {copiedText === `var-${key}` ? '已复制' : '复制变量'}
                    </Button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    当前值: {String(value) || '(空)'}
                  </div>
                </div>
              ))}

              {/* 显示后端返回的模板变量 */}
              {previewData?.variables && previewData.variables.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <Title level={5}>检测到的模板变量</Title>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">
                      从当前组合中检测到的模板变量：
                    </Text>
                  </div>
                  {previewData.variables.map((variable, index) => (
                    <div key={index} style={{
                      display: 'inline-block',
                      margin: '4px 8px 4px 0'
                    }}>
                      <Tag color="blue" style={{ cursor: 'pointer' }}>
                        {`{{${variable}}}`}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}

              <Alert
                message="变量使用说明"
                description="在提示词内容中使用 {{变量名}} 格式即可插入变量，例如：为 {{business_type}} 业务生成测试用例。"
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default CombinationPreview;