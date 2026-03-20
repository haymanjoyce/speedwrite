function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/`([^`]+)`/g, '<code class="font-mono bg-gray-100 rounded px-1 text-sm text-gray-800">$1</code>')
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" class="text-blue-600 hover:underline" target="_blank" rel="noreferrer">$1</a>')
  return text
}

function getProtectedLineSet(content, protectedSections) {
  if (!protectedSections || protectedSections.length === 0) return new Set()
  const lines = content.split('\n')
  const protectedSet = new Set()
  for (const heading of protectedSections) {
    let startLine = -1
    let startLevel = 0
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+(.+)/)
      if (m && m[2].trim() === heading) {
        startLine = i
        startLevel = m[1].length
        break
      }
    }
    if (startLine === -1) continue
    protectedSet.add(startLine)
    for (let i = startLine + 1; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+/)
      if (m && m[1].length <= startLevel) break
      protectedSet.add(i)
    }
  }
  return protectedSet
}

function renderMarkdown(content, protectedLineSet) {
  const lines = content.split('\n')
  const blocks = [] // { html, startLine }
  let i = 0

  while (i < lines.length) {
    const startLine = i
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      blocks.push({
        html: `<pre class="font-mono bg-gray-100 rounded p-4 text-sm overflow-x-auto mb-4"><code>${codeLines.join('\n')}</code></pre>`,
        startLine,
      })
      i++
      continue
    }

    // Headings
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) {
      blocks.push({ html: `<h1 class="text-3xl font-bold text-gray-900 mb-4 mt-6">${renderInline(escapeHtml(h1[1]))}</h1>`, startLine })
      i++; continue
    }
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      blocks.push({ html: `<h2 class="text-2xl font-semibold text-gray-800 mb-3 mt-5">${renderInline(escapeHtml(h2[1]))}</h2>`, startLine })
      i++; continue
    }
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) {
      blocks.push({ html: `<h3 class="text-xl font-semibold text-gray-700 mb-2 mt-4">${renderInline(escapeHtml(h3[1]))}</h3>`, startLine })
      i++; continue
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items = []
      const listStartLine = i
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        const text = lines[i].replace(/^[-*]\s+/, '')
        items.push(`<li>${renderInline(escapeHtml(text))}</li>`)
        i++
      }
      blocks.push({ html: `<ul class="list-disc pl-6 mb-4 text-gray-700">${items.join('')}</ul>`, startLine: listStartLine })
      continue
    }

    // Blank line
    if (line.trim() === '') { i++; continue }

    // Paragraph
    const paraLines = []
    const paraStartLine = i
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,3}\s/) && !lines[i].match(/^[-*]\s+/) && !lines[i].startsWith('```')) {
      paraLines.push(renderInline(escapeHtml(lines[i])))
      i++
    }
    if (paraLines.length) {
      blocks.push({ html: `<p class="text-gray-700 leading-relaxed mb-4">${paraLines.join('<br>')}</p>`, startLine: paraStartLine })
    }
  }

  return blocks
}

export default function MarkdownPreview({ content, protectedSections = [] }) {
  const protectedLineSet = getProtectedLineSet(content ?? '', protectedSections)
  const blocks = renderMarkdown(content ?? '', protectedLineSet)

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white max-w-3xl">
      {blocks.map((block, idx) => {
        const isProtected = protectedLineSet.has(block.startLine)
        if (isProtected) {
          return (
            <div key={idx} className="bg-gray-50 border-l-2 border-gray-200 pl-4 my-1">
              <div dangerouslySetInnerHTML={{ __html: block.html }} />
            </div>
          )
        }
        return <div key={idx} dangerouslySetInnerHTML={{ __html: block.html }} />
      })}
    </div>
  )
}
