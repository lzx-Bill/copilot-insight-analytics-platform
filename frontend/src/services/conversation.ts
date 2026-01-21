/**
 * 对话相关 API
 */
import { apiClient } from './api';

export interface Message {
  _id: string;
  conversation_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context_files: string[];
  sequence: number;
  created_at: string;
}

export interface MessagesStats {
  total_messages: number;
  by_role: Array<{
    _id: string;
    count: number;
    avg_length: number;
  }>;
}

export interface Conversation {
  _id: string;
  session_id: string;
  question_id: string;
  timestamp: string;
  project_name?: string;  // 项目名称
  conversation: {
    user_input: string;
    assistant_response: string;
    context_files: string[];
  };
  metadata: {
    domain?: string;
    sub_domain?: string;
    intent_type?: string;
    complexity_level?: string;
    model?: string;
    mode?: string;
    response_time_ms?: number;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    estimated_cost?: number;
    tool_count?: number;
    file_read_count?: number;
    file_write_count?: number;
    code_lines_generated?: number;
    user_sentiment?: string;
    is_follow_up: boolean;
    has_error: boolean;
    languages_involved?: string[];
  };
  tags: string[];
  note?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatsOverview {
  total_count: number;
  total_cost: number;
  total_tokens: number;
  avg_response_time_ms: number;
  avg_tokens?: number;
  avg_cost?: number;
  total_tool_count?: number;
  total_file_reads?: number;
  total_file_writes?: number;
  total_code_lines?: number;
}

export interface DomainDistribution {
  _id: string;
  count: number;
  total_cost: number;
  total_tokens?: number;
}

export interface ModelDistribution {
  _id: string;
  count: number;
  total_cost: number;
  total_tokens: number;
  avg_response_time: number;
}

export interface DailyTrend {
  _id: string;
  count: number;
  total_cost: number;
  total_tokens: number;
}

export interface IntentDistribution {
  _id: string;
  count: number;
}

export interface ProjectDistribution {
  _id: string;
  count: number;
  total_cost: number;
  total_tokens: number;
}

export interface ToolUsage {
  _id: string;
  total_count: number;
  usage_count: number;
}

export interface FilterOptions {
  domains: string[];
  models: string[];
  tags: string[];
  project_names: string[];  // 项目名称列表
  intent_types: string[];
  complexity_levels: string[];
}

export interface ImportLimits {
  max_files_per_upload: number;
  max_file_size_mb: number;
  allowed_extensions: string[];
}

export interface ListParams {
  skip?: number;
  limit?: number;
  domain?: string;
  session_id?: string;
  model?: string;
  intent_type?: string;
  complexity_level?: string;
  has_error?: boolean;
  is_favorite?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  tags?: string;
  project_name?: string;  // 项目名称筛选
}

// 更新对话请求数据类型
export interface UpdateConversationData {
  tags?: string[];
  note?: string;
  project_name?: string;
  is_favorite?: boolean;
  metadata?: {
    domain?: string;
    sub_domain?: string;
    intent_type?: string;
    complexity_level?: string;
    question_length?: number;
    model?: string;
    mode?: string;
    response_time_ms?: number;
    tokens?: {
      input?: number;
      output?: number;
      total?: number;
    };
    estimated_cost?: number;
    tool_count?: number;
    file_read_count?: number;
    file_write_count?: number;
    code_lines_generated?: number;
    user_sentiment?: string;
    is_follow_up?: boolean;
    has_error?: boolean;
    languages_involved?: string[];
  };
  conversation?: {
    user_input?: string;
    assistant_response?: string;
    context_files?: string[];
  };
}

export interface StatsParams {
  domain?: string;
  model?: string;
  intent_type?: string;
  start_date?: string;
  end_date?: string;
  project_name?: string;  // 项目名称筛选
}

export const conversationApi = {
  // 导入文本
  importText: async (text: string) => {
    return apiClient.post('/conversations/import/text', { text });
  },

  // 导入单个文件
  importFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/conversations/import/file', formData);
  },

  // 批量导入多个文件
  importFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.post('/conversations/import/files', formData);
  },

  // 获取导入限制
  getImportLimits: async (): Promise<ImportLimits> => {
    return apiClient.get('/conversations/import/limits');
  },

  // 获取对话列表
  list: async (params?: ListParams): Promise<Conversation[]> => {
    return apiClient.get('/conversations/', { params });
  },

  // 获取对话总数
  count: async (params?: Partial<ListParams>): Promise<{ count: number }> => {
    return apiClient.get('/conversations/count/total', { params });
  },

  // 获取筛选选项
  getFilterOptions: async (): Promise<FilterOptions> => {
    return apiClient.get('/conversations/filters/options');
  },

  // 获取单个对话
  get: async (questionId: string): Promise<Conversation> => {
    return apiClient.get(`/conversations/${questionId}`);
  },

  // 更新对话（支持所有字段，除时间戳外）
  update: async (questionId: string, data: UpdateConversationData) => {
    return apiClient.put(`/conversations/${questionId}`, data);
  },

  // 删除对话
  delete: async (questionId: string) => {
    return apiClient.delete(`/conversations/${questionId}`);
  },

  // 统计概览（支持筛选）
  getStatsOverview: async (params?: StatsParams): Promise<StatsOverview> => {
    return apiClient.get('/conversations/stats/overview', { params });
  },

  // 领域分布（支持筛选）
  getDomainDistribution: async (params?: { start_date?: string; end_date?: string; project_name?: string }): Promise<DomainDistribution[]> => {
    return apiClient.get('/conversations/stats/domain-distribution', { params });
  },

  // 模型分布
  getModelDistribution: async (params?: { start_date?: string; end_date?: string; project_name?: string }): Promise<ModelDistribution[]> => {
    return apiClient.get('/conversations/stats/model-distribution', { params });
  },

  // 每日趋势
  getDailyTrend: async (params?: { days?: number; domain?: string; model?: string; project_name?: string }): Promise<DailyTrend[]> => {
    return apiClient.get('/conversations/stats/daily-trend', { params });
  },

  // 意图分布
  getIntentDistribution: async (params?: { start_date?: string; end_date?: string; project_name?: string }): Promise<IntentDistribution[]> => {
    return apiClient.get('/conversations/stats/intent-distribution', { params });
  },

  // 项目分布
  getProjectDistribution: async (params?: { start_date?: string; end_date?: string }): Promise<ProjectDistribution[]> => {
    return apiClient.get('/conversations/stats/project-distribution', { params });
  },

  // 工具使用统计
  getToolsUsage: async (params?: { limit?: number; start_date?: string; end_date?: string; project_name?: string }): Promise<ToolUsage[]> => {
    return apiClient.get('/conversations/stats/tools-usage', { params });
  },

  // 获取对话消息
  getMessages: async (questionId: string): Promise<Message[]> => {
    return apiClient.get(`/conversations/${questionId}/messages`);
  },

  // 获取消息统计
  getMessagesStats: async (params?: { start_date?: string; end_date?: string }): Promise<MessagesStats> => {
    return apiClient.get('/conversations/stats/messages', { params });
  },
};
