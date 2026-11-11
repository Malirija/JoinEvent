import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Pencil, Trash2, Users } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import { formatEventDate, formatEventPrice, formatEventTime } from '../lib/formatEvent.js'
import { useAuth } from '../context/useAuth.js'
import { getCategoryImage } from '../lib/categoryImages.js'
import { deleteEvent, getEventById } from '../lib/eventService.js'

export default function EventDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loadResult, setLoadResult] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const requestKey = id

  useEffect(() => {
    let active = true
    getEventById(id)
      .then((event) => {
        if (active) setLoadResult({ requestKey, event, error: event ? '' : 'This event is unpublished or no longer available.' })
      })
      .catch((error) => { if (active) setLoadResult({ requestKey, event: null, error: error.message }) })
    return () => { active = false }
  }, [id, requestKey])

  const loading = loadResult?.requestKey !== requestKey
  const event = loading ? null : loadResult.event
  const error = loading ? '' : loadResult.error
  async function handleDelete() {
    if (!event || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteEvent(event.id)
      navigate('/events', { replace: true, state: { success: `“${event.title}” was deleted.` } })
    } catch (deleteFailure) {
      setDeleteError(deleteFailure.message)
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const isOwner = Boolean(event && user?.id === event.owner_id)
  const spots = event?.available_capacity

  if (loading) return <Loading label="Loading event details..."/>
  if (error || !event) return <section className="panel event-not-found"><EmptyState title="Event unavailable" description={error || 'This event is no longer available.'}/><Link className="button button-secondary" to="/events"><ArrowLeft size={15}/> Back to events</Link></section>

  return <>
    <Link className="back-link event-back-link" to="/events"><ArrowLeft size={15}/> All events</Link>
    {location.state?.success && <div className="event-success" role="status">{location.state.success}</div>}
    {deleteError && <ErrorMessage message={deleteError}/>}
    <article className="event-detail panel">
      <div className="event-detail-hero"><img src={getCategoryImage(event.category)} alt={`${event.category} event`} /><span className="event-card-category">{event.category}</span>{event.status === 'draft' && <span className="event-draft-badge">Draft · only you can see this</span>}</div>
      <div className="event-detail-content"><div className="event-detail-heading"><div><span className={`event-price ${Number(event.price) === 0 ? 'free' : ''}`}>{formatEventPrice(event.price)}</span><h1>{event.title}</h1></div>{isOwner && <div className="event-owner-actions"><Link className="button button-secondary" to={`/events/${event.id}/edit`}><Pencil size={15}/> Edit event</Link><button className="button button-danger-outline" onClick={() => setDeleteOpen(true)}><Trash2 size={15}/> Delete</button></div>}</div>
        <div className="event-detail-facts"><div><CalendarDays size={17}/><span><strong>{formatEventDate(event.starts_at)}</strong><small>{formatEventTime(event.starts_at)}{event.ends_at ? ` – ${formatEventTime(event.ends_at)}` : ''}</small></span></div><div><MapPin size={17}/><span><strong>{event.location}</strong><small>Event location</small></span></div><div><Users size={17}/><span><strong>{spots == null ? 'Unlimited capacity' : `${spots} spots available`}</strong><small>{event.activeSignups} registered{event.capacity ? ` of ${event.capacity}` : ''}</small></span></div><div><Clock3 size={17}/><span><strong>{event.status === 'published' ? 'Registration open' : event.status === 'draft' ? 'Draft event' : 'Cancelled'}</strong><small>{event.status === 'published' ? 'See you there' : 'Visible to the event creator'}</small></span></div></div>
        <section className="event-description"><h2>About this event</h2>{event.description ? <p>{event.description}</p> : <p className="muted-copy">The host hasn’t added a description yet.</p>}</section>
      </div>
    </article>
    <ConfirmDialog open={deleteOpen} title="Delete this event?" message={deleting ? 'Deleting event...' : 'This permanently deletes the event and its signup records.'} confirmLabel={deleting ? 'Deleting...' : 'Delete event'} cancelLabel="Keep event" onCancel={() => !deleting && setDeleteOpen(false)} onConfirm={handleDelete}/>
  </>
}
