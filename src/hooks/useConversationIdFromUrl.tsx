import { useState, useEffect } from 'react'

function getBasePath(): string {
  const baseEl = document.querySelector('base')
  if (baseEl?.href) {
    return new URL(baseEl.href).pathname.replace(/\/$/, '')
  }
  return ''
}

function getConversationIdFromPathname(): string {
  const basePath = getBasePath()
  const pathname = window.location.pathname
  const relativePath = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname
  return relativePath === '/' || relativePath === '' ? '/' : relativePath.replace(/^\//, '')
}

export function useConversationIdFromUrl(): [string, (id: string) => void] {
  const [conversationId, setConversationId] = useState(() => {
    return getConversationIdFromPathname()
  })

  useEffect(() => {
    const handlePopState = () => {
      const newId = getConversationIdFromPathname()
      console.log('popstate event detected', newId)
      setConversationId(newId)
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('history-state-changed', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('history-state-changed', handlePopState)
    }
  }, [])

  const setConversationIdAndUrl = (id: string) => {
    setConversationId(id)
    const basePath = getBasePath()
    const newPath = id === '/' ? basePath || '/' : `${basePath}/${id}`
    window.history.pushState({}, '', newPath)
    window.dispatchEvent(new Event('history-state-changed'))
  }

  return [conversationId, setConversationIdAndUrl]
}

export { getBasePath }
