import { and, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { costBuckets, usageBuckets } from '../db/schema.js'

export interface Totals {
  totalCostUsd: number
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  cacheHitRate: number
  activeWorkspaceCount: number
  models: string[]
}

export function getTotals(fromTs: number, toTs: number): Totals {
  const db = getDb()

  const [costRow] = db
    .select({ total: sql<number>`COALESCE(SUM(${costBuckets.costUsd}), 0)` })
    .from(costBuckets)
    .where(and(gte(costBuckets.bucketStart, fromTs), lte(costBuckets.bucketStart, toTs)))
    .all()

  const [tokenRow] = db
    .select({
      uncached: sql<number>`COALESCE(SUM(${usageBuckets.uncachedInputTokens}), 0)`,
      cached: sql<number>`COALESCE(SUM(${usageBuckets.cachedInputTokens}), 0)`,
      output: sql<number>`COALESCE(SUM(${usageBuckets.outputTokens}), 0)`,
    })
    .from(usageBuckets)
    .where(and(gte(usageBuckets.bucketStart, fromTs), lte(usageBuckets.bucketStart, toTs)))
    .all()

  // "Active" = workspaces with usage in the requested range (not the lifetime
  // workspaces table, which would also count archived ones).
  const wsRows = db
    .selectDistinct({ id: usageBuckets.workspaceId })
    .from(usageBuckets)
    .where(
      and(
        gte(usageBuckets.bucketStart, fromTs),
        lte(usageBuckets.bucketStart, toTs),
        isNotNull(usageBuckets.workspaceId),
      ),
    )
    .all()

  const modelRows = db
    .select({ model: usageBuckets.model })
    .from(usageBuckets)
    .where(and(gte(usageBuckets.bucketStart, fromTs), lte(usageBuckets.bucketStart, toTs)))
    .groupBy(usageBuckets.model)
    .all()

  const uncached = tokenRow?.uncached ?? 0
  const cached = tokenRow?.cached ?? 0
  const totalInput = uncached + cached
  const cacheHitRate = totalInput > 0 ? cached / totalInput : 0

  return {
    totalCostUsd: costRow?.total ?? 0,
    totalInputTokens: totalInput,
    totalCachedInputTokens: cached,
    totalOutputTokens: tokenRow?.output ?? 0,
    cacheHitRate,
    activeWorkspaceCount: wsRows.length,
    models: modelRows.map((r) => r.model),
  }
}
