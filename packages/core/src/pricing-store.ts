import fs from 'node:fs'
import path from 'node:path'
import { DB_DIR } from './db/client.js'
import type { ModelPricing } from './pricing.js'

const PRICING_PATH = path.join(DB_DIR, 'pricing.json')

export interface PricingStore {
  updatedAt: string
  prices: Record<string, ModelPricing>
}

export function loadPricingStore(): PricingStore | null {
  try {
    const raw = fs.readFileSync(PRICING_PATH, 'utf8')
    return JSON.parse(raw) as PricingStore
  } catch {
    return null
  }
}

export function savePricingStore(store: PricingStore): void {
  fs.mkdirSync(DB_DIR, { recursive: true })
  fs.writeFileSync(PRICING_PATH, JSON.stringify(store, null, 2), { mode: 0o600 })
}

// Fetches and parses prices from anthropic.com/pricing.
// Returns null if the page can't be parsed reliably.
export async function fetchLivePricing(): Promise<Record<string, ModelPricing> | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  let html: string
  try {
    const res = await fetch('https://www.anthropic.com/pricing', {
      headers: { 'user-agent': 'simplecost-cli/1.0' },
      signal: controller.signal,
    })
    html = await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }

  const prices: Record<string, ModelPricing> = {}

  // Extract JSON-like price data embedded in Next.js __NEXT_DATA__ script tag
  const nextDataMatch = /__NEXT_DATA__[^>]*>(\{.+?\})<\/script>/s.exec(html)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]!)
      const text = JSON.stringify(data)
      extractPricesFromText(text, prices)
    } catch {
      // fall through to HTML parsing
    }
  }

  // Fallback: parse HTML table rows for model names and dollar amounts
  if (Object.keys(prices).length === 0) {
    extractPricesFromHtml(html, prices)
  }

  return Object.keys(prices).length >= 3 ? prices : null
}

function extractPricesFromText(text: string, out: Record<string, ModelPricing>): void {
  // Look for patterns like "claude-sonnet-4-5" near dollar amounts
  const modelPattern = /"(claude-[a-z0-9-]+)"[^}]{0,300}?"(\d+(?:\.\d+)?)"[^}]{0,100}?"(\d+(?:\.\d+)?)"/g
  let m: RegExpExecArray | null
  while ((m = modelPattern.exec(text)) !== null) {
    const [, model, inputStr, outputStr] = m
    const input = parseFloat(inputStr!)
    const output = parseFloat(outputStr!)
    if (model && input > 0 && output > input) {
      out[model] = { inputPerMToken: input, outputPerMToken: output }
    }
  }
}

function extractPricesFromHtml(html: string, out: Record<string, ModelPricing>): void {
  // Match rows that contain a Claude model API name and two dollar amounts
  const rowPattern = /(claude-[a-z0-9-]+)[^$]*\$(\d+(?:\.\d+)?)[^$]*\$(\d+(?:\.\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = rowPattern.exec(html)) !== null) {
    const [, model, inputStr, outputStr] = m
    const input = parseFloat(inputStr!)
    const output = parseFloat(outputStr!)
    if (model && input > 0 && output > input) {
      out[model] = { inputPerMToken: input, outputPerMToken: output }
    }
  }
}
