import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  // Assume closed until the backend confirms otherwise.
  const [registrationsOpen, setRegistrationsOpen] = useState(false)

  useEffect(() => {
    api.registrationStatus()
      .then((res) => setRegistrationsOpen(!!res?.open))
      .catch(() => setRegistrationsOpen(false))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      const data = await api.register(email, password)
      localStorage.setItem('token', data.access_token)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    }
  }

  if (!registrationsOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Registrations are closed</h1>
          <p className="text-sm text-gray-500">
            New account registration is currently unavailable.{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create account</h1>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
          </div>
          <Button type="submit" variant="primary" size="md" className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
