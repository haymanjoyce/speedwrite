import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function Editor({ document, onUpdate, onSelectText, contentOverride }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [localSelection, setLocalSelection] = useState('')
  const saveTimer = useRef(null)

  useEffect(() => {
    setContent(document?.content ?? '')
    setLastSaved(null)
    setLocalSelection('')
    clearTimeout(saveTimer.current)
  }, [document?.id])

  useEffect(() => {
    if (contentOverride != null) setContent(contentOverride)
  }, [contentOverride])

  const scheduleSave = (docId, newContent) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updated = await api.updateDocument(docId, { content: newContent })
        setLastSaved(new Date())
        onUpdate(updated)
      } catch (err) {
        console.error('Auto-save failed', err)
      } finally {
        setSaving(false)
      }
    }, 1000)
  }

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)
    scheduleSave(document.id, val)
  }

  const handleSelect = (e) => {
    const { selectionStart, selectionEnd } = e.target
    setLocalSelection(selectionStart !== selectionEnd ? content.slice(selectionStart, selectionEnd) : '')
  }

  const handleAddToChat = () => {
    if (onSelectText && localSelection) {
      onSelectText(localSelection)
      setLocalSelection('')
    }
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
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-200 flex-shrink-0 text-xs text-gray-400">
        <div>
          {localSelection && onSelectText && (
            <button
              onClick={handleAddToChat}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Add to chat ↗
            </button>
          )}
        </div>
        <div>
          {saving && <span>Saving…</span>}
          {!saving && lastSaved && <span>Saved {lastSaved.toLocaleTimeString()}</span>}
        </div>
      </div>
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
