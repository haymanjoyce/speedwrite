import DocumentTree from './DocumentTree'

export default function DocumentSidebar({ document }) {
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="flex-1 py-4">
        {document && <DocumentTree content={document.content} />}
      </div>
    </div>
  )
}
