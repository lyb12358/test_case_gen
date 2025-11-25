import React, { useState } from 'react';
import { Tooltip, Popover, Button, Space, Typography, Divider } from 'antd';
import {
  InfoCircleOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  VideoCameraOutlined,
  LinkOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

// 基础帮助提示组件
interface HelpTooltipProps {
  title?: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  icon?: React.ReactNode;
  type?: 'info' | 'question' | 'warning' | 'success';
  size?: 'small' | 'default' | 'large';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  placement = 'top',
  trigger = 'hover',
  icon,
  type = 'info',
  size = 'default'
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'question':
        return <QuestionCircleOutlined />;
      case 'warning':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />;
      case 'success':
        return <InfoCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const tooltipContent = (
    <div style={{ maxWidth: 300 }}>
      {title && (
        <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
        {content}
      </div>
    </div>
  );

  return (
    <Tooltip
      title={tooltipContent}
      placement={placement}
      trigger={trigger}
      overlayStyle={{ maxWidth: 350 }}
    >
      <span style={{
        cursor: 'help',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        marginLeft: 4
      }}>
        {icon || getDefaultIcon()}
      </span>
    </Tooltip>
  );
};

// 详细帮助弹窗组件
interface HelpPopoverProps {
  title: string;
  content: React.ReactNode;
  links?: Array<{ title: string; url: string; type?: 'doc' | 'video' }>;
  trigger?: 'click' | 'hover' | 'focus';
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  icon?: React.ReactNode;
  buttonText?: string;
}

export const HelpPopover: React.FC<HelpPopoverProps> = ({
  title,
  content,
  links,
  trigger = 'click',
  placement = 'topRight',
  icon,
  buttonText
}) => {
  const popoverContent = (
    <div style={{ maxWidth: 400 }}>
      <div style={{ marginBottom: 12 }}>
        <Text strong>{title}</Text>
      </div>
      <div style={{ marginBottom: 12, fontSize: '13px', lineHeight: '1.5' }}>
        {content}
      </div>

      {links && links.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ fontSize: '12px' }}>
            <Text type="secondary">相关资源：</Text>
            <div style={{ marginTop: 8 }}>
              <Space direction="vertical" size={4}>
                {links.map((link, index) => (
                  <Button
                    key={index}
                    type="link"
                    size="small"
                    icon={link.type === 'video' ? <VideoCameraOutlined /> : <BookOutlined />}
                    href={link.url}
                    target="_blank"
                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    {link.title}
                  </Button>
                ))}
              </Space>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      title={null}
      trigger={trigger}
      placement={placement}
      overlayStyle={{ maxWidth: 450 }}
    >
      <Button
        type="text"
        size="small"
        icon={icon || <QuestionCircleOutlined />}
        style={{ fontSize: '12px' }}
      >
        {buttonText || '帮助'}
      </Button>
    </Popover>
  );
};

// 表单字段帮助组件
interface FormFieldHelpProps {
  fieldName: string;
  description: string;
  example?: string;
  validation?: string;
  tips?: string[];
}

export const FormFieldHelp: React.FC<FormFieldHelpProps> = ({
  fieldName,
  description,
  example,
  validation,
  tips
}) => {
  const helpContent = (
    <div>
      <Paragraph style={{ marginBottom: 8 }}>
        <Text strong>{fieldName}</Text>
      </Paragraph>

      {description && (
        <Paragraph style={{ marginBottom: example ? 8 : 0 }}>
          <Text type="secondary">{description}</Text>
        </Paragraph>
      )}

      {example && (
        <div style={{ marginBottom: validation ? 8 : 0 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>示例：</Text>
          <div style={{
            background: '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            marginTop: '4px',
            fontFamily: 'monospace'
          }}>
            {example}
          </div>
        </div>
      )}

      {validation && (
        <div style={{ marginBottom: tips ? 8 : 0 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>验证规则：</Text>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {validation}
          </div>
        </div>
      )}

      {tips && tips.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>提示：</Text>
          <ul style={{ fontSize: '12px', margin: '4px 0 0 16px', paddingLeft: '16px' }}>
            {tips.map((tip, index) => (
              <li key={index} style={{ marginBottom: '2px' }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <HelpTooltip
      content={helpContent}
      trigger="click"
      placement="right"
      type="info"
      size="small"
    />
  );
};

// 快捷键帮助组件
interface ShortcutHelpProps {
  shortcuts: Array<{ key: string; description: string; category?: string }>;
  title?: string;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({
  shortcuts,
  title = '快捷键'
}) => {
  const categories = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || '通用';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const helpContent = (
    <div style={{ minWidth: 300 }}>
      <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
        {title}
      </div>
      {Object.entries(categories).map(([category, categoryShortcuts]) => (
        <div key={category} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: 6,
            color: '#666'
          }}>
            {category}
          </div>
          {categoryShortcuts.map((shortcut, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
              fontSize: '12px'
            }}>
              <span>{shortcut.description}</span>
              <kbd style={{
                background: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <HelpTooltip
      content={helpContent}
      trigger="click"
      placement="bottom"
      type="question"
    />
  );
};

// 向导帮助组件
interface GuideHelpProps {
  steps: Array<{
    title: string;
    content: React.ReactNode;
    target?: string; // CSS selector for target element
    placement?: 'top' | 'bottom' | 'left' | 'right';
  }>;
  onComplete?: () => void;
  onStart?: () => void;
  buttonText?: string;
}

export const GuideHelp: React.FC<GuideHelpProps> = ({
  steps,
  onComplete,
  onStart,
  buttonText = '使用向导'
}) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStart = () => {
    setVisible(true);
    setCurrentStep(0);
    onStart?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setVisible(false);
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setVisible(false);
    onComplete?.();
  };

  const step = steps[currentStep];

  return (
    <>
      <Button
        type="default"
        size="small"
        icon={<QuestionCircleOutlined />}
        onClick={handleStart}
      >
        {buttonText}
      </Button>

      {/* 这里可以集成 react-joyride 或类似的向导库 */}
      {/* 简化版本：使用 Popover 实现步骤引导 */}
      {visible && step && (
        <Popover
          open={visible}
          onOpenChange={setVisible}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{step.title}</span>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {currentStep + 1} / {steps.length}
              </span>
            </div>
          }
          content={
            <div style={{ minWidth: 300 }}>
              <div style={{ marginBottom: 16 }}>
                {step.content}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button size="small" onClick={handleSkip}>
                  跳过
                </Button>
                <Space>
                  <Button
                    size="small"
                    disabled={currentStep === 0}
                    onClick={handlePrev}
                  >
                    上一步
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleNext}
                  >
                    {currentStep === steps.length - 1 ? '完成' : '下一步'}
                  </Button>
                </Space>
              </div>
            </div>
          }
          placement={step.placement || 'bottom'}
        >
          <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }} />
        </Popover>
      )}
    </>
  );
};

export default {
  HelpTooltip,
  HelpPopover,
  FormFieldHelp,
  ShortcutHelp,
  GuideHelp
};