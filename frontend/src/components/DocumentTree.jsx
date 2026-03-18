function parseHeadings(content) {
  const lines = (content || '').split('\n')
  const headings = []
  for (const line of lines) {
    const m3 = line.match(/^###(?!#)\s+(.+)/)
    const m2 = line.match(/^##(?!#)\s+(.+)/)
    if (m3) headings.push({ level: 3, text: m3[1].trim() })
    else if (m2) headings.push({ level: 2, text: m2[1].trim() })
  }
  return headings
}

export default function DocumentTree({ content, onHeadingClick }) {
  const headings = parseHeadings(content)
  if (!headings.length) return null

  return (
    <div className="border-l border-gray-200 ml-5">
      {headings.map((h, i) => (
        <div
          key={i}
          onClick={() => onHeadingClick?.(h.text)}
          className={`py-0.5 text-xs text-gray-500 hover:text-gray-800 cursor-pointer truncate ${
            h.level === 3 ? 'pl-6' : 'pl-3'
          }`}
        >
          {h.text}
        </div>
      ))}
    </div>
  )
}
