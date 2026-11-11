import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import EventForm from '../components/events/EventForm.jsx'
import { createEvent } from '../lib/eventService.js'

export default function CreateEventPage() {
  const navigate = useNavigate()

  async function handleCreate(values) {
    const event = await createEvent(values)
    navigate(`/events/${event.id}`, { replace: true, state: { success: 'Your event was created.' } })
  }

  return <>
    <div className="page-heading form-page-heading"><div><Link className="back-link" to="/events"><ArrowLeft size={15}/> All events</Link><p className="eyebrow">EVENT MANAGEMENT</p><h1>Create event</h1><p className="page-description">Add the details for your next event.</p></div></div>
    <EventForm onSubmit={handleCreate} submitLabel="Create event"/>
  </>
}
