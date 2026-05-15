import { apiRequest } from '../api/httpClient'
import type { OkxIntegrationStatus } from './types'

export type OkxIntegrationApi = {
  getStatus: () => Promise<OkxIntegrationStatus>
}

export const okxIntegrationApi: OkxIntegrationApi = {
  getStatus() {
    return apiRequest('/integrations/okx/status')
  },
}
