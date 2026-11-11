import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/useAuth.js'

export default function RegisterPage() {
  const { register, initializationError, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)
    try {
      const result = await register(name, email, password)
      if (result.session) {
        navigate('/', { replace: true })
      } else {
        navigate('/login', {
          replace: true,
          state: { notice: 'Account created. Check your email for a confirmation link, then sign in.' },
        })
      }
    } catch (authError) {
      setError(authError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="login-wrap"><section className="panel login-panel auth-panel">
    <span className="login-mark"><UserPlus size={22}/></span>
    <p className="eyebrow">GET STARTED</p>
    <h1>Create your account</h1>
    <p className="page-description">Join your community and start creating events.</p>
    {initializationError && <p className="auth-notice warning" role="status">{initializationError}</p>}
    {error && <p className="auth-notice error" role="alert">{error}</p>}
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Name<input type="text" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name"/></label>
      <label>Email<input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" name="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters"/></label>
      <label>Confirm password<input type="password" name="confirm-password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again"/></label>
      <button className="button button-primary login-button" type="submit" disabled={submitting || !isConfigured}>{submitting ? 'Creating account...' : 'Create account'}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </section></div>
}
