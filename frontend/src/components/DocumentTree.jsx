import { useState } from 'react'

export function parseHeadings(content) {
  const lines = (content || '').split('\n')
  const headings = []
  lines.forEach((line, lineIndex) => {
    const m3 = line.match(/^###(?!#)\s+(.+)/)
    const m2 = line.match(/^##(?!#)\s+(.+)/)
    if (m3) headings.push({ level: 3, text: m3[1].trim(), lineIndex })
    else if (m2) headings.push({ level: 2, text: m2[1].trim(), lineIndex })
  })
  return headings
}

function getInScope(headings, hoveredIndex) {
  if (hoveredIndex === null) return new Set()
  const parentLevel = headings[hoveredIndex].level
  const scope = new Set()
  for (let i = hoveredIndex + 1; i < headings.length; i++) {
    if (headings[i].level <= parentLevel) break
    scope.add(i)
  }
  return scope
}

function extractSection(content, headings, index) {
  const lines = content.split('\n')
  const { lineIndex, level } = headings[index]
  let endLine = lines.length
  for (let i = lineIndex + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})(?!#)\s+/)
    if (m && m[1].length <= level) {
      endLine = i
      break
    }
  }
  return lines.slice(lineIndex, endLine).join('\n').trim()
}

export default function DocumentTree({ content, onHeadingClick, onSectionRewrite, protectedSections = [], onToggleProtection }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const headings = parseHeadings(content)
  if (!headings.length) return null

  const inScope = getInScope(headings, hoveredIndex)

  return (
    <div className="border-l border-gray-200 ml-5">
      {headings.map((h, i) => {
        const isHovered = i === hoveredIndex
        const isInScope = inScope.has(i)
        const isHighlighted = isHovered || isInScope
        const isProtected = protectedSections.includes(h.text)

        return (
          <div
            key={i}
            className={`group flex items-center justify-between py-0.5 pr-2 truncate ${
              h.level === 3 ? 'pl-6' : 'pl-3'
            } ${isProtected ? 'bg-gray-100' : isHighlighted ? 'bg-blue-50' : ''}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Lock icon */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleProtection?.(h.text)
              }}
              className={`flex-shrink-0 mr-1 text-xs leading-none transition-colors cursor-pointer ${
                isProtected
                  ? 'text-gray-400'
                  : isHovered
                  ? 'text-gray-300 hover:text-gray-500'
                  : 'text-transparent'
              }`}
              title={isProtected ? 'Click to unlock section' : 'Click to lock section'}
            >
              {isProtected ? '🔒' : '🔓'}
            </button>

            <span
              onClick={() => onHeadingClick?.(h.text)}
              className={`text-xs truncate cursor-pointer flex-1 ${
                isHighlighted && !isProtected ? 'text-blue-700' : isProtected ? 'text-gray-500' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {h.text}
            </span>

            {isHovered && onSectionRewrite && !isProtected && (
              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSectionRewrite(extractSection(content, headings, i))
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Rewrite
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
