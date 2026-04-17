import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ATTACHMENT_TRUNCATION_LIMIT, ATTACHMENT_WARNING_THRESHOLD } from '../constants/attachmentLimits'
import { FREE_ACTION_CAP } from '../constants/limits'
import MarkdownPreview from './MarkdownPreview'

const isMac = navigator.platform.toUpperCase().includes('MAC')



function truncateContext(text) {
  const originalLength = text.length
  const truncated = originalLength > ATTACHMENT_TRUNCATION_LIMIT
  if (!truncated) return { text, truncated: false, originalLength }
  const slice = text.slice(0, ATTACHMENT_TRUNCATION_LIMIT)
  const lastNewline = slice.lastIndexOf('\n')
  const cutText = lastNewline > 0 ? slice.slice(0, lastNewline) : slice
  return { text: cutText + '\n[truncated]', truncated: true, originalLength }
}

function SourcePickerPopup({ sources, onSelect, onClose, anchorRef }) {
  const popupRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        !(anchorRef?.current && anchorRef.current.contains(e.target))
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-72 z-50"
    >
      <div className="max-h-48 overflow-y-auto">
        <p className="text-xs text-gray-400 px-3 py-2">All sources are queried by default. Attach a source to focus on one only.</p>
        {(!sources || sources.length === 0) && (
          <p className="text-xs text-gray-400 px-3 py-2">No sources available.</p>
        )}
        {(sources || []).map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="text-sm text-gray-700 hover:bg-gray-50 rounded px-3 py-1.5 cursor-pointer w-full text-left truncate"
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function EvidenceChatPanel({ docId, evidenceSources, document, actionsUsed = 0, hasByokKey = false, onActionComplete = null }) {
  const isCapped = !hasByokKey && actionsUsed >= FREE_ACTION_CAP
  const actionsRemaining = hasByokKey ? null : Math.max(0, FREE_ACTION_CAP - actionsUsed)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitOnEnter, setSubmitOnEnter] = useState(
    () => localStorage.getItem('speedwrite_submit_on_enter') !== 'false'
  )
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [localContext, setLocalContext] = useState(null)
  const [ragActive, setRagActive] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const plusButtonRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    const history = document?.evidence_chat_history ?? []
    setMessages(
      history.map((entry) => ({
        role: entry.role,
        content: entry.content,
        context_label: entry.context_label ?? null,
      }))
    )
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }, 0)
  }, [document?.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom) scrollToBottom()
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
      localStorage.setItem('speedwrite_submit_on_enter', String(next))
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

  const handleSelectSource = async (source) => {
    setShowPopup(false)
    try {
      if (source.__allSources) {
        const sources = evidenceSources || []
        const parts = await Promise.all(
          sources.map(async (s) => {
            const full = await api.getEvidence(docId, s.id)
            return `--- Source: ${s.title} (${s.type}) ---\n${full.content || ''}\n\n`
          })
        )
        const combined = parts.join('')
        const { text, truncated } = truncateContext(combined)
        setLocalContext({
          text,
          label: `All sources (${sources.length} source${sources.length === 1 ? '' : 's'})`,
          truncated,
          originalLength: combined.length,
          evidenceId: null,
        })
      } else {
        const full = await api.getEvidence(docId, source.id)
        const content = full.content || ''
        const { text, truncated } = truncateContext(content)
        setLocalContext({ text, label: source.title, truncated, originalLength: content.length, evidenceId: source.id })
      }
    } catch (err) {
      console.error('Failed to load evidence content', err)
    }
  }

  const handleClearContext = () => {
    setLocalContext(null)
  }

  const handleSend = async (textOverride) => {
    const text = (textOverride !== undefined ? textOverride : input).trim()
    if (!text || loading) return

    const contextSnapshot = localContext
    const contextLabel = contextSnapshot?.label ?? null
    const hasContext = !!contextSnapshot?.text

    setMessages((prev) => [...prev, { role: 'user', content: text, context_label: contextLabel }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLocalContext(null)
    abortControllerRef.current = new AbortController()
    setLoading(true)

    try {
      let context = contextSnapshot?.text ?? null

      if (contextSnapshot?.evidenceId) {
        try {
          const ragRes = await api.ragQuery(docId, contextSnapshot.evidenceId, text, abortControllerRef.current.signal)
          if (ragRes?.used_rag && ragRes.chunks?.length > 0) {
            context = ragRes.chunks.map((c) => c.text).join('\n---\n')
            setRagActive(true)
          }
        } catch (err) {
          if (err.name === 'AbortError') throw err
          // RAG unavailable — fall back to contextSnapshot.text silently
        }
      }

      const res = await api.evidenceChat(
        docId, text, context, contextLabel, hasContext, abortControllerRef.current.signal
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }])
      onActionComplete?.()
    } catch (err) {
      if (err.name !== 'AbortError') {
        const isCapError = err.message.includes('Monthly limit')
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: isCapError ? err.message : `Error: ${err.message}` },
        ])
      }
    } finally {
      abortControllerRef.current = null
      setLoading(false)
      setRagActive(false)
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setLoading(false)
    setRagActive(false)
  }

  const isTruncated = localContext?.truncated ?? false
  const isAmber = (localContext?.originalLength ?? 0) > ATTACHMENT_WARNING_THRESHOLD
  const actualChars = localContext?.originalLength ?? 0
  const sendHint = submitOnEnter ? '↵ to send' : (isMac ? '⌘↵ to send' : 'Ctrl↵ to send')

  return (
    <div className="w-[380px] flex flex-col border-l border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Chat</span>
        <button
          onClick={() => { api.clearEvidenceChatHistory(docId).catch(console.error); setMessages([]) }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Clear chat history"
          aria-label="Clear chat history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && !loading && (
          <p className="text-xs text-gray-400 text-center mt-8">
            Attach a source with + and ask questions about it.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="flex flex-col items-end max-w-[85%]">
                {msg.context_label && (
                  <div className="text-xs text-gray-400 mb-1">{msg.context_label}</div>
                )}
                <div className="rounded-lg px-3 py-2 text-sm bg-blue-600 text-white">
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            ) : msg.content?.trim() ? (
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-gray-800">
                <div className="[&>*]:!p-0 [&>*]:!max-w-none [&>*]:!overflow-visible [&>*]:!bg-transparent [&>*]:!flex-none">
                  <MarkdownPreview content={msg.content} />
                </div>
              </div>
            ) : null}
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

      {/* Context chip */}
      {localContext && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              isAmber
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}
            title={isTruncated ? `Content exceeded ${ATTACHMENT_TRUNCATION_LIMIT} characters and was truncated` : undefined}
          >
            <span className="truncate">{localContext.label}</span>
            <span className={`flex-shrink-0 ml-1 ${isAmber ? '' : 'text-gray-400'}`}>
              {'• '}
              {isAmber ? `⚠ ${actualChars} / ${ATTACHMENT_TRUNCATION_LIMIT} chars${isTruncated ? ' (truncated)' : ''}` : `${actualChars} / ${ATTACHMENT_TRUNCATION_LIMIT} chars`}
            </span>
            <button
              onClick={handleClearContext}
              className={`ml-auto flex-shrink-0 text-base leading-none pl-1 ${
                isAmber ? 'text-amber-400 hover:text-amber-600' : 'text-blue-400 hover:text-blue-600'
              }`}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Cap banner */}
      {isCapped && (
        <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-amber-800">
            Monthly limit reached. Add your Anthropic API key in{' '}
            <Link to="/account" className="underline hover:text-amber-900">Account settings</Link>
            {' '}to continue.
          </p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="relative flex gap-2 bg-white border border-gray-200 rounded-lg p-2 focus-within:border-blue-300 transition-colors">
          {showPopup && (
            <SourcePickerPopup
              sources={evidenceSources || []}
              onSelect={handleSelectSource}
              onClose={() => setShowPopup(false)}
              anchorRef={plusButtonRef}
            />
          )}
          <button
            ref={plusButtonRef}
            onClick={() => setShowPopup((v) => !v)}
            className="self-end text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none px-1 pb-0.5 flex-shrink-0"
            title="Attach evidence source"
          >
            +
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
            style={{ maxHeight: '144px', overflowY: 'auto' }}
          />
          <div className="self-end flex flex-col items-end gap-1">
            {ragActive && <span className="text-xs text-green-600 font-medium">✦ RAG</span>}
            {loading ? (
              <button
                onClick={handleStop}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 font-medium"
              >
                ■ Stop
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isCapped}
                title={isCapped ? 'Monthly action limit reached — add your Anthropic API key in Account settings' : undefined}
                className="text-xs bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 font-medium"
              >
                Send
              </button>
            )}
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
}
