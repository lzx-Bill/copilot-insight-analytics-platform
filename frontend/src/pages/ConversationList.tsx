import React, { useState, useCallback } from 'react';
import { Card, Table, Tag, Space, Button, Modal, Descriptions, Input, message, Select, DatePicker, Row, Col, Tooltip, Form, InputNumber, Switch, Tabs, Divider } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, DragOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi, Conversation, ListParams, UpdateConversationData } from '@/services/conversation';
import { useTagMappings, applyMapping } from '@/hooks/useTagMappings';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

// 最大显示字符数
const MAX_TOOLTIP_CHARS = 300;

// 带截断和"更多"按钮的 Tooltip 内容组件
const TruncatedTooltipContent: React.FC<{ text: string; onShowMore: () => void }> = ({ text, onShowMore }) => {
  if (!text || text.length <= MAX_TOOLTIP_CHARS) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  }
  
  return (
    <div>
      <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
        {text.slice(0, MAX_TOOLTIP_CHARS)}...
      </div>
      <Button 
        type="primary" 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          onShowMore();
        }}
      >
        查看更多
      </Button>
    </div>
  );
};

// 可调整宽度的表头组件
const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            width: 10,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1,
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

// 默认列顺序
const defaultColumnOrder = ['timestamp', 'project_name', 'domain', 'question', 'model', 'intent_type', 'tokens', 'cost', 'action'];

// 默认列宽
const defaultColumnWidths: Record<string, number> = {
  timestamp: 160,
  project_name: 180,
  domain: 120,
  question: 300,
  model: 130,
  intent_type: 90,
  tokens: 80,
  cost: 80,
  action: 150,
};

const ConversationList: React.FC = () => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullTextModalOpen, setFullTextModalOpen] = useState(false);
  const [fullTextContent, setFullTextContent] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [editForm] = Form.useForm();
  
  // 列配置状态
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('conversationListColumnOrder');
    return saved ? JSON.parse(saved) : defaultColumnOrder;
  });
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('conversationListColumnWidths');
    return saved ? JSON.parse(saved) : defaultColumnWidths;
  });
  
  // 拖拽排序状态
  const [dragState, setDragState] = useState<{ dragIndex: number | null; hoverIndex: number | null }>({ dragIndex: null, hoverIndex: null });
  
  // 筛选状态
  const [filters, setFilters] = useState<ListParams>({
    skip: 0,
    limit: 20,
    sort_by: 'timestamp',
    sort_order: 'desc',
  });
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  
  const queryClient = useQueryClient();
  
  // 获取标签映射
  const tagMappings = useTagMappings();
  
  // 获取筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: () => conversationApi.getFilterOptions(),
  });

  // 获取对话列表
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations', filters],
    queryFn: () => conversationApi.list(filters),
  });

  // 获取总数
  const { data: countData } = useQuery({
    queryKey: ['conversationCount', filters],
    queryFn: () => conversationApi.count({
      domain: filters.domain,
      model: filters.model,
      intent_type: filters.intent_type,
      search: filters.search,
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_name: filters.project_name,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: UpdateConversationData }) =>
      conversationApi.update(questionId, data),
    onSuccess: () => {
      message.success('更新成功');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      message.error('更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => conversationApi.delete(questionId),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationCount'] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const handleView = (record: Conversation) => {
    setSelectedConversation(record);
    setViewModalOpen(true);
  };

  const handleEdit = (record: Conversation) => {
    setSelectedConversation(record);
    // 设置表单初始值
    editForm.setFieldsValue({
      project_name: record.project_name || '',
      tags: record.tags?.join(', ') || '',
      note: record.note || '',
      is_favorite: record.is_favorite || false,
      user_input: record.conversation.user_input || '',
      assistant_response: record.conversation.assistant_response || '',
      context_files: record.conversation.context_files?.join(', ') || '',
      domain: record.metadata.domain || '',
      sub_domain: record.metadata.sub_domain || '',
      intent_type: record.metadata.intent_type || '',
      complexity_level: record.metadata.complexity_level || '',
      model: record.metadata.model || '',
      mode: record.metadata.mode || '',
      response_time_ms: record.metadata.response_time_ms || 0,
      tokens_input: record.metadata.tokens?.input || 0,
      tokens_output: record.metadata.tokens?.output || 0,
      estimated_cost: record.metadata.estimated_cost || 0,
      tool_count: record.metadata.tool_count || 0,
      file_read_count: record.metadata.file_read_count || 0,
      file_write_count: record.metadata.file_write_count || 0,
      code_lines_generated: record.metadata.code_lines_generated || 0,
      user_sentiment: record.metadata.user_sentiment || 'Neutral',
      is_follow_up: record.metadata.is_follow_up || false,
      has_error: record.metadata.has_error || false,
      languages_involved: record.metadata.languages_involved?.join(', ') || '',
    });
    setEditModalOpen(true);
  };

  const handleDelete = (record: Conversation) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条对话记录吗？',
      onOk: () => deleteMutation.mutate(record.question_id),
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedConversation) return;
    
    try {
      const values = await editForm.validateFields();
      
      const updateData: UpdateConversationData = {
        project_name: values.project_name || undefined,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
        note: values.note || undefined,
        is_favorite: values.is_favorite,
        conversation: {
          user_input: values.user_input,
          assistant_response: values.assistant_response,
          context_files: values.context_files ? values.context_files.split(',').map((f: string) => f.trim()).filter((f: string) => f) : [],
        },
        metadata: {
          domain: values.domain || undefined,
          sub_domain: values.sub_domain || undefined,
          intent_type: values.intent_type || undefined,
          complexity_level: values.complexity_level || undefined,
          model: values.model || undefined,
          mode: values.mode || undefined,
          response_time_ms: values.response_time_ms || undefined,
          tokens: {
            input: values.tokens_input || 0,
            output: values.tokens_output || 0,
            total: (values.tokens_input || 0) + (values.tokens_output || 0),
          },
          estimated_cost: values.estimated_cost || undefined,
          tool_count: values.tool_count || undefined,
          file_read_count: values.file_read_count || undefined,
          file_write_count: values.file_write_count || undefined,
          code_lines_generated: values.code_lines_generated || undefined,
          user_sentiment: values.user_sentiment || undefined,
          is_follow_up: values.is_follow_up,
          has_error: values.has_error,
          languages_involved: values.languages_involved ? values.languages_involved.split(',').map((l: string) => l.trim()).filter((l: string) => l) : [],
        },
      };
      
      updateMutation.mutate({
        questionId: selectedConversation.question_id,
        data: updateData,
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      skip: 0,
      search: searchText || undefined,
      start_date: dateRange[0]?.toISOString(),
      end_date: dateRange[1]?.toISOString(),
    }));
  };

  const handleReset = () => {
    setSearchText('');
    setDateRange([null, null]);
    setFilters({
      skip: 0,
      limit: 20,
      sort_by: 'timestamp',
      sort_order: 'desc',
    });
  };

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setFilters(prev => ({
      ...prev,
      skip: (pagination.current - 1) * pagination.pageSize,
      limit: pagination.pageSize,
      sort_by: sorter.field ? (Array.isArray(sorter.field) ? sorter.field.join('.') : sorter.field) : 'timestamp',
      sort_order: sorter.order === 'ascend' ? 'asc' : 'desc',
    }));
  };

  // 处理列宽调整
  const handleResize = useCallback((key: string) => (_: any, { size }: { size: { width: number } }) => {
    setColumnWidths((widths) => {
      const newWidths = { ...widths, [key]: size.width };
      localStorage.setItem('conversationListColumnWidths', JSON.stringify(newWidths));
      return newWidths;
    });
  }, []);

  // 处理列拖拽开始
  const handleDragStart = (index: number) => {
    setDragState({ dragIndex: index, hoverIndex: null });
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragState.dragIndex !== null && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  };

  // 处理拖拽结束
  const handleDrop = (targetIndex: number) => {
    if (dragState.dragIndex !== null && dragState.dragIndex !== targetIndex) {
      const newOrder = [...columnOrder];
      const [removed] = newOrder.splice(dragState.dragIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      setColumnOrder(newOrder);
      localStorage.setItem('conversationListColumnOrder', JSON.stringify(newOrder));
    }
    setDragState({ dragIndex: null, hoverIndex: null });
  };

  // 重置列配置
  const handleResetColumns = () => {
    setColumnOrder(defaultColumnOrder);
    setColumnWidths(defaultColumnWidths);
    localStorage.removeItem('conversationListColumnOrder');
    localStorage.removeItem('conversationListColumnWidths');
    message.success('列配置已重置');
  };

  // 列定义
  const getColumnDefinitions = () => ({
    timestamp: {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: true,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    project_name: {
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      ellipsis: true,
      render: (text: string) => {
        const mapped = applyMapping(text, tagMappings.project);
        return mapped ? <Tag color="purple">{mapped}</Tag> : '-';
      },
    },
    domain: {
      title: '领域',
      dataIndex: ['metadata', 'domain'],
      key: 'domain',
      ellipsis: true,
      render: (text: string) => {
        const mapped = applyMapping(text, tagMappings.domain);
        return mapped ? <Tag color="blue">{mapped}</Tag> : '-';
      },
    },
    question: {
      title: '问题',
      dataIndex: ['conversation', 'user_input'],
      key: 'question',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip 
          title={
            <TruncatedTooltipContent 
              text={text} 
              onShowMore={() => {
                setFullTextContent(text);
                setFullTextModalOpen(true);
              }} 
            />
          }
          overlayStyle={{ maxWidth: 500 }}
        >
          <div style={{ maxWidth: columnWidths.question - 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {text}
          </div>
        </Tooltip>
      ),
    },
    model: {
      title: '模型',
      dataIndex: ['metadata', 'model'],
      key: 'model',
      ellipsis: true,
    },
    intent_type: {
      title: '意图',
      dataIndex: ['metadata', 'intent_type'],
      key: 'intent_type',
      render: (text: string) => {
        const mapped = applyMapping(text, tagMappings.intent);
        return mapped ? <Tag>{mapped}</Tag> : '-';
      },
    },
    tokens: {
      title: 'Token',
      dataIndex: ['metadata', 'tokens', 'total'],
      key: 'tokens',
      sorter: true,
      render: (val: number) => val?.toLocaleString() || '-',
    },
    cost: {
      title: '成本',
      dataIndex: ['metadata', 'estimated_cost'],
      key: 'cost',
      sorter: true,
      render: (text: number) => text ? `$${text.toFixed(3)}` : '-',
    },
    action: {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      render: (_: any, record: Conversation) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleView(record)}>查看</Button>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  });

  // 根据顺序生成带宽度的列
  const columns = (() => {
    const defs = getColumnDefinitions();
    return columnOrder
      .filter(key => (defs as any)[key])
      .map((key, index) => ({
        ...(defs as any)[key],
        width: columnWidths[key] || defaultColumnWidths[key],
        onHeaderCell: (column: any) => ({
          width: column.width,
          onResize: handleResize(key),
          draggable: key !== 'action',
          onDragStart: () => handleDragStart(index),
          onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
          onDrop: () => handleDrop(index),
          onDragEnd: () => setDragState({ dragIndex: null, hoverIndex: null }),
          style: {
            cursor: key !== 'action' ? 'grab' : 'default',
            background: dragState.hoverIndex === index ? '#e6f7ff' : undefined,
          },
        }),
      }));
  })();

  // 自定义表头组件
  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>对话浏览</h1>
      
      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索问题内容..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="领域"
              style={{ width: '100%' }}
              allowClear
              value={filters.domain}
              onChange={(val) => setFilters(prev => ({ ...prev, domain: val, skip: 0 }))}
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
              onChange={(val) => setFilters(prev => ({ ...prev, model: val, skip: 0 }))}
            >
              {filterOptions?.models.map((m: string) => (
                <Select.Option key={m} value={m}>{m}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="意图类型"
              style={{ width: '100%' }}
              allowClear
              value={filters.intent_type}
              onChange={(val) => setFilters(prev => ({ ...prev, intent_type: val, skip: 0 }))}
            >
              {filterOptions?.intent_types.map((i: string) => (
                <Select.Option key={i} value={i}>{i}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="项目"
              style={{ width: '100%' }}
              allowClear
              value={filters.project_name}
              onChange={(val) => setFilters(prev => ({ ...prev, project_name: val, skip: 0 }))}
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
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col>
            <Space>
              <Button type="primary" icon={<FilterOutlined />} onClick={handleSearch}>
                筛选
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置筛选
              </Button>
              <Button onClick={() => refetch()}>
                刷新
              </Button>
              <Tooltip title="拖拽列边缘调整宽度，拖拽表头调整顺序，配置自动保存">
                <Button icon={<DragOutlined />} onClick={handleResetColumns}>
                  重置列配置
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table
          components={components}
          columns={columns}
          dataSource={conversations}
          loading={isLoading}
          rowKey="question_id"
          scroll={{ x: 1200 }}
          onChange={handleTableChange}
          pagination={{
            current: Math.floor((filters.skip || 0) / (filters.limit || 20)) + 1,
            pageSize: filters.limit || 20,
            total: countData?.count || 0,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      {/* 查看对话详情模态框 */}
      <Modal
        title="对话详情"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={null}
        width={900}
      >
        {selectedConversation && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="会话ID" span={2}>
              {selectedConversation.session_id}
            </Descriptions.Item>
            <Descriptions.Item label="问题ID" span={2}>
              {selectedConversation.question_id}
            </Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>
              {selectedConversation.project_name ? 
                <Tag color="purple">{applyMapping(selectedConversation.project_name, tagMappings.project)}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="时间" span={1}>
              {dayjs(selectedConversation.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="响应时间" span={1}>
              {selectedConversation.metadata.response_time_ms ? 
                `${(selectedConversation.metadata.response_time_ms / 1000).toFixed(1)}s` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="领域">
              {applyMapping(selectedConversation.metadata.domain, tagMappings.domain) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="子领域">
              {selectedConversation.metadata.sub_domain || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="模型">
              {selectedConversation.metadata.model || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="模式">
              {selectedConversation.metadata.mode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="意图类型">
              {applyMapping(selectedConversation.metadata.intent_type, tagMappings.intent) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="复杂度">
              {selectedConversation.metadata.complexity_level || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Token (入/出/总)">
              {selectedConversation.metadata.tokens ? 
                `${selectedConversation.metadata.tokens.input} / ${selectedConversation.metadata.tokens.output} / ${selectedConversation.metadata.tokens.total}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="估算成本">
              {selectedConversation.metadata.estimated_cost ? 
                `$${selectedConversation.metadata.estimated_cost.toFixed(4)}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户问题" span={2}>
              <div style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {selectedConversation.conversation.user_input}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="AI回答" span={2}>
              <div style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', background: '#f0f9ff', padding: 8, borderRadius: 4 }}>
                {selectedConversation.conversation.assistant_response}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {selectedConversation.tags?.length > 0 ? 
                selectedConversation.tags.map(tag => (
                  <Tag key={tag} color="green">{tag}</Tag>
                )) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {selectedConversation.note || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 完整问题内容弹窗 */}
      <Modal
        title="完整问题内容"
        open={fullTextModalOpen}
        onCancel={() => setFullTextModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setFullTextModalOpen(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ 
          maxHeight: 500, 
          overflow: 'auto', 
          whiteSpace: 'pre-wrap', 
          background: '#f5f5f5', 
          padding: 16, 
          borderRadius: 4,
          lineHeight: 1.6
        }}>
          {fullTextContent}
        </div>
      </Modal>

      {/* 编辑对话模态框 - 完整版 */}
      <Modal
        title="编辑对话（时间戳不可编辑）"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSaveEdit}
        confirmLoading={updateMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={900}
      >
        <Form form={editForm} layout="vertical">
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="项目名称" name="project_name">
                          <Input placeholder="项目名称" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="标签（逗号分隔）" name="tags">
                          <Input placeholder="例如: 重要, 待复习, Bug修复" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="收藏" name="is_favorite" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="备注" name="note">
                      <TextArea rows={3} placeholder="添加备注..." />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'conversation',
                label: '对话内容',
                children: (
                  <>
                    <Form.Item label="用户问题" name="user_input">
                      <TextArea rows={4} placeholder="用户输入的问题" />
                    </Form.Item>
                    <Form.Item label="AI回答" name="assistant_response">
                      <TextArea rows={6} placeholder="AI的回答内容" />
                    </Form.Item>
                    <Form.Item label="上下文文件（逗号分隔）" name="context_files">
                      <Input placeholder="例如: main.py, config.py" />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'metadata',
                label: '元数据',
                children: (
                  <>
                    <Divider orientation="left">问题分析</Divider>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="领域" name="domain">
                          <Input placeholder="如: Python, React" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="子领域" name="sub_domain">
                          <Input placeholder="如: FastAPI, Hooks" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="意图类型" name="intent_type">
                          <Select placeholder="选择意图类型" allowClear>
                            <Select.Option value="debug">debug</Select.Option>
                            <Select.Option value="implement">implement</Select.Option>
                            <Select.Option value="refactor">refactor</Select.Option>
                            <Select.Option value="explain">explain</Select.Option>
                            <Select.Option value="research">research</Select.Option>
                            <Select.Option value="optimize">optimize</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="复杂度" name="complexity_level">
                          <Select placeholder="选择复杂度" allowClear>
                            <Select.Option value="simple">simple</Select.Option>
                            <Select.Option value="medium">medium</Select.Option>
                            <Select.Option value="complex">complex</Select.Option>
                            <Select.Option value="expert">expert</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="用户情绪" name="user_sentiment">
                          <Select placeholder="选择情绪" allowClear>
                            <Select.Option value="Neutral">Neutral</Select.Option>
                            <Select.Option value="Positive">Positive</Select.Option>
                            <Select.Option value="Frustrated">Frustrated</Select.Option>
                            <Select.Option value="Urgent">Urgent</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="涉及语言（逗号分隔）" name="languages_involved">
                          <Input placeholder="如: Python, TypeScript" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">AI响应信息</Divider>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="模型" name="model">
                          <Input placeholder="如: Claude Opus 4.5" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="模式" name="mode">
                          <Select placeholder="选择模式" allowClear>
                            <Select.Option value="agent">agent</Select.Option>
                            <Select.Option value="ask">ask</Select.Option>
                            <Select.Option value="plan">plan</Select.Option>
                            <Select.Option value="edit">edit</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="响应时间 (ms)" name="response_time_ms">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="输入 Token" name="tokens_input">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="输出 Token" name="tokens_output">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="估算成本 ($)" name="estimated_cost">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.001} precision={4} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">工具使用</Divider>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item label="工具调用次数" name="tool_count">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="文件读取次数" name="file_read_count">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="文件写入次数" name="file_write_count">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="生成代码行数" name="code_lines_generated">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">状态标记</Divider>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="是否追问" name="is_follow_up" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="是否有错误" name="has_error" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default ConversationList;
