import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Select, DatePicker, Button, Space } from 'antd';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { conversationApi, StatsParams, ProjectDistribution } from '@/services/conversation';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Analytics: React.FC = () => {
  // 筛选状态
  const [filters, setFilters] = useState<StatsParams>({});
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // 获取筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: () => conversationApi.getFilterOptions(),
  });

  // 获取统计概览
  const { data: statsOverview, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['stats-overview', filters],
    queryFn: () => conversationApi.getStatsOverview(filters),
  });

  // 获取领域分布
  const { data: domainDistribution, isLoading: domainLoading } = useQuery({
    queryKey: ['domain-distribution', filters],
    queryFn: () => conversationApi.getDomainDistribution(filters),
  });

  // 获取模型分布
  const { data: modelDistribution } = useQuery({
    queryKey: ['model-distribution', filters],
    queryFn: () => conversationApi.getModelDistribution(filters),
  });

  // 获取意图分布
  const { data: intentDistribution } = useQuery({
    queryKey: ['intent-distribution', filters],
    queryFn: () => conversationApi.getIntentDistribution(filters),
  });

  // 获取每日趋势
  const { data: dailyTrend } = useQuery({
    queryKey: ['daily-trend', filters],
    queryFn: () => conversationApi.getDailyTrend(filters),
  });

  // 获取工具使用统计
  const { data: toolsUsage } = useQuery({
    queryKey: ['tools-usage', filters],
    queryFn: () => conversationApi.getToolsUsage(filters),
  });

  // 获取项目分布
  const { data: projectDistribution, isLoading: projectLoading } = useQuery({
    queryKey: ['project-distribution', filters],
    queryFn: () => conversationApi.getProjectDistribution({
      start_date: filters.start_date,
      end_date: filters.end_date,
    }),
  });

  const handleApplyFilter = () => {
    setFilters(prev => ({
      ...prev,
      start_date: dateRange[0]?.toISOString(),
      end_date: dateRange[1]?.toISOString(),
    }));
  };

  const handleReset = () => {
    setDateRange([null, null]);
    setFilters({});
  };

  // 领域饼图配置
  const domainChartOption = {
    title: {
      text: '技术领域分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        data: domainDistribution?.map(item => ({
          value: item.count,
          name: item._id || '未分类',
        })) || [],
      },
    ],
  };

  // 模型柱状图配置 - 使用新 API
  const modelChartOption = {
    title: {
      text: '模型使用分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>使用次数: ${data.value}<br/>成本: $${modelDistribution?.find((m: any) => m._id === data.name)?.total_cost?.toFixed(4) || '0'}`;
      },
    },
    xAxis: {
      type: 'category',
      data: modelDistribution?.map((m: any) => m._id || '未知') || [],
      axisLabel: {
        rotate: 30,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        type: 'bar',
        data: modelDistribution?.map((m: any) => m.count) || [],
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  };

  // 意图类型饼图配置 - 使用新 API
  const intentChartOption = {
    title: {
      text: '问题意图分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: intentDistribution?.map((item: any) => ({
          value: item.count,
          name: item._id || '未知',
        })) || [],
      },
    ],
  };

  // 每日趋势折线图配置
  const dailyTrendOption = {
    title: {
      text: '每日对话趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dailyTrend?.map((d: any) => d._id) || [],
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '对话数',
        position: 'left',
      },
      {
        type: 'value',
        name: '成本($)',
        position: 'right',
      },
    ],
    legend: {
      bottom: 0,
    },
    series: [
      {
        name: '对话数',
        type: 'line',
        data: dailyTrend?.map((d: any) => d.count) || [],
        smooth: true,
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '成本',
        type: 'bar',
        yAxisIndex: 1,
        data: dailyTrend?.map((d: any) => d.total_cost?.toFixed(4)) || [],
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  // 工具使用排行图
  const toolsChartOption = {
    title: {
      text: '工具使用 Top 10',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '20%',
    },
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      data: toolsUsage?.slice(0, 10).reverse().map((t: any) => t._id) || [],
      axisLabel: {
        width: 100,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: toolsUsage?.slice(0, 10).reverse().map((t: any) => t.total_count) || [],
        itemStyle: { color: '#722ed1' },
      },
    ],
  };

  // 项目分布饼图配置
  const projectChartOption = {
    title: {
      text: '项目分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        data: projectDistribution?.map((item: ProjectDistribution) => ({
          value: item.count,
          name: item._id || '未知项目',
        })) || [],
      },
    ],
  };

  // 领域分布表格列
  const domainColumns = [
    {
      title: '领域',
      dataIndex: '_id',
      key: 'domain',
      render: (text: string) => <Tag color="blue">{text || '未分类'}</Tag>,
    },
    {
      title: '对话数',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
    },
    {
      title: '总成本',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (text: number) => text ? `$${text.toFixed(4)}` : '-',
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>数据分析</h1>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="领域"
              style={{ width: '100%' }}
              allowClear
              value={filters.domain}
              onChange={(val) => setFilters(prev => ({ ...prev, domain: val }))}
            >
              {filterOptions?.domains.map((d: string) => (
                <Select.Option key={d} value={d}>{d}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="模型"
              style={{ width: '100%' }}
              allowClear
              value={filters.model}
              onChange={(val) => setFilters(prev => ({ ...prev, model: val }))}
            >
              {filterOptions?.models.map((m: string) => (
                <Select.Option key={m} value={m}>{m}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="项目"
              style={{ width: '100%' }}
              allowClear
              value={filters.project_name}
              onChange={(val) => setFilters(prev => ({ ...prev, project_name: val }))}
            >
              {filterOptions?.project_names?.map((p: string) => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<FilterOutlined />} onClick={handleApplyFilter}>
                应用筛选
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button onClick={() => refetchStats()}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 概览统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="总对话数"
              value={statsOverview?.total_count || 0}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="累计成本"
              value={statsOverview?.total_cost || 0}
              precision={4}
              prefix="$"
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="总 Token 数"
              value={statsOverview?.total_tokens || 0}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={statsOverview?.avg_response_time_ms ? (statsOverview.avg_response_time_ms / 1000).toFixed(1) : 0}
              suffix="s"
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 - 第一行：每日趋势 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <ReactECharts option={dailyTrendOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 - 第二行 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card loading={domainLoading}>
            <ReactECharts option={domainChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card loading={projectLoading}>
            <ReactECharts option={projectChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 - 第三行 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card>
            <ReactECharts option={modelChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <ReactECharts option={intentChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 - 第四行 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={24}>
          <Card>
            <ReactECharts option={toolsChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 详情表格 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="领域详情">
            <Table
              columns={domainColumns}
              dataSource={domainDistribution}
              rowKey="_id"
              size="small"
              pagination={false}
              loading={domainLoading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
