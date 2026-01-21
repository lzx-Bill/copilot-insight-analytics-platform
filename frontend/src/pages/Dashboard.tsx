import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { 
  CommentOutlined, 
  DollarOutlined, 
  ThunderboltOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';
import { conversationApi } from '@/services/conversation';

const Dashboard: React.FC = () => {
  // 获取统计概览
  const { data: statsOverview, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: conversationApi.getStatsOverview,
  });

  // 获取领域分布
  const { data: domainDistribution, isLoading: domainLoading } = useQuery({
    queryKey: ['domain-distribution'],
    queryFn: conversationApi.getDomainDistribution,
  });

  // 领域分布饼图配置
  const domainChartOption = {
    title: {
      text: '技术领域分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '对话数',
        type: 'pie',
        radius: '50%',
        data: domainDistribution?.map(item => ({
          value: item.count,
          name: item._id || '未分类',
        })) || [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>
      
      {/* KPI 指标卡 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总对话数"
              value={statsOverview?.total_count || 0}
              prefix={<CommentOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计成本"
              value={statsOverview?.total_cost || 0}
              prefix={<DollarOutlined />}
              precision={4}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总 Token 数"
              value={statsOverview?.total_tokens || 0}
              prefix={<DatabaseOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={statsOverview?.avg_response_time_ms || 0}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card loading={domainLoading}>
            <ReactECharts option={domainChartOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近对话" loading={domainLoading}>
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              暂无数据
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
