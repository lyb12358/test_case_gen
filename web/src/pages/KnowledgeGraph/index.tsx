import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Select, Space, Spin, Alert, message } from 'antd';
import { ReloadOutlined, ClearOutlined, BarChartOutlined } from '@ant-design/icons';
import Graph from './Graph';
import { knowledgeGraphService } from '../../services/knowledgeGraphService';
import { KnowledgeGraphData, GraphStats } from '../../types/knowledgeGraph';

const { Option } = Select;

const KnowledgeGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadData = async (businessType?: string) => {
    setLoading(true);
    setError('');

    try {
      const [dataResponse, statsResponse] = await Promise.all([
        knowledgeGraphService.getGraphData(businessType),
        knowledgeGraphService.getGraphStats()
      ]);

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
    loadData();
  }, [selectedBusinessType]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>TSP本体图谱</h1>
        <p>可视化展示业务类型、服务和接口之间的关系</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="实体总数"
              value={stats?.total_entities || 0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="业务实体"
              value={stats?.business_entities || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="服务实体"
              value={stats?.service_entities || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="接口实体"
              value={stats?.interface_entities || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <Select
            placeholder="按业务类型筛选"
            allowClear
            style={{ width: 200 }}
            value={selectedBusinessType || undefined}
            onChange={setSelectedBusinessType}
          >
            <Option value="RCC">RCC - 远程净化</Option>
            <Option value="RFD">RFD - 香氛控制</Option>
            <Option value="ZAB">ZAB - 远程恒温座舱设置</Option>
            <Option value="ZBA">ZBA - 水淹报警</Option>
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadData(selectedBusinessType)}
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

      <Card title="TSP本体图谱可视化" style={{ minHeight: '600px' }}>
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
      </Card>
    </div>
  );
};

export default KnowledgeGraph;