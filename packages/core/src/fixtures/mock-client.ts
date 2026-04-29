import type {
  CostPageResponse,
  CostParams,
  OrgInfo,
  UsagePageResponse,
  UsageParams,
  WorkspacesPageResponse,
} from '../anthropic/types.js'
import {
  FIXTURE_WORKSPACES,
  MOCK_END_MS,
  MOCK_START_MS,
  generateCostBuckets,
  generateUsageBuckets,
} from './data.js'

export class MockAnthropicClient {
  async getMe(): Promise<OrgInfo> {
    return { id: 'org-mock-001', name: 'Demo Org (mock data)' }
  }

  async validateAndGetOrg(): Promise<OrgInfo | null> {
    return this.getMe()
  }

  async getUsagePage(_params: UsageParams & { page?: string }): Promise<UsagePageResponse> {
    return {
      data: generateUsageBuckets(MOCK_START_MS, MOCK_END_MS),
      has_more: false,
      next_page: null,
    }
  }

  async getCostPage(_params: CostParams & { page?: string }): Promise<CostPageResponse> {
    return {
      data: generateCostBuckets(MOCK_START_MS, MOCK_END_MS),
      has_more: false,
      next_page: null,
    }
  }

  async getWorkspacesPage(_params?: { page?: string }): Promise<WorkspacesPageResponse> {
    return { data: FIXTURE_WORKSPACES, has_more: false, next_page: null }
  }
}
