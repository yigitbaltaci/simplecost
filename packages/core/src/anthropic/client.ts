import type {
  CostPageResponse,
  CostParams,
  OrgInfo,
  UsagePageResponse,
  UsageParams,
  WorkspacesPageResponse,
} from './types.js'

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSec: number) {
    super(`Rate limited. Try again in ${retryAfterSec}s.`)
  }
}

const BASE_URL = 'https://api.anthropic.com'
const API_VERSION = '2023-06-01'

export class AnthropicAdminClient {
  constructor(private readonly apiKey: string) {}

  private async request<T>(
    path: string,
    params?: Record<string, string | string[] | number>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v)
          }
        } else if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)

    let res: Response
    try {
      res = await fetch(url.toString(), {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
          'content-type': 'application/json',
        },
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      if ((err as Error).name === 'AbortError') throw new Error('Request timed out after 30s.')
      throw err
    }
    clearTimeout(timer)

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after')
      const waitSec = retryAfter ? Number.parseInt(retryAfter) : 60
      throw new RateLimitError(waitSec)
    }
    if (res.status === 401)
      throw new Error("Invalid admin API key. Run 'simplecost auth' to update.")
    if (res.status === 403)
      throw new Error('This key lacks admin permissions. Use an Anthropic admin API key.')
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText)
      throw new Error(`Anthropic API error ${res.status}: ${body}`)
    }

    const json = await res.json()
    if (process.env.SIMPLECOST_DEBUG) {
      console.error('\n[DEBUG]', path, JSON.stringify(json).slice(0, 500))
    }
    return json as T
  }

  async getMe(): Promise<OrgInfo> {
    return this.request<OrgInfo>('/v1/organizations/me')
  }

  // Validates the admin key. Tries `/me` first (some Admin keys expose org info there);
  // falls back to a workspaces probe if `/me` is unavailable on this org.
  // Returns null orgInfo when the key is valid but no org metadata can be fetched.
  async validateAndGetOrg(): Promise<OrgInfo | null> {
    try {
      return await this.getMe()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const isMissingEndpoint = /\b(404|405|not[_ ]?found)\b/i.test(msg)
      if (!isMissingEndpoint) throw err
    }
    // Probe workspaces — succeeds for any valid admin key (even orgs with no workspaces).
    await this.getWorkspacesPage()
    return null
  }

  async getUsagePage(params: UsageParams & { page?: string }): Promise<UsagePageResponse> {
    const { 'group_by[]': groupBy, page, ...rest } = params
    return this.request<UsagePageResponse>('/v1/organizations/usage_report/messages', {
      ...rest,
      'group_by[]': groupBy,
      ...(page ? { page } : {}),
    })
  }

  async getCostPage(params: CostParams & { page?: string }): Promise<CostPageResponse> {
    const { 'group_by[]': groupBy, page, ...rest } = params
    return this.request<CostPageResponse>('/v1/organizations/cost_report', {
      ...rest,
      'group_by[]': groupBy,
      ...(page ? { page } : {}),
    })
  }

  async getWorkspacesPage(params?: { page?: string }): Promise<WorkspacesPageResponse> {
    return this.request<WorkspacesPageResponse>('/v1/organizations/workspaces', {
      ...(params?.page ? { page: params.page } : {}),
    })
  }
}
