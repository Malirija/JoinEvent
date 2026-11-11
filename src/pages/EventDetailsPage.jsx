import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Pencil, Ticket, Trash2, Users } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import { formatEventDate, formatEventPrice, formatEventTime } from '../lib/formatEvent.js'
import { useAuth } from '../context/useAuth.js'
import { getCategoryImage } from '../lib/categoryImages.js'
import { deleteEvent, getEventById } from '../lib/eventService.js'
import { cancelSignup, getEventSignups, getMySignups, registerForEvent } from '../lib/signupService.js'

export default function EventDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loadResult, setLoadResult] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [signupResult, setSignupResult] = useState(null)
  const [signupBusy, setSignupBusy] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')

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
  const isOwner = Boolean(event && user?.id === event.owner_id)
  const signupKey = `${id}:${user?.id || ''}`

  useEffect(() => {
    if (!event || !user) return undefined
    let active = true
    Promise.all([
      getMySignups(),
      isOwner ? getEventSignups(event.id) : Promise.resolve([]),
    ])
      .then(([mySignups, eventSignups]) => {
        if (active) setSignupResult({ key: signupKey, mySignups, eventSignups, error: '' })
      })
      .catch((signupLoadError) => {
        if (active) setSignupResult({ key: signupKey, mySignups: [], eventSignups: [], error: signupLoadError.message })
      })
    return () => { active = false }
  }, [event, id, isOwner, signupKey, user])

  const signupLoading = Boolean(user && signupResult?.key !== signupKey)
  const currentSignup = signupResult?.key === signupKey
    ? signupResult.mySignups.find((signup) => signup.event_id === id)
    : null
  const eventSignups = signupResult?.key === signupKey ? signupResult.eventSignups : []
  const signupLoadError = signupResult?.key === signupKey ? signupResult.error : ''
  const spots = event?.availableCapacity
  const eventHasStarted = Boolean(event && new Date(event.starts_at) <= new Date())
  const registrationBlockedReason = event?.status !== 'published'
    ? 'Registration is closed for this event.'
    : eventHasStarted
      ? 'Registration closed because this event has started.'
      : spots != null && spots <= 0
        ? 'This event has reached its capacity.'
        : ''

  async function reloadSignupData() {
    const [updatedEvent, mySignups, ownerSignups] = await Promise.all([
      getEventById(id),
      getMySignups(),
      isOwner ? getEventSignups(id) : Promise.resolve([]),
    ])
    if (updatedEvent) setLoadResult({ requestKey, event: updatedEvent, error: '' })
    setSignupResult({ key: signupKey, mySignups, eventSignups: ownerSignups, error: '' })
  }

  async function handleSignupAction() {
    if (signupBusy || !event) return
    setSignupBusy(true)
    setSignupError('')
    setSignupSuccess('')
    try {
      const result = currentSignup?.signup_status === 'active'
        ? await cancelSignup(event.id)
        : await registerForEvent(event.id)
      setSignupSuccess(result?.result_message || 'Your registration was updated.')
      try {
        await reloadSignupData()
      } catch {
        setSignupError('Your registration was updated, but the latest attendee count could not be loaded. Refresh the page to see it.')
      }
    } catch (actionError) {
      setSignupError(actionError.message)
    } finally {
      setSignupBusy(false)
    }
  }

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

  if (loading) return <Loading label="Loading event details..."/>
  if (error || !event) return <section className="panel event-not-found"><EmptyState title="Event unavailable" description={error || 'This event is no longer available.'}/><Link className="button button-secondary" to="/events"><ArrowLeft size={15}/> Back to events</Link></section>

  return <>
    <Link className="back-link event-back-link" to="/events"><ArrowLeft size={15}/> All events</Link>
    {location.state?.success && <div className="event-success" role="status">{location.state.success}</div>}
    {deleteError && <ErrorMessage message={deleteError}/>}
    <article className="event-detail panel">
      <div className="event-detail-hero"><img src={getCategoryImage(event.category)} alt={`${event.category} event`} /><span className="event-card-category">{event.category}</span>{event.status === 'draft' && <span className="event-draft-badge">Draft · only you can see this</span>}</div>
      <div className="event-detail-content"><div className="event-detail-heading"><div><span className={`event-price ${Number(event.price) === 0 ? 'free' : ''}`}>{Number(event.price) > 0 && <Ticket size={13}/>} {formatEventPrice(event.price)}</span><h1>{event.title}</h1></div>{isOwner && <div className="event-owner-actions"><Link className="button button-secondary" to={`/events/${event.id}/edit`}><Pencil size={15}/> Edit event</Link><button className="button button-danger-outline" onClick={() => setDeleteOpen(true)}><Trash2 size={15}/> Delete</button></div>}</div>
        <div className="event-detail-facts"><div><CalendarDays size={17}/><span><strong>{formatEventDate(event.starts_at)}</strong><small>{formatEventTime(event.starts_at)}{event.ends_at ? ` – ${formatEventTime(event.ends_at)}` : ''}</small></span></div><div><MapPin size={17}/><span><strong>{event.location}</strong><small>Event location</small></span></div><div><Users size={17}/><span><strong>{event.activeSignups} confirmed registrations</strong><small>{spots == null ? 'Unlimited places' : `${spots} places available`}{event.capacity ? ` of ${event.capacity}` : ''}</small></span></div><div><Clock3 size={17}/><span><strong>{event.status === 'published' ? 'Registration open' : event.status === 'draft' ? 'Draft event' : 'Cancelled'}</strong><small>{event.status === 'published' ? 'See you there' : 'Visible to the event creator'}</small></span></div></div>
        <section className="registration-panel"><div className="registration-panel-heading"><div><h2>Registration</h2><p>{Number(event.price) > 0 ? 'Registration reserves a place; payment is not collected.' : 'Reserve a place at this event.'}</p></div><div className="registration-capacity"><strong>{event.activeSignups}</strong><span>confirmed</span><i>·</i><strong>{spots == null ? '∞' : spots}</strong><span>available</span></div></div>
          {signupSuccess && <div className="event-success" role="status">{signupSuccess}</div>}
          {signupError && <ErrorMessage message={signupError}/>}
          {signupLoadError && <ErrorMessage message={signupLoadError}/>}
          {!user ? <div className="registration-action"><span>Sign in to manage your registration.</span><Link className="button button-primary" to="/login" state={{ from: location }}>Sign in to register</Link></div> : isOwner ? <div className="registration-action"><span>You are hosting this event.</span><span className="registration-state hosted">Event creator</span></div> : signupLoading ? <Loading label="Checking your registration..."/> : <div className="registration-action"><span>{currentSignup?.signup_status === 'active' ? <span className="registration-state registered">You are registered</span> : currentSignup?.signup_status === 'cancelled' ? <span className="registration-state cancelled">Your previous registration was cancelled</span> : 'You are not registered yet.'}</span>{currentSignup?.signup_status === 'active' ? <button className="button button-secondary" onClick={handleSignupAction} disabled={signupBusy}>{signupBusy ? 'Cancelling...' : 'Cancel registration'}</button> : <button className="button button-primary" onClick={handleSignupAction} disabled={signupBusy || Boolean(registrationBlockedReason)}>{signupBusy ? 'Registering...' : currentSignup?.signup_status === 'cancelled' ? 'Register again' : 'Register for this event'}</button>}{currentSignup?.signup_status !== 'active' && registrationBlockedReason && <small className="registration-blocked-reason">{registrationBlockedReason}</small>}</div>}
        </section>
        <section className="event-description"><h2>About this event</h2>{event.description ? <p>{event.description}</p> : <p className="muted-copy">The host hasn’t added a description yet.</p>}</section>
        {isOwner && <section className="event-attendees"><div className="panel-heading"><div><h2>Attendees</h2><p>People registered for your event</p></div></div>{signupLoading ? <Loading label="Loading attendees..."/> : signupLoadError ? null : eventSignups.filter((signup) => signup.signup_status === 'active').length ? <ul>{eventSignups.filter((signup) => signup.signup_status === 'active').map((signup) => <li key={signup.signup_id}><span className="user-avatar">{signup.attendee_name?.slice(0, 1).toUpperCase()}</span><span>{signup.attendee_name}</span><small>{formatEventDate(signup.registered_at)}</small></li>)}</ul> : <p className="attendee-empty">No registrations yet.</p>}</section>}

      </div>
    </article>
    <ConfirmDialog open={deleteOpen} title="Delete this event?" message={deleting ? 'Deleting event...' : 'This permanently deletes the event and its signup records.'} confirmLabel={deleting ? 'Deleting...' : 'Delete event'} cancelLabel="Keep event" onCancel={() => !deleting && setDeleteOpen(false)} onConfirm={handleDelete}/>
  </>
}
