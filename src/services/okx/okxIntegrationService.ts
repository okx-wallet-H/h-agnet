import { okxIntegrationApi } from './okxIntegrationApi'

export function getOkxIntegrationRemoteStatus() {
  return okxIntegrationApi.getStatus()
}
