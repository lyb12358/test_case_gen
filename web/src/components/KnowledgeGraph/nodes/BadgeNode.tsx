import React, { useState, useRef, useEffect } from 'react';
import { Badge, Avatar, Tooltip } from 'antd';
import {
  ApartmentOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined
} from '@ant-design/icons';

interface BadgeNodeProps {
  data: {
    label: string;
    type: 'scenario' | 'business' | 'interface' | 'test_case';
    description?: string;
    extra_data?: any;
    selected?: boolean;
  };
  onClick?: (e: React.MouseEvent) => void;
}

const BadgeNode: React.FC<BadgeNodeProps> = ({ data, onClick }) => {
  const { label, type, description, selected } = data;
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTime = useRef(0);
  const hasMoved = useRef(false);

  // 获取节点类型配置
  const getTypeConfig = (nodeType: string) => {
    switch (nodeType) {
      case 'scenario':
        return {
          icon: <ApartmentOutlined />,
          color: '#722ed1',
          bgColor: '#f9f0ff',
          borderColor: '#b37feb'
        };
      case 'business':
        return {
          icon: <DatabaseOutlined />,
          color: '#1890ff',
          bgColor: '#f0f5ff',
          borderColor: '#40a9ff'
        };
      case 'interface':
        return {
          icon: <ApiOutlined />,
          color: '#fa8c16',
          bgColor: '#fff7e6',
          borderColor: '#ffa940'
        };
      case 'test_case':
        return {
          icon: <FileTextOutlined />,
          color: '#13c2c2',
          bgColor: '#e6fffb',
          borderColor: '#36cfc9'
        };
      default:
        return {
          icon: <FileTextOutlined />,
          color: '#999',
          bgColor: '#f5f5f5',
          borderColor: '#d9d9d9'
        };
    }
  };

  const typeConfig = getTypeConfig(type);

  // 全局鼠标抬起事件处理器
  const handleGlobalMouseUp = () => {
    dragStartTime.current = 0;
    hasMoved.current = false;
    setIsDragging(false);
  };

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartTime.current = Date.now();
    hasMoved.current = false;
    setIsDragging(false);
  };

  // 处理鼠标移动事件
  const handleMouseMove = () => {
    if (dragStartTime.current > 0) {
      hasMoved.current = true;
      setIsDragging(true);
    }
  };

  // 处理鼠标抬起事件
  const handleMouseUp = () => {
    dragStartTime.current = 0;
    hasMoved.current = false;
    setIsDragging(false);
  };

  // 处理鼠标点击事件
  const handleClick = (e: React.MouseEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - dragStartTime.current;

    // 如果移动过或者时间差大于200ms，认为是拖动操作，不触发点击
    if (hasMoved.current || timeDiff > 200) {
      return;
    }

    // 只有在真正的点击情况下才触发onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Tooltip
      title={isDragging ? null : (description || label)}
      placement="top"
    >
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        style={{
          cursor: isDragging ? 'grabbing' : 'pointer',
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {/* 主圆形节点 */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: typeConfig.bgColor,
            border: `2px solid ${selected ? typeConfig.color : typeConfig.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: selected
              ? `0 4px 12px ${typeConfig.color}30`
              : '0 2px 6px rgba(0,0,0,0.1)',
            transform: selected ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <Avatar
            size="small"
            icon={typeConfig.icon}
            style={{
              backgroundColor: typeConfig.color,
              border: 'none'
            }}
          />
        </div>

        {/* 标签 */}
        <div
          style={{
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
            maxWidth: '60px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.2'
          }}
        >
          {label}
        </div>

        {/* 状态指示器（如果有的话） */}
        {data.extra_data?.status && (
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor:
                data.extra_data.status === 'success' ? '#52c41a' :
                data.extra_data.status === 'error' ? '#ff4d4f' :
                data.extra_data.status === 'warning' ? '#faad14' :
                data.extra_data.status === 'running' ? '#1890ff' : '#d9d9d9',
              border: '2px solid #fff'
            }}
          />
        )}
      </div>
    </Tooltip>
  );
};

export default BadgeNode;