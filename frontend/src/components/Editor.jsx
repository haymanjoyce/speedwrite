import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function Editor({ document, onUpdate }) {
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

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a document or create a new one
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-end px-6 py-2 border-b border-gray-200 flex-shrink-0 text-xs text-gray-400">
        {saving && <span>Saving…</span>}
        {!saving && lastSaved && <span>Saved {lastSaved.toLocaleTimeString()}</span>}
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
