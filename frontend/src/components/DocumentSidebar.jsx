import DocumentTree from './DocumentTree'

export default function DocumentSidebar({ document }) {
  return (
    <div className="w-64 bg-[#3d3d3d] border-r border-[#4d4d4d] flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="flex-1 py-4">
        {document && <DocumentTree content={document.content} />}
      </div>
    </div>
  )
}
