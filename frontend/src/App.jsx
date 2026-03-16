import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Document from './pages/Document'
import Evidence from './pages/Evidence'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id"
          element={
            <RequireAuth>
              <Document />
            </RequireAuth>
          }
        />
        <Route
          path="/document/:id/evidence"
          element={
            <RequireAuth>
              <Evidence />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
