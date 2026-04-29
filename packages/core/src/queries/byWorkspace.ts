import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { costBuckets, usageBuckets, workspaces } from '../db/schema.js'

export interface WorkspaceSpend {
  workspaceId: string | null
  workspaceName: string
  totalCostUsd: number
  pctOfTotal: number
}

export function getSpendByWorkspace(fromTs: number, toTs: number): WorkspaceSpend[] {
  const db = getDb()

  const rows = db
    .select({
      workspaceId: costBuckets.workspaceId,
      workspaceName: sql<string>`COALESCE(${workspaces.name}, '(no workspace)')`,
      totalCost: sql<number>`COALESCE(SUM(${costBuckets.costUsd}), 0)`,
    })
    .from(costBuckets)
    .leftJoin(workspaces, eq(costBuckets.workspaceId, workspaces.id))
    .where(and(gte(costBuckets.bucketStart, fromTs), lte(costBuckets.bucketStart, toTs)))
    .groupBy(costBuckets.workspaceId)
    .orderBy(desc(sql`SUM(${costBuckets.costUsd})`))
    .all()

  const grandTotal = rows.reduce((sum, r) => sum + r.totalCost, 0)

  return rows.map((r) => ({
    workspaceId: r.workspaceId,
    workspaceName: r.workspaceName,
    totalCostUsd: r.totalCost,
    pctOfTotal: grandTotal > 0 ? (r.totalCost / grandTotal) * 100 : 0,
  }))
}

export interface WorkspaceDailySpend {
  dailyCosts: number[]
  peakHour: number
  topModel: string
}

export function getWorkspaceDetail(
  workspaceId: string | null,
  fromTs: number,
  toTs: number,
): WorkspaceDailySpend {
  const db = getDb()
  const DAY = 86_400

  const dailyCosts: number[] = []
  for (let t = fromTs; t < toTs; t += DAY) {
    const whereClause =
      workspaceId !== null
        ? and(
            gte(costBuckets.bucketStart, t),
            lte(costBuckets.bucketStart, t + DAY - 1),
            eq(costBuckets.workspaceId, workspaceId),
          )
        : and(
            gte(costBuckets.bucketStart, t),
            lte(costBuckets.bucketStart, t + DAY - 1),
            sql`${costBuckets.workspaceId} IS NULL`,
          )

    const [row] = db
      .select({ total: sql<number>`COALESCE(SUM(${costBuckets.costUsd}), 0)` })
      .from(costBuckets)
      .where(whereClause)
      .all()
    dailyCosts.push(row?.total ?? 0)
  }

  const usageWhereClause =
    workspaceId !== null
      ? and(
          gte(usageBuckets.bucketStart, fromTs),
          lte(usageBuckets.bucketStart, toTs),
          eq(usageBuckets.workspaceId, workspaceId),
        )
      : and(
          gte(usageBuckets.bucketStart, fromTs),
          lte(usageBuckets.bucketStart, toTs),
          sql`${usageBuckets.workspaceId} IS NULL`,
        )

  const bucketRows = db
    .select({
      bucketStart: usageBuckets.bucketStart,
      model: usageBuckets.model,
      tokens: sql<number>`COALESCE(SUM(${usageBuckets.uncachedInputTokens} + ${usageBuckets.cachedInputTokens} + ${usageBuckets.outputTokens}), 0)`,
    })
    .from(usageBuckets)
    .where(usageWhereClause)
    .groupBy(usageBuckets.bucketStart, usageBuckets.model)
    .all()

  const hourTotals = new Array<number>(24).fill(0)
  const modelTotals: Record<string, number> = {}

  for (const r of bucketRows) {
    const h = new Date(r.bucketStart * 1000).getHours()
    hourTotals[h] = (hourTotals[h] ?? 0) + r.tokens
    modelTotals[r.model] = (modelTotals[r.model] ?? 0) + r.tokens
  }

  let peakHour = 0
  let peakVal = 0
  for (let h = 0; h < 24; h++) {
    if ((hourTotals[h] ?? 0) > peakVal) {
      peakVal = hourTotals[h] ?? 0
      peakHour = h
    }
  }

  const topModel = Object.entries(modelTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  return { dailyCosts, peakHour, topModel }
}

export interface ExportRow {
  bucketStartIso: string
  bucketEndIso: string
  workspaceId: string | null
  workspaceName: string
  apiKeyId: string | null
  model: string
  serviceTier: string
  uncachedInputTokens: number
  cachedInputTokens: number
  outputTokens: number
}

export function getExportRows(fromTs: number, toTs: number): ExportRow[] {
  const db = getDb()
  return db
    .select({
      bucketStart: usageBuckets.bucketStart,
      bucketEnd: usageBuckets.bucketEnd,
      workspaceId: usageBuckets.workspaceId,
      workspaceName: sql<string>`COALESCE(${workspaces.name}, '(no workspace)')`,
      apiKeyId: usageBuckets.apiKeyId,
      model: usageBuckets.model,
      serviceTier: usageBuckets.serviceTier,
      uncachedInputTokens: usageBuckets.uncachedInputTokens,
      cachedInputTokens: usageBuckets.cachedInputTokens,
      outputTokens: usageBuckets.outputTokens,
    })
    .from(usageBuckets)
    .leftJoin(workspaces, eq(usageBuckets.workspaceId, workspaces.id))
    .where(and(gte(usageBuckets.bucketStart, fromTs), lte(usageBuckets.bucketStart, toTs)))
    .orderBy(usageBuckets.bucketStart)
    .all()
    .map((r) => ({
      bucketStartIso: new Date(r.bucketStart * 1000).toISOString(),
      bucketEndIso: new Date(r.bucketEnd * 1000).toISOString(),
      workspaceId: r.workspaceId,
      workspaceName: r.workspaceName,
      apiKeyId: r.apiKeyId,
      model: r.model,
      serviceTier: r.serviceTier,
      uncachedInputTokens: r.uncachedInputTokens,
      cachedInputTokens: r.cachedInputTokens,
      outputTokens: r.outputTokens,
    }))
}
