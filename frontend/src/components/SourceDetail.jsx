import { useEffect, useState } from 'react'

const TYPE_LABEL = { file: 'File', url: 'URL', text: 'Plain text', document: 'Document' }
const TYPE_ICON = { file: '📄', url: '🔗', text: '📝', document: '📑' }
const MAX_CONTENT = 2000

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
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
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a source to view it
      </div>
    )
  }

  const rawContent = (item.type === 'document' && item.sync)
    ? (liveContent ?? '')
    : (item.content ?? '')
  const truncated = rawContent.length > MAX_CONTENT
  const displayContent = truncated ? rawContent.slice(0, MAX_CONTENT) : rawContent

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="px-8 pt-8 pb-4 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5">
            {TYPE_ICON[item.type]} {TYPE_LABEL[item.type] ?? item.type}
          </span>
          <span>Added {new Date(item.created_at).toLocaleString()}</span>
          {item.file_size != null && <span>{formatBytes(item.file_size)}</span>}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block break-all"
          >
            {item.url}
          </a>
        )}
        {item.type === 'document' && (
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <button
              onClick={() => onToggleSync?.(!item.sync)}
              className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-full px-2.5 py-0.5 hover:border-gray-300 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${item.sync ? 'bg-green-500' : 'bg-gray-300'}`} />
              Sync: {item.sync ? 'On' : 'Off'}
            </button>
            {item.sync ? (
              <span className="text-xs text-gray-400">Live content (sync on)</span>
            ) : (
              item.synced_at && (
                <span className="text-xs text-gray-400">
                  Snapshot — Last synced: {new Date(item.synced_at).toLocaleString()}
                </span>
              )
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {truncated && (
          <p className="text-xs text-gray-400 mb-2">
            Showing first {MAX_CONTENT.toLocaleString()} characters
          </p>
        )}
        <textarea
          readOnly
          value={displayContent}
          className="w-full h-full min-h-64 font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-4 resize-none outline-none leading-relaxed"
        />
      </div>
    </div>
  )
}
