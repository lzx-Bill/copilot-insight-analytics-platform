import React, { useState } from 'react';
import { Card, Tabs, Input, Upload, Button, message, Space, Alert, Table, Tag, Typography } from 'antd';
import { UploadOutlined, SendOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/conversation';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

interface FileResult {
  filename: string;
  success: boolean;
  saved: number;
  duplicates: number;
  errors: number;
  message: string;
}

const DataImport: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [uploadResults, setUploadResults] = useState<FileResult[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // 获取上传限制
  const { data: limits } = useQuery({
    queryKey: ['importLimits'],
    queryFn: () => conversationApi.getImportLimits(),
  });

  // 文本导入 mutation
  const textImportMutation = useMutation({
    mutationFn: conversationApi.importText,
    onSuccess: (data: any) => {
      const count = data.count || 0;
      const skipped = data.skipped || 0;
      
      if (count === 0 && skipped > 0) {
        message.info(`所有对话都已存在: 跳过 ${skipped} 条重复`);
      } else if (count === 0) {
        message.warning('未能解析出任何对话，请检查格式');
      } else {
        message.success(data.message || `导入成功: ${count} 条对话`);
      }
      setTextInput('');
      queryClient.invalidateQueries({ queryKey: ['stats-overview'] });
      queryClient.invalidateQueries({ queryKey: ['domain-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        message.error(detail);
      } else if (Array.isArray(detail)) {
        message.error(detail.map((d: any) => d.msg).join('; ') || '导入失败');
      } else {
        message.error('导入失败，请检查文本格式是否正确');
      }
    },
  });

  // 多文件导入 mutation
  const filesImportMutation = useMutation({
    mutationFn: (files: File[]) => conversationApi.importFiles(files),
    onSuccess: (data: any) => {
      const totalErrors = data.total_errors || 0;
      const totalSaved = data.total_saved || 0;
      const totalDuplicates = data.total_duplicates || 0;
      
      if (totalErrors > 0 && totalSaved === 0) {
        message.error(`导入失败: 所有文件都无法解析`);
      } else if (totalErrors > 0) {
        message.warning(`部分导入: 成功 ${totalSaved} 条, 重复 ${totalDuplicates} 条, 失败 ${totalErrors} 个文件`);
      } else if (totalSaved === 0 && totalDuplicates > 0) {
        message.info(`所有对话都已存在: 跳过 ${totalDuplicates} 条重复`);
      } else {
        message.success(`批量导入完成: 成功 ${totalSaved} 条, 重复 ${totalDuplicates} 条`);
      }
      setUploadResults(data.results || []);
      setFileList([]);
      queryClient.invalidateQueries({ queryKey: ['stats-overview'] });
      queryClient.invalidateQueries({ queryKey: ['domain-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationCount'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        message.error(detail);
      } else if (Array.isArray(detail)) {
        message.error(detail.map((d: any) => d.msg).join('; ') || '批量导入失败');
      } else {
        message.error('批量导入失败，请检查文件格式');
      }
    },
  });

  // 单文件导入 mutation (保留)
  // const fileImportMutation = useMutation({...});

  const handleTextImport = () => {
    if (!textInput.trim()) {
      message.warning('请输入对话内容');
      return;
    }
    textImportMutation.mutate(textInput);
  };

  const handleBatchUpload = () => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }
    const files = fileList.map(f => f.originFileObj || f);
    filesImportMutation.mutate(files);
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.md,.txt,.markdown',
    fileList,
    beforeUpload: (file: File) => {
      // 检查文件数量限制
      if (fileList.length >= (limits?.max_files_per_upload || 10)) {
        message.error(`最多只能上传 ${limits?.max_files_per_upload || 10} 个文件`);
        return Upload.LIST_IGNORE;
      }
      // 检查文件大小
      const maxSize = (limits?.max_file_size_mb || 5) * 1024 * 1024;
      if (file.size > maxSize) {
        message.error(`文件 ${file.name} 超过大小限制 (${limits?.max_file_size_mb || 5}MB)`);
        return Upload.LIST_IGNORE;
      }
      return false; // 阻止自动上传
    },
    onChange: (info: any) => {
      setFileList(info.fileList);
    },
    onRemove: (file: any) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
  };

  // 结果表格列
  const resultColumns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileTextOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'status',
      width: 80,
      render: (success: boolean) => success ? 
        <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag> : 
        <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>,
    },
    {
      title: '保存',
      dataIndex: 'saved',
      key: 'saved',
      width: 80,
      render: (val: number) => <Text type="success">{val}</Text>,
    },
    {
      title: '重复',
      dataIndex: 'duplicates',
      key: 'duplicates',
      width: 80,
      render: (val: number) => val > 0 ? <Text type="warning">{val}</Text> : '-',
    },
    {
      title: '错误',
      dataIndex: 'errors',
      key: 'errors',
      width: 80,
      render: (val: number) => val > 0 ? <Text type="danger">{val}</Text> : '-',
    },
    {
      title: '信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  const items = [
    {
      key: 'text',
      label: '文本粘贴',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <TextArea
            rows={15}
            placeholder="粘贴 Copilot 对话内容..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleTextImport}
            loading={textImportMutation.isPending}
            size="large"
          >
            导入对话
          </Button>
        </Space>
      ),
    },
    {
      key: 'file',
      label: '批量文件上传',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 限制提示 */}
          <Alert
            message="上传限制"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>最多同时上传 {limits?.max_files_per_upload || 10} 个文件</li>
                <li>单个文件最大 {limits?.max_file_size_mb || 5} MB</li>
                <li>支持格式: {limits?.allowed_extensions?.join(', ') || '.md, .txt, .markdown'}</li>
                <li>重复的对话会自动跳过</li>
              </ul>
            }
            type="info"
            showIcon
          />

          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">
              支持选择多个文件一起上传，系统会并发处理
            </p>
          </Dragger>

          {fileList.length > 0 && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleBatchUpload}
              loading={filesImportMutation.isPending}
              size="large"
              block
            >
              开始上传 ({fileList.length} 个文件)
            </Button>
          )}

          {/* 上传结果 */}
          {uploadResults.length > 0 && (
            <Card title="上传结果" size="small">
              <Table
                columns={resultColumns}
                dataSource={uploadResults}
                rowKey="filename"
                size="small"
                pagination={false}
              />
            </Card>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>数据导入</h1>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
};

export default DataImport;
