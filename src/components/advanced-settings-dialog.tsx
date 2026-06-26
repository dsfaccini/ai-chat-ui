import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'

interface AdvancedSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  retryTimeout: number
  onRetryTimeoutChange: (value: number) => void
}

export function AdvancedSettingsDialog({
  open,
  onOpenChange,
  retryTimeout,
  onRetryTimeoutChange,
}: AdvancedSettingsDialogProps) {
  // Local draft so a half-typed value never propagates; commit on save.
  const [draft, setDraft] = useState(String(retryTimeout))

  useEffect(() => {
    if (open) setDraft(String(retryTimeout))
  }, [open, retryTimeout])

  const parsed = Number(draft)
  const valid = Number.isFinite(parsed) && parsed > 0

  const handleSave = () => {
    if (valid) onRetryTimeoutChange(parsed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Advanced settings</DialogTitle>
          <DialogDescription>Tune how loopy handles requests.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="retry-timeout" className="text-sm font-medium">
            Request retry timeout (seconds)
          </label>
          <Input
            id="retry-timeout"
            type="number"
            min={1}
            value={draft}
            aria-invalid={!valid}
            onChange={(e) => {
              setDraft(e.target.value)
            }}
          />
          <p className="text-xs text-muted-foreground">
            How long loopy keeps retrying transient model errors (rate limits, 5xx) before failing. Default 120 (2
            min).
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
