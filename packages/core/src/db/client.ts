import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

export const DB_DIR = path.join(os.homedir(), '.claude-cost')
const DB_PATH = path.join(DB_DIR, 'cache.db')

// SQL-as-strings migrations — avoids file-system path issues in a bundled CLI.
// Add new entries to the END of this array only; never modify existing ones.
const MIGRATIONS: string[] = [
  // 0000_initial
  `CREATE TABLE IF NOT EXISTS usage_buckets (
    bucket_start INTEGER NOT NULL,
    bucket_end INTEGER NOT NULL,
    workspace_id TEXT,
    api_key_id TEXT,
    model TEXT NOT NULL,
    service_tier TEXT NOT NULL,
    context_window TEXT,
    uncached_input_tokens INTEGER NOT NULL DEFAULT 0,
    cached_input_tokens INTEGER NOT NULL DEFAULT 0,
    cache_creation_5m_tokens INTEGER NOT NULL DEFAULT 0,
    cache_creation_1h_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    server_tool_use_tokens INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER NOT NULL,
    PRIMARY KEY (bucket_start, workspace_id, api_key_id, model, service_tier)
  )`,
  `CREATE TABLE IF NOT EXISTS cost_buckets (
    bucket_start INTEGER NOT NULL,
    bucket_end INTEGER NOT NULL,
    workspace_id TEXT,
    description TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    synced_at INTEGER NOT NULL,
    PRIMARY KEY (bucket_start, workspace_id, description)
  )`,
  `CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_color TEXT,
    archived_at INTEGER,
    synced_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_checkpoints (
    endpoint TEXT NOT NULL,
    range_start INTEGER NOT NULL,
    range_end INTEGER NOT NULL,
    synced_at INTEGER NOT NULL,
    PRIMARY KEY (endpoint, range_start)
  )`,
  `CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`,
]

function applyMigrations(sqlite: Database.Database): void {
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)',
  )

  const applied = (
    sqlite.prepare('SELECT id FROM _migrations ORDER BY id').all() as { id: number }[]
  ).map((r) => r.id)

  const insert = sqlite.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)')

  for (let i = 0; i < MIGRATIONS.length; i++) {
    if (applied.includes(i)) continue
    const migration = MIGRATIONS[i]
    if (!migration) continue
    sqlite.exec(migration)
    insert.run(i, Date.now())
  }
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db) return _db

  fs.mkdirSync(DB_DIR, { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  applyMigrations(sqlite)

  _db = drizzle(sqlite, { schema })
  return _db
}
