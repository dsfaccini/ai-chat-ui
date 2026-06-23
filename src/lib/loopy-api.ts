export type SubgoalStatus = 'pending' | 'in_progress' | 'done'

export interface LoopySubgoal {
  id: string
  description: string
  status: SubgoalStatus
  verification: string
}

export interface LoopyDecision {
  summary: string
  why: string
}

export interface LoopyLearning {
  summary: string
}

export interface LoopyWorkflow {
  goal: string
  phase: string
  subgoals: LoopySubgoal[]
  decisions: LoopyDecision[]
  learnings: LoopyLearning[]
  finished: boolean
  success: boolean
  summary: string
}

export interface LoopyOrchestratorPersona {
  name: string
  role: string
  write_access: boolean
  instructions: string
  defined_in: string
}

export interface LoopyReviewPersona {
  name: string
  wave: 1 | 2 | 3
  instructions: string
  defined_in: string
}

export interface LoopyPersonas {
  orchestrator_personas: LoopyOrchestratorPersona[]
  review_personas: LoopyReviewPersona[]
}

export interface LoopyWorkspace {
  workspace: string
  roots: string[]
}

// The Loopy endpoints share the chat backend origin. When the backend is a
// plain chat server the routes are absent; callers treat a non-ok response or
// a parse failure as "no active Loopy workflow" rather than an error.
async function getLoopyJson<T>(path: string): Promise<T | null> {
  const res = await fetch(path)
  if (!res.ok) return null
  return (await res.json()) as T
}

export function getLoopyWorkflow(): Promise<LoopyWorkflow | null> {
  return getLoopyJson<LoopyWorkflow>('/loopy/workflow')
}

export function getLoopyPersonas(): Promise<LoopyPersonas | null> {
  return getLoopyJson<LoopyPersonas>('/loopy/personas')
}

export function getLoopyWorkspace(): Promise<LoopyWorkspace | null> {
  return getLoopyJson<LoopyWorkspace>('/loopy/workspace')
}
