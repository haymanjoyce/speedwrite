import { api } from '../api'

export default function EvidenceSidebar({ items, selectedId, onSelect, docId, onItemUpdate }) {
  const handleToggleActive = async (e, item) => {
    e.stopPropagation()
    const currentActive = item.active !== false
    const nextActive = !currentActive

    onItemUpdate({ ...item, active: nextActive })
    try {
      const updated = await api.updateEvidence(docId, item.id, { active: nextActive })
      onItemUpdate(updated)
    } catch {
      onItemUpdate({ ...item, active: currentActive })
    }
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sources</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 && (
          <p className="text-gray-400 text-xs px-4 py-2">No sources yet.</p>
        )}
        {items.map((item) => {
          const isActive = item.active !== false
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                item.id === selectedId
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={(e) => handleToggleActive(e, item)}
                aria-label={isActive ? 'Deactivate source' : 'Activate source'}
                className="flex-shrink-0 w-3.5 h-3.5 rounded-sm border transition-colors focus:outline-none"
                style={{
                  backgroundColor: isActive ? '#111827' : 'transparent',
                  borderColor: isActive ? '#111827' : '#d1d5db',
                }}
              >
                {isActive && (
                  <svg viewBox="0 0 10 10" fill="none" className="w-full h-full">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`text-sm truncate ${
                item.id === selectedId
                  ? isActive ? 'text-gray-900' : 'text-gray-400'
                  : isActive ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {item.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
