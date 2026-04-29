// Key storage uses AES-256-GCM with a machine-derived key.
// This is obfuscation, not real security — the key is stored on the local filesystem
// and the encryption key is derived from publicly available machine identifiers.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DB_DIR } from '../db/client.js'

const ALGORITHM = 'aes-256-gcm'
const CONFIG_PATH = path.join(DB_DIR, 'config.json')

interface Config {
  adminKey?: string
  orgId?: string
  orgName?: string
}

function deriveKey(): Buffer {
  const seed = os.hostname() + os.userInfo().username
  return crypto.scryptSync(seed, 'claude-cost-v1', 32)
}

function encrypt(plaintext: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(ciphertext: string): string {
  const key = deriveKey()
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function readConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(raw) as Config
  } catch {
    return {}
  }
}

function writeConfig(config: Config): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
}

export function getAdminKey(): string | null {
  const config = readConfig()
  if (!config.adminKey) return null
  try {
    return decrypt(config.adminKey)
  } catch {
    return null
  }
}

export function setAdminKey(plainKey: string, orgId: string, orgName: string): void {
  writeConfig({ adminKey: encrypt(plainKey), orgId, orgName })
}
