import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function AuthImage({ src, alt, ...props }) {
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!src?.startsWith('/api/documents/')) return
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    let objectUrl
    fetch(src, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load image')
        return res.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(console.error)
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (src?.startsWith('/api/documents/')) {
    return blobUrl ? <img src={blobUrl} alt={alt} {...props} /> : null
  }
  return <img src={src} alt={alt} {...props} />
}

const HIGHLIGHT = 'bg-gray-50 border-l-2 border-gray-200 pl-4 my-1'

function Highlight({ children }) {
  return <div className={HIGHLIGHT}>{children}</div>
}

function makeComponents(structureLocked, variant) {
  const isChat = variant === 'chat'

  function wrap(isHL, element) {
    return isHL ? <Highlight>{element}</Highlight> : element
  }

  return {
    h1({ node, children, ...props }) {
      const el = <h1 className={isChat ? 'text-base font-bold text-gray-900 mt-3 mb-1' : 'text-3xl font-bold text-gray-900 mb-4 mt-6'} {...props}>{children}</h1>
      return wrap(!isChat && structureLocked, el)
    },
    h2({ node, children, ...props }) {
      const el = <h2 className={isChat ? 'text-base font-semibold text-gray-800 mt-3 mb-1' : 'text-2xl font-semibold text-gray-800 mb-3 mt-5'} {...props}>{children}</h2>
      return wrap(!isChat && structureLocked, el)
    },
    h3({ node, children, ...props }) {
      const el = <h3 className={isChat ? 'text-sm font-semibold text-gray-700 mt-3 mb-1' : 'text-xl font-semibold text-gray-700 mb-2 mt-4'} {...props}>{children}</h3>
      return wrap(!isChat && structureLocked, el)
    },
    h4({ node, children, ...props }) {
      return <h4 className={isChat ? 'text-sm font-semibold text-gray-700 mt-2 mb-1' : 'text-lg font-semibold text-gray-700 mb-2 mt-3'} {...props}>{children}</h4>
    },
    h5({ node, children, ...props }) {
      return <h5 className={isChat ? 'text-sm font-semibold text-gray-700 mt-2 mb-1' : 'text-base font-semibold text-gray-700 mb-1 mt-2'} {...props}>{children}</h5>
    },
    h6({ node, children, ...props }) {
      return <h6 className={isChat ? 'text-sm font-semibold text-gray-700 mt-2 mb-1' : 'text-sm font-semibold text-gray-700 mb-1 mt-2'} {...props}>{children}</h6>
    },
    p({ node, children, ...props }) {
      return <p className={isChat ? 'text-gray-700 mb-2' : 'text-gray-700 leading-relaxed mb-4'} {...props}>{children}</p>
    },
    ul({ node, children, ...props }) {
      return <ul className={`list-disc ${isChat ? 'pl-5 mb-2' : 'pl-6 mb-4'} text-gray-700`} {...props}>{children}</ul>
    },
    ol({ node, children, ...props }) {
      return <ol className={`list-decimal ${isChat ? 'pl-5 mb-2' : 'pl-6 mb-4'} text-gray-700`} {...props}>{children}</ol>
    },
    pre({ node, children, ...props }) {
      return <pre className="font-mono bg-gray-100 rounded p-4 text-sm overflow-x-auto mb-4" {...props}>{children}</pre>
    },
    code({ inline, children, ...props }) {
      if (inline) {
        return <code className="font-mono bg-gray-100 rounded px-1 text-sm text-gray-800" {...props}>{children}</code>
      }
      return <code {...props}>{children}</code>
    },
    table({ node, children, ...props }) {
      return (
        <div className="overflow-x-auto mb-4">
          <table className="border-collapse w-full text-sm text-gray-700" {...props}>{children}</table>
        </div>
      )
    },
    thead({ children, ...props }) {
      return <thead className="bg-gray-100 font-semibold" {...props}>{children}</thead>
    },
    th({ children, ...props }) {
      return <th className="border border-gray-300 px-3 py-2 text-left" {...props}>{children}</th>
    },
    td({ children, ...props }) {
      return <td className="border border-gray-300 px-3 py-2" {...props}>{children}</td>
    },
    a({ children, ...props }) {
      return <a className="text-blue-600 hover:underline" target="_blank" rel="noreferrer" {...props}>{children}</a>
    },
    img: AuthImage,
  }
}

export default function MarkdownPreview({ content, structureLocked = false, variant = 'document' }) {
  const components = makeComponents(structureLocked, variant)

  if (variant === 'chat') {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content ?? ''}
      </ReactMarkdown>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content ?? ''}
      </ReactMarkdown>
    </div>
  )
}
