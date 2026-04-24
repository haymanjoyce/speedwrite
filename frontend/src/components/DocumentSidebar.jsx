import DocumentTree from './DocumentTree'
import { parseHeadings } from './DocumentTree'

export default function DocumentSidebar({ document, onHeadingClick, protectedSections, onToggleProtection, structureLocked, onToggleStructureLock, pendingProposal = false }) {
  const hasHeadings = document && parseHeadings(document.content).length > 0

  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Structure</span>
        {!pendingProposal && (
          <button
            onClick={onToggleStructureLock}
            title={structureLocked ? 'Locked: AI cannot add, remove, reorder, or rename sections. Section content can still be rewritten. Click to unlock.' : 'Lock structure: AI cannot add, remove, reorder, or rename sections. Section content can still be rewritten.'}
            className={`text-base leading-none transition-colors cursor-pointer ${structureLocked ? 'text-gray-700' : 'text-gray-300 hover:text-gray-500'}`}
          >
            {structureLocked ? '🔒' : '🔓'}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {document && hasHeadings && (
          <DocumentTree
            content={document.content}
            onHeadingClick={onHeadingClick}
            protectedSections={protectedSections}
            onToggleProtection={onToggleProtection}
            pendingProposal={pendingProposal}
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

