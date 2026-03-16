import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function ChatPanel({ docId, document, onUpdateDocument, onContentUpdate, onClose, contextText, onClearContext }) {
  const [mode, setMode] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Populate from persisted chat_history when document loads
  useEffect(() => {
    const history = document?.chat_history ?? []
    setMessages(
      history.map((entry) => ({
        role: entry.role,
        content: entry.content,
        mode: entry.mode,
        proposed_content: entry.proposed_content ?? null,
        isNew: false,
      }))
    )
  }, [document?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const resizeTextarea = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 144) + 'px'
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    resizeTextarea(e.target)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const attachedContext = contextText || null
    setMessages((prev) => [...prev, { role: 'user', content: text, mode, isNew: false }])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClearContext()
    setLoading(true)

    try {
      const res = await api.chatMessage(docId, text, mode, attachedContext)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.message,
          mode: res.mode,
          proposed_content: res.proposed_content ?? null,
          isNew: true,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}`, mode, isNew: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (proposedContent, msgIndex) => {
    try {
      const updated = await api.updateDocument(docId, { content: proposedContent })
      onUpdateDocument(updated)
      onContentUpdate(proposedContent)
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, accepted: true, isNew: false } : m))
      )
    } catch (err) {
      console.error('Failed to apply proposed changes', err)
    }
  }

  const handleReject = (msgIndex) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, rejected: true, isNew: false } : m))
    )
  }

  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const sendHint = isMac ? '⌘↵' : 'Ctrl↵'

  return (
    <div className="w-[380px] flex flex-col border-l border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <span className="text-sm font-semibold text-gray-800">AI Chat</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-gray-200 text-xs">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1 transition-colors ${
                mode === 'chat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`px-3 py-1 transition-colors ${
                mode === 'agent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Agent
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-gray-400 text-center mt-8">
            {mode === 'chat'
              ? 'Ask anything about your document.'
              : 'Ask the AI to edit or rewrite parts of your document.'}
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

              {msg.proposed_content && msg.isNew && !msg.accepted && !msg.rejected && (
                <div className="mt-2 border border-amber-300 rounded bg-amber-50 p-2">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Proposed changes</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono bg-white rounded p-1.5 border border-amber-100">
                    {msg.proposed_content}
                  </pre>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(msg.proposed_content, i)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(i)}
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {msg.accepted && (
                <p className="text-xs text-green-600 mt-1">✓ Changes applied</p>
              )}
              {msg.rejected && msg.proposed_content && (
                <p className="text-xs text-gray-400 mt-1">Changes rejected</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-400">
              <span className="inline-flex gap-1 text-lg">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context attachment chip */}
      {contextText && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs text-blue-700">
            <span className="truncate">📎 Selected text ({contextText.length} chars)</span>
            <button
              onClick={onClearContext}
              className="ml-auto flex-shrink-0 text-blue-400 hover:text-blue-600 text-base leading-none pl-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-2 focus-within:border-blue-300 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message… (${sendHint} to send)`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
            style={{ maxHeight: '144px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="self-end text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
