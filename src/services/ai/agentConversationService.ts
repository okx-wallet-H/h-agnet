import {
  agentConversationApi,
  type SendAgentConversationMessageInput,
} from './agentConversationApi'

export function listAgentConversationMessages() {
  return agentConversationApi.listMessages()
}

export function listAgentConversationTurns() {
  return agentConversationApi.listTurns()
}

export function sendAgentConversationMessage(
  input: SendAgentConversationMessageInput,
) {
  return agentConversationApi.sendMessage(input)
}
