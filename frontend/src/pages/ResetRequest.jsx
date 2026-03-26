import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'

export default function ResetRequest() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.requestPasswordReset(email)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Reset password</h1>
        {done ? (
          <p className="text-sm text-gray-700">
            If that email is registered, a reset link has been sent. Check your inbox.
          </p>
        ) : (
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
            <Button type="submit" variant="primary" size="md" className="w-full">
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-gray-500 text-center">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
