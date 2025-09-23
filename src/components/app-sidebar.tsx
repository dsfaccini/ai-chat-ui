import { CirclePlus, MessageCircle } from 'lucide-react'
import { type MouseEvent, useEffect, useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { ConversationEntry } from '@/types'

function useConversations(): ConversationEntry[] {
  const [conversations, setConversations] = useState<ConversationEntry[]>(() => {
    const stored = window.localStorage.getItem('conversationIds')
    return stored ? (JSON.parse(stored) as ConversationEntry[]) : []
  })

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'conversationIds' && e.newValue) {
        setConversations(JSON.parse(e.newValue) as ConversationEntry[])
      }
    }

    const handleCustomStorageChange = () => {
      const stored = window.localStorage.getItem('conversationIds')
      setConversations(stored ? (JSON.parse(stored) as ConversationEntry[]) : [])
    }

    window.addEventListener('storage', handleStorageChange)
    // a custom event to handle same-tab updates
    window.addEventListener('local-storage-change', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage-change', handleCustomStorageChange)
    }
  }, [])

  return conversations
}

function doLocalNavigation(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey) {
    return
  }
  const path = new URL((e.currentTarget as HTMLAnchorElement).href).pathname
  window.history.pushState({}, '', path)
  // custom event to notify other components of the URL change
  window.dispatchEvent(new Event('history-state-changed'))
  e.preventDefault()
}

export function AppSidebar() {
  const conversations = useConversations()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <h1 className="mt-4 ml-4 text-l font-medium">Pydantic AI Chat</h1>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Start a new conversation">
                <a href="/" onClick={doLocalNavigation}>
                  <CirclePlus />
                  <span>New conversation</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((conversation, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton asChild>
                    <a href={conversation.id} onClick={doLocalNavigation} className="h-auto flex items-start gap-2">
                      <MessageCircle className="size-3 mt-1" />
                      <span className="flex flex-col items-start">
                        <span className="truncate max-w-[150px]">{conversation.firstMessage}</span>
                        <span className="text-xs opacity-80">{new Date(conversation.timestamp).toLocaleString()}</span>
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
