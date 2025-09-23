import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
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
import { useEffect, useState, type FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { GlobeIcon } from 'lucide-react'
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources'
import { Loader } from '@/components/ai-elements/loader'

import { Part } from './Part'
import { nanoid } from 'nanoid'
import { useThrottle } from '@uidotdev/usehooks'

const models = [
  {
    name: 'GPT 4.1',
    value: 'openai/gpt-4.1',
  },
  {
    name: 'Anthropic Sonnet 4',
    value: 'anthropic:claude-sonnet-4-0',
  },
]

interface ConversationEntry {
  id: string
  timestamp: number
}

function useConversationIdFromUrl(): [string, (id: string) => void] {
  const [conversationId, setConversationId] = useState(() => {
    return window.location.pathname === '/' ? '' : window.location.pathname
  })

  useEffect(() => {
    const handlePopState = () => {
      const newId = window.location.pathname === '/' ? '' : window.location.pathname
      setConversationId(newId)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const setConversationIdAndUrl = (id: string) => {
    setConversationId(id)
    const url = new URL(window.location.toString())
    url.pathname = id || '/'
    window.history.pushState({}, '', url.toString())
  }

  return [conversationId, setConversationIdAndUrl]
}

const Chat = () => {
  const [input, setInput] = useState('')
  const [model, setModel] = useState<string>(models[0].value)
  const [webSearch, setWebSearch] = useState(false)
  const { messages, sendMessage, status, setMessages, regenerate } = useChat()
  const throttledMessages = useThrottle(messages, 500)
  const [conversationId, setConversationId] = useConversationIdFromUrl()

  useEffect(() => {
    if (conversationId === '/') {
      setMessages([])
    } else {
      const localStorageMessages = window.localStorage.getItem(conversationId)
      if (localStorageMessages) {
        setMessages(JSON.parse(localStorageMessages) as typeof messages)
      }
    }
  }, [conversationId])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const theCurrentUrl = new URL(window.location.toString())

      // we're starting a new conversation
      if (theCurrentUrl.pathname === '/') {
        const newConversationId = `/${nanoid()}`
        setConversationId(newConversationId)

        saveConversationEntryInLocalStorage(newConversationId)

        theCurrentUrl.pathname = newConversationId
        window.history.pushState({}, '', theCurrentUrl.toString())
      }

      sendMessage(
        { text: input },
        {
          body: { model, webSearch },
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

  function regen(messageId: string) {
    regenerate({ messageId }).catch((error: unknown) => {
      console.error('Error regenerating message:', error)
    })
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputTextarea
          onChange={(e) => {
            setInput(e.target.value)
          }}
          value={input}
          autoFocus={true}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton
              variant={webSearch ? 'default' : 'ghost'}
              onClick={() => {
                setWebSearch(!webSearch)
              }}
            >
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
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
                {models.map((model) => (
                  <PromptInputModelSelectItem key={model.value} value={model.value}>
                    {model.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit disabled={!input} status={status} />
        </PromptInputToolbar>
      </PromptInput>
    </>
  )
}

export default Chat

function saveConversationEntryInLocalStorage(newConversationId: string) {
  const currentConversations = window.localStorage.getItem('conversationIds') ?? '[]'
  const conversationIds = JSON.parse(currentConversations) as ConversationEntry[]
  conversationIds.push({
    id: newConversationId,
    timestamp: Date.now(),
  })
  window.localStorage.setItem('conversationIds', JSON.stringify(conversationIds))
}
