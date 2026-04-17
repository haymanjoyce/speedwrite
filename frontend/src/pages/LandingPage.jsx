import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function LandingPage() {
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora&display=swap');`}</style>
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-400">SpeedWrite</span>
          <h1 className="text-3xl font-semibold text-gray-900 mt-12" style={{ fontFamily: "'Lora', serif" }}>Write documents faster.</h1>
          <Link to="/register" className="mt-12">
            <Button variant="primary" size="md" className="py-3 text-lg" style={{ paddingLeft: '4rem', paddingRight: '4rem' }}>Create account</Button>
          </Link>
          <Link to="/login" className="mt-5 text-sm text-blue-600 underline">
            Sign in
          </Link>
        </div>
      </div>
    </>
  )
}
