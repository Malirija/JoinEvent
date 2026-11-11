import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/useAuth.js'

export default function LoginPage() {
  const { login, initializationError, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const notice = location.state?.notice

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const destination = location.state?.from?.pathname || '/'
      navigate(destination, { replace: true })
    } catch (authError) {
      setError(authError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="login-wrap"><section className="panel login-panel auth-panel">
    <span className="login-mark"><LogIn size={22}/></span>
    <p className="eyebrow">WELCOME BACK</p>
    <h1>Sign in to JoinEvent</h1>
    <p className="page-description">Enter your account details to continue.</p>
    {notice && <p className="auth-notice success" role="status">{notice}</p>}
    {initializationError && <p className="auth-notice warning" role="status">{initializationError}</p>}
    {error && <p className="auth-notice error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Email<input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password"/></label>
      <button className="button button-primary login-button" type="submit" disabled={submitting || !isConfigured}>{submitting ? 'Signing in...' : 'Sign in'}</button>
    </form>
    <p className="auth-switch">New to JoinEvent? <Link to="/register">Create an account</Link></p>
  </section></div>
}
