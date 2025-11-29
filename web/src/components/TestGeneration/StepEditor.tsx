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
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

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
  const [steps, setSteps] = useState<StepItem[]>(() => {
    if (value && value.length > 0) {
      return value;
    }
    return [{ id: 1, step_number: 1, action: '', expected: '' }];
  });

  const triggerChange = useCallback((newSteps: StepItem[]) => {
    setSteps(newSteps);
    onChange?.(newSteps);
  }, [onChange]);

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 重新编号
    const newSteps = items.map((step, index) => ({
      ...step,
      step_number: index + 1
    }));

    triggerChange(newSteps);
  }, [steps, triggerChange]);

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
      setSteps(value.length > 0 ? value : [{ id: 1, step_number: 1, action: '', expected: '' }]);
    }
  }, [value]); // 移除 steps 依赖，避免循环更新

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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps" isDropDisabled={disabled} isCombineEnabled={false} ignoreContainerClipping={false}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ minHeight: '100px' }}
              >
                {steps.map((step, index) => (
                  <Draggable key={step.id} draggableId={step.id.toString()} index={index} isDragDisabled={disabled} disableInteractiveElementBlocking={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.5 : 1,
                          marginBottom: '12px'
                        }}
                      >
                        <Row gutter={16} style={{ alignItems: 'center' }}>
                          <Col span={1} style={{ textAlign: 'center' }}>
                            <div
                              {...provided.dragHandleProps}
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
                        </Row>

                        {index < steps.length - 1 && (
                          <Divider style={{ margin: '12px 0', borderColor: '#e8e8e8' }} />
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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