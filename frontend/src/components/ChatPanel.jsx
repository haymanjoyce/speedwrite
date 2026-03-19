import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../api'

const ChatPanel = forwardRef(function ChatPanel({ docId, document, onProposedChange, contextText, onClearContext }, ref) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitOnEnter, setSubmitOnEnter] = useState(
    () => localStorage.getItem('logbooklm_submit_on_enter') !== 'false'
  )
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const historyLoadedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    appendMessages(userMsg, assistantMsg) {
      setMessages((prev) => [
        ...prev,
        ...(userMsg != null ? [{ role: 'user', content: userMsg }] : []),
        { role: 'assistant', content: assistantMsg },
      ])
    },
  }))

  useEffect(() => {
    if (historyLoadedRef.current) return
    historyLoadedRef.current = true
    const history = document?.chat_history ?? []
    setMessages(
      history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }))
    )
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, loading])

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  const resizeTextarea = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 144) + 'px'
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    resizeTextarea(e.target)
  }

  const toggleSubmitOnEnter = () => {
    setSubmitOnEnter((prev) => {
      const next = !prev
      localStorage.setItem('logbooklm_submit_on_enter', String(next))
      return next
    })
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Enter' && !e.shiftKey && submitOnEnter) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const attachedContext = contextText || null
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClearContext()
    setLoading(true)

    try {
      const res = await api.chatMessage(docId, text, attachedContext)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }])
      if (res.proposed_content) {
        onProposedChange(res.proposed_content)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const sendHint = submitOnEnter ? '↵ to send' : (isMac ? '⌘↵ to send' : 'Ctrl↵ to send')

  return (
    <div className="w-[380px] flex flex-col border-l border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && !loading && (
          <p className="text-xs text-gray-400 text-center mt-8">
            Ask the AI to edit or rewrite parts of your document.
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

      {/* Scroll to bottom */}
      {showScrollButton && (
        <div className="flex justify-center py-1 flex-shrink-0">
          <button
            onClick={scrollToBottom}
            className="bg-white border border-gray-200 rounded-full shadow-sm px-3 py-0.5 text-xs text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            ↓ Latest
          </button>
        </div>
      )}

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
            placeholder={`Message… (${sendHint})`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
            style={{ maxHeight: '144px', overflowY: 'auto' }}
          />
          <div className="self-end flex flex-col items-end gap-1">
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 font-medium"
            >
              Send
            </button>
            <button
              onClick={toggleSubmitOnEnter}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer leading-none"
              title={submitOnEnter ? 'Enter sends (click to toggle)' : 'Enter adds new line (click to toggle)'}
            >
              {submitOnEnter ? '↵ on' : '↵ off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ChatPanel
