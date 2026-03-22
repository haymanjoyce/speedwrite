import DocumentTree from './DocumentTree'
import { parseHeadings } from './DocumentTree'

export default function DocumentSidebar({ document, onHeadingClick, onSectionRewrite, protectedSections, onToggleProtection }) {
  const hasHeadings = document && parseHeadings(document.content).length > 0

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="flex-1 py-4">
        {document && hasHeadings && (
          <DocumentTree
            content={document.content}
            onHeadingClick={onHeadingClick}
            onSectionRewrite={onSectionRewrite}
            protectedSections={protectedSections}
            onToggleProtection={onToggleProtection}
          />
        )}
        {document && !hasHeadings && (
          <p className="text-xs text-gray-400 italic px-5 py-3">
            No structure yet. Add ## headings to build a document tree.
          </p>
        )}
      </div>
    </div>
  )
}
