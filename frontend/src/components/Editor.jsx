import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import DiffView from './DiffView'
import MarkdownPreview from './MarkdownPreview'
import SegmentedControl from './SegmentedControl'

const Editor = forwardRef(function Editor({ document, onUpdate, onSelectText, onSaveStatus, contentOverride, onContentOverrideApplied, pendingProposal, editorMode, onEditorModeChange, protectedSections = [], flashStatus = '', structureLocked = false }, ref) {
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findIndex, setFindIndex] = useState(0)
  const saveTimer = useRef(null)
  const textareaRef = useRef(null)

  const findMatches = useMemo(() => {
    if (!findQuery) return []
    const lower = content.toLowerCase()
    const q = findQuery.toLowerCase()
    const indices = []
    let pos = 0
    while (true) {
      const idx = lower.indexOf(q, pos)
      if (idx === -1) break
      indices.push(idx)
      pos = idx + 1
    }
    return indices
  }, [findQuery, content])

  // Reset index when query changes
  useEffect(() => {
    setFindIndex(0)
  }, [findQuery])

  // Close find bar when switching away from edit mode
  useEffect(() => {
    if (editorMode !== 'edit') {
      closeFindBar()
    }
  }, [editorMode])

  const closeFindBar = () => {
    setFindOpen(false)
    setFindQuery('')
    setFindIndex(0)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const openFindBar = () => {
    setFindOpen(true)
  }

  const selectMatch = (index, matches) => {
    const el = textareaRef.current
    if (!el || !matches.length) return
    const start = matches[index]
    const end = start + findQuery.length

    // Measure pixel offset of match start using mirror div technique
    const mirror = window.document.createElement('div')
    const style = window.getComputedStyle(el)
    ;['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap',
    ].forEach((p) => { mirror.style[p] = style[p] })
    mirror.style.position = 'absolute'
    mirror.style.top = '-9999px'
    mirror.style.left = '-9999px'
    mirror.style.width = el.offsetWidth + 'px'
    mirror.style.overflow = 'hidden'
    mirror.style.visibility = 'hidden'
    mirror.textContent = el.value.slice(0, start)
    const span = window.document.createElement('span')
    span.textContent = '|'
    mirror.appendChild(span)
    window.document.body.appendChild(mirror)
    const top = span.offsetTop
    window.document.body.removeChild(mirror)

    el.focus()
    el.setSelectionRange(start, end)
    el.scrollTo({ top: Math.max(0, top - 60), behavior: 'smooth' })
  }

  const goNext = () => {
    if (!findMatches.length) return
    const next = (findIndex + 1) % findMatches.length
    setFindIndex(next)
    selectMatch(next, findMatches)
  }

  const goPrev = () => {
    if (!findMatches.length) return
    const prev = (findIndex - 1 + findMatches.length) % findMatches.length
    setFindIndex(prev)
    selectMatch(prev, findMatches)
  }

  const handleFindKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeFindBar()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        goPrev()
      } else {
        goNext()
      }
    }
  }

  const handleTextareaKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      openFindBar()
    }
  }

  useImperativeHandle(ref, () => ({
    scrollToHeading(headingText) {
      const el = textareaRef.current
      if (!el) return
      const lines = el.value.split('\n')
      let charOffset = 0
      for (const line of lines) {
        const m = line.match(/^#{1,6}\s+(.+)/)
        if (m && m[1].trim() === headingText) {
          const mirror = window.document.createElement('div')
          const style = window.getComputedStyle(el)
          ;['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap',
          ].forEach((p) => { mirror.style[p] = style[p] })
          mirror.style.position = 'absolute'
          mirror.style.top = '-9999px'
          mirror.style.left = '-9999px'
          mirror.style.width = el.offsetWidth + 'px'
          mirror.style.overflow = 'hidden'
          mirror.style.visibility = 'hidden'
          mirror.textContent = el.value.slice(0, charOffset)
          const span = window.document.createElement('span')
          span.textContent = '|'
          mirror.appendChild(span)
          window.document.body.appendChild(mirror)
          const top = span.offsetTop
          window.document.body.removeChild(mirror)
          el.scrollTo({ top: Math.max(0, top - 24), behavior: 'smooth' })
          return
        }
        charOffset += line.length + 1
      }
    },
  }))

  useEffect(() => {
    setContent(document?.content ?? '')
    if (onSelectText) onSelectText('')
    clearTimeout(saveTimer.current)
  }, [document?.id])

  useEffect(() => {
    if (contentOverride != null) {
      setContent(contentOverride)
      if (document?.id) {
        setSaveStatus('Saving…')
        onSaveStatus?.('Saving…')
        scheduleSave(document.id, contentOverride)
      }
      onContentOverrideApplied?.()
    }
  }, [contentOverride])

  const scheduleSave = (docId, newContent) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('Saving…')
      if (onSaveStatus) onSaveStatus('Saving…')
      try {
        const updated = await api.updateDocument(docId, { content: newContent })
        const ts = `Saved ${new Date().toLocaleTimeString()}`
        setSaveStatus(ts)
        if (onSaveStatus) onSaveStatus(ts)
        onUpdate(updated)
      } catch (err) {
        console.error('Auto-save failed', err)
        setSaveStatus('')
        if (onSaveStatus) onSaveStatus('')
      }
    }, 1000)
  }

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)
    scheduleSave(document.id, val)
  }

  const handleSelect = (e) => {
    if (!onSelectText) return
    const { selectionStart, selectionEnd } = e.target
    onSelectText(selectionStart !== selectionEnd ? content.slice(selectionStart, selectionEnd) : '')
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a document or create a new one
      </div>
    )
  }

  const btnCls = 'border border-gray-200 rounded px-1.5 py-0.5 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editor</span>
        <div className="flex items-center gap-3">
          {(flashStatus || saveStatus) && <span className="text-xs text-gray-400">{flashStatus || saveStatus}</span>}
          {!pendingProposal && onEditorModeChange && (
            <>
              {editorMode === 'edit' && (
                <button
                  className={btnCls}
                  onClick={openFindBar}
                  title="Find (Ctrl+F)"
                  aria-label="Find"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <SegmentedControl
                options={[
                  { value: 'edit', label: 'Edit' },
                  { value: 'preview', label: 'Preview' },
                ]}
                value={editorMode}
                onChange={onEditorModeChange}
              />
            </>
          )}
        </div>
      </div>
      {findOpen && !pendingProposal && editorMode === 'edit' && (
        <div className="h-10 bg-gray-50 border-b border-gray-200 px-4 flex items-center gap-2 flex-shrink-0">
          <input
            autoFocus
            type="text"
            className="w-44 flex-shrink-0 text-sm border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-gray-400 bg-white"
            placeholder="Find…"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
          />
          <button className={btnCls} onClick={goPrev} title="Previous match (Shift+Enter)">↑</button>
          <button className={btnCls} onClick={goNext} title="Next match (Enter)">↓</button>
          <span className="text-xs min-w-[3.5rem] text-center text-gray-400">
            {findQuery ? `${findMatches.length ? findIndex + 1 : 0} / ${findMatches.length}` : ''}
          </span>
          <div className="flex-1" />
          <button className={btnCls} onClick={closeFindBar} title="Close">×</button>
        </div>
      )}
      {pendingProposal ? (
        <DiffView originalContent={content} proposedContent={pendingProposal} protectedSections={protectedSections} structureLocked={structureLocked} />
      ) : editorMode === 'preview' ? (
        <MarkdownPreview content={content} protectedSections={protectedSections} structureLocked={structureLocked} />
      ) : (
        <textarea
          ref={textareaRef}
          className="flex-1 p-6 font-mono text-sm text-gray-800 resize-none outline-none leading-relaxed"
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onMouseUp={handleSelect}
          onKeyUp={handleSelect}
          onKeyDown={handleTextareaKeyDown}
          placeholder={"Start writing here...\n\nUse ## headings to structure your document — they'll appear in the document tree on the left."}
          spellCheck={false}
        />
      )}
    </div>
  )
})

export default Editor
