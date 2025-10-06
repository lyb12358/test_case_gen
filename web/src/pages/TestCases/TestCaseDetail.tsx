import React from 'react';
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Descriptions,
  Table,
  Divider,
  Alert,
  Spin,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { testCaseService } from '../../services/testCaseService';

const { Title, Text } = Typography;

const TestCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: testCase, isLoading, error } = useQuery({
    queryKey: ['testCase', id],
    queryFn: () => testCaseService.getTestCaseById(Number(id)),
    enabled: !!id,
  });

  const handleBack = () => {
    navigate('/test-cases');
  };

  const handleExport = () => {
    if (!testCase) return;

    const exportData = {
      business_type: testCase.business_type,
      generated_at: testCase.created_at,
      test_cases: testCase.test_cases
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_cases_${testCase.business_type}_${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getBusinessTypeFullName = (type: string) => {
    const names: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置',
      'ZBA': '水淹报警'
    };
    return names[type] || type;
  };

  const getBusinessTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'RCC': 'blue',
      'RFD': 'green',
      'ZAB': 'orange',
      'ZBA': 'red'
    };
    return colors[type] || 'default';
  };

  const testCasesColumns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => name || '-',
    },
    {
      title: '所属模块',
      dataIndex: 'module',
      key: 'module',
      width: 150,
      render: (module: string) => module || '-',
    },
    {
      title: '前置条件',
      dataIndex: 'preconditions',
      key: 'preconditions',
      width: 200,
      render: (conditions: string | string[]) => {
        if (!conditions) return '-';
        if (Array.isArray(conditions)) {
          return (
            <div>
              {conditions.map((condition, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  • {condition}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            {conditions}
          </div>
        );
      },
    },
    {
      title: '测试步骤',
      dataIndex: 'steps',
      key: 'steps',
      width: 300,
      render: (steps: string[]) => (
        <div>
          {steps?.map((step, index) => (
            <div key={index} style={{ marginBottom: 4 }}>
              {index + 1}. {step}
            </div>
          )) || '-'}
        </div>
      ),
    },
    {
      title: '预期结果',
      dataIndex: 'expected_result',
      key: 'expected_result',
      width: 250,
      render: (results: string | string[]) => {
        if (!results) return '-';
        if (Array.isArray(results)) {
          return (
            <div>
              {results.map((result, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  • {result}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            {results}
          </div>
        );
      },
    },
    {
      title: '功能模块',
      dataIndex: 'functional_module',
      key: 'functional_module',
      width: 120,
      render: (module: string) => module || '-',
    },
    {
      title: '功能域',
      dataIndex: 'functional_domain',
      key: 'functional_domain',
      width: 120,
      render: (domain: string) => domain || '-',
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 200,
      render: (remarks: string) => remarks || '-',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载测试用例详情中...</div>
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div>
        <Title level={2}>测试用例详情</Title>
        <Card>
          <Empty
            description="未找到该测试用例"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button type="primary" onClick={handleBack} style={{ marginTop: 16 }}>
            返回列表
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            测试用例详情
          </Title>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出JSON
          </Button>
        </Space>
      </div>

      <Card>
        <Descriptions
          title="基本信息"
          bordered
          column={2}
          size="small"
        >
          <Descriptions.Item label="测试用例ID">
            <Text code>#{testCase.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="业务类型">
            <Tag color={getBusinessTypeColor(testCase.business_type)}>
              {getBusinessTypeFullName(testCase.business_type)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="生成时间">
            {dayjs(testCase.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="测试用例数量">
            {testCase.test_cases?.length || 0}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          <Text strong>测试用例详情</Text>
          <Tag style={{ marginLeft: 8 }} color="blue">
            共 {testCase.test_cases?.length || 0} 个测试用例
          </Tag>
        </div>

        {testCase.test_cases && testCase.test_cases.length > 0 ? (
          <Table
            columns={testCasesColumns}
            dataSource={testCase.test_cases}
            rowKey={(_, index) => `${testCase.id}-${index}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个测试用例`,
            }}
            scroll={{ x: 1400 }}
            size="small"
          />
        ) : (
          <Empty
            description="暂无测试用例数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}

        <Alert
          message="使用说明"
          description={
            <div>
              <p>• 可以通过上方"导出JSON"按钮下载完整的测试用例数据</p>
              <p>• 测试用例按照功能模块分组，每个用例包含前置条件、测试步骤和预期结果</p>
              <p>• 用例名称、模块和功能域信息有助于快速定位和理解测试内容</p>
              <p>• 备注字段包含接口路径等重要参考信息</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
};

export default TestCaseDetail;