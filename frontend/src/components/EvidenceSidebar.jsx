import Button from './Button'

const TYPE_ICON = { file: '📄', url: '🔗', text: '📝' }

export default function EvidenceSidebar({ items, selectedId, onSelect, onAdd }) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sources</span>
      </div>
      <div className="px-4 pt-3 pb-3 border-b border-gray-200">
        <Button variant="primary" size="md" onClick={onAdd} className="w-full">
          + Add Source
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 && (
          <p className="text-gray-400 text-xs px-4 py-2">No sources yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
              item.id === selectedId
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-100'
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
