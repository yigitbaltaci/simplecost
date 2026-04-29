import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Redirect DB_DIR to a temp folder so tests don't touch ~/.claude-cost
const tmpDir = path.join(os.tmpdir(), `claude-cost-test-${process.pid}`)

vi.mock('../db/client.js', () => ({ DB_DIR: tmpDir }))

// Import AFTER mocking so the module picks up the mocked DB_DIR
const { getAdminKey, readConfig, setAdminKey } = await import('./store.js')

describe('config store', () => {
  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns null when no key is stored', () => {
    expect(getAdminKey()).toBeNull()
  })

  it('round-trips an admin key through encrypt/decrypt', () => {
    const key = 'sk-ant-admin01-test-key-1234567890'
    setAdminKey(key, 'org-123', 'My Org')
    expect(getAdminKey()).toBe(key)
  })

  it('stores orgId and orgName in config', () => {
    setAdminKey('sk-ant-admin01-test', 'org-abc', 'Acme Corp')
    const config = readConfig()
    expect(config.orgId).toBe('org-abc')
    expect(config.orgName).toBe('Acme Corp')
  })

  it('writes config file with restricted permissions', () => {
    setAdminKey('sk-ant-admin01-test', 'org-x', 'X')
    const configPath = path.join(tmpDir, 'config.json')
    const stat = fs.statSync(configPath)
    // Mode 0o600 = owner read/write only
    expect(stat.mode & 0o777).toBe(0o600)
  })

  it('returns null when stored key is corrupted', () => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(
      path.join(tmpDir, 'config.json'),
      JSON.stringify({ adminKey: 'not-valid-base64-encrypted-data!!!' }),
      { mode: 0o600 },
    )
    expect(getAdminKey()).toBeNull()
  })
})
