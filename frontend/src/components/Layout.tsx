import React, { useState } from 'react';
import { Layout as AntLayout, Menu, theme } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ImportOutlined,
  SearchOutlined,
  BarChartOutlined,
  TagsOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/import',
      icon: <ImportOutlined />,
      label: '数据导入',
    },
    {
      key: '/conversations',
      icon: <SearchOutlined />,
      label: '对话浏览',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: '/tags',
      icon: <TagsOutlined />,
      label: '标签管理',
    },
  ];

  return (
    <AntLayout className="app-shell">
      <Sider className="app-sider" width={240} collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className={`brand ${collapsed ? 'brand-collapsed' : ''}`}>
          <div className="brand-mark"><LineChartOutlined /></div>
          {!collapsed && (
            <div>
              <div className="brand-name">Copilot Insight</div>
              <div className="brand-caption">Analytics workspace</div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header className="app-header" style={{ background: colorBgContainer }}>
          <div>
            <div className="header-title">Copilot Insight Analytics Platform</div>
            <div className="header-subtitle">Local-first · Your conversations stay with you</div>
          </div>
        </Header>
        <Content className="app-content">
          <div className="content-frame">{children}</div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
