import { CalendarDays, ChartNoAxesColumnIncreasing, LayoutDashboard, LogIn, LogOut, Menu, Settings, Ticket, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/statistics', label: 'Statistics', icon: ChartNoAxesColumnIncreasing },
]

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const { user, profileName, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const page = location.pathname === '/' ? 'Overview' : location.pathname.slice(1).replace(/^./, (c) => c.toUpperCase())
  const displayName = profileName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'JoinEvent member'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  async function handleLogout() {
    setAuthError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setAuthError(error.message)
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><CalendarDays size={19} strokeWidth={2.3} /></span><span>Join<span className="brand-accent">Event</span></span><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button></div>
        <div className="nav-label">MENU</div>
        <nav className="main-nav" aria-label="Main navigation">
          {links.filter(({ to }) => user || (to !== '/' && to !== '/statistics')).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}
          {user && <>
            <NavLink end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/my-events" onClick={() => setMenuOpen(false)}><CalendarDays size={18} strokeWidth={1.8} /><span>My Events</span></NavLink>
            <NavLink end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/my-registrations" onClick={() => setMenuOpen(false)}><Ticket size={18} strokeWidth={1.8} /><span>My Registrations</span></NavLink>
            <NavLink end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/profile" onClick={() => setMenuOpen(false)}><Settings size={18} strokeWidth={1.8} /><span>My Profile</span></NavLink>
          </>}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-divider"/>{authError && <p className="auth-nav-error" role="alert">{authError}</p>}{user ? <><button className="user-card" onClick={() => navigate('/profile')}><span className="user-avatar">{initials}</span><span className="user-details"><strong>{displayName}</strong><small>{user.email}</small></span></button><button className="nav-link logout-link" onClick={handleLogout}><LogOut size={17}/><span>Log out</span></button></> : <Link className="nav-link" to="/login"><LogIn size={17}/><span>Log in</span></Link>}</div>
      </aside>
      {menuOpen && <button aria-label="Close menu overlay" className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumbs"><span>JoinEvent</span><span className="crumb-slash">/</span><strong>{page}</strong></div></div></header>
        <div className="page-wrap"><Outlet /></div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} JoinEvent</span></footer>
      </main>
    </div>
  )
}
