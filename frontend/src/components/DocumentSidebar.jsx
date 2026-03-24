import DocumentTree from './DocumentTree'
import { parseHeadings } from './DocumentTree'

export default function DocumentSidebar({ document, onHeadingClick, onSectionRewrite, protectedSections, onToggleProtection, structureLocked, onToggleStructureLock }) {
  const hasHeadings = document && parseHeadings(document.content).length > 0

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Structure</span>
        <button
          onClick={onToggleStructureLock}
          title={structureLocked ? 'Structure locked — AI cannot add, remove, or rename sections. Click to unlock.' : 'Lock structure — prevent AI from changing sections'}
          className={`text-base leading-none transition-colors cursor-pointer ${structureLocked ? 'text-gray-700' : 'text-gray-300 hover:text-gray-500'}`}
        >
          {structureLocked ? '🔒' : '🔓'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
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

