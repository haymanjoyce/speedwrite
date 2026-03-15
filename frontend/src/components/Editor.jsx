import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function Editor({ document, onUpdate, onDelete }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    setContent(document?.content ?? '')
    setLastSaved(null)
    clearTimeout(saveTimer.current)
  }, [document?.id])

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

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${document.title}"?`)) return
    await api.deleteDocument(document.id)
    onDelete(document.id)
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a document or create a new one
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-base font-semibold text-gray-800 truncate">{document.title}</h1>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0 ml-4">
          {saving && <span>Saving…</span>}
          {!saving && lastSaved && (
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      <textarea
        className="flex-1 p-6 font-mono text-sm text-gray-800 resize-none outline-none leading-relaxed"
        value={content}
        onChange={handleChange}
        placeholder="Start writing in Markdown…"
        spellCheck={false}
      />
    </div>
  )
}
