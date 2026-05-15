import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  listAgentConversationMessages,
  listAgentConversationTurns,
  sendAgentConversationMessage,
} from '../../../services/ai/agentConversationService'

export const agentConversationKeys = {
  all: ['agent-conversation'] as const,
  messages: () => [...agentConversationKeys.all, 'messages'] as const,
  turns: () => [...agentConversationKeys.all, 'turns'] as const,
}

export function useAgentConversationMessages() {
  return useQuery({
    queryKey: agentConversationKeys.messages(),
    queryFn: listAgentConversationMessages,
    enabled: isApiConfigured(),
  })
}

export function useAgentConversationTurns() {
  return useQuery({
    queryKey: agentConversationKeys.turns(),
    queryFn: listAgentConversationTurns,
    enabled: isApiConfigured(),
  })
}

export function useSendAgentConversationMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendAgentConversationMessage,
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: agentConversationKeys.all,
      })
      void queryClient.invalidateQueries({ queryKey: ['card-library'] })
      void queryClient.invalidateQueries({ queryKey: ['agent-strategy'] })
      void queryClient.invalidateQueries({ queryKey: ['trade-proposal'] })
    },
  })
}
