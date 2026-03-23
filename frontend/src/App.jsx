import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import SearchOverlay from './components/SearchOverlay'
import { SearchProvider, useSearch } from './context/SearchContext'
import Document from './pages/Document'
import Evidence from './pages/Evidence'
import History from './pages/History'
import Home from './pages/Home'
import Log from './pages/Log'
import Login from './pages/Login'
import Register from './pages/Register'

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isOpen, toggle } = useSearch()

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggle])

  return (
    <>
      {isOpen && <SearchOverlay />}
      <Routes>
        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
        <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ErrorBoundary><Home /></ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id"
          element={
            <RequireAuth>
              <ErrorBoundary><Document /></ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id/evidence"
          element={
            <RequireAuth>
              <ErrorBoundary><Evidence /></ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id/log"
          element={
            <RequireAuth>
              <ErrorBoundary><Log /></ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id/history"
          element={
            <RequireAuth>
              <ErrorBoundary><History /></ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SearchProvider>
          <AppRoutes />
        </SearchProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
