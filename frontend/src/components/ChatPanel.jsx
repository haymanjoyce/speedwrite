import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ATTACHMENT_TRUNCATION_LIMIT, ATTACHMENT_WARNING_THRESHOLD } from '../constants/attachmentLimits'
import { FREE_ACTION_CAP } from '../constants/limits'
import { DOCUMENT_INSIGHT_ACTIONS } from '../insightPrompts'
import ActionsDropdown from './ActionsDropdown'
import AttachmentPopup from './AttachmentPopup'
import MarkdownPreview from './MarkdownPreview'

const isMac = navigator.platform.toUpperCase().includes('MAC')

function truncateContext(text) {
  const originalLength = text.length
  const truncated = originalLength > ATTACHMENT_TRUNCATION_LIMIT
  if (!truncated) return { text, truncated: false, originalLength }

  const slice = text.slice(0, ATTACHMENT_TRUNCATION_LIMIT)
  const lastNewline = slice.lastIndexOf('\n')
  const cutText = lastNewline > 0 ? slice.slice(0, lastNewline) : slice

  return {
    text: cutText + '\n[truncated]',
    truncated: true,
    originalLength,
  }
}

const REDRAFT_LABELS = {
  rewrite: 'Rewrite',
  restructure: 'Restructure',
  expand: 'Expand',
  condense: 'Condense',
  simplify: 'Simplify',
  formalise: 'Formalise',
}

const REDRAFT_PROMPTS = {
  rewrite: 'Rewrite this entire document.',
  restructure: 'Restructure this document for better organisation and flow.',
  expand: 'Expand this document by fleshing out thin sections and adding more detail throughout.',
  condense: 'Condense this document by removing redundancy while preserving all key information.',
  simplify: 'Rewrite this document in simpler language. Reduce jargon, shorten sentences, and make it accessible to a non-specialist audience while preserving all key information.',
  formalise: 'Rewrite this document in a more formal, professional tone. Remove casual language, tighten the writing, and ensure it is appropriate for a professional or academic audience.',
}

const INSIGHTS_PROMPTS = Object.fromEntries(DOCUMENT_INSIGHT_ACTIONS.map((a) => [a.action, a.prompt]))

const ChatPanel = forwardRef(function ChatPanel({
  docId, document, onProposedChange, contextText, onClearContext, provider,
  headings, evidenceSources, pendingProposal, evidenceCount = 0, structureLocked = false,
  actionsUsed = 0, hasByokKey = false, onActionComplete = null,
}, ref) {
  const isCapped = !hasByokKey && actionsUsed >= FREE_ACTION_CAP
  const actionsRemaining = hasByokKey ? null : Math.max(0, FREE_ACTION_CAP - actionsUsed)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitOnEnter, setSubmitOnEnter] = useState(
    () => localStorage.getItem('speedwrite_submit_on_enter') !== 'false'
  )
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [localContext, setLocalContext] = useState(null) // { text, label, truncated, originalLength, evidenceId }
  const [ragActive, setRagActive] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const plusButtonRef = useRef(null)
  const abortControllerRef = useRef(null)
  const instructionInputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    appendMessages(userMsg, assistantMsg) {
      setMessages((prev) => [
        ...prev,
        ...(userMsg != null ? [{ role: 'user', content: userMsg }] : []),
        { role: 'assistant', content: assistantMsg },
      ])
    },
    prefillRewrite(sectionContent, headingText) {
      const { text, truncated } = truncateContext(sectionContent)
      setLocalContext({ text, label: headingText, truncated, originalLength: sectionContent.length, evidenceId: null })
      setInput('Rewrite this section.')
      setTimeout(() => {
        if (textareaRef.current) {
          resizeTextarea(textareaRef.current)
          textareaRef.current.focus()
        }
      }, 0)
    },
    fireInsight(promptText) {
      fireInsightInternal(promptText)
    },
  }))

  useEffect(() => {
    const history = document?.chat_history ?? []
    setMessages(
      history.map((entry) => ({
        role: entry.role,
        content: entry.content,
        context_label: entry.context_label ?? null,
        proposed_content: null,
        accepted: undefined,
        rejected: undefined,
      }))
    )
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }, 0)
  }, [document?.id])

  // External context (e.g. "Add to chat" from editor) takes over — clear local attachment
  useEffect(() => {
    if (contextText) setLocalContext(null)
  }, [contextText])

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

  const handleAttach = (content, label, evidenceId) => {
    const { text, truncated } = truncateContext(content)
    setLocalContext({ text, label, truncated, originalLength: content.length, evidenceId: evidenceId ?? null })
    setShowPopup(false)
  }

  const handleClearContext = () => {
    setLocalContext(null)
    onClearContext()
  }

  const handleSend = async (textOverride, mode = 'chat') => {
    const text = (textOverride !== undefined ? textOverride : input).trim()
    if (!text || loading) return

    const contextSnapshot = localContext
    const hasContext = !!(contextSnapshot?.text || contextText)
    const contextLabel = contextSnapshot ? contextSnapshot.label : contextText ? 'Selected text' : null
    setMessages((prev) => [...prev, { role: 'user', content: text, context_label: contextLabel, mode }])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLocalContext(null)
    onClearContext()
    abortControllerRef.current = new AbortController()
    setLoading(true)

    try {
      let context = contextSnapshot
        ? contextSnapshot.text
        : contextText
          ? truncateContext(contextText).text
          : null

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

      const res = await api.chatMessage(docId, text, context, hasContext, provider, contextLabel, abortControllerRef.current.signal, structureLocked, mode)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }])
      onActionComplete?.()
      if (res.proposed_content) {
        onProposedChange(res.proposed_content)
      }
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

  const handleActionSelect = (action, instructions) => {
    if (instructions === null) {
      setPendingAction(action)
    } else {
      fireInsightInternal(INSIGHTS_PROMPTS[action])
    }
  }

  const runAction = (action, instructions) => {
    setPendingAction(null)
    const base = REDRAFT_PROMPTS[action]
    const prompt = instructions.trim() ? `${base} ${instructions.trim()}` : base
    fireInsightInternal(prompt)
  }

  const fireInsightInternal = (promptText) => {
    setInput(promptText)
    setTimeout(() => handleSend(promptText, 'edit'), 0)
  }

  const effectiveContext = localContext?.text || contextText
  const chipLabel = localContext
    ? localContext.label
    : contextText
      ? `Selected text (${contextText.length} chars)`
      : null
  const isTruncated = localContext?.truncated || (!localContext && contextText && contextText.length > ATTACHMENT_TRUNCATION_LIMIT)
  const isAmber = (localContext?.originalLength ?? 0) > ATTACHMENT_WARNING_THRESHOLD || (!localContext && contextText && contextText.length > ATTACHMENT_WARNING_THRESHOLD)
  const actualChars = localContext ? localContext.originalLength : (contextText?.length ?? 0)
  const sendHint = submitOnEnter ? '↵ to send' : (isMac ? '⌘↵ to send' : 'Ctrl↵ to send')

  return (
    <div className="w-[380px] flex flex-col border-l border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Chat</span>
          {evidenceCount > 0 && (
            <span className="text-xs text-gray-400">{evidenceCount} source{evidenceCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
        <ActionsDropdown
          title="Redraft"
          actions={[
            { label: 'Rewrite', action: 'rewrite' },
            { label: 'Restructure', action: 'restructure' },
            { label: 'Expand', action: 'expand' },
            { label: 'Condense', action: 'condense' },
            { label: 'Simplify', action: 'simplify' },
            { label: 'Formalise', action: 'formalise' },
          ]}
          onAction={(action) => handleActionSelect(action, null)}
          disabled={!!pendingProposal}
        />
        <ActionsDropdown
          title="Insights"
          actions={DOCUMENT_INSIGHT_ACTIONS.map((a) => ({ label: a.label, action: a.action }))}
          onAction={(action) => handleActionSelect(action, '')}
          disabled={!!pendingProposal}
        />
        </div>
      </div>
      {pendingAction && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-gray-600 capitalize flex-shrink-0">{REDRAFT_LABELS[pendingAction]}</span>
          <input
            type="text"
            placeholder="Additional instructions (optional)"
            autoFocus
            ref={instructionInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); runAction(pendingAction, instructionInputRef.current?.value ?? '') }
              if (e.key === 'Escape') setPendingAction(null)
            }}
            className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-800 outline-none focus:border-blue-400 transition-colors bg-white"
          />
          <button
            onClick={() => runAction(pendingAction, instructionInputRef.current?.value ?? '')}
            className="flex-shrink-0 rounded px-2 py-0.5 text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Run
          </button>
          <button
            onClick={() => setPendingAction(null)}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
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
            {msg.role === 'user' ? (
              <div className="flex flex-col items-end max-w-[85%]">
                {msg.context_label && (
                  <div className="text-xs text-gray-400 mb-1">
                    {msg.context_label}
                  </div>
                )}
                {msg.mode === 'edit' && (
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 mb-1">Edit</span>
                )}
                <div className="rounded-lg px-3 py-2 text-sm bg-blue-600 text-white">
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 text-gray-800">
                {msg.content && (
                  <div className="[&>*]:!p-0 [&>*]:!max-w-none [&>*]:!overflow-visible [&>*]:!bg-transparent [&>*]:!flex-none"><MarkdownPreview content={msg.content} /></div>
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

      {/* Context attachment chip */}
      {effectiveContext && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              isAmber
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}
            title={isTruncated ? `Content exceeded ${ATTACHMENT_TRUNCATION_LIMIT} characters and was truncated` : undefined}
          >
            <span className="truncate">{chipLabel}</span>
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
            <AttachmentPopup
              headings={headings || []}
              evidenceSources={evidenceSources || []}
              onAttach={handleAttach}
              onClose={() => setShowPopup(false)}
              anchorRef={plusButtonRef}
            />
          )}
          <button
            ref={plusButtonRef}
            onClick={() => setShowPopup((v) => !v)}
            className="self-end text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none px-1 pb-0.5 flex-shrink-0"
            title="Attach section or evidence"
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
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleSend(undefined, 'edit')}
                  disabled={!input.trim() || isCapped}
                  title={isCapped ? 'Monthly action limit reached — add your Anthropic API key in Account settings' : undefined}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:text-gray-400 text-gray-700 px-3 py-1.5 rounded transition-colors font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isCapped}
                  title={isCapped ? 'Monthly action limit reached — add your Anthropic API key in Account settings' : undefined}
                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded transition-colors font-medium"
                >
                  Send
                </button>
              </div>
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
})

export default ChatPanel
