function lcs(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function diffLines(oldLines, newLines) {
  const dp = lcs(oldLines, newLines)
  const result = []
  let i = oldLines.length
  let j = newLines.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'equal', line: oldLines[i - 1], origIndex: i - 1 })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'add', line: newLines[j - 1], origIndex: i })
      j--
    } else {
      result.push({ type: 'remove', line: oldLines[i - 1], origIndex: i - 1 })
      i--
    }
  }
  return result.reverse()
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

export default function DiffView({ originalContent, proposedContent, protectedSections = [] }) {
  const oldLines = (originalContent ?? '').split('\n')
  const newLines = (proposedContent ?? '').split('\n')
  const diff = diffLines(oldLines, newLines)
  const protectedLineSet = getProtectedLineSet(originalContent ?? '', protectedSections)

  return (
    <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed bg-white">
      {diff.map((entry, i) => {
        const isProtected = protectedLineSet.has(entry.origIndex)

        if (isProtected) {
          return (
            <div key={i} className="flex border-l-2 border-gray-300 bg-gray-100">
              <span className="w-4 flex-shrink-0 select-none text-gray-400">~</span>
              <span className="text-gray-400 whitespace-pre-wrap break-all">{entry.line}</span>
            </div>
          )
        }

        if (entry.type === 'equal') {
          return (
            <div key={i} className="flex">
              <span className="w-4 flex-shrink-0 select-none text-gray-300"> </span>
              <span className="text-gray-800 whitespace-pre-wrap break-all">{entry.line}</span>
            </div>
          )
        }
        if (entry.type === 'remove') {
          return (
            <div key={i} className="flex border-l-2 border-red-400" style={{ background: '#fee2e2' }}>
              <span className="w-4 flex-shrink-0 select-none text-red-400">-</span>
              <span className="text-red-700 line-through whitespace-pre-wrap break-all">{entry.line}</span>
            </div>
          )
        }
        // add
        return (
          <div key={i} className="flex border-l-2 border-green-400" style={{ background: '#dcfce7' }}>
            <span className="w-4 flex-shrink-0 select-none text-green-500">+</span>
            <span className="text-green-700 whitespace-pre-wrap break-all">{entry.line}</span>
          </div>
        )
      })}
    </div>
  )
}
