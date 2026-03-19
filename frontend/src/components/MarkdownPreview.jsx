function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="font-mono bg-gray-100 rounded px-1 text-sm text-gray-800">$1</code>')
  // URLs
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" class="text-blue-600 hover:underline" target="_blank" rel="noreferrer">$1</a>')
  return text
}

function renderMarkdown(content) {
  const lines = content.split('\n')
  const html = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      html.push(`<pre class="font-mono bg-gray-100 rounded p-4 text-sm overflow-x-auto mb-4"><code>${codeLines.join('\n')}</code></pre>`)
      i++
      continue
    }

    // Headings
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) { html.push(`<h1 class="text-3xl font-bold text-gray-900 mb-4 mt-6">${renderInline(escapeHtml(h1[1]))}</h1>`); i++; continue }

    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { html.push(`<h2 class="text-2xl font-semibold text-gray-800 mb-3 mt-5">${renderInline(escapeHtml(h2[1]))}</h2>`); i++; continue }

    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { html.push(`<h3 class="text-xl font-semibold text-gray-700 mb-2 mt-4">${renderInline(escapeHtml(h3[1]))}</h3>`); i++; continue }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        const text = lines[i].replace(/^[-*]\s+/, '')
        items.push(`<li>${renderInline(escapeHtml(text))}</li>`)
        i++
      }
      html.push(`<ul class="list-disc pl-6 mb-4 text-gray-700">${items.join('')}</ul>`)
      continue
    }

    // Blank line — skip (paragraph breaks handled by collecting paragraph lines)
    if (line.trim() === '') { i++; continue }

    // Paragraph — collect consecutive non-blank, non-special lines
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,3}\s/) && !lines[i].match(/^[-*]\s+/) && !lines[i].startsWith('```')) {
      paraLines.push(renderInline(escapeHtml(lines[i])))
      i++
    }
    if (paraLines.length) {
      html.push(`<p class="text-gray-700 leading-relaxed mb-4">${paraLines.join('<br>')}</p>`)
    }
  }

  return html.join('\n')
}

export default function MarkdownPreview({ content }) {
  const html = renderMarkdown(content ?? '')
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white max-w-3xl">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
