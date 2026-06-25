import { Workflow } from 'lucide-react'
import { useState } from 'react'

import { LoopyPanelContent } from '@/components/loopy-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLoopyInstructions, useLoopyPersonas, useLoopyWorkflow, useLoopyWorkspace } from '@/hooks/useLoopy'

export function LoopySheet() {
  const [open, setOpen] = useState(false)
  const workflowQuery = useLoopyWorkflow()
  const personasQuery = useLoopyPersonas()
  const workspaceQuery = useLoopyWorkspace()
  const instructionsQuery = useLoopyInstructions()

  const workflow = workflowQuery.data

  // Plain chat backends lack the Loopy routes -- hide the entry point entirely
  // until a workflow is available.
  if (!workflow) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="absolute right-3 top-3 z-10 gap-2">
          <Workflow className="size-4" />
          Loopy
          <Badge variant="secondary" className="capitalize">
            {workflow.phase}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Workflow className="size-4" />
            Loopy run-graph
          </SheetTitle>
          <SheetDescription>Live view of the active Loopy workflow.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0 px-4 pb-6">
          <LoopyPanelContent
            workflow={workflow}
            personas={personasQuery.data}
            workspace={workspaceQuery.data}
            instructions={instructionsQuery.data}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
