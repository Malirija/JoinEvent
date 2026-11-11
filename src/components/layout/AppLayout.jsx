import { Bell, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, CircleHelp, LayoutDashboard, LogIn, LogOut, Menu, Plus, Search, Settings, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/statistics', label: 'Statistics', icon: ChartNoAxesColumnIncreasing },
]

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedIn] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const page = location.pathname === '/' ? 'Overview' : location.pathname.slice(1).replace(/^./, (c) => c.toUpperCase())

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><CalendarDays size={19} strokeWidth={2.3} /></span><span>Join<span className="brand-accent">Event</span></span><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch"><span className="workspace-avatar">S</span><span className="workspace-text"><strong>Studio North</strong><small>Free plan</small></span><ChevronDown size={15} /></button>
        <div className="nav-label">MENU</div>
        <nav className="main-nav" aria-label="Main navigation">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Events' && <span className="nav-count">12</span>}</NavLink>)}</nav>
        <div className="sidebar-bottom"><NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/profile"><Settings size={18} strokeWidth={1.8} /><span>My Profile</span></NavLink><a className="nav-link" href="#help"><CircleHelp size={18} strokeWidth={1.8} /><span>Help & support</span></a><div className="sidebar-divider"/><button className="user-card" onClick={() => navigate(signedIn ? '/profile' : '/login')}><span className="user-avatar">JD</span><span className="user-details"><strong>Jordan Davis</strong><small>jordan@example.com</small></span><ChevronDown size={15} /></button></div>
      </aside>
      {menuOpen && <button aria-label="Close menu overlay" className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div></div><div className="topbar-actions"><button className="topbar-search"><Search size={16}/><span>Search anything...</span><kbd>⌘ K</kbd></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button><span className="topbar-divider"/><button className="topbar-user" onClick={() => navigate('/profile')}><span className="user-avatar">JD</span><ChevronDown size={14}/></button></div></header>
        <div className="page-wrap"><Outlet /></div>
        <footer className="page-footer"><span>© 2024 JoinEvent, Inc.</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#support">Support</a></span></footer>
      </main>
    </div>
  )
}
