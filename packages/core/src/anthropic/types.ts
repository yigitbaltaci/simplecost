export interface OrgInfo {
  id: string
  name: string
}

// --- Usage report ---

export interface UsageParams {
  starting_at: string
  ending_at?: string
  bucket_width: '1m' | '1h' | '1d'
  'group_by[]': string[]
  limit?: number
}

export interface UsageBucketResult {
  workspace_id: string | null
  api_key_id: string | null
  model: string
  service_tier: string
  context_window: string | null
  uncached_input_tokens: number
  cached_input_tokens: number
  cache_creation: {
    ephemeral_5m_input_tokens: number
    ephemeral_1h_input_tokens: number
  }
  output_tokens: number
  server_tool_use: { web_search_requests: number } | null
}

export interface UsageBucket {
  starting_at: string
  ending_at: string
  results: UsageBucketResult[]
}

export interface PagedResponse<T> {
  data: T[]
  has_more: boolean
  next_page: string | null
}

export type UsagePageResponse = PagedResponse<UsageBucket>

// --- Cost report ---

export interface CostParams {
  starting_at: string
  ending_at?: string
  'group_by[]': string[]
  limit?: number
}

export interface CostBucketResult {
  workspace_id: string | null
  description: string
  cost_usd: number
}

export interface CostBucket {
  starting_at: string
  ending_at: string
  results: CostBucketResult[]
}

export type CostPageResponse = PagedResponse<CostBucket>

// --- Workspaces ---

export interface Workspace {
  id: string
  name: string
  display_color: string | null
  archived_at: string | null
}

export type WorkspacesPageResponse = PagedResponse<Workspace>
