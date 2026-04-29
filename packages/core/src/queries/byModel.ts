import { and, gte, lte, sql } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { costBuckets, usageBuckets } from '../db/schema.js'
import { estimateTokenDollars } from '../pricing.js'

export interface ModelSpend {
  model: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  cacheHitRate: number
  totalCostUsd: number
}

// Distributes the actual cost-report total across model IDs using estimated
// per-model dollars (tokens × price) as weights. This preserves the true
// total while attributing it to real model IDs from usage_buckets — sidesteps
// the brittle "Claude Sonnet 4 - Input Tokens" description parsing which
// can't tell minor versions apart (4.5 vs 4.6 vs 4.7).
export function getSpendByModel(fromTs: number, toTs: number): ModelSpend[] {
  const db = getDb()

  const tokenRows = db
    .select({
      model: usageBuckets.model,
      uncached: sql<number>`COALESCE(SUM(${usageBuckets.uncachedInputTokens}), 0)`,
      cached: sql<number>`COALESCE(SUM(${usageBuckets.cachedInputTokens}), 0)`,
      cache5m: sql<number>`COALESCE(SUM(${usageBuckets.cacheCreation5mTokens}), 0)`,
      cache1h: sql<number>`COALESCE(SUM(${usageBuckets.cacheCreation1hTokens}), 0)`,
      output: sql<number>`COALESCE(SUM(${usageBuckets.outputTokens}), 0)`,
    })
    .from(usageBuckets)
    .where(and(gte(usageBuckets.bucketStart, fromTs), lte(usageBuckets.bucketStart, toTs)))
    .groupBy(usageBuckets.model)
    .all()

  const [costRow] = db
    .select({ total: sql<number>`COALESCE(SUM(${costBuckets.costUsd}), 0)` })
    .from(costBuckets)
    .where(and(gte(costBuckets.bucketStart, fromTs), lte(costBuckets.bucketStart, toTs)))
    .all()

  const totalActualCost = costRow?.total ?? 0

  const weighted = tokenRows.map((r) => ({
    ...r,
    estimated: estimateTokenDollars({
      model: r.model,
      uncachedInput: r.uncached,
      cachedInput: r.cached,
      cacheCreation5m: r.cache5m,
      cacheCreation1h: r.cache1h,
      output: r.output,
    }),
  }))

  const totalEstimated = weighted.reduce((s, w) => s + w.estimated, 0)

  return weighted
    .map((r) => {
      const totalInput = r.uncached + r.cached
      const share = totalEstimated > 0 ? r.estimated / totalEstimated : 0
      return {
        model: r.model,
        inputTokens: totalInput,
        cachedInputTokens: r.cached,
        outputTokens: r.output,
        cacheHitRate: totalInput > 0 ? r.cached / totalInput : 0,
        totalCostUsd: totalActualCost * share,
      }
    })
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}
