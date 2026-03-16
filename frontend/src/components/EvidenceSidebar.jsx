const TYPE_ICON = { file: '📄', url: '🔗', text: '📝' }

export default function EvidenceSidebar({ items, selectedId, onSelect, onAdd }) {
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-gray-700">
        <p className="text-white font-semibold tracking-tight mb-3">Evidence</p>
        <button
          onClick={onAdd}
          className="w-full text-sm bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1.5 transition-colors"
        >
          + Add Source
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 && (
          <p className="text-gray-500 text-xs px-4 py-2">No sources yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
              item.id === selectedId
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="flex-shrink-0 text-sm">{TYPE_ICON[item.type] ?? '📄'}</span>
            <span className="text-sm truncate">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
