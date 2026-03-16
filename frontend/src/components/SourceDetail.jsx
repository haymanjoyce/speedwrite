const TYPE_LABEL = { file: 'File', url: 'URL', text: 'Plain text' }
const TYPE_ICON = { file: '📄', url: '🔗', text: '📝' }
const MAX_CONTENT = 2000

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function SourceDetail({ item, onDelete }) {
  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a source to view it
      </div>
    )
  }

  const content = item.content ?? ''
  const truncated = content.length > MAX_CONTENT
  const displayContent = truncated ? content.slice(0, MAX_CONTENT) : content

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-start justify-between px-8 pt-8 pb-4 border-b border-gray-100 flex-shrink-0">
        <div>
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
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-red-400 hover:text-red-600 text-sm transition-colors ml-6 flex-shrink-0"
        >
          Delete
        </button>
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
