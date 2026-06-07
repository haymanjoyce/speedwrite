import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'

export default function LandingPage() {
  // Assume closed until the backend confirms otherwise — avoids a flash of an
  // enabled button on a closed instance.
  const [registrationsOpen, setRegistrationsOpen] = useState(false)

  useEffect(() => {
    api.registrationStatus()
      .then((res) => setRegistrationsOpen(!!res?.open))
      .catch(() => setRegistrationsOpen(false))
  }, [])

  const createButton = (
    <Button
      variant="primary"
      size="md"
      className="py-3 text-lg"
      style={{ paddingLeft: '4rem', paddingRight: '4rem' }}
      disabled={!registrationsOpen}
    >
      Create account
    </Button>
  )

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora&display=swap');`}</style>
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-400">SpeedWrite</span>
          <h1 className="text-3xl font-semibold text-gray-900 mt-12" style={{ fontFamily: "'Lora', serif" }}>Write documents faster.</h1>
          {registrationsOpen ? (
            <Link to="/register" className="mt-12">
              {createButton}
            </Link>
          ) : (
            <div className="mt-12">{createButton}</div>
          )}
          <Link to="/login" className="mt-5 text-sm text-blue-600 underline">
            Sign in
          </Link>
        </div>
      </div>
    </>
  )
}
