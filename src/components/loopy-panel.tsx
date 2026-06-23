import { CheckCircle2, ChevronRight, Circle, FolderTree, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type {
  LoopyDecision,
  LoopyLearning,
  LoopyOrchestratorPersona,
  LoopyPersonas,
  LoopyReviewPersona,
  LoopySubgoal,
  LoopyWorkflow,
  LoopyWorkspace,
  SubgoalStatus,
} from '@/lib/loopy-api'

const PHASES = ['triage', 'plan', 'implement', 'verify', 'review', 'done']

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
}

function PhaseStepper({ phase }: { phase: string }) {
  const normalized = phase.toLowerCase()
  const activeIndex = PHASES.indexOf(normalized)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PHASES.map((p, index) => {
        const isActive = index === activeIndex
        const isPast = activeIndex >= 0 && index < activeIndex
        return (
          <Badge
            key={p}
            variant={isActive ? 'default' : isPast ? 'secondary' : 'outline'}
            className={cn('capitalize', !isActive && !isPast && 'text-muted-foreground')}
          >
            {p}
          </Badge>
        )
      })}
    </div>
  )
}

function SubgoalStatusIcon({ status }: { status: SubgoalStatus }) {
  if (status === 'done') return <CheckCircle2 className="size-4 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
  if (status === 'in_progress') return <Loader2 className="size-4 text-primary animate-spin mt-0.5 shrink-0" />
  return <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
}

function SubgoalList({ subgoals }: { subgoals: LoopySubgoal[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {subgoals.map((subgoal) => (
        <li key={subgoal.id} className="flex items-start gap-2">
          <SubgoalStatusIcon status={subgoal.status} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={cn('text-sm', subgoal.status === 'done' && 'text-muted-foreground line-through')}>
              {subgoal.description}
            </span>
            {subgoal.verification && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium">Verify:</span> {subgoal.verification}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function DecisionList({ decisions }: { decisions: LoopyDecision[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {decisions.map((decision, index) => (
        <li key={index} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
          <span className="text-sm">{decision.summary}</span>
          <span className="text-xs text-muted-foreground">{decision.why}</span>
        </li>
      ))}
    </ul>
  )
}

function LearningList({ learnings }: { learnings: LoopyLearning[] }) {
  return (
    <ul className="flex flex-col gap-1.5 list-disc pl-4">
      {learnings.map((learning, index) => (
        <li key={index} className="text-sm">
          {learning.summary}
        </li>
      ))}
    </ul>
  )
}

function PersonaCard({
  name,
  subtitle,
  instructions,
  definedIn,
}: {
  name: string
  subtitle?: ReactNode
  instructions: string
  definedIn: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent rounded-md">
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
        <span className="flex flex-col min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium truncate">{name}</span>
          {subtitle}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{instructions}</p>
        <p className="mt-2 text-xs text-muted-foreground/70 font-mono break-all">{definedIn}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ReviewWaveGroup({ wave, personas }: { wave: 1 | 2 | 3; personas: LoopyReviewPersona[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Wave {wave}</span>
      <div className="flex flex-col gap-1.5">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.name}
            name={persona.name}
            instructions={persona.instructions}
            definedIn={persona.defined_in}
          />
        ))}
      </div>
    </div>
  )
}

function PersonasView({ personas }: { personas: LoopyPersonas }) {
  const waves: (1 | 2 | 3)[] = [1, 2, 3]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <SectionTitle>Review personas</SectionTitle>
        {waves.map((wave) => {
          const inWave = personas.review_personas.filter((persona) => persona.wave === wave)
          if (inWave.length === 0) return null
          return <ReviewWaveGroup key={wave} wave={wave} personas={inWave} />
        })}
        {personas.review_personas.length === 0 && <p className="text-sm text-muted-foreground">No review personas.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle>Orchestrator delegates</SectionTitle>
        {personas.orchestrator_personas.map((persona: LoopyOrchestratorPersona) => (
          <PersonaCard
            key={persona.name}
            name={persona.name}
            subtitle={
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{persona.role}</span>
                <Badge variant={persona.write_access ? 'secondary' : 'outline'} className="text-[10px] py-0">
                  {persona.write_access ? 'write' : 'read-only'}
                </Badge>
              </span>
            }
            instructions={persona.instructions}
            definedIn={persona.defined_in}
          />
        ))}
        {personas.orchestrator_personas.length === 0 && (
          <p className="text-sm text-muted-foreground">No orchestrator delegates.</p>
        )}
      </div>
    </div>
  )
}

function WorkflowView({ workflow }: { workflow: LoopyWorkflow }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionTitle>Goal</SectionTitle>
        <p className="text-sm">{workflow.goal}</p>
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle>Phase</SectionTitle>
        <PhaseStepper phase={workflow.phase} />
      </div>

      {workflow.finished && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border p-3',
            workflow.success ? 'border-green-600/30 bg-green-600/10' : 'border-destructive/30 bg-destructive/10',
          )}
        >
          {workflow.success ? (
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{workflow.success ? 'Succeeded' : 'Failed'}</span>
            {workflow.summary && <span className="text-sm text-muted-foreground">{workflow.summary}</span>}
          </div>
        </div>
      )}

      {workflow.subgoals.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Subgoals</SectionTitle>
          <SubgoalList subgoals={workflow.subgoals} />
        </div>
      )}

      {workflow.decisions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Decisions</SectionTitle>
          <DecisionList decisions={workflow.decisions} />
        </div>
      )}

      {workflow.learnings.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Learnings</SectionTitle>
          <LearningList learnings={workflow.learnings} />
        </div>
      )}
    </div>
  )
}

function WorkspaceView({ workspace }: { workspace: LoopyWorkspace }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Workspace</SectionTitle>
      <p className="text-sm font-mono break-all">{workspace.workspace}</p>
      {workspace.roots.length > 0 && (
        <ul className="flex flex-col gap-1">
          {workspace.roots.map((root) => (
            <li key={root} className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderTree className="size-3.5 shrink-0" />
              <span className="font-mono break-all">{root}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LoopyPanelContent({
  workflow,
  personas,
  workspace,
}: {
  workflow: LoopyWorkflow | null | undefined
  personas: LoopyPersonas | null | undefined
  workspace: LoopyWorkspace | null | undefined
}) {
  if (!workflow) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <ShieldCheck className="size-6" />
        <p className="text-sm">No active Loopy workflow.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <WorkflowView workflow={workflow} />
      {workspace && (
        <>
          <Separator />
          <WorkspaceView workspace={workspace} />
        </>
      )}
      {personas && (
        <>
          <Separator />
          <PersonasView personas={personas} />
        </>
      )}
    </div>
  )
}
