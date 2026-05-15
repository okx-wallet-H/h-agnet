import { useQuery } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import { getOkxIntegrationRemoteStatus } from '../../../services/okx/okxIntegrationService'

export const okxIntegrationKeys = {
  all: ['okx-integration'] as const,
  status: () => [...okxIntegrationKeys.all, 'status'] as const,
}

export function useOkxIntegrationStatus() {
  return useQuery({
    queryKey: okxIntegrationKeys.status(),
    queryFn: getOkxIntegrationRemoteStatus,
    enabled: isApiConfigured(),
    retry: false,
  })
}
