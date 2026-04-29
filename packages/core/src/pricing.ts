// Per-token prices in USD. Source: anthropic.com/pricing (verified 2026-04-29).
// At runtime, ~/.claude-cost/pricing.json (written by `simplecost prices`) takes precedence.
// Cache multipliers:
//   cache read        → 0.10× input
//   5m cache write    → 1.25× input
//   1h cache write    → 2.00× input

export interface ModelPricing {
  inputPerMToken: number
  outputPerMToken: number
}

const PRICES: Record<string, ModelPricing> = {
  // --- Claude 4 Opus ($5 / $25) ---
  'claude-opus-4-7':              { inputPerMToken: 5,    outputPerMToken: 25   },
  'claude-opus-4-6':              { inputPerMToken: 5,    outputPerMToken: 25   },
  'claude-opus-4-5':              { inputPerMToken: 5,    outputPerMToken: 25   },

  // --- Claude 4 Opus legacy ($15 / $75) ---
  'claude-opus-4-1':              { inputPerMToken: 15,   outputPerMToken: 75   },
  'claude-opus-4':                { inputPerMToken: 15,   outputPerMToken: 75   },

  // --- Claude 4 Sonnet ($3 / $15) ---
  'claude-sonnet-4-6':            { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-4-5':            { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-4':              { inputPerMToken: 3,    outputPerMToken: 15   },

  // --- Claude 3.7 Sonnet ($3 / $15) ---
  'claude-sonnet-3-7-20250219':   { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-3-7':            { inputPerMToken: 3,    outputPerMToken: 15   },

  // --- Claude 3.5 Sonnet ($3 / $15) ---
  'claude-sonnet-3-5-20241022':   { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-3-5-20240620':   { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-3-5':            { inputPerMToken: 3,    outputPerMToken: 15   },

  // --- Claude 4 Haiku ($1 / $5) ---
  'claude-haiku-4-5-20251001':    { inputPerMToken: 1,    outputPerMToken: 5    },
  'claude-haiku-4-5':             { inputPerMToken: 1,    outputPerMToken: 5    },

  // --- Claude 3.5 Haiku ($0.80 / $4) ---
  'claude-haiku-3-5-20241022':    { inputPerMToken: 0.80, outputPerMToken: 4    },
  'claude-haiku-3-5':             { inputPerMToken: 0.80, outputPerMToken: 4    },

  // --- Claude 3 ($15/$75 Opus, $3/$15 Sonnet, $0.25/$1.25 Haiku) ---
  'claude-opus-3-20240229':       { inputPerMToken: 15,   outputPerMToken: 75   },
  'claude-opus-3':                { inputPerMToken: 15,   outputPerMToken: 75   },
  'claude-sonnet-3-20240229':     { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-sonnet-3':              { inputPerMToken: 3,    outputPerMToken: 15   },
  'claude-haiku-3-20240307':      { inputPerMToken: 0.25, outputPerMToken: 1.25 },
  'claude-haiku-3':               { inputPerMToken: 0.25, outputPerMToken: 1.25 },

  // --- Claude 2 (legacy) ---
  'claude-2-1':                   { inputPerMToken: 8,    outputPerMToken: 24   },
  'claude-2-0':                   { inputPerMToken: 8,    outputPerMToken: 24   },
  'claude-2':                     { inputPerMToken: 8,    outputPerMToken: 24   },
  'claude-instant-1-2':           { inputPerMToken: 0.80, outputPerMToken: 2.40 },
  'claude-instant-1':             { inputPerMToken: 0.80, outputPerMToken: 2.40 },
}

const FAMILY_FALLBACKS: Array<{ pattern: RegExp; pricing: ModelPricing }> = [
  { pattern: /claude-opus-4/,    pricing: { inputPerMToken: 5,    outputPerMToken: 25   } },
  { pattern: /claude-opus/,      pricing: { inputPerMToken: 15,   outputPerMToken: 75   } },
  { pattern: /claude-sonnet/,    pricing: { inputPerMToken: 3,    outputPerMToken: 15   } },
  { pattern: /claude-haiku-4/,   pricing: { inputPerMToken: 1,    outputPerMToken: 5    } },
  { pattern: /claude-haiku-3-5/, pricing: { inputPerMToken: 0.80, outputPerMToken: 4    } },
  { pattern: /claude-haiku/,     pricing: { inputPerMToken: 0.25, outputPerMToken: 1.25 } },
  { pattern: /claude-instant/,   pricing: { inputPerMToken: 0.80, outputPerMToken: 2.40 } },
  { pattern: /claude-2/,         pricing: { inputPerMToken: 8,    outputPerMToken: 24   } },
]

const FALLBACK: ModelPricing = { inputPerMToken: 3, outputPerMToken: 15 }

import { loadPricingStore } from './pricing-store.js'

let _liveCache: Record<string, ModelPricing> | null | undefined = undefined

function getLivePrices(): Record<string, ModelPricing> | null {
  if (_liveCache !== undefined) return _liveCache
  _liveCache = loadPricingStore()?.prices ?? null
  return _liveCache
}

export function getModelPricing(model: string): ModelPricing {
  const live = getLivePrices()
  if (live?.[model]) return live[model]!

  // Longest prefix match (e.g. claude-haiku-3-5-20241022 → claude-haiku-3-5)
  const candidates = Object.keys(PRICES).filter((k) => model.startsWith(k))
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.length - a.length)
    return PRICES[candidates[0]!]!
  }

  for (const { pattern, pricing } of FAMILY_FALLBACKS) {
    if (pattern.test(model)) return pricing
  }

  return FALLBACK
}

export interface TokenBundle {
  model: string
  uncachedInput: number
  cachedInput: number
  cacheCreation5m: number
  cacheCreation1h: number
  output: number
}

export function estimateTokenDollars(t: TokenBundle): number {
  const p = getModelPricing(t.model)
  const rate = (perMToken: number) => perMToken / 1_000_000
  return (
    t.uncachedInput   * rate(p.inputPerMToken) +
    t.cachedInput     * rate(p.inputPerMToken) * 0.1 +
    t.cacheCreation5m * rate(p.inputPerMToken) * 1.25 +
    t.cacheCreation1h * rate(p.inputPerMToken) * 2.0 +
    t.output          * rate(p.outputPerMToken)
  )
}
