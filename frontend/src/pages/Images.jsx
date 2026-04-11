import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'
import ContextBar from '../components/ContextBar'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'

export default function Images() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [copyLabel, setCopyLabel] = useState('Copy URL')
  const [showFeedback, setShowFeedback] = useState(false)
  const uploadInputRef = useRef(null)
  const prevBlobUrl = useRef(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/home'))
    api.listImages(id).then(setImages).catch(console.error)
  }, [id])

  // Revoke old blob URL when selection changes
  useEffect(() => {
    if (prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current)
      prevBlobUrl.current = null
    }
    setBlobUrl(null)
    setPendingDelete(false)
    if (!selectedImage) return
    api.fetchImageBlob(id, selectedImage.filename)
      .then((url) => {
        prevBlobUrl.current = url
        setBlobUrl(url)
      })
      .catch(console.error)
  }, [selectedImage?.filename])

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
    }
  }, [])

  useEffect(() => {
    if (!pendingDelete) return
    const handler = (e) => { if (e.key === 'Escape') setPendingDelete(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pendingDelete])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setUploadError(null)
    try {
      const updatedList = await api.uploadImage(id, file)
      setImages(updatedList)
      // Select the newly uploaded image (last in list matching the filename)
      const uploaded = updatedList.find((img) => img.filename === file.name)
        ?? updatedList[updatedList.length - 1]
      setSelectedImage(uploaded)
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
      setTimeout(() => setUploadError(null), 4000)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteImage(id, selectedImage.filename)
      setImages((prev) => prev.filter((img) => img.filename !== selectedImage.filename))
      setSelectedImage(null)
      setPendingDelete(false)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleCopyUrl = () => {
    const markdown = `![${selectedImage.filename}](${api.getImageUrl(id, selectedImage.filename)})`
    navigator.clipboard.writeText(markdown).then(() => {
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy URL'), 2000)
    }).catch(console.error)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        docTitle={doc?.title}
        showBack={true}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
          { label: 'History', active: false, onClick: () => navigate(`/document/${id}/history`) },
          { label: 'Images', active: true, onClick: () => {} },
        ]}
        actions={[
          { label: uploading ? 'Uploading…' : 'Upload Image', onClick: () => uploadInputRef.current.click(), variant: 'default', disabled: uploading },
        ]}
      />
      {uploadError && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex-shrink-0">
          <span className="text-xs text-red-600">{uploadError}</span>
        </div>
      )}
      {pendingDelete && selectedImage && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-red-700 flex-1">Delete "{selectedImage.filename}"? This cannot be undone.</span>
          <button
            onClick={handleDelete}
            className="text-xs bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setPendingDelete(false)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — image list */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Images</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {images.length === 0 && (
              <p className="text-gray-400 text-xs px-4 py-2">No images uploaded yet.</p>
            )}
            {images.map((img) => (
              <div
                key={img.filename}
                onClick={() => setSelectedImage(img)}
                className={`px-4 py-2 cursor-pointer text-sm truncate transition-colors ${
                  img.filename === selectedImage?.filename
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {img.filename}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — image detail */}
        <main className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {selectedImage ? selectedImage.filename : 'Image Detail'}
            </span>
            {selectedImage && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopyUrl}>{copyLabel}</Button>
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(true)}>Delete</Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
            {selectedImage && blobUrl && (
              <img
                src={blobUrl}
                alt={selectedImage.filename}
                className="max-w-full max-h-full object-contain"
              />
            )}
            {!selectedImage && (
              <p className="text-gray-400 text-sm mt-8">Select an image to view it.</p>
            )}
          </div>
        </main>
      </div>
      <input ref={uploadInputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleUpload} />
    </div>
  )
}
