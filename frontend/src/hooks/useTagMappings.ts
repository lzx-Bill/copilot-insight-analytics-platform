/**
 * 标签映射 Hook - 在前端将原始值映射为标签名称
 * 用于对话列表中的 domain、project_name、intent_type 等字段的显示
 */
import { useQuery } from '@tanstack/react-query';
import { tagApi } from '@/services/conversation';

export interface TagMappings {
  domain: Record<string, string>;
  project: Record<string, string>;
  intent: Record<string, string>;
}

/**
 * 获取所有标签映射的 Hook
 * 返回 { domain: { original -> tagName }, project: {...}, intent: {...} }
 */
export function useTagMappings() {
  const { data: domainMapping } = useQuery({
    queryKey: ['tag-mapping', 'domain'],
    queryFn: () => tagApi.getMapping('domain'),
    staleTime: 30000,
  });

  const { data: projectMapping } = useQuery({
    queryKey: ['tag-mapping', 'project'],
    queryFn: () => tagApi.getMapping('project'),
    staleTime: 30000,
  });

  const { data: intentMapping } = useQuery({
    queryKey: ['tag-mapping', 'intent'],
    queryFn: () => tagApi.getMapping('intent'),
    staleTime: 30000,
  });

  const mappings: TagMappings = {
    domain: domainMapping?.mapping || {},
    project: projectMapping?.mapping || {},
    intent: intentMapping?.mapping || {},
  };

  return mappings;
}

/**
 * 应用标签映射 - 将原始值替换为标签名
 */
export function applyMapping(value: string | undefined | null, mapping: Record<string, string>): string | undefined | null {
  if (!value) return value;
  return mapping[value] || value;
}
