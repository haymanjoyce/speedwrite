import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Editor from '../components/Editor'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

export default function Home() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [activeDoc, setActiveDoc] = useState(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.listDocuments().then(setDocuments).catch(console.error)
  }, [])

  useEffect(() => {
    if (!id) {
      setActiveDoc(null)
      return
    }
    api.getDocument(id).then(setActiveDoc).catch(() => navigate('/'))
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleNewDocument = async () => {
    try {
      const doc = await api.createDocument({ content: '# Untitled\n\n' })
      setDocuments((prev) => [doc, ...prev])
      navigate(`/document/${doc.id}`)
    } catch (err) {
      console.error('Failed to create document', err)
    }
  }

  const handleUpdate = (updated) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setActiveDoc(updated)
  }

  const handleDelete = (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    setActiveDoc(null)
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          documents={documents}
          activeDocId={id}
          onNewDocument={handleNewDocument}
        />
        <Editor
          document={activeDoc}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
