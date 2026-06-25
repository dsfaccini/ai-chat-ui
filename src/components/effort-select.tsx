import {
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
} from '@/components/ai-elements/prompt-input'

interface EffortOption {
  value: string
  label: string
}

const EFFORT_OPTIONS: EffortOption[] = [
  { value: 'minimal', label: 'Effort: Minimal' },
  { value: 'low', label: 'Effort: Low' },
  { value: 'medium', label: 'Effort: Medium' },
  { value: 'high', label: 'Effort: High' },
  { value: 'xhigh', label: 'Effort: X-High' },
]

interface EffortSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export const EffortSelect = ({ value, onValueChange }: EffortSelectProps) => {
  return (
    <PromptInputModelSelect value={value} onValueChange={onValueChange}>
      <PromptInputModelSelectTrigger>
        <PromptInputModelSelectValue />
      </PromptInputModelSelectTrigger>
      <PromptInputModelSelectContent>
        {EFFORT_OPTIONS.map((opt) => (
          <PromptInputModelSelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </PromptInputModelSelectItem>
        ))}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  )
}
