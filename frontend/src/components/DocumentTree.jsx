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

const levelColor = (level) => {
  if (level <= 1) return 'text-gray-800'
  if (level === 2) return 'text-gray-700'
  if (level === 3) return 'text-gray-600'
  return 'text-gray-500'
}

export default function DocumentTree({ content, onHeadingClick, protectedSections = [], onToggleProtection, pendingProposal = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const headings = parseHeadings(content)
  if (!headings.length) return null

  return (
    <div>
      {headings.map((h, i) => {
        const isHovered = i === hoveredIndex
        const isProtected = protectedSections.includes(h.text)

        return (
          <div
            key={i}
            className={`group flex items-center justify-between py-0.5 pr-2 truncate ${
              h.level === 3 ? 'pl-6' : 'pl-3'
            } ${isProtected ? 'bg-gray-100' : ''}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Lock icon */}
            {!pendingProposal && (
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
            )}

            <span
              onClick={() => onHeadingClick?.(h.text)}
              title={h.text}
              className={`text-xs truncate cursor-pointer flex-1 ${levelColor(h.level)}${isProtected ? '' : ' hover:text-gray-800'}`}
            >
              {h.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}
