import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  dryRunHSkill,
  getAgentRunnerStatus,
  getHSkillRuntimeStatus,
  getOfficialStrategyPlan,
  invokeHSkill,
  listHSkillWrappers,
  listHSkillInvocations,
  listOfficialStrategies,
  listStrategyRuns,
  startOfficialStrategy,
} from '../../../services/agent'

export const strategySkillKeys = {
  all: ['strategy-skills'] as const,
  official: () => [...strategySkillKeys.all, 'official'] as const,
  plan: (strategyId: string) =>
    [...strategySkillKeys.all, 'plan', strategyId] as const,
  wrappers: () => [...strategySkillKeys.all, 'wrappers'] as const,
  runtime: () => [...strategySkillKeys.all, 'runtime'] as const,
  invocations: () => [...strategySkillKeys.all, 'invocations'] as const,
  runner: () => [...strategySkillKeys.all, 'runner'] as const,
  runs: () => [...strategySkillKeys.all, 'runs'] as const,
}

export function useOfficialStrategySkills() {
  return useQuery({
    queryKey: strategySkillKeys.official(),
    queryFn: listOfficialStrategies,
    enabled: isApiConfigured(),
  })
}

export function useOfficialStrategyPlan(strategyId?: string) {
  return useQuery({
    queryKey: strategySkillKeys.plan(strategyId ?? 'none'),
    queryFn: () => getOfficialStrategyPlan(strategyId ?? ''),
    enabled: isApiConfigured() && Boolean(strategyId),
  })
}

export function useHSkillWrappers() {
  return useQuery({
    queryKey: strategySkillKeys.wrappers(),
    queryFn: listHSkillWrappers,
    enabled: isApiConfigured(),
  })
}

export function useHSkillRuntimeStatus() {
  return useQuery({
    queryKey: strategySkillKeys.runtime(),
    queryFn: getHSkillRuntimeStatus,
    enabled: isApiConfigured(),
  })
}

export function useHSkillInvocations() {
  return useQuery({
    queryKey: strategySkillKeys.invocations(),
    queryFn: listHSkillInvocations,
    enabled: isApiConfigured(),
  })
}

export function useDryRunHSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wrapperId,
      input,
    }: {
      wrapperId: string
      input?: Record<string, unknown>
    }) => dryRunHSkill(wrapperId, input),
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: strategySkillKeys.runtime(),
      })
      void queryClient.invalidateQueries({
        queryKey: strategySkillKeys.invocations(),
      })
    },
  })
}

export function useInvokeHSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wrapperId,
      input,
    }: {
      wrapperId: string
      input?: Record<string, unknown>
    }) => invokeHSkill(wrapperId, input),
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: strategySkillKeys.runtime(),
      })
      void queryClient.invalidateQueries({
        queryKey: strategySkillKeys.invocations(),
      })
    },
  })
}

export function useAgentRunnerStatus() {
  return useQuery({
    queryKey: strategySkillKeys.runner(),
    queryFn: getAgentRunnerStatus,
    enabled: isApiConfigured(),
  })
}

export function useStrategyRuns() {
  return useQuery({
    queryKey: strategySkillKeys.runs(),
    queryFn: listStrategyRuns,
    enabled: isApiConfigured(),
  })
}

export function useStartOfficialStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startOfficialStrategy,
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: strategySkillKeys.all,
      })
      void queryClient.invalidateQueries({ queryKey: ['card-library'] })
    },
  })
}
