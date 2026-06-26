import { cn } from '@/lib/utils'

interface NarrationTickerProps {
  line: string
  seq: number
  className?: string
}

// Ephemeral status line near the loader. Keying the inner span on `seq` remounts it
// each time the narrator changes the line, so the fade/slide-in animation replays --
// the old line vanishes, the new one drifts in (the "Star Wars" feel).
export function NarrationTicker({ line, seq, className }: NarrationTickerProps) {
  if (!line) return null
  return (
    <div className={cn('overflow-hidden', className)}>
      <span
        key={seq}
        className="block animate-in fade-in-0 slide-in-from-bottom-1 text-xs text-muted-foreground duration-500"
      >
        {line}
      </span>
    </div>
  )
}
