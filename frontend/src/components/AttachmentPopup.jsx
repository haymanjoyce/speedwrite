import { useEffect, useRef, useState } from 'react'

const TYPE_ICONS = { url: '🔗', file: '📄', text: '📝', document: '📋' }

export default function AttachmentPopup({ headings, evidenceSources, onAttach, onClose, anchorRef }) {
  const [screen, setScreen] = useState('type')
  const [query, setQuery] = useState('')
  const popupRef = useRef(null)
  const searchRef = useRef(null)

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

  useEffect(() => {
    if (screen !== 'type') {
      setQuery('')
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [screen])

  const filteredHeadings = (headings || []).filter((h) =>
    h.text.toLowerCase().includes(query.toLowerCase())
  )
  const filteredSources = (evidenceSources || []).filter((s) =>
    (s.title || '').toLowerCase().includes(query.toLowerCase())
  )

  if (screen === 'type') {
    return (
      <div
        ref={popupRef}
        className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-72 z-50"
      >
        <button
          onClick={() => setScreen('section')}
          className="text-sm text-gray-700 hover:bg-gray-50 rounded px-3 py-2 cursor-pointer w-full text-left"
        >
          📄 Section
        </button>
        <button
          onClick={() => setScreen('evidence')}
          className="text-sm text-gray-700 hover:bg-gray-50 rounded px-3 py-2 cursor-pointer w-full text-left"
        >
          🔗 Evidence
        </button>
      </div>
    )
  }

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-72 z-50"
    >
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setScreen('type')}
          className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer px-1 flex-shrink-0"
        >
          ←
        </button>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={screen === 'section' ? 'Search headings…' : 'Search sources…'}
          className="flex-1 text-sm outline-none px-2 py-1 border border-gray-200 rounded"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {screen === 'section' && filteredHeadings.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No headings found.</p>
        )}
        {screen === 'section' && filteredHeadings.map((h, i) => (
          <button
            key={i}
            onClick={() => { onAttach(h.content, `📄 ${h.text}`); onClose() }}
            className={`text-sm text-gray-700 hover:bg-gray-50 rounded py-1.5 cursor-pointer w-full text-left truncate ${
              h.level === 3 ? 'pl-7 pr-3' : 'pl-3 pr-3'
            }`}
          >
            {h.text}
          </button>
        ))}
        {screen === 'evidence' && filteredSources.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No sources found.</p>
        )}
        {screen === 'evidence' && filteredSources.map((s, i) => (
          <button
            key={i}
            onClick={() => { onAttach(s.content || '', `📎 ${s.title}`); onClose() }}
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
