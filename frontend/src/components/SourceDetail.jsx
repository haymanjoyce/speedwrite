import { Link } from 'react-router-dom'

function timeAgo(isoString) {
  const date = new Date(isoString + 'Z')
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'yesterday'
  return date.toLocaleDateString()
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTypeLabel(item) {
  if (item.type === 'file' && item.filename) {
    const ext = item.filename.split('.').pop()?.toUpperCase()
    return ext ? `File (${ext})` : 'File'
  }
  if (item.type === 'url') return 'URL'
  if (item.type === 'text') return 'Text'
  if (item.type === 'document') return 'Document'
  return item.type
}

export default function SourceDetail({ item, allItems = [] }) {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source Detail</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm text-gray-400">Select a source to view its contents</p>
        </div>
      </div>
    )
  }

  const wordCount = (item.content ?? '').split(/\s+/).filter(Boolean).length

  const isDuplicateUrl = item.type === 'url' && item.url &&
    allItems.some((other) => other.id !== item.id && other.type === 'url' && other.url?.toLowerCase() === item.url.toLowerCase())

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Panel header */}
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source Detail</span>
      </div>

      {/* Fetch error warning */}
      {item.last_fetch_error && (
        <div className="bg-amber-50 border-b border-amber-100 text-xs text-amber-600 px-4 py-2 flex-shrink-0">
          Last update failed ({item.last_fetch_error})
        </div>
      )}

      {/* Duplicate URL warning */}
      {isDuplicateUrl && (
        <div className="bg-amber-50 border-b border-amber-100 text-xs text-amber-600 px-4 py-2 flex-shrink-0">
          Another source with this URL already exists.
        </div>
      )}

      {/* Metadata header */}
      <div className="bg-white border-b border-gray-100 p-6 flex-shrink-0">
        <h1 className="text-base font-semibold text-gray-900 mb-3">{item.title}</h1>
        <div className="space-y-1">
          {(item.type === 'url' ? [
            ['Type', getTypeLabel(item)],
            item.url ? ['URL', item.url] : null,
            ['Added', formatDate(item.created_at)],
            item.last_fetched_at ? ['Last updated', timeAgo(item.last_fetched_at)] : null,
            wordCount > 0 ? ['Words', `~${wordCount.toLocaleString()}`] : null,
          ] : item.type === 'file' ? [
            ['Type', getTypeLabel(item)],
            ['Added', formatDate(item.created_at)],
            wordCount > 0 ? ['Words', `~${wordCount.toLocaleString()}`] : null,
            item.file_size != null ? ['Size', formatBytes(item.file_size)] : null,
          ] : item.type === 'document' ? [
            ['Type', getTypeLabel(item)],
            ['Added', formatDate(item.created_at)],
            item.last_fetched_at ? ['Last updated', timeAgo(item.last_fetched_at)] : null,
            wordCount > 0 ? ['Words', `~${wordCount.toLocaleString()}`] : null,
            item.source_doc_id ? ['Source doc', item.source_doc_id] : null,
          ] : [
            ['Type', getTypeLabel(item)],
            ['Added', formatDate(item.created_at)],
            wordCount > 0 ? ['Words', `~${wordCount.toLocaleString()}`] : null,
          ]).filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex gap-3 text-xs">
              <span className="text-gray-400 flex-shrink-0 w-24">{label}</span>
              {label === 'URL' ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{value}</a>
              ) : label === 'Source doc' ? (
                <Link to={`/document/${value}`} className="text-blue-600 hover:underline">View source document →</Link>
              ) : (
                <span className="text-gray-700">{value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 overflow-y-auto p-6">
        {item.description ? (
          <div className="space-y-4">
            {item.description.split(/\n(?=## )/).map((block) => {
              const lines = block.trim().split('\n')
              const heading = lines[0].replace(/^##\s*/, '').trim()
              const bullets = lines.slice(1).filter((l) => /^[-*]\s/.test(l.trim())).map((l) => l.replace(/^[-*]\s*/, '').trim())
              return (
                <div key={heading}>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{heading}</p>
                  <ul className="space-y-0.5">
                    {bullets.map((b, i) => (
                      <li key={i} className="text-sm text-gray-600 pl-3 flex gap-2"><span className="flex-shrink-0">·</span><span>{b}</span></li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No description yet.</p>
        )}
      </div>

    </div>
  )
}
