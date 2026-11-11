import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Clock3, MapPin, Pencil, Save, Ticket, Trash2, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import { useAuth } from '../context/useAuth.js'
import { cancelSignup } from '../lib/signupService.js'
import { deleteEvent } from '../lib/eventService.js'
import { formatEventDate, formatEventPrice, formatEventTime } from '../lib/formatEvent.js'
import { getCategoryImage } from '../lib/categoryImages.js'
import { getMyEvents, getMyProfile, getMySignups, updateMyProfile } from '../lib/profileService.js'

function AccountField({ icon: Icon, label, value }) {
  return <div className="profile-account-field"><span className="profile-field-icon"><Icon size={16}/></span><span><small>{label}</small><strong>{value || '—'}</strong></span></div>
}

function EventImage({ category, title }) {
  return <img className="profile-event-image" src={getCategoryImage(category)} alt={`${title} event`} />
}

export default function ProfilePage({ view = 'profile' }) {
  const { user, syncProfileName } = useAuth()
  const [reloadId, setReloadId] = useState(0)
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const reload = useCallback(() => setReloadId((current) => current + 1), [])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    Promise.all([getMyProfile(), getMyEvents(), getMySignups()])
      .then(([profile, events, signups]) => {
        if (!active) return
        setData({ requestId: reloadId, profile, events, signups })
        setName(profile.name || '')
      })
      .catch((error) => { if (active) setLoadError({ requestId: reloadId, message: error.message }) })
    return () => { active = false }
  }, [user, reloadId])

  async function handleSaveProfile(event) {
    event.preventDefault()
    setSavingName(true)
    setSaveError('')
    setSuccess('')
    try {
      const profile = await updateMyProfile(name)
      syncProfileName(profile.name || name.trim())
      setData((current) => current && ({ ...current, profile: { ...current.profile, ...profile, name: profile.name || name.trim() } }))
      setName(profile.name || name.trim())
      setSuccess('Your name has been updated.')
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSavingName(false)
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction || actionBusy) return
    setActionBusy(true)
    setActionError('')
    setSuccess('')
    try {
      if (confirmAction.type === 'event') {
        await deleteEvent(confirmAction.item.id)
        setSuccess(`“${confirmAction.item.title}” was deleted.`)
      } else {
        await cancelSignup(confirmAction.item.event_id)
        setSuccess(`Your registration for “${confirmAction.item.event.title}” was cancelled.`)
      }
      setConfirmAction(null)
      reload()
    } catch (error) {
      setActionError(error.message)
      setConfirmAction(null)
    } finally {
      setActionBusy(false)
    }
  }

  const profileData = data?.requestId === reloadId ? data : null
  const activeLoadError = loadError?.requestId === reloadId ? loadError.message : ''

  if (!profileData && !activeLoadError) return <Loading label="Loading your profile..." />

  const pageContent = {
    profile: { eyebrow: 'YOUR ACCOUNT', title: 'My Profile', description: 'Manage your personal account information.' },
    events: { eyebrow: 'CREATED BY YOU', title: 'My Events', description: 'Manage the events you host.' },
    registrations: { eyebrow: 'EVENTS YOU JOIN', title: 'My Registrations', description: 'View and manage your event registrations.' },
  }[view]

  return <>
    <div className="page-heading profile-heading"><div><p className="eyebrow">{pageContent.eyebrow}</p><h1>{pageContent.title}</h1><p className="page-description">{pageContent.description}</p></div></div>
    {activeLoadError && <ErrorMessage message={activeLoadError} onRetry={reload}/>}
    {profileData && <>
      {success && <div className="event-success" role="status">{success}<button type="button" aria-label="Dismiss" onClick={() => setSuccess('')}>×</button></div>}
      {actionError && <ErrorMessage message={actionError}/>}
      {view === 'profile' && <section className="profile-account panel">
        <div className="profile-avatar-large">{(profileData.profile.name || profileData.profile.email || 'U').slice(0, 1).toUpperCase()}</div>
        <div className="profile-account-main">
          <div className="profile-account-heading"><div><h2>Account information</h2><p>Personal information associated with your account.</p></div><span className="profile-member-since">Member since {formatEventDate(profileData.profile.created_at)}</span></div>
          <div className="profile-account-fields">
            <AccountField icon={UserRound} label="Name" value={profileData.profile.name}/>
            <AccountField icon={Ticket} label="Email address" value={profileData.profile.email}/>
            <AccountField icon={CalendarDays} label="Account created" value={formatEventDate(profileData.profile.created_at)}/>
          </div>
          <form className="profile-name-form" onSubmit={handleSaveProfile}>
            <label htmlFor="profile-name">Update your name</label>
            <div><input id="profile-name" type="text" value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={100} required/><button className="button button-primary" type="submit" disabled={savingName || name.trim() === profileData.profile.name}>{savingName ? 'Saving...' : <><Save size={14}/> Save name</>}</button></div>
            {saveError && <ErrorMessage message={saveError}/>}
          </form>
        </div>
      </section>}

      {view === 'events' && <section className="profile-section">
        <div className="profile-section-heading"><div><p className="eyebrow">CREATED BY YOU</p><h2>My Events <span>{profileData.events.length}</span></h2></div><Link className="button button-primary" to="/events/new">Create event</Link></div>
        {profileData.events.length === 0 ? <section className="panel profile-empty-panel"><EmptyState icon={CalendarDays} title="No events yet" description="Events you create will appear here."/><Link className="button button-primary profile-empty-action" to="/events/new">Create an event</Link></section> : <div className="profile-list">{profileData.events.map((event) => <article className="profile-list-card panel" key={event.id}>
          <Link to={`/events/${event.id}`} className="profile-image-link"><EventImage category={event.category} title={event.title}/></Link>
          <div className="profile-list-main"><div className="profile-item-heading"><div><Link className="profile-item-title" to={`/events/${event.id}`}>{event.title}</Link><span className={`status-pill ${event.status}`}>{event.status}</span></div><div className="profile-item-actions"><Link className="button button-secondary" to={`/events/${event.id}/edit`}><Pencil size={14}/> Edit</Link><button className="button button-danger-outline" type="button" onClick={() => setConfirmAction({ type: 'event', item: event })}><Trash2 size={14}/> Delete</button></div></div>
            <div className="profile-item-meta"><span><CalendarDays size={14}/>{formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}</span><span><MapPin size={14}/>{event.location}</span><span><UserRound size={14}/>{event.activeSignups} registered</span></div>
          </div>
        </article>)}</div>}
      </section>}

      {view === 'registrations' && <section className="profile-section">
        <div className="profile-section-heading"><div><p className="eyebrow">EVENTS YOU JOIN</p><h2>My Registrations <span>{profileData.signups.length}</span></h2></div></div>
        {profileData.signups.length === 0 ? <section className="panel profile-empty-panel"><EmptyState icon={Ticket} title="No registrations yet" description="When you register for an event, it will appear here."/><Link className="button button-primary profile-empty-action" to="/events">Browse events</Link></section> : <div className="profile-list">{profileData.signups.map((signup) => <article className="profile-list-card panel" key={signup.signup_id}>
          <Link to={`/events/${signup.event_id}`} className="profile-image-link"><EventImage category={signup.event?.event_category || signup.event?.category} title={signup.event?.title || 'Event'}/></Link>
          <div className="profile-list-main"><div className="profile-item-heading"><div><Link className="profile-item-title" to={`/events/${signup.event_id}`}>{signup.event?.title || 'Event details unavailable'}</Link><span className={`status-pill ${signup.signup_status}`}>{signup.signup_status === 'active' ? 'Confirmed' : 'Cancelled'}</span></div>{signup.signup_status === 'active' && <button className="button button-secondary" type="button" onClick={() => setConfirmAction({ type: 'signup', item: signup })}><X size={14}/> Cancel registration</button>}</div>
            <div className="profile-item-meta">{(signup.event?.event_starts_at || signup.event?.starts_at) && <span><CalendarDays size={14}/>{formatEventDate(signup.event.event_starts_at || signup.event.starts_at)} · {formatEventTime(signup.event.event_starts_at || signup.event.starts_at)}</span>}<span><MapPin size={14}/>{signup.event?.event_location || signup.event?.location || 'Location unavailable'}</span><span><Clock3 size={14}/>Registered {formatEventDate(signup.registered_at)}</span><span><Ticket size={14}/>{formatEventPrice(signup.event?.event_price ?? signup.event?.price ?? 0)}</span></div>
          </div>
        </article>)}</div>}
      </section>}
    </>}
    <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction?.type === 'event' ? 'Delete this event?' : 'Cancel this registration?'} message={confirmAction?.type === 'event' ? `“${confirmAction?.item.title}” and its signup history will be permanently deleted.` : `Cancel your place for “${confirmAction?.item.event.title}”? Your registration history will be kept.`} confirmLabel={actionBusy ? 'Working...' : confirmAction?.type === 'event' ? 'Delete event' : 'Cancel registration'} cancelLabel="Go back" onCancel={() => !actionBusy && setConfirmAction(null)} onConfirm={handleConfirmAction}/>
  </>
}
