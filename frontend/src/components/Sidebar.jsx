import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DocumentTree from './DocumentTree'

export default function Sidebar({ documents, activeDocId, onNewDocument }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-gray-700">
        <button
          onClick={onNewDocument}
          className="w-full text-sm bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1.5 transition-colors"
        >
          + New Document
        </button>
      </div>

      <div className="flex-1 py-2">
        {documents.length === 0 && (
          <p className="text-gray-500 text-xs px-4 py-2">No documents yet.</p>
        )}
        {documents.map((doc) => (
          <div key={doc.id}>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 group ${
                doc.id === activeDocId ? 'bg-gray-700' : 'hover:bg-gray-750'
              }`}
            >
              <button
                onClick={() => toggle(doc.id)}
                className="text-gray-500 hover:text-gray-300 w-4 flex-shrink-0 text-xs leading-none"
              >
                {expanded[doc.id] ? '▾' : '▸'}
              </button>
              <span
                onClick={() => navigate(`/document/${doc.id}`)}
                className="text-gray-200 text-sm truncate flex-1 cursor-pointer hover:text-white"
              >
                {doc.title}
              </span>
            </div>
            {expanded[doc.id] && <DocumentTree content={doc.content} />}
          </div>
        ))}
      </div>
    </div>
  )
}
