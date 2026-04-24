export default function ResizableGutter({ side, onResize, onResizeEnd, min, max, currentWidth }) {
  const handleMouseDown = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = currentWidth
    const capturedMin = min
    const capturedMax = max

    window.document.body.style.userSelect = 'none'

    const handleMove = (moveEvent) => {
      const delta = side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX
      const newWidth = Math.max(capturedMin, Math.min(capturedMax, startWidth + delta))
      onResize(newWidth)
    }

    const handleUp = (upEvent) => {
      const delta = side === 'left' ? upEvent.clientX - startX : startX - upEvent.clientX
      const newWidth = Math.max(capturedMin, Math.min(capturedMax, startWidth + delta))
      window.document.body.style.userSelect = ''
      onResizeEnd(newWidth)
      window.document.removeEventListener('mousemove', handleMove)
      window.document.removeEventListener('mouseup', handleUp)
    }

    window.document.addEventListener('mousemove', handleMove)
    window.document.addEventListener('mouseup', handleUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="relative flex-shrink-0 cursor-col-resize group"
      style={{ width: 8 }}
    >
      <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gray-200 group-hover:bg-gray-400 transition-colors" />
    </div>
  )
}
