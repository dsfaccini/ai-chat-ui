import { useQuery } from '@tanstack/react-query'

import {
  getLoopyInstructions,
  getLoopyNarration,
  getLoopyPersonas,
  getLoopyWorkflow,
  getLoopyWorkspace,
} from '@/lib/loopy-api'

const WORKFLOW_POLL_MS = 3000
const NARRATION_POLL_MS = 1500

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

// Polls the narrator status line only while the agent is working. Best-effort and
// cosmetic: a missing or non-loopy backend just yields `null` (no error surfaced).
export function useLoopyNarration(active: boolean) {
  return useQuery({
    queryKey: ['loopy', 'narration'],
    queryFn: getLoopyNarration,
    enabled: active,
    refetchInterval: active ? NARRATION_POLL_MS : false,
    retry: false,
  })
}
