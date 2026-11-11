import { CalendarDays, Clock3, MapPin, Pencil, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCategoryImage } from '../../lib/categoryImages.js'
import { formatEventDate, formatEventPrice, formatEventTime } from '../../lib/formatEvent.js'

export default function EventCard({ event, isOwner = false, onDelete }) {
  const remaining = event.availableCapacity
  return <article className="event-card">
    <Link to={`/events/${event.id}`} className="event-card-image-link" aria-label={`View ${event.title}`}>
      <img className="event-card-image" src={getCategoryImage(event.category)} alt={`${event.category} event`} />
      <span className="event-card-category">{event.category}</span>
      {event.status === 'draft' && <span className="event-draft-badge">Draft</span>}
    </Link>
    <div className="event-card-content">
      <div className="event-card-title-row"><Link to={`/events/${event.id}`} className="event-card-title">{event.title}</Link><span className={`event-price ${Number(event.price) === 0 ? 'free' : ''}`}>{formatEventPrice(event.price)}</span></div>
      <div className="event-card-meta"><span><CalendarDays size={14}/>{formatEventDate(event.starts_at)}</span><span><Clock3 size={14}/>{formatEventTime(event.starts_at)}</span></div>
      <div className="event-card-meta event-location"><span><MapPin size={14}/>{event.location}</span></div>
      <div className="event-card-bottom"><span className="event-capacity"><Users size={14}/>{remaining == null ? `${event.activeSignups} attending · Unlimited` : `${remaining} spots left`}</span>{isOwner && <span className="event-card-actions"><Link to={`/events/${event.id}/edit`} aria-label={`Edit ${event.title}`}><Pencil size={15}/></Link><button type="button" onClick={() => onDelete(event)} aria-label={`Delete ${event.title}`}><Trash2 size={15}/></button></span>}</div>
    </div>
  </article>
}
