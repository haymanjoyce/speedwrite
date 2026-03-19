import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../api'
import DiffView from './DiffView'
import MarkdownPreview from './MarkdownPreview'

const Editor = forwardRef(function Editor({ document, onUpdate, onSelectText, onSaveStatus, contentOverride, pendingProposal, editorMode }, ref) {
  const [content, setContent] = useState('')
  const saveTimer = useRef(null)
  const textareaRef = useRef(null)

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
        onSaveStatus?.('Saving…')
        scheduleSave(document.id, contentOverride)
      }
    }
  }, [contentOverride])

  const scheduleSave = (docId, newContent) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (onSaveStatus) onSaveStatus('Saving…')
      try {
        const updated = await api.updateDocument(docId, { content: newContent })
        if (onSaveStatus) onSaveStatus(`Saved ${new Date().toLocaleTimeString()}`)
        onUpdate(updated)
      } catch (err) {
        console.error('Auto-save failed', err)
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
      {pendingProposal ? (
        <DiffView originalContent={content} proposedContent={pendingProposal} />
      ) : editorMode === 'preview' ? (
        <MarkdownPreview content={content} />
      ) : (
        <textarea
          ref={textareaRef}
          className="flex-1 p-6 font-mono text-sm text-gray-800 resize-none outline-none leading-relaxed"
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onMouseUp={handleSelect}
          onKeyUp={handleSelect}
          placeholder="Start writing in Markdown…"
          spellCheck={false}
        />
      )}
    </div>
  )
})

export default Editor
