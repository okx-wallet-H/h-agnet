import { apiRequest } from '../api/httpClient'
import type {
  AgentConversationMessage,
  AgentConversationResponse,
  AgentConversationTurn,
} from './types'

export type SendAgentConversationMessageInput = {
  content: string
}

export type AgentConversationApi = {
  listMessages: () => Promise<AgentConversationMessage[]>
  listTurns: () => Promise<AgentConversationTurn[]>
  sendMessage: (
    input: SendAgentConversationMessageInput,
  ) => Promise<AgentConversationResponse>
}

export const agentConversationApi: AgentConversationApi = {
  listMessages() {
    return apiRequest('/ai/conversation/messages')
  },
  listTurns() {
    return apiRequest('/ai/conversation/turns')
  },
  sendMessage(input) {
    return apiRequest('/ai/conversation/messages', {
      method: 'POST',
      body: input,
    })
  },
}
