import { getApiSessionToken } from './sessionTokenStore'

export type ApiClientErrorCode =
  | 'missing-api-base-url'
  | 'request-failed'
  | 'invalid-response'

export class ApiClientError extends Error {
  code: ApiClientErrorCode

  constructor(code: ApiClientErrorCode, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
  }
}

const apiBaseUrl = process.env.EXPO_PUBLIC_H_AGENT_API_URL
export const H_WALLET_API_PREFIX = '/api/h/v1'

export function isApiConfigured() {
  return Boolean(apiBaseUrl)
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
}

type ApiEnvelope<TData> =
  | {
      ok: true
      data: TData
    }
  | {
      ok: false
      error?: {
        code?: string
        message?: string
      }
    }

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  if (!apiBaseUrl) {
    throw new ApiClientError(
      'missing-api-base-url',
      'H Wallet 后端 API 地址未配置。',
    )
  }

  const sessionToken = await getApiSessionToken()
  const response = await fetch(`${apiBaseUrl}${normalizeApiPath(path)}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<TResponse>
    | null

  if (!response.ok || !payload?.ok) {
    throw new ApiClientError(
      'request-failed',
      payload && 'error' in payload && payload.error?.message
        ? payload.error.message
        : `请求失败，状态码 ${response.status}。`,
    )
  }

  if (!('data' in payload)) {
    throw new ApiClientError('invalid-response', '后端响应缺少数据。')
  }

  return payload.data
}

function normalizeApiPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath.startsWith(H_WALLET_API_PREFIX)) {
    return normalizedPath
  }

  return `${H_WALLET_API_PREFIX}${normalizedPath}`
}
