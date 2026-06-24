import { useQuery } from '@tanstack/react-query'

import { getLoopyInstructions, getLoopyPersonas, getLoopyWorkflow, getLoopyWorkspace } from '@/lib/loopy-api'

const WORKFLOW_POLL_MS = 3000

export function useLoopyWorkflow() {
  return useQuery({
    queryKey: ['loopy', 'workflow'],
    queryFn: getLoopyWorkflow,
    refetchInterval: WORKFLOW_POLL_MS,
    retry: false,
  })
}

export function useLoopyPersonas() {
  return useQuery({
    queryKey: ['loopy', 'personas'],
    queryFn: getLoopyPersonas,
    retry: false,
  })
}

export function useLoopyWorkspace() {
  return useQuery({
    queryKey: ['loopy', 'workspace'],
    queryFn: getLoopyWorkspace,
    retry: false,
  })
}

export function useLoopyInstructions() {
  return useQuery({
    queryKey: ['loopy', 'instructions'],
    queryFn: getLoopyInstructions,
    retry: false,
  })
}
