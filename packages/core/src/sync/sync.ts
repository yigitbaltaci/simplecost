import { and, gte, lte } from 'drizzle-orm'
import { AnthropicAdminClient } from '../anthropic/client.js'
import { getAdminKey } from '../config/store.js'
import { getDb } from '../db/client.js'
import { costBuckets, syncCheckpoints, usageBuckets, workspaces } from '../db/schema.js'
import { MockAnthropicClient } from '../fixtures/mock-client.js'

export interface SyncResult {
  usageBucketsAdded: number
  costBucketsAdded: number
  workspacesAdded: number
}

export interface SyncOptions {
  from: Date
  to: Date
  onProgress?: (msg: string) => void
}

function isMockMode(): boolean {
  return process.env['CLAUDE_COST_MOCK'] === '1'
}

function getClient(): AnthropicAdminClient | MockAnthropicClient {
  if (isMockMode()) return new MockAnthropicClient()
  const key = getAdminKey()
  if (!key) throw new Error("No admin API key configured. Run 'simplecost auth' first.")
  return new AnthropicAdminClient(key)
}

function toIso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export async function sync(opts: SyncOptions): Promise<SyncResult> {
  const { from, to, onProgress } = opts
  const progress = (msg: string) => onProgress?.(msg)
  const db = getDb()
  const client = getClient()
  const now = Math.floor(Date.now() / 1000)

  const fromTs = Math.floor(from.getTime() / 1000)
  const toTs = Math.floor(to.getTime() / 1000)
  const days = Math.ceil((toTs - fromTs) / 86_400)
  const dayLimit = Math.min(days, 31)

  // --- Workspaces ---
  progress('Syncing workspaces…')
  const wsPage = await client.getWorkspacesPage()
  const allWorkspaces = wsPage.data

  if (allWorkspaces.length > 0) {
    const wsInserts = allWorkspaces.map((w) => ({
      id: w.id,
      name: w.name,
      displayColor: w.display_color,
      archivedAt: w.archived_at ? Math.floor(new Date(w.archived_at).getTime() / 1000) : null,
      syncedAt: now,
    }))
    db.insert(workspaces).values(wsInserts).onConflictDoUpdate({
      target: workspaces.id,
      set: {
        name: workspaces.name,
        displayColor: workspaces.displayColor,
        archivedAt: workspaces.archivedAt,
        syncedAt: workspaces.syncedAt,
      },
    }).run()
  }
  progress(`  ${allWorkspaces.length} workspaces`)

  // --- Usage buckets ---
  progress('Syncing usage data…')
  db.delete(usageBuckets)
    .where(and(gte(usageBuckets.bucketStart, fromTs), lte(usageBuckets.bucketStart, toTs)))
    .run()

  const usagePage = await client.getUsagePage({
    starting_at: toIso(from),
    ending_at: toIso(to),
    bucket_width: '1d',
    'group_by[]': ['workspace_id', 'model'],
    limit: dayLimit,
  })
  const allUsage = usagePage.data

  let usageCount = 0
  for (const bucket of allUsage) {
    const bucketStartTs = Math.floor(new Date(bucket.starting_at).getTime() / 1000)
    const bucketEndTs = Math.floor(new Date(bucket.ending_at).getTime() / 1000)

    const rows = bucket.results.map((r) => ({
      bucketStart: bucketStartTs,
      bucketEnd: bucketEndTs,
      workspaceId: r.workspace_id,
      apiKeyId: r.api_key_id ?? null,
      model: r.model,
      serviceTier: r.service_tier ?? '',
      contextWindow: r.context_window ?? null,
      uncachedInputTokens: r.uncached_input_tokens,
      cachedInputTokens: r.cached_input_tokens,
      cacheCreation5mTokens: r.cache_creation?.ephemeral_5m_input_tokens ?? 0,
      cacheCreation1hTokens: r.cache_creation?.ephemeral_1h_input_tokens ?? 0,
      outputTokens: r.output_tokens,
      serverToolUseTokens: r.server_tool_use?.web_search_requests ?? 0,
      syncedAt: now,
    }))

    if (rows.length > 0) {
      db.insert(usageBuckets).values(rows).run()
      usageCount += rows.length
    }
  }
  progress(`  ${usageCount} usage buckets`)

  // --- Cost buckets ---
  progress('Syncing cost data…')
  db.delete(costBuckets)
    .where(and(gte(costBuckets.bucketStart, fromTs), lte(costBuckets.bucketStart, toTs)))
    .run()

  const costPage = await client.getCostPage({
    starting_at: toIso(from),
    ending_at: toIso(to),
    'group_by[]': ['workspace_id'],
    limit: dayLimit,
  })
  const allCosts = costPage.data

  let costCount = 0
  for (const bucket of allCosts) {
    const bucketStartTs = Math.floor(new Date(bucket.starting_at).getTime() / 1000)
    const bucketEndTs = Math.floor(new Date(bucket.ending_at).getTime() / 1000)

    const rows = bucket.results.map((r) => ({
      bucketStart: bucketStartTs,
      bucketEnd: bucketEndTs,
      workspaceId: r.workspace_id,
      description: (r as { description?: string }).description ?? '',
      costUsd: r.cost_usd,
      syncedAt: now,
    }))

    if (rows.length > 0) {
      db.insert(costBuckets).values(rows).run()
      costCount += rows.length
    }
  }
  progress(`  ${costCount} cost buckets`)

  // --- Checkpoints ---
  db.insert(syncCheckpoints)
    .values([
      { endpoint: 'usage', rangeStart: fromTs, rangeEnd: toTs, syncedAt: now },
      { endpoint: 'cost', rangeStart: fromTs, rangeEnd: toTs, syncedAt: now },
    ])
    .onConflictDoUpdate({
      target: [syncCheckpoints.endpoint, syncCheckpoints.rangeStart],
      set: { rangeEnd: toTs, syncedAt: now },
    })
    .run()

  return {
    usageBucketsAdded: usageCount,
    costBucketsAdded: costCount,
    workspacesAdded: allWorkspaces.length,
  }
}
