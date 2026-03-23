import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSearch } from '../context/SearchContext'

function Highlight({ text, query }) {
  if (!query || !text) return <>{text || ''}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-gray-900 font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-2 bg-gray-50">
      {title}
    </div>
  )
}

export default function SearchOverlay() {
  const navigate = useNavigate()
  const { close } = useSearch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  const docs = results?.documents || []
  const evidence = results?.evidence || []
  const chat = results?.chat || []
  const hasResults = docs.length + evidence.length + chat.length > 0
  const noResults = results !== null && !loading && !hasResults

  const docOffset = 0
  const evOffset = docs.length
  const chatOffset = evOffset + evidence.length

  const allItems = [
    ...docs.map((d) => ({ type: 'document', data: d })),
    ...evidence.map((e) => ({ type: 'evidence', data: e })),
    ...chat.map((c) => ({ type: 'chat', data: c })),
  ]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      clearTimeout(debounceRef.current)
      setResults(null)
      setLoading(false)
      return
    }
    setResults(null)
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query)
        setResults(data)
        setFocusedIndex(0)
      } catch (err) {
        console.error('Search failed', err)
        setResults({ documents: [], evidence: [], chat: [] })
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  const handleSelect = (item) => {
    if (item.type === 'document') {
      navigate(`/document/${item.data.id}`)
    } else if (item.type === 'evidence') {
      navigate(`/document/${item.data.doc_id}/evidence`, { state: { evidenceId: item.data.evidence_id } })
    } else {
      navigate(`/document/${item.data.doc_id}`)
    }
    close()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allItems.length > 0) {
      handleSelect(allItems[focusedIndex])
    }
  }

  const itemClass = (focused) =>
    `w-full text-left px-6 py-3 cursor-pointer transition-colors ${focused ? 'bg-gray-50' : 'hover:bg-gray-50'}`

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-start justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="w-full max-w-2xl mx-4 mt-24 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-4">
          <svg className="text-gray-400 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, evidence, chat…"
            className="flex-1 text-lg outline-none bg-transparent placeholder-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Results / states */}
        <div className="border-t border-gray-100">
          {query.length < 2 ? (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">Start typing to search…</p>
          ) : loading ? (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">Searching…</p>
          ) : noResults ? (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">No results found</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {docs.length > 0 && (
                <>
                  <SectionHeader title="Documents" />
                  {docs.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect({ type: 'document', data: item })}
                      onMouseEnter={() => setFocusedIndex(docOffset + i)}
                      className={itemClass(focusedIndex === docOffset + i)}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        <Highlight text={item.title} query={query} />
                      </div>
                      {item.match_type === 'content' && (
                        <div className="text-sm text-gray-500 truncate mt-0.5">
                          <Highlight text={item.excerpt} query={query} />
                        </div>
                      )}
                    </button>
                  ))}
                </>
              )}
              {evidence.length > 0 && (
                <>
                  <SectionHeader title="Evidence" />
                  {evidence.map((item, i) => (
                    <button
                      key={item.evidence_id}
                      onClick={() => handleSelect({ type: 'evidence', data: item })}
                      onMouseEnter={() => setFocusedIndex(evOffset + i)}
                      className={itemClass(focusedIndex === evOffset + i)}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        <Highlight text={item.evidence_title} query={query} />
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{item.doc_title}</div>
                      {item.match_type === 'content' && (
                        <div className="text-sm text-gray-500 truncate mt-0.5">
                          <Highlight text={item.excerpt} query={query} />
                        </div>
                      )}
                    </button>
                  ))}
                </>
              )}
              {chat.length > 0 && (
                <>
                  <SectionHeader title="Chat" />
                  {chat.map((item, i) => (
                    <button
                      key={`${item.doc_id}-${chatOffset + i}`}
                      onClick={() => handleSelect({ type: 'chat', data: item })}
                      onMouseEnter={() => setFocusedIndex(chatOffset + i)}
                      className={itemClass(focusedIndex === chatOffset + i)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${item.role === 'assistant' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          {item.role === 'assistant' ? 'AI' : 'User'}
                        </span>
                        <span className="text-xs text-gray-400 truncate">{item.doc_title}</span>
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        <Highlight text={item.message} query={query} />
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
