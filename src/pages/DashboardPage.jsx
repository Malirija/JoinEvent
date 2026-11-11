import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, Plus, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import { formatEventDate, formatEventTime } from '../lib/formatEvent.js'
import { getEvents } from '../lib/eventService.js'
import { useAuth } from '../context/useAuth.js'

const EMPTY_EVENTS = []
const categoryColors = ['#8057e8', '#4c9bd6', '#e99a48', '#e5768b', '#4db68d', '#8d9bce', '#c180cf']

function formatToday() {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
}

export default function DashboardPage() {
  const { user, profileName } = useAuth()
  const [requestId, setRequestId] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    getEvents()
      .then((events) => { if (active) setResult({ requestId, events, error: '' }) })
      .catch((error) => { if (active) setResult({ requestId, events: [], error: error.message }) })
    return () => { active = false }
  }, [requestId])

  const loading = result?.requestId !== requestId
  const error = loading ? '' : result.error
  const allEvents = loading ? EMPTY_EVENTS : result.events
  const events = useMemo(() => allEvents.filter((event) => event.owner_id === user?.id), [allEvents, user?.id])
  const now = new Date()
  const upcoming = events.filter((event) => event.status === 'published' && new Date(event.starts_at) > now)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  const activeSignups = events.reduce((total, event) => total + event.activeSignups, 0)
  const categoryData = Object.values(events.reduce((counts, event) => {
    counts[event.category] = counts[event.category] || { category: event.category, count: 0 }
    counts[event.category].count += 1
    return counts
  }, {})).sort((a, b) => b.count - a.count)
  const recentEvents = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const displayName = profileName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">{formatToday()}</p><h1>Welcome, {displayName}</h1><p className="page-description">A current look at the events you host.</p></div><Link className="button button-primary" to="/events/new"><Plus size={17}/> Create event</Link></div>
    {error && <ErrorMessage message={error} onRetry={() => setRequestId((current) => current + 1)}/>}
    {loading ? <Loading label="Loading your event data..."/> : !error && <>
      <section className="stats-grid" aria-label="Your event summary">
        <StatCard title="Events created" value={events.length.toLocaleString()} note="Events you host" icon={CalendarDays} tone="violet" />
        <StatCard title="Active signups" value={activeSignups.toLocaleString()} note="Across your events" icon={Users} tone="blue" />
        <StatCard title="Upcoming events" value={upcoming.length.toLocaleString()} note="Published and upcoming" icon={Activity} tone="green" />
      </section>
      {events.length === 0 ? <section className="panel dashboard-empty-panel"><EmptyState icon={CalendarDays} title="Your hosted events will appear here" description="Create an event to start building your event calendar."/><Link className="button button-primary" to="/events/new"><Plus size={16}/> Create your first event</Link></section> : <>
        <div className="dashboard-grid data-dashboard-grid">
          <section className="panel chart-panel"><div className="panel-heading"><div><h2>Events by category</h2><p>Distribution of your hosted events</p></div></div>{categoryData.length ? <div className="live-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f2" strokeDasharray="3 5"/><XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#858d96', fontSize: 10 }} dy={8}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#969da7', fontSize: 10 }}/><Tooltip cursor={{ fill: '#f7f5fd' }}/><Bar dataKey="count" name="Events" fill="#8057e8" radius={[5, 5, 0, 0]}>{categoryData.map((item, index) => <Cell key={item.category} fill={categoryColors[index % categoryColors.length]}/>)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyState icon={ChartNoAxesColumnIncreasing} title="No category data" description="Events with categories will appear here."/>}</section>
          <section className="panel upcoming-panel"><div className="panel-heading"><div><h2>Upcoming events</h2><p>Published events you host</p></div><Link to="/events" className="text-link">All events <ArrowRight size={14}/></Link></div>{upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 4).map((event) => <Link className="upcoming-event live-upcoming" to={`/events/${event.id}`} key={event.id}><span className="date-tile"><small>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(event.starts_at)).toUpperCase()}</small><strong>{new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(new Date(event.starts_at))}</strong></span><span className="upcoming-details"><strong>{event.title}</strong><span>{formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}</span><small>{event.location}</small></span></Link>)}</div> : <EmptyState title="No upcoming published events" description="Publish an event with a future start date and it will appear here."/>}<Link to="/events" className="panel-bottom-link">View events <ArrowRight size={14}/></Link></section>
        </div>
        <section className="panel events-table-panel"><div className="panel-heading"><div><h2>Recently created</h2><p>Your latest hosted events</p></div><Link to="/events" className="text-link">All events <ArrowRight size={14}/></Link></div><div className="table-wrap"><table><thead><tr><th>EVENT</th><th>STARTS</th><th>LOCATION</th><th>ACTIVE SIGNUPS</th><th>STATUS</th></tr></thead><tbody>{recentEvents.map((event) => <tr key={event.id}><td><Link className="dashboard-event-link" to={`/events/${event.id}`}>{event.title}</Link><small className="cell-sub">{event.category}</small></td><td><strong>{formatEventDate(event.starts_at)}</strong><small className="cell-sub">{formatEventTime(event.starts_at)}</small></td><td>{event.location}</td><td><strong>{event.activeSignups}{event.capacity ? ` / ${event.capacity}` : ''}</strong></td><td><span className={`status-pill ${event.status === 'published' ? 'published' : 'draft'}`}>{event.status}</span></td></tr>)}</tbody></table></div></section>
      </>}
    </>}
  </>
}
