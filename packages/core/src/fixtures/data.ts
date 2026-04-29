import type { CostBucket, UsageBucket, Workspace } from '../anthropic/types.js'

export const FIXTURE_WORKSPACES: Workspace[] = [
  { id: 'ws-prod-001', name: 'production', display_color: '#FF6B6B', archived_at: null },
  { id: 'ws-dev-002', name: 'development', display_color: '#4ECDC4', archived_at: null },
  { id: 'ws-rsch-003', name: 'research', display_color: '#45B7D1', archived_at: null },
]

// Fixed 7-day mock window ending Apr 27, 2026 UTC
export const MOCK_END_MS = new Date('2026-04-27T00:00:00Z').getTime()
export const MOCK_START_MS = MOCK_END_MS - 7 * 24 * 3_600_000

function rng(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000
  return x - Math.floor(x)
}

function randInt(seed: number, min: number, max: number): number {
  return Math.floor(min + rng(seed) * (max - min))
}

function activityMultiplier(tsMs: number): number {
  const d = new Date(tsMs)
  const h = d.getUTCHours()
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return 0.25
  if (h >= 8 && h <= 20) return 1.0
  return 0.15
}

export function generateUsageBuckets(fromMs: number, toMs: number): UsageBucket[] {
  const HOUR = 3_600_000
  const buckets: UsageBucket[] = []

  for (let t = fromMs; t < toMs; t += HOUR) {
    const act = activityMultiplier(t)
    const s = t / 1000
    const results: UsageBucket['results'] = []

    if (rng(s) < 0.9 * act) {
      results.push({
        workspace_id: 'ws-prod-001',
        api_key_id: 'key-prod-001',
        model: 'claude-sonnet-4-6',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 1, 20_000, 150_000),
        cached_input_tokens: randInt(s + 2, 10_000, 80_000),
        cache_creation: {
          ephemeral_5m_input_tokens: randInt(s + 3, 0, 5_000),
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: randInt(s + 4, 3_000, 20_000),
        server_tool_use: null,
      })
    }
    if (rng(s + 10) < 0.12 * act) {
      results.push({
        workspace_id: 'ws-prod-001',
        api_key_id: 'key-prod-001',
        model: 'claude-opus-4-7',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 11, 5_000, 40_000),
        cached_input_tokens: randInt(s + 12, 2_000, 15_000),
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
        output_tokens: randInt(s + 13, 1_000, 8_000),
        server_tool_use: null,
      })
    }
    if (rng(s + 20) < 0.65 * act) {
      results.push({
        workspace_id: 'ws-dev-002',
        api_key_id: 'key-dev-001',
        model: 'claude-sonnet-4-6',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 21, 5_000, 60_000),
        cached_input_tokens: randInt(s + 22, 1_000, 20_000),
        cache_creation: {
          ephemeral_5m_input_tokens: randInt(s + 23, 0, 2_000),
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: randInt(s + 24, 1_000, 10_000),
        server_tool_use: null,
      })
    }
    if (rng(s + 30) < 0.8 * act) {
      results.push({
        workspace_id: 'ws-dev-002',
        api_key_id: 'key-dev-001',
        model: 'claude-haiku-4-5-20251001',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 31, 50_000, 400_000),
        cached_input_tokens: randInt(s + 32, 20_000, 100_000),
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
        output_tokens: randInt(s + 33, 10_000, 60_000),
        server_tool_use: null,
      })
    }
    if (rng(s + 40) < 0.45 * act) {
      results.push({
        workspace_id: 'ws-rsch-003',
        api_key_id: 'key-rsch-001',
        model: 'claude-sonnet-4-6',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 41, 10_000, 100_000),
        cached_input_tokens: randInt(s + 42, 5_000, 50_000),
        cache_creation: {
          ephemeral_5m_input_tokens: randInt(s + 43, 0, 8_000),
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: randInt(s + 44, 2_000, 18_000),
        server_tool_use: null,
      })
    }
    if (rng(s + 50) < 0.25) {
      results.push({
        workspace_id: null,
        api_key_id: 'key-legacy-001',
        model: 'claude-sonnet-4-6',
        service_tier: 'standard',
        context_window: null,
        uncached_input_tokens: randInt(s + 51, 2_000, 20_000),
        cached_input_tokens: randInt(s + 52, 0, 5_000),
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
        output_tokens: randInt(s + 53, 500, 3_000),
        server_tool_use: null,
      })
    }

    if (results.length > 0) {
      buckets.push({
        starting_at: new Date(t).toISOString(),
        ending_at: new Date(t + HOUR).toISOString(),
        results,
      })
    }
  }

  return buckets
}

const BASE_DAILY_COSTS: Array<{ workspace_id: string | null; description: string; cost: number }> =
  [
    { workspace_id: 'ws-prod-001', description: 'Claude Sonnet 4 - Input Tokens', cost: 8.5 },
    { workspace_id: 'ws-prod-001', description: 'Claude Sonnet 4 - Output Tokens', cost: 13.2 },
    { workspace_id: 'ws-prod-001', description: 'Claude Opus 4 - Input Tokens', cost: 5.4 },
    { workspace_id: 'ws-prod-001', description: 'Claude Opus 4 - Output Tokens', cost: 21.6 },
    { workspace_id: 'ws-dev-002', description: 'Claude Sonnet 4 - Input Tokens', cost: 2.1 },
    { workspace_id: 'ws-dev-002', description: 'Claude Sonnet 4 - Output Tokens', cost: 3.8 },
    { workspace_id: 'ws-dev-002', description: 'Claude Haiku 4 - Input Tokens', cost: 1.8 },
    { workspace_id: 'ws-dev-002', description: 'Claude Haiku 4 - Output Tokens', cost: 2.3 },
    { workspace_id: 'ws-rsch-003', description: 'Claude Sonnet 4 - Input Tokens', cost: 3.2 },
    { workspace_id: 'ws-rsch-003', description: 'Claude Sonnet 4 - Output Tokens', cost: 5.1 },
    { workspace_id: null, description: 'Claude Sonnet 4 - Input Tokens', cost: 0.8 },
    { workspace_id: null, description: 'Claude Sonnet 4 - Output Tokens', cost: 1.2 },
  ]

export function generateCostBuckets(fromMs: number, toMs: number): CostBucket[] {
  const DAY = 86_400_000
  const buckets: CostBucket[] = []

  for (let t = fromMs; t < toMs; t += DAY) {
    const results = BASE_DAILY_COSTS.map((item, i) => ({
      workspace_id: item.workspace_id,
      description: item.description,
      cost_usd: item.cost * (0.8 + rng(t / 1000 + i) * 0.4),
    }))
    buckets.push({
      starting_at: new Date(t).toISOString(),
      ending_at: new Date(t + DAY).toISOString(),
      results,
    })
  }

  return buckets
}
