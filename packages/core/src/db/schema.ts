import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usageBuckets = sqliteTable(
  'usage_buckets',
  {
    bucketStart: integer('bucket_start').notNull(),
    bucketEnd: integer('bucket_end').notNull(),
    workspaceId: text('workspace_id'),
    apiKeyId: text('api_key_id'),
    model: text('model').notNull(),
    serviceTier: text('service_tier').notNull(),
    contextWindow: text('context_window'),

    uncachedInputTokens: integer('uncached_input_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    cacheCreation5mTokens: integer('cache_creation_5m_tokens').notNull().default(0),
    cacheCreation1hTokens: integer('cache_creation_1h_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    serverToolUseTokens: integer('server_tool_use_tokens').notNull().default(0),

    syncedAt: integer('synced_at').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.bucketStart,
        table.workspaceId,
        table.apiKeyId,
        table.model,
        table.serviceTier,
      ],
    }),
  ],
)

export const costBuckets = sqliteTable(
  'cost_buckets',
  {
    bucketStart: integer('bucket_start').notNull(),
    bucketEnd: integer('bucket_end').notNull(),
    workspaceId: text('workspace_id'),
    description: text('description').notNull(),
    costUsd: real('cost_usd').notNull(),
    syncedAt: integer('synced_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.bucketStart, table.workspaceId, table.description] })],
)

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayColor: text('display_color'),
  archivedAt: integer('archived_at'),
  syncedAt: integer('synced_at').notNull(),
})

export const syncCheckpoints = sqliteTable(
  'sync_checkpoints',
  {
    endpoint: text('endpoint').notNull(),
    rangeStart: integer('range_start').notNull(),
    rangeEnd: integer('range_end').notNull(),
    syncedAt: integer('synced_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.endpoint, table.rangeStart] })],
)
