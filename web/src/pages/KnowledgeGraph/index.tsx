import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Select, Space, Spin, Alert, message } from 'antd';
import { ReloadOutlined, ClearOutlined, BarChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Graph from './Graph';
import { knowledgeGraphService } from '../../services/knowledgeGraphService';
import { testCaseService } from '../../services/testCaseService';
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
    queryFn: testCaseService.getBusinessTypes,
  });

  const { data: businessTypesMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['businessTypesMapping'],
    queryFn: testCaseService.getBusinessTypesMapping,
  });

  const businessTypes = businessTypesData?.business_types || [];
  const businessTypesMap = businessTypesMapping?.business_types || {};

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

      setGraphData(dataResponse);
      setStats(statsResponse);
    } catch (err: any) {
      setError(err.response?.data?.detail || '加载知识图谱数据失败');
      console.error('Error loading graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setLoading(true);
    try {
      await knowledgeGraphService.initializeGraph();
      message.success('TSP本体图谱初始化成功');
      await loadData(selectedBusinessType);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '初始化知识图谱失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await knowledgeGraphService.clearGraph();
      message.success('TSP本体图谱清空成功');
      setGraphData(null);
      setStats(null);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '清空知识图谱失败');
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
              title="实体总数"
              value={stats?.total_entities || 0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="场景实体"
              value={stats?.scenario_entities || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="业务实体"
              value={stats?.business_entities || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="接口实体"
              value={stats?.interface_entities || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="用例实体"
              value={stats?.test_case_entities || 0}
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

          <Button
            type="primary"
            onClick={handleInitialize}
            loading={loading}
          >
            初始化图谱
          </Button>

          <Button
            danger
            icon={<ClearOutlined />}
            onClick={handleClear}
            loading={loading}
          >
            清空图谱
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
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
            <Spin size="large" />
          </div>
        ) : graphData ? (
          <Graph data={graphData} />
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
              <Button type="primary" onClick={handleInitialize}>
                初始化TSP本体图谱
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;