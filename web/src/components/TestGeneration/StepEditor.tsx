import React, { useState, useCallback, memo } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Popconfirm,
  Typography,
  Divider
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { DragDropProvider, SortableItem } from '../drag-drop';
import { useDragDrop } from '../../hooks/useDragDrop';

const { TextArea } = Input;
const { Text } = Typography;

interface StepItem {
  id: number;
  step_number: number;
  action: string;
  expected: string;
}

interface StepEditorProps {
  value?: StepItem[];
  onChange?: (steps: StepItem[]) => void;
  placeholder?: {
    action?: string;
    expected?: string;
  };
  disabled?: boolean;
  maxSteps?: number;
}

const StepEditor: React.FC<StepEditorProps> = ({
  value = [],
  onChange,
  placeholder = {
    action: '请输入执行动作',
    expected: '请输入预期结果'
  },
  disabled = false,
  maxSteps = 20
}) => {
  const getStepId = useCallback((step: StepItem) => step.id.toString(), []);

  const {
    items: steps,
    setItems,
    handleDragEnd
  } = useDragDrop<StepItem>(
    value && value.length > 0
      ? value
      : [{ id: 1, step_number: 1, action: '', expected: '' }],
    getStepId
  );

  const triggerChange = useCallback((newSteps: StepItem[]) => {
    // 重新编号
    const renumberedSteps = newSteps.map((step, index) => ({
      ...step,
      step_number: index + 1
    }));

    setItems(renumberedSteps);
    onChange?.(renumberedSteps);
  }, [setItems, onChange]);

  const handleDragEndWithRenumber = useCallback((event: any) => {
    handleDragEnd(event);

    // 如果拖拽改变了顺序，重新触发变化
    if (event.items) {
      const reorderedSteps = event.items.map((id: string) =>
        steps.find(step => step.id.toString() === id)
      ).filter(Boolean) as StepItem[];

      const renumberedSteps = reorderedSteps.map((step, index) => ({
        ...step,
        step_number: index + 1
      }));

      setItems(renumberedSteps);
      onChange?.(renumberedSteps);
    }
  }, [handleDragEnd, steps, setItems, onChange]);

  const addStep = useCallback(() => {
    if (steps.length >= maxSteps) {
      return;
    }
    const newStep: StepItem = {
      id: Date.now(),
      step_number: steps.length + 1,
      action: '',
      expected: ''
    };
    const newSteps = [...steps, newStep];
    triggerChange(newSteps);
  }, [steps, maxSteps, triggerChange]);

  const removeStep = useCallback((index: number) => {
    if (steps.length <= 1) {
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index)
      .map((step, i) => ({
        ...step,
        step_number: i + 1
      }));
    triggerChange(newSteps);
  }, [steps, triggerChange]);

  const updateStep = useCallback((index: number, field: 'action' | 'expected', fieldValue: string) => {
    const newSteps = steps.map((step, i) =>
      i === index ? { ...step, [field]: fieldValue } : step
    );
    triggerChange(newSteps);
  }, [steps, triggerChange]);

  // 同步外部value变化 - 避免无限循环
  React.useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(steps)) {
      const newValue = value.length > 0 ? value : [{ id: 1, step_number: 1, action: '', expected: '' }];
      setItems(newValue);
    }
  }, [value, setItems]); // 保留 setItems 依赖

  return (
    <div className="step-editor">
      <Card
        size="small"
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong>执行步骤</Text>
            <Text type="secondary">({steps.length} 个步骤)</Text>
          </Space>
        }
        styles={{
          header: {
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)',
            borderBottom: '1px solid #91d5ff',
            fontSize: '14px',
            fontWeight: '600'
          },
          body: {
            backgroundColor: disabled ? '#f5f5f5' : 'white'
          }
        }}
        style={{
          border: disabled ? '1px dashed #d9d9d9' : '1px solid #d9d9d9'
        }}
        className="step-editor"
      >
        <DragDropProvider
          items={steps.map(step => step.id.toString())}
          onDragEnd={handleDragEndWithRenumber}
        >
          <div style={{ minHeight: '100px' }}>
            {steps.map((step, index) => (
              <SortableItem
                key={step.id}
                id={step.id.toString()}
                style={{ marginBottom: '12px' }}
              >
                <Row gutter={16} style={{ alignItems: 'center' }}>
                  <Col span={1} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        cursor: 'grab',
                        marginRight: '8px',
                        color: '#666'
                      }}
                    >
                      <DragOutlined />
                    </div>
                  </Col>
                  <Col span={1} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      {step.step_number}
                    </div>
                  </Col>

                  <Col span={10}>
                    <div style={{ position: 'relative' }}>
                      <TextArea
                        placeholder={placeholder.action}
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        disabled={disabled}
                        rows={2}
                        style={{ resize: 'none' }}
                        maxLength={500}
                        showCount
                      />
                      {step.action && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#52c41a',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <CheckCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col span={10}>
                    <div style={{ position: 'relative' }}>
                      <TextArea
                        placeholder={placeholder.expected}
                        value={step.expected}
                        onChange={(e) => updateStep(index, 'expected', e.target.value)}
                        disabled={disabled}
                        rows={2}
                        style={{ resize: 'none' }}
                        maxLength={500}
                        showCount
                      />
                      {step.expected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#52c41a',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <CheckCircleOutlined style={{ color: 'white', fontSize: '10px' }} />
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col span={2} style={{ textAlign: 'center' }}>
                    <Popconfirm
                      title="确定删除此步骤？"
                      onConfirm={() => removeStep(index)}
                      disabled={disabled || steps.length <= 1}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        disabled={disabled || steps.length <= 1}
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Col>
                </Row>

                {index < steps.length - 1 && (
                  <Divider style={{ margin: '12px 0', borderColor: '#e8e8e8' }} />
                )}
              </SortableItem>
            ))}
          </div>
        </DragDropProvider>

        {!disabled && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button
              type="dashed"
              onClick={addStep}
              disabled={steps.length >= maxSteps}
              icon={<PlusOutlined />}
              style={{ width: '200px' }}
            >
              添加步骤 ({steps.length}/{maxSteps})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default memo(StepEditor);