import DocumentTree from './DocumentTree'

export default function DocumentSidebar({ document, onHeadingClick }) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="flex-1 py-4">
        {document && <DocumentTree content={document.content} onHeadingClick={onHeadingClick} />}
      </div>
    </div>
  )
}
