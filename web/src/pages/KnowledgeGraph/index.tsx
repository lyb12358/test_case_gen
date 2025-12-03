import React, { useState, useEffect, startTransition } from 'react';
import { Card, Row, Col, Statistic, Button, Select, Space, Spin, Alert, message } from 'antd';
import { ReloadOutlined, ClearOutlined, BarChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import OptimizedKnowledgeGraph from '../../components/KnowledgeGraph/OptimizedKnowledgeGraph';
import { knowledgeGraphService } from '../../services/knowledgeGraphService';
import { businessService } from '../../services/businessService';
import unifiedGenerationService from '../../services/unifiedGenerationService';
import { KnowledgeGraphData, GraphStats } from '../../types/knowledgeGraph';
import { useProject } from '../../contexts/ProjectContext';

const { Option } = Select;

const KnowledgeGraph: React.FC = () => {
  const { currentProject, projects } = useProject();
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>('');

  // Get business types and mapping from API
  const { data: businessTypesData, isLoading: typesLoading } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: businessService.getBusinessTypes,
  });

  const { data: businessTypesMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['businessTypesMapping'],
    queryFn: unifiedGenerationService.getBusinessTypesMapping,
  });

  const businessTypesMap = businessTypesMapping || {};
  const businessTypes = Object.keys(businessTypesMap);

  const loadData = async (businessType?: string, projectId?: number) => {
    setLoading(true);
    setError('');

    // 添加调试日志
    console.log('Loading graph data with businessType:', businessType, 'projectId:', projectId);

    try {
      const [dataResponse, statsResponse] = await Promise.all([
        knowledgeGraphService.getGraphData(businessType, projectId),
        knowledgeGraphService.getGraphStats()
      ]);

      console.log('Graph data response:', dataResponse);
      console.log('Data nodes count:', dataResponse?.nodes?.length);
      console.log('Data edges count:', dataResponse?.edges?.length);

      // Use startTransition for non-urgent state updates
      startTransition(() => {
        setGraphData(dataResponse);
        setStats(statsResponse);
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || '加载知识图谱数据失败');
      console.error('Error loading graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    loadData(selectedBusinessType, selectedProject);
  }, [selectedBusinessType, selectedProject]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <p>为用例生成提供结构化元数据，为变更管理提供可解释的依据</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="项目总数"
              value={stats?.project_count || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="业务类型"
              value={stats?.business_type_count || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="测试点"
              value={stats?.test_point_count || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="测试用例"
              value={stats?.test_case_count || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="完成率"
              value={stats?.completion_rate || 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <Select
            placeholder="按业务类型筛选"
            allowClear
            style={{ width: 250 }}
            value={selectedBusinessType || undefined}
            onChange={setSelectedBusinessType}
            loading={typesLoading || mappingLoading}
          >
            {businessTypes.map(type => (
              <Option key={type} value={type}>
                [{type}] {businessTypesMap[type]?.name || type}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="按项目筛选"
            allowClear
            style={{ width: 200 }}
            value={selectedProject || undefined}
            onChange={setSelectedProject}
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
                {currentProject?.id === project.id && (
                  <span style={{ color: '#52c41a', marginLeft: 8 }}>(当前)</span>
                )}
              </Option>
            ))}
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadData(selectedBusinessType, selectedProject)}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          style={{ marginBottom: '24px' }}
          closable
          onClose={() => setError('')}
        />
      )}

      <div style={{ minHeight: '600px' }}>
        {graphData ? (
          <OptimizedKnowledgeGraph
            data={graphData}
            onError={(error) => {
              console.error('Knowledge graph error:', error);
              setError(error.message);
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '500px',
            color: '#999'
          }}>
            <div style={{ textAlign: 'center' }}>
              <p>暂无图谱数据</p>
              <Button type="primary" onClick={() => loadData()} loading={loading}>
                重新加载图谱数据
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;