import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ATTACHMENT_TRUNCATION_LIMIT, ATTACHMENT_WARNING_THRESHOLD } from '../constants/attachmentLimits'
import { SHARED_INSIGHT_ACTIONS } from '../insightPrompts'
import MarkdownPreview from './MarkdownPreview'

const isMac = navigator.platform.toUpperCase().includes('MAC')

const TYPE_ICONS = { url: '🔗', file: '📄', text: '📝', document: '📋' }


function truncateContext(text) {
  const originalLength = text.length
  const truncated = originalLength > ATTACHMENT_TRUNCATION_LIMIT
  if (!truncated) return { text, truncated: false, originalLength }
  const slice = text.slice(0, ATTACHMENT_TRUNCATION_LIMIT)
  const lastNewline = slice.lastIndexOf('\n')
  const cutText = lastNewline > 0 ? slice.slice(0, lastNewline) : slice
  return { text: cutText + '\n[truncated]', truncated: true, originalLength }
}

function InsightsDropdown({ disabled, onAction }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { if (!disabled) setOpen((v) => !v) }}
        disabled={disabled}
        title={disabled ? 'Attach a source first' : undefined}
        className={`text-xs border rounded px-3 py-1 transition-colors ${
          disabled
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
        }`}
      >
        Insights
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-md py-1 z-50 min-w-44">
          {SHARED_INSIGHT_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => { setOpen(false); onAction(a.prompt) }}
              className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-4 py-1.5 cursor-pointer"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
        {(!sources || sources.length === 0) && (
          <p className="text-xs text-gray-400 px-3 py-2">No sources available.</p>
        )}
        {sources && sources.length > 0 && (
          <>
            <button
              onClick={() => onSelect({ __allSources: true })}
              className="text-sm font-medium text-gray-700 hover:bg-gray-50 rounded px-3 py-1.5 cursor-pointer w-full text-left flex items-center gap-2"
            >
              <span className="flex-shrink-0">📚</span>
              <span>All sources</span>
            </button>
            <div className="border-t border-gray-100 my-1" />
          </>
        )}
        {(sources || []).map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="text-sm text-gray-700 hover:bg-gray-50 rounded px-3 py-1.5 cursor-pointer w-full text-left flex items-center gap-2"
          >
            <span className="flex-shrink-0">{TYPE_ICONS[s.type] || '📄'}</span>
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function EvidenceChatPanel({ docId, evidenceSources, document }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitOnEnter, setSubmitOnEnter] = useState(
    () => localStorage.getItem('logbooklm_submit_on_enter') !== 'false'
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
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${err.message}` },
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
        <InsightsDropdown
          disabled={!localContext}
          onAction={(prompt) => {
            setInput(prompt)
            setTimeout(() => handleSend(prompt), 0)
          }}
        />
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
            ) : (
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-gray-800">
                {msg.content && (
                  <div className="[&>*]:!p-0 [&>*]:!max-w-none [&>*]:!overflow-visible [&>*]:!bg-transparent [&>*]:!flex-none">
                    <MarkdownPreview content={msg.content} />
                  </div>
                )}
              </div>
            )}
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
            placeholder={`Message… (${sendHint})`}
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
                onClick={handleSend}
                disabled={!input.trim()}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded transition-colors flex-shrink-0 font-medium"
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
