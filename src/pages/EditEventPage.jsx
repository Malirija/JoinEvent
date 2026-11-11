import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EventForm from '../components/events/EventForm.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { useAuth } from '../context/useAuth.js'
import { getEventById, updateEvent } from '../lib/eventService.js'

export default function EditEventPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requestId, setRequestId] = useState(0)
  const [loadResult, setLoadResult] = useState(null)
  const requestKey = `${id}:${requestId}:${user?.id || ''}`

  useEffect(() => {
    let active = true
    getEventById(id)
      .then((event) => {
        let error = ''
        if (!event) error = 'This event could not be found.'
        else if (event.owner_id !== user?.id) error = 'Only the event creator can edit this event.'
        if (active) setLoadResult({ requestKey, event: error ? null : event, error })
      })
      .catch((error) => { if (active) setLoadResult({ requestKey, event: null, error: error.message }) })
    return () => { active = false }
  }, [id, requestKey, user?.id])

  const loading = loadResult?.requestKey !== requestKey
  const event = loading ? null : loadResult.event
  const error = loading ? '' : loadResult.error
  const loadEvent = () => setRequestId((current) => current + 1)

  async function handleUpdate(values) {
    const updatedEvent = await updateEvent(id, values)
    navigate(`/events/${id}`, { replace: true, state: { success: 'Your changes were saved.' } })
    return updatedEvent
  }

  return <>
    <div className="page-heading form-page-heading"><div><Link className="back-link" to={event ? `/events/${event.id}` : '/events'}><ArrowLeft size={15}/> Back to event</Link><p className="eyebrow">EVENT MANAGEMENT</p><h1>Edit event</h1><p className="page-description">Update your event details and visibility.</p></div></div>
    {loading ? <Loading label="Loading event..."/> : error ? <section className="panel state-panel"><ErrorMessage message={error} onRetry={loadEvent}/><Link className="button button-secondary" to="/events">Browse events</Link></section> : event && <EventForm key={event.id} initialEvent={event} onSubmit={handleUpdate} submitLabel="Save changes"/>}
    {!loading && !error && !event && <EmptyState title="Event unavailable" description="This event is no longer available."/>}
  </>
}
