import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const TYPE_ICON = { file: '📄', url: '🔗', text: '📝', document: '📑' }
const MAX_CONTENT = 2000

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTypeBadge(item) {
  if (item.type === 'file' && item.filename) {
    const ext = item.filename.split('.').pop()?.toUpperCase()
    return ext || 'File'
  }
  if (item.type === 'url') return 'URL'
  if (item.type === 'text') return 'Text'
  if (item.type === 'document') return 'Document'
  return item.type
}

function getDomain(url) {
  try { return new URL(url).hostname } catch { return null }
}

export default function SourceDetail({ item, onToggleSync, onFetchLiveContent }) {
  const [liveContent, setLiveContent] = useState(null)

  useEffect(() => {
    if (item?.type === 'document' && item.sync) {
      setLiveContent(null)
      onFetchLiveContent?.().then(setLiveContent).catch(console.error)
    } else {
      setLiveContent(null)
    }
  }, [item?.id, item?.sync])

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
        <span className="text-3xl">🔍</span>
        <p className="text-sm text-gray-400">Select a source to view its contents</p>
      </div>
    )
  }

  const rawContent = (item.type === 'document' && item.sync)
    ? (liveContent ?? '')
    : (item.content ?? '')
  const truncated = rawContent.length > MAX_CONTENT
  const displayContent = truncated ? rawContent.slice(0, MAX_CONTENT) : rawContent
  const wordCount = rawContent.split(/\s+/).filter(Boolean).length

  const domain = item.url ? getDomain(item.url) : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Metadata header */}
      <div className="bg-white border-b border-gray-100 p-6 flex-shrink-0">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0 mt-0.5">{TYPE_ICON[item.type] || '📄'}</span>
          <div className="flex-1 min-w-0">

            {/* Title + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg font-semibold text-gray-900">{item.title}</h1>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 flex-shrink-0">
                {getTypeBadge(item)}
              </span>
              {item.type === 'document' && (
                <span className={`text-xs rounded-full px-2 py-0.5 flex-shrink-0 ${
                  item.sync ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.sync ? 'Live' : 'Snapshot'}
                </span>
              )}
            </div>

            {/* Secondary metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
              <span>Added {formatDate(item.created_at)}</span>
              {wordCount > 0 && <span>~{wordCount.toLocaleString()} words</span>}
              {item.file_size != null && <span>{formatBytes(item.file_size)}</span>}
            </div>

            {/* URL with favicon */}
            {item.url && domain && (
              <div className="flex items-center gap-1.5 mt-2">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate"
                >
                  {domain}
                </a>
              </div>
            )}

            {/* Document source link */}
            {item.type === 'document' && item.source_doc_id && (
              <Link
                to={`/document/${item.source_doc_id}`}
                className="text-xs text-blue-600 hover:underline mt-1.5 inline-block"
              >
                View source document →
              </Link>
            )}

            {/* Sync toggle */}
            {item.type === 'document' && (
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => onToggleSync?.(!item.sync)}
                  className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-full px-2.5 py-0.5 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <span className={`w-2 h-2 rounded-full ${item.sync ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Sync: {item.sync ? 'On' : 'Off'}
                </button>
                {!item.sync && item.synced_at && (
                  <span className="text-xs text-gray-400">
                    Last synced: {formatDate(item.synced_at)}
                  </span>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayContent}</p>
      </div>

      {/* Truncation banner */}
      {truncated && (
        <div className="bg-amber-50 border-t border-amber-100 text-xs text-amber-600 px-6 py-2 flex-shrink-0">
          Showing first {MAX_CONTENT.toLocaleString()} characters
        </div>
      )}

    </div>
  )
}
