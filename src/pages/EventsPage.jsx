import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import EventCard from '../components/events/EventCard.jsx'
import { deleteEvent, getEvents } from '../lib/eventService.js'
import { eventCategories } from '../lib/categoryImages.js'
import { useAuth } from '../context/useAuth.js'

const EMPTY_EVENTS = []

export default function EventsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [requestId, setRequestId] = useState(0)
  const [loadResult, setLoadResult] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [priceType, setPriceType] = useState('all')
  const [ownership, setOwnership] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [now, setNow] = useState(() => Date.now())
  const [selectedForDelete, setSelectedForDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [success, setSuccess] = useState(location.state?.success || '')

  useEffect(() => {
    let active = true
    getEvents()
      .then((events) => { if (active) setLoadResult({ requestId, events, error: '' }) })
      .catch((error) => { if (active) setLoadResult({ requestId, events: [], error: error.message }) })
    return () => { active = false }
  }, [requestId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const loading = loadResult?.requestId !== requestId
  const events = loading ? EMPTY_EVENTS : loadResult.events
  const error = loading ? '' : loadResult.error
  const loadEvents = () => setRequestId((current) => current + 1)

  const filteredEvents = useMemo(() => events
    .filter((event) => event.title.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((event) => category === 'all' || event.category === category)
    .filter((event) => priceType === 'all' || (priceType === 'free' ? Number(event.price) === 0 : Number(event.price) > 0))
    .filter((event) => ownership === 'all' || (event.owner_id !== user?.id && new Date(event.starts_at).getTime() > now))
    .filter((event) => !event.ends_at || new Date(event.ends_at).getTime() >= now)
    .filter((event) => timeFilter !== 'active' || (new Date(event.starts_at).getTime() <= now && (!event.ends_at || new Date(event.ends_at).getTime() >= now)))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)), [events, search, category, priceType, ownership, timeFilter, now, user?.id])

  async function confirmDelete() {
    if (!selectedForDelete || deleting) return
    setDeleting(true)
    setOperationError('')
    try {
      await deleteEvent(selectedForDelete.id)
      setLoadResult((current) => ({ ...current, events: current.events.filter((event) => event.id !== selectedForDelete.id) }))
      setSuccess(`“${selectedForDelete.title}” was deleted.`)
      setSelectedForDelete(null)
    } catch (deleteError) {
      setOperationError(deleteError.message)
      setSelectedForDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return <>
    <div className="page-heading events-heading"><div><p className="eyebrow">DISCOVER & ORGANIZE</p><h1>Events</h1><p className="page-description">Find an event to attend or manage the events you host.</p></div><Link className="button button-primary" to="/events/new"><Plus size={17}/> Create event</Link></div>
    {success && <div className="event-success" role="status">{success}<button type="button" aria-label="Dismiss" onClick={() => setSuccess('')}>×</button></div>}
    {error && <ErrorMessage message={error} onRetry={loadEvents}/>}
    {operationError && <ErrorMessage message={operationError}/>}
    <section className="event-browser panel">
      <div className="event-filters">
        <label className="event-search"><Search size={16}/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by event title" aria-label="Search events by title"/></label>
        <label className="event-filter"><SlidersHorizontal size={15}/><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{eventCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="event-filter"><span className="sr-only">Filter by price</span><select value={priceType} onChange={(event) => setPriceType(event.target.value)}><option value="all">Free & paid</option><option value="free">Free only</option><option value="paid">Paid only</option></select></label>
        <label className="event-filter"><span className="sr-only">Filter by creator</span><select value={ownership} onChange={(event) => setOwnership(event.target.value)}><option value="all">All events</option><option value="joinable">Events I can join</option></select></label>
        <label className="event-filter"><span className="sr-only">Filter by event time</span><select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}><option value="all">Not ended</option><option value="active">Happening now</option></select></label>
      </div>
      {loading ? <Loading label="Loading events..."/> : !error && filteredEvents.length === 0 ? <EmptyState icon={CalendarDays} title={events.length ? 'No events match these filters' : 'No events yet'} description={events.length ? 'Try another search or change the category and price filters.' : 'Published events will appear here. Create one to get started.'} /> : !error && <div className="event-grid">{filteredEvents.map((event) => <EventCard key={event.id} event={event} isOwner={Boolean(user && user.id === event.owner_id)} onDelete={setSelectedForDelete}/>)}</div>}
    </section>
    <ConfirmDialog open={Boolean(selectedForDelete)} title="Delete this event?" message={deleting ? 'Deleting event...' : `“${selectedForDelete?.title}” and its signups will be permanently deleted.`} confirmLabel={deleting ? 'Deleting...' : 'Delete event'} cancelLabel="Keep event" onCancel={() => !deleting && setSelectedForDelete(null)} onConfirm={confirmDelete}/>
  </>
}
