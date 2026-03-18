import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function Editor({ document, onUpdate, onSelectText, onSaveStatus, contentOverride }) {
  const [content, setContent] = useState('')
  const saveTimer = useRef(null)

  useEffect(() => {
    setContent(document?.content ?? '')
    if (onSelectText) onSelectText('')
    clearTimeout(saveTimer.current)
  }, [document?.id])

  useEffect(() => {
    if (contentOverride != null) setContent(contentOverride)
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
      <textarea
        className="flex-1 p-6 font-mono text-sm text-gray-800 resize-none outline-none leading-relaxed"
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        placeholder="Start writing in Markdown…"
        spellCheck={false}
      />
    </div>
  )
}
