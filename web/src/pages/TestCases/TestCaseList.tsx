import React, { useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Tag,
  message,
  Tooltip,
  Popconfirm,
  Input,
  Select,
  DatePicker
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testCaseService } from '../../services/testCaseService';
import { TestCaseGroup } from '../../types/testCases';

const { Title } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const TestCaseList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 获取测试用例列表
  const { data: testCasesData, isLoading, refetch } = useQuery({
    queryKey: ['testCases'],
    queryFn: testCaseService.getAllTestCases,
    select: (data) => {
      let testCaseGroups = data.test_case_groups || [];

      // 按搜索文本过滤
      if (searchText) {
        testCaseGroups = testCaseGroups.filter(group =>
          Object.values(group).some(value =>
            String(value).toLowerCase().includes(searchText.toLowerCase())
          ) ||
          group.test_case_items?.some((item: any) =>
            Object.values(item).some(value =>
              String(value).toLowerCase().includes(searchText.toLowerCase())
            )
          )
        );
      }

      // 按业务类型过滤
      if (selectedBusinessType) {
        testCaseGroups = testCaseGroups.filter(group => group.business_type === selectedBusinessType);
      }

      // 按日期范围过滤
      if (dateRange && dateRange.length === 2) {
        const [start, end] = dateRange;
        testCaseGroups = testCaseGroups.filter(group => {
          const createdAt = dayjs(group.created_at);
          return createdAt.isAfter(start) && createdAt.isBefore(end);
        });
      }

      return testCaseGroups;
    }
  });

  // 获取业务类型列表
  const { data: businessTypesData } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: testCaseService.getBusinessTypes,
  });

  // 提取业务类型数组
  const businessTypes = businessTypesData?.business_types || [];

  // 删除测试用例
  const deleteMutation = useMutation({
    mutationFn: testCaseService.deleteTestCasesByBusinessType,
    onSuccess: () => {
      message.success('测试用例删除成功');
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.message}`);
    },
  });

  const handleDelete = (businessType: string) => {
    deleteMutation.mutate(businessType);
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

  const getBusinessTypeFullName = (type: string) => {
    const names: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置',
      'ZBA': '水淹报警'
    };
    return names[type] || type;
  };

  const columns: any[] = [
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (type: string) => (
        <Tag color={getBusinessTypeColor(type)}>
          {getBusinessTypeFullName(type)}
        </Tag>
      ),
      filters: businessTypes.map(type => ({
        text: getBusinessTypeFullName(type),
        value: type,
      })),
      onFilter: (value: string | number | boolean, record: TestCaseGroup) => record.business_type === value,
    },
    {
      title: '用例名称',
      dataIndex: 'test_case_items',
      key: 'case_name',
      width: 200,
      render: (cases: any[]) => {
        if (!cases || cases.length === 0) return '-';
        const names = cases.filter(c => c.name).slice(0, 2);
        return (
          <div>
            {names.map((caseItem, index) => (
              <div key={index} style={{ fontSize: '12px', marginBottom: 2 }}>
                {caseItem.name}
              </div>
            ))}
            {cases.length > 2 && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                +{cases.length - 2} 更多...
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '所属模块',
      dataIndex: 'test_case_items',
      key: 'module',
      width: 150,
      render: (cases: any[]) => {
        if (!cases || cases.length === 0) return '-';
        const modules = [...new Set(cases.map(c => c.module).filter(Boolean))];
        return (
          <div>
            {modules.slice(0, 2).map((module, index) => (
              <div key={index} style={{ fontSize: '12px', marginBottom: 2 }}>
                {module}
              </div>
            ))}
            {modules.length > 2 && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                +{modules.length - 2} 更多...
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '功能模块',
      dataIndex: 'test_case_items',
      key: 'functional_module',
      width: 120,
      render: (cases: any[]) => {
        if (!cases || cases.length === 0) return '-';
        const modules = [...new Set(cases.map(c => c.functional_module).filter(Boolean))];
        return (
          <div>
            {modules.slice(0, 2).map((module, index) => (
              <div key={index} style={{ fontSize: '12px', marginBottom: 2 }}>
                {module}
              </div>
            ))}
            {modules.length > 2 && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                +{modules.length - 2} 更多...
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
      sorter: (a: TestCaseGroup, b: TestCaseGroup) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '用例数量',
      dataIndex: 'test_case_items',
      key: 'test_cases_count',
      width: 80,
      render: (cases: any[]) => cases?.length || 0,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: TestCaseGroup) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/test-cases/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="删除测试用例">
            <Popconfirm
              title="确定删除吗？"
              description={`删除所有 "${getBusinessTypeFullName(record.business_type)}" 测试用例`}
              onConfirm={() => handleDelete(record.business_type)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 直接使用测试用例组数据，无需分组
  const groupedData = testCasesData || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>测试用例列表</Title>
        <Space>
          <Button
            type="primary"
            onClick={() => navigate('/test-cases/generate')}
          >
            生成测试用例
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="搜索测试用例..."
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchText}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
            <Select
              placeholder="选择业务类型"
              allowClear
              style={{ width: 150 }}
              value={selectedBusinessType}
              onChange={setSelectedBusinessType}
            >
              {businessTypes.map(type => (
                <Select.Option key={type} value={type}>
                  {getBusinessTypeFullName(type)}
                </Select.Option>
              ))}
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={groupedData}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total: groupedData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default TestCaseList;