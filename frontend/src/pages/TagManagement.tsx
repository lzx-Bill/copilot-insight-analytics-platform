import React, { useState } from 'react';
import { Card, Table, Tag, Space, Button, Modal, Input, Select, message, Tabs, Popconfirm, Empty, Tooltip, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined, AppstoreOutlined, AimOutlined, ProjectOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi, CategoryTag, CreateTagData, UpdateTagData } from '@/services/conversation';

const { Text } = Typography;

// 标签类型配置
const TAG_TYPE_CONFIG = {
  domain: {
    label: '技术领域',
    color: 'blue',
    icon: <AppstoreOutlined />,
    description: '将多个技术领域分类归并到一个标签下，简化技术领域分布展示',
  },
  project: {
    label: '项目类别',
    color: 'purple',
    icon: <ProjectOutlined />,
    description: '将多个项目名称归并到一个标签下，简化项目分布展示',
  },
  intent: {
    label: '问题意图',
    color: 'green',
    icon: <AimOutlined />,
    description: '将多个意图类型归并到一个标签下，简化意图分布展示',
  },
};

type TagType = 'domain' | 'project' | 'intent';

const TagManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TagType>('domain');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CategoryTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // 获取标签列表
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['category-tags', activeTab],
    queryFn: () => tagApi.list(activeTab),
  });

  // 获取可用值
  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['available-values', activeTab],
    queryFn: () => tagApi.getAvailableValues(activeTab),
  });

  // 创建标签
  const createMutation = useMutation({
    mutationFn: (data: CreateTagData) => tagApi.create(data),
    onSuccess: () => {
      message.success('标签创建成功');
      setCreateModalOpen(false);
      setNewTagName('');
      setSelectedValues([]);
      invalidateAll();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '创建失败');
    },
  });

  // 更新标签
  const updateMutation = useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateTagData }) => tagApi.update(tagId, data),
    onSuccess: () => {
      message.success('标签更新成功');
      setEditModalOpen(false);
      setEditingTag(null);
      setNewTagName('');
      setSelectedValues([]);
      invalidateAll();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '更新失败');
    },
  });

  // 删除标签
  const deleteMutation = useMutation({
    mutationFn: (tagId: string) => tagApi.delete(tagId),
    onSuccess: () => {
      message.success('标签删除成功');
      invalidateAll();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '删除失败');
    },
  });

  // 使所有相关缓存失效
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['category-tags'] });
    queryClient.invalidateQueries({ queryKey: ['available-values'] });
    queryClient.invalidateQueries({ queryKey: ['filterOptions'] });
    queryClient.invalidateQueries({ queryKey: ['domain-distribution'] });
    queryClient.invalidateQueries({ queryKey: ['intent-distribution'] });
    queryClient.invalidateQueries({ queryKey: ['project-distribution'] });
    queryClient.invalidateQueries({ queryKey: ['stats-overview'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['conversationCount'] });
  };

  // 打开创建弹窗
  const handleOpenCreate = () => {
    setNewTagName('');
    setSelectedValues([]);
    setCreateModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEdit = (tag: CategoryTag) => {
    setEditingTag(tag);
    setNewTagName(tag.tag_name);
    setSelectedValues(tag.original_values);
    setEditModalOpen(true);
  };

  // 创建标签
  const handleCreate = () => {
    if (!newTagName.trim()) {
      message.warning('请输入标签名称');
      return;
    }
    if (selectedValues.length === 0) {
      message.warning('请至少选择一个原始类别');
      return;
    }
    createMutation.mutate({
      tag_name: newTagName.trim(),
      tag_type: activeTab,
      original_values: selectedValues,
    });
  };

  // 更新标签
  const handleUpdate = () => {
    if (!editingTag) return;
    if (!newTagName.trim()) {
      message.warning('请输入标签名称');
      return;
    }
    updateMutation.mutate({
      tagId: editingTag.id,
      data: {
        tag_name: newTagName.trim(),
        original_values: selectedValues,
      },
    });
  };

  // 获取编辑时可用的值（包括当前标签自己的值 + 未分配的值）
  const getEditAvailableValues = (): string[] => {
    const unassigned = availableData?.available_values || [];
    const currentValues = editingTag?.original_values || [];
    return [...new Set([...unassigned, ...currentValues])].sort();
  };

  const config = TAG_TYPE_CONFIG[activeTab];

  // 表格列
  const columns = [
    {
      title: '标签名称',
      dataIndex: 'tag_name',
      key: 'tag_name',
      width: 200,
      render: (text: string) => (
        <Tag color={config.color} style={{ fontSize: 14, padding: '4px 12px' }}>
          {config.icon} {text}
        </Tag>
      ),
    },
    {
      title: '包含的原始类别',
      dataIndex: 'original_values',
      key: 'original_values',
      render: (values: string[]) => (
        <Space wrap>
          {values.map(v => (
            <Tag key={v}>{v}</Tag>
          ))}
          {values.length === 0 && <Text type="secondary">无</Text>}
        </Space>
      ),
    },
    {
      title: '类别数量',
      key: 'count',
      width: 100,
      render: (_: unknown, record: CategoryTag) => record.original_values.length,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: CategoryTag) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`删除标签 "${record.tag_name}" 后，其包含的原始类别将恢复显示。确定删除吗？`}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = Object.entries(TAG_TYPE_CONFIG).map(([key, cfg]) => ({
    key,
    label: (
      <span>
        {cfg.icon} {cfg.label}
      </span>
    ),
  }));

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>
        <TagsOutlined /> 标签管理
      </h1>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          标签管理允许您将多个类别归并到一个标签下。归类后，所有页面（Dashboard、对话浏览、数据分析）中的图表、筛选器和详情表格都会使用标签名称替代原始类别名称。
          删除标签后，原始类别将恢复显示。
        </Text>
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={(key) => setActiveTab(key as TagType)}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              新增{config.label}标签
            </Button>
          }
        />

        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">{config.description}</Text>
          {availableData && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              （共 {availableData.all_values.length} 个原始类别，{availableData.assigned_values.length} 个已归类，
              {availableData.available_values.length} 个未归类）
            </Text>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={tags}
          loading={tagsLoading}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                description={`暂无${config.label}标签，点击上方按钮创建`}
              />
            ),
          }}
        />

        {/* 未归类的原始值展示 */}
        {availableData && availableData.available_values.length > 0 && (
          <Card
            title={`未归类的${config.label}（${availableData.available_values.length} 个）`}
            style={{ marginTop: 16 }}
            size="small"
          >
            <Space wrap>
              {availableData.available_values.map(v => (
                <Tag key={v} style={{ marginBottom: 4 }}>{v}</Tag>
              ))}
            </Space>
          </Card>
        )}
      </Card>

      {/* 创建标签弹窗 */}
      <Modal
        title={`新增${config.label}标签`}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>标签名称</label>
          <Input
            placeholder={`输入${config.label}标签名称`}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            选择要归类的原始类别
            <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8 }}>
              （仅显示未被其他标签占用的类别）
            </Text>
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择要归类到此标签下的类别"
            value={selectedValues}
            onChange={setSelectedValues}
            loading={availableLoading}
            optionFilterProp="label"
            options={(availableData?.available_values || []).map(v => ({
              label: v,
              value: v,
            }))}
          />
        </div>
      </Modal>

      {/* 编辑标签弹窗 */}
      <Modal
        title={`编辑${config.label}标签`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingTag(null);
        }}
        onOk={handleUpdate}
        confirmLoading={updateMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>标签名称</label>
          <Input
            placeholder={`输入${config.label}标签名称`}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            选择要归类的原始类别
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择要归类到此标签下的类别"
            value={selectedValues}
            onChange={setSelectedValues}
            loading={availableLoading}
            optionFilterProp="label"
            options={getEditAvailableValues().map(v => ({
              label: v,
              value: v,
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TagManagement;
