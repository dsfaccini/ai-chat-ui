import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { useChat } from '@ai-sdk/react'
import { Settings2Icon, WifiOffIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useThrottle } from '@uidotdev/usehooks'
import { nanoid } from 'nanoid'
import { useConversationIdFromUrl } from './hooks/useConversationIdFromUrl'
import { Part } from './Part'
import type { ConversationEntry } from './types'
import { getToolIcon } from '@/lib/tool-icons'

interface ModelConfig {
  id: string
  name: string
  builtin_tools: string[]
}

interface BuiltinTool {
  name: string
  id: string
}

// TODO: if just a single model, don't show model selector, just a label.
interface RemoteConfig {
  models: ModelConfig[]
  builtinTools: BuiltinTool[]
}

async function getModels() {
  const res = await fetch('/api/configure')
  return (await res.json()) as RemoteConfig
}

const Chat = () => {
  const [input, setInput] = useState('')
  const [model, setModel] = useState<string>('')
  const [enabledTools, setEnabledTools] = useState<string[]>([])
  const { messages, sendMessage, status, setMessages, regenerate, error } = useChat()
  const throttledMessages = useThrottle(messages, 500)
  const [conversationId, setConversationId] = useConversationIdFromUrl()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Heartbeat monitoring
  const [apiBase, setApiBase] = useState<string>('')
  const [serverReachable, setServerReachable] = useState<boolean>(true)
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0)
  const backoffIntervalRef = useRef<number>(5000) // Start at 5 seconds
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const configQuery = useQuery({
    queryFn: getModels,
    queryKey: ['models'],
  })

  useEffect(() => {
    if (configQuery.data) {
      setModel(configQuery.data.models[0].id)
    }
  }, [configQuery.data])

  useLayoutEffect(() => {
    if (conversationId === '/') {
      setMessages([])
    } else {
      const localStorageMessages = window.localStorage.getItem(conversationId)
      if (localStorageMessages) {
        setMessages(JSON.parse(localStorageMessages) as typeof messages)
      }
    }
    textareaRef.current?.focus()
  }, [conversationId])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const theCurrentUrl = new URL(window.location.toString())

      // we're starting a new conversation
      if (theCurrentUrl.pathname === '/') {
        const newConversationId = `/${nanoid()}`
        setConversationId(newConversationId)

        saveConversationEntryInLocalStorage(newConversationId, input)

        theCurrentUrl.pathname = newConversationId
        window.history.pushState({}, '', theCurrentUrl.toString())
      }

      sendMessage(
        { text: input },
        {
          body: { model, builtinTools: enabledTools, webSearch: true },
        },
      ).catch((error: unknown) => {
        console.error('Error sending message:', error)
      })
      setInput('')
    }
  }

  useEffect(() => {
    if (conversationId && throttledMessages.length > 0) {
      window.localStorage.setItem(conversationId, JSON.stringify(throttledMessages))
    }
  }, [throttledMessages, conversationId])

  // Initialize API base from window.__AI_CHAT_UI_API_BASE__
  useEffect(() => {
    const base = (window as unknown as { __AI_CHAT_UI_API_BASE__: string | undefined }).__AI_CHAT_UI_API_BASE__ ?? ''
    setApiBase(base)
  }, [])

  // Heartbeat monitoring with exponential backoff
  useEffect(() => {
    if (!apiBase) {
      // No custom API base, assume same-origin which is always reachable
      return
    }

    const checkHealth = async () => {
      try {
        // Fetch is globally overridden, so just call /api/health
        const response = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          // Server is reachable
          if (!serverReachable) {
            setServerReachable(true)
          }
          setConsecutiveFailures(0)
        } else {
          throw new Error('Health check failed')
        }
      } catch (_error) {
        // Server is not reachable
        const newFailures = consecutiveFailures + 1
        setConsecutiveFailures(newFailures)

        if (newFailures >= 2) {
          setServerReachable(false)
        }
      }

      // Exponential backoff: double the interval each time, max 60 seconds
      backoffIntervalRef.current = Math.min(backoffIntervalRef.current * 2, 60000 * 5) // 5 minutes

      // Schedule next check
      heartbeatTimeoutRef.current = setTimeout(checkHealth, backoffIntervalRef.current)
    }

    // Start initial check
    heartbeatTimeoutRef.current = setTimeout(checkHealth, backoffIntervalRef.current)

    // Cleanup on unmount or apiBase change
    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current)
      }
      // Reset backoff on apiBase change
      backoffIntervalRef.current = 5000
    }
  }, [apiBase, serverReachable, consecutiveFailures])

  function regen(messageId: string) {
    regenerate({ messageId }).catch((error: unknown) => {
      console.error('Error regenerating message:', error)
    })
  }

  const availableTools = useMemo(() => {
    const enabledToolIds = configQuery.data?.models.find((entry) => entry.id === model)?.builtin_tools ?? []
    return configQuery.data?.builtinTools.filter((tool) => enabledToolIds.includes(tool.id)) ?? []
  }, [configQuery.data, model])

  if (conversationId !== '/' && messages.length === 0) {
    return null
  }

  return (
    <>
      <Conversation className="h-full">
        <ConversationContent>
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'assistant' &&
                message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger count={message.parts.filter((part) => part.type === 'source-url').length} />
                    {message.parts
                      .filter((part) => part.type === 'source-url')
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts.map((part, i) => (
                <Part
                  key={`${message.id}-${i}`}
                  part={part}
                  message={message}
                  status={status}
                  index={i}
                  regen={regen}
                  lastMessage={message.id === messages.at(-1)?.id}
                />
              ))}
            </div>
          ))}
          {status === 'submitted' && <Loader />}
          {status === 'error' && error && (
            <div className="px-4 py-3 mx-4 my-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              <strong>Error:</strong> {error.message}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0 p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            onChange={(e) => {
              setInput(e.target.value)
            }}
            value={input}
            autoFocus={true}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              {availableTools.length > 0 && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <PromptInputButton variant="outline">
                          <Settings2Icon className="size-4" />
                        </PromptInputButton>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Tools</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start">
                    {availableTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between gap-3 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
                        onClick={() => {
                          setEnabledTools((prev) =>
                            prev.includes(tool.id) ? prev.filter((id) => id !== tool.id) : [...prev, tool.id],
                          )
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {getToolIcon(tool.id)}
                          <span className="text-sm">{tool.name}</span>
                        </div>
                        <Switch
                          checked={enabledTools.includes(tool.id)}
                          onCheckedChange={(checked) => {
                            setEnabledTools((prev) =>
                              checked ? [...prev, tool.id] : prev.filter((id) => id !== tool.id),
                            )
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        />
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {configQuery.data && model && (
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    setModel(value)
                  }}
                  value={model}
                >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {(configQuery.data as { models: { id: string; name: string }[] }).models.map((model) => (
                      <PromptInputModelSelectItem key={model.id} value={model.id}>
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              )}
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>

      {/* Server connection error toast */}
      {!serverReachable && apiBase && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-destructive/90 text-destructive-foreground rounded-lg shadow-lg border border-destructive backdrop-blur-sm">
            <WifiOffIcon className="size-5 flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Cannot reach local server</p>
              <p className="text-xs opacity-90">{apiBase}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Chat

const MAX_FIRST_MESSAGE_LENGTH = 30

function saveConversationEntryInLocalStorage(newConversationId: string, firstMessage: string) {
  const currentConversations = window.localStorage.getItem('conversationIds') ?? '[]'
  const conversationIds = JSON.parse(currentConversations) as ConversationEntry[]
  const trimmedFirstMessage =
    firstMessage.length > MAX_FIRST_MESSAGE_LENGTH
      ? firstMessage.slice(0, MAX_FIRST_MESSAGE_LENGTH) + '...'
      : firstMessage
  conversationIds.unshift({
    id: newConversationId,
    firstMessage: trimmedFirstMessage,
    timestamp: Date.now(),
  })
  window.localStorage.setItem('conversationIds', JSON.stringify(conversationIds))
  // dispatch a custom event so that the sidebar can update
  window.dispatchEvent(new Event('local-storage-change'))
}
