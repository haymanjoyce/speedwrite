const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }

  if (res.status === 204) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }

  return res.json()
}

export const api = {
  // Auth
  register: (email, password) =>
    request('POST', '/auth/register', { email, password }),
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),

  // Documents
  listDocuments: () => request('GET', '/documents/'),
  getDocument: (id) => request('GET', `/documents/${id}`),
  createDocument: (data) => request('POST', '/documents/', data),
  updateDocument: (id, data) => request('PUT', `/documents/${id}`, data),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),

  // Chat
  chatMessage: (docId, message, mode, context) =>
    request('POST', `/documents/${docId}/chat`, { message, mode, context }),

  // Evidence
  listEvidence: (docId) => request('GET', `/documents/${docId}/evidence`),
  getEvidence: (docId, evidenceId) => request('GET', `/documents/${docId}/evidence/${evidenceId}`),
  addEvidenceFile: async (docId, file) => {
    const form = new FormData()
    form.append('file', file)
    const headers = {}
    const token = localStorage.getItem('token')
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/documents/${docId}/evidence/file`, {
      method: 'POST',
      headers,
      body: form,
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },
  addEvidenceUrl: (docId, url) =>
    request('POST', `/documents/${docId}/evidence/url`, { url }),
  addEvidenceText: (docId, title, content) =>
    request('POST', `/documents/${docId}/evidence/text`, { title, content }),
  deleteEvidence: (docId, evidenceId) =>
    request('DELETE', `/documents/${docId}/evidence/${evidenceId}`),
}
