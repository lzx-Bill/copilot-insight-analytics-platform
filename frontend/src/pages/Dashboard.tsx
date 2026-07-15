import React from 'react';
import { Row, Col, Card, Statistic, List, Tag, Typography, Empty } from 'antd';
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
    queryFn: () => conversationApi.getStatsOverview(),
  });

  // 获取领域分布
  const { data: domainDistribution, isLoading: domainLoading } = useQuery({
    queryKey: ['domain-distribution'],
    queryFn: () => conversationApi.getDomainDistribution(),
  });

  const { data: recentConversations, isLoading: recentLoading } = useQuery({
    queryKey: ['conversations', 'recent'],
    queryFn: () => conversationApi.list({ limit: 5, sort_by: 'timestamp', sort_order: 'desc' }),
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
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">AI WORKFLOW ANALYTICS</div>
          <h1>看清你的 AI 编程方式</h1>
          <p>把散落的 Copilot 对话变成可检索、可比较、可持续积累的数据资产。</p>
        </div>
        <div className="hero-signal" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      </section>
      
      {/* KPI 指标卡 */}
      <Row gutter={[16, 16]} className="dashboard-section">
        <Col xs={24} sm={12} xl={6}>
          <Card className="kpi-card kpi-indigo">
            <Statistic
              title="总对话数"
              value={statsOverview?.total_count || 0}
              prefix={<CommentOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="kpi-card kpi-emerald">
            <Statistic
              title="累计成本"
              value={statsOverview?.total_cost || 0}
              prefix={<DollarOutlined />}
              precision={4}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="kpi-card kpi-amber">
            <Statistic
              title="总 Token 数"
              value={statsOverview?.total_tokens || 0}
              prefix={<DatabaseOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="kpi-card kpi-cyan">
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
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={13}>
          <Card className="panel-card" title="技术领域分布" loading={domainLoading}>
            <ReactECharts option={domainChartOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col xs={24} xl={11}>
          <Card className="panel-card" title="最近对话" loading={recentLoading}>
            {recentConversations?.length ? (
              <List
                className="recent-list"
                dataSource={recentConversations}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Typography.Text ellipsis>{item.conversation.user_input}</Typography.Text>}
                      description={new Date(item.timestamp).toLocaleString('zh-CN')}
                    />
                    <Tag color="geekblue">{item.metadata.domain || '未分类'}</Tag>
                  </List.Item>
                )}
              />
            ) : <Empty description="导入第一段对话后，这里会出现你的 AI 工作轨迹" />}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
