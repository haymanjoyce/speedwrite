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

import { useEffect, useMemo, useRef } from 'react'

export default function DiffView({ originalContent, proposedContent, protectedSections = [], structureLocked = false }) {
  const diff = useMemo(() => {
    const oldLines = (originalContent ?? '').split('\n')
    const newLines = (proposedContent ?? '').split('\n')
    return diffLines(oldLines, newLines)
  }, [originalContent, proposedContent])

  const protectedLineSet = useMemo(() => {
    const base = getProtectedLineSet(originalContent ?? '', protectedSections)
    if (structureLocked) {
      const lines = (originalContent ?? '').split('\n')
      lines.forEach((line, i) => {
        if (/^#{1,6}\s/.test(line)) base.add(i)
      })
    }
    return base
  }, [originalContent, protectedSections, structureLocked])

  const firstChangeRef = useRef(null)

  useEffect(() => {
    firstChangeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [proposedContent])

  let firstChangeSeen = false
  let prevType = null

  return (
    <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed bg-white">
      {diff.map((entry, i) => {
        const isProtected = protectedLineSet.has(entry.origIndex)
        const isEmpty = entry.line === ''

        if (entry.type === 'equal') {
          if (isProtected) {
            prevType = 'protected'
            return (
              <div key={i} className={`flex border-l-2 border-gray-300 bg-gray-100 py-0.5${isEmpty ? ' min-h-[1rem]' : ''}`}>
                <span className="w-4 font-mono text-xs flex-shrink-0 select-none text-gray-400">~</span>
                <span className="text-gray-400 whitespace-pre-wrap break-all">{entry.line}</span>
              </div>
            )
          }
          const separator = prevType === 'add' || prevType === 'remove'
          prevType = 'equal'
          return (
            <div key={i} className={`flex py-0.5${isEmpty ? ' min-h-[1rem]' : ''}${separator ? ' border-t border-gray-100 mt-0.5' : ''}`}>
              <span className="w-4 font-mono text-xs flex-shrink-0 select-none text-gray-300"> </span>
              <span className="text-gray-500 whitespace-pre-wrap break-all">{entry.line}</span>
            </div>
          )
        }

        const isFirstChange = !firstChangeSeen
        if (isFirstChange) firstChangeSeen = true

        if (entry.type === 'remove') {
          prevType = 'remove'
          return (
            <div key={i} ref={isFirstChange ? firstChangeRef : null} className={`flex border-l-2 border-red-400 py-0.5${isEmpty ? ' min-h-[1rem]' : ''}`} style={{ background: '#fee2e2' }}>
              <span className="w-4 font-mono text-xs flex-shrink-0 select-none text-red-400">-</span>
              <span className="text-red-700 line-through whitespace-pre-wrap break-all">{entry.line}</span>
            </div>
          )
        }
        // add
        prevType = 'add'
        return (
          <div key={i} ref={isFirstChange ? firstChangeRef : null} className={`flex border-l-2 border-green-400 py-0.5${isEmpty ? ' min-h-[1rem]' : ''}`} style={{ background: '#dcfce7' }}>
            <span className="w-4 font-mono text-xs flex-shrink-0 select-none text-green-500">+</span>
            <span className="text-green-700 whitespace-pre-wrap break-all">{entry.line}</span>
          </div>
        )
      })}
    </div>
  )
}
