import { useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../common/ErrorMessage.jsx'
import { eventCategories } from '../../lib/categoryImages.js'
import { supabase } from '../../lib/supabase.js'
import { LoaderCircle, Sparkles } from 'lucide-react'

const eventLocations = ['Vilnius', 'Kaunas', 'Klaipėda', 'Utena', 'Panevėžys', 'Alytus', 'Druskininkai', 'Mažeikiai']

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default function EventForm({ initialEvent, onSubmit, submitLabel }) {
  const [values, setValues] = useState(() => ({
    title: initialEvent?.title || '',
    category: initialEvent?.category || 'Technology',
    description: initialEvent?.description || '',
    location: eventLocations.includes(initialEvent?.location) ? initialEvent.location : '',
    startsAt: toLocalInput(initialEvent?.starts_at),
    endsAt: toLocalInput(initialEvent?.ends_at),
    capacity: initialEvent?.capacity == null ? '' : String(initialEvent.capacity),
    priceType: Number(initialEvent?.price || 0) > 0 ? 'paid' : 'free',
    price: Number(initialEvent?.price || 0) > 0 ? String(initialEvent.price) : '',
    status: initialEvent?.status || 'published',
  }))
  const [times, setTimes] = useState(() => ({
    startsAt: toLocalInput(initialEvent?.starts_at).slice(11) || '12:00',
    endsAt: toLocalInput(initialEvent?.ends_at).slice(11) || '12:00',
  }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    if (field === 'description') setGenerationError('')
  }

  async function generateDescription() {
    const title = values.title.trim()
    if (!title || !supabase) return
    if (values.description.trim() && !window.confirm('Replace the existing description with an AI-generated one?')) return

    setGenerating(true)
    setGenerationError('')
    try {
      const { data, error } = await supabase.functions.invoke('generate-event-description', {
        body: { title },
        signal: AbortSignal.timeout(70_000),
      })
      if (error) throw error
      if (typeof data?.description !== 'string' || !data.description.trim()) {
        throw new Error('The generator returned an empty description. Please try again.')
      }
      updateField('description', data.description.trim())
    } catch (error) {
      let message = error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'Gemini is taking longer than usual to respond. Please try again in a moment.'
        : error.message || 'We couldn’t generate the description just now. Please try again in a moment.'
      if (error.context && typeof error.context.clone === 'function') {
        const responseBody = await error.context.clone().json().catch(() => null)
        if (typeof responseBody?.error === 'string') message = responseBody.error
      }
      setGenerationError(message)
    } finally {
      setGenerating(false)
    }
  }

  function updateScheduleDate(field, date) {
    const defaultTime = '12:00'
    setTimes((current) => ({ ...current, [field]: defaultTime }))
    updateField(field, date ? `${date}T${defaultTime}` : '')
  }

  function updateScheduleTime(field, time) {
    setTimes((current) => ({ ...current, [field]: time }))
    const date = values[field].slice(0, 10)
    if (date) updateField(field, `${date}T${time}`)
  }

  function validate() {
    const nextErrors = {}
    const title = values.title.trim()
    const location = values.location.trim()
    const start = new Date(values.startsAt)
    const end = new Date(values.endsAt)
    const capacity = Number(values.capacity)
    const price = values.priceType === 'free' ? 0 : Number(values.price)
    const now = new Date()

    if (!title) nextErrors.title = 'Enter an event title.'
    if (!values.category) nextErrors.category = 'Choose a category.'
    if (!eventLocations.includes(location)) nextErrors.location = 'Choose a city from the list.'
    if (!values.startsAt || Number.isNaN(start.getTime())) nextErrors.startsAt = 'Choose a valid start date and time.'
    else if (start < now) nextErrors.startsAt = 'Start date and time cannot be in the past.'
    if (!values.endsAt || Number.isNaN(end.getTime())) nextErrors.endsAt = 'Choose a valid end date and time.'
    else if (end < now) nextErrors.endsAt = 'End date and time cannot be in the past.'
    else if (!Number.isNaN(start.getTime()) && end <= start) nextErrors.endsAt = 'End date and time must be after the start.'
    if (!values.capacity || !Number.isSafeInteger(capacity) || capacity <= 0) nextErrors.capacity = 'Capacity must be a positive whole number.'
    if (values.priceType === 'paid' && (!values.price || !Number.isFinite(price) || price <= 0)) nextErrors.price = 'Paid events need a price greater than zero.'
    if (values.priceType === 'paid' && values.price && !/^\d+(\.\d{0,2})?$/.test(values.price)) nextErrors.price = 'Enter a price with no more than two decimal places.'

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setSaving(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        category: values.category,
        description: values.description.trim(),
        location: values.location.trim(),
        starts_at: new Date(values.startsAt).toISOString(),
        ends_at: new Date(values.endsAt).toISOString(),
        capacity: Number(values.capacity),
        price: values.priceType === 'free' ? 0 : Number(values.price),
        status: values.status,
      })
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const minDateTime = localDateTimeValue(new Date())
  const today = minDateTime.slice(0, 10)
  const startDate = values.startsAt.slice(0, 10)
  const endMinDate = startDate > today ? startDate : today
  const endMinTime = startDate === values.endsAt.slice(0, 10) ? times.startsAt : undefined

  return <form className="event-form panel" onSubmit={handleSubmit} noValidate>
    {formError && <ErrorMessage message={formError}/>}
    <div className="form-section"><h2>Event information</h2><p>Give people the details they need to join you.</p>
      <div className="form-field"><label htmlFor="event-title">Event title <i>*</i></label><input id="event-title" value={values.title} onChange={(event) => updateField('title', event.target.value)} maxLength={160} placeholder="e.g. Vilnius Product Meetup" aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}</div>
      <div className="form-grid"><div className="form-field"><label htmlFor="event-category">Category <i>*</i></label><select id="event-category" value={values.category} onChange={(event) => updateField('category', event.target.value)}>{eventCategories.map((category) => <option key={category}>{category}</option>)}</select>{fieldErrors.category && <small className="field-error">{fieldErrors.category}</small>}</div><div className="form-field"><label htmlFor="event-location">Location <i>*</i></label><select id="event-location" value={values.location} onChange={(event) => updateField('location', event.target.value)} aria-invalid={Boolean(fieldErrors.location)}><option value="">Choose a city</option>{eventLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select>{fieldErrors.location && <small className="field-error">{fieldErrors.location}</small>}</div></div>
      <div className="form-field"><div className="description-label-row"><label htmlFor="event-description">Description</label><button className="button button-secondary ai-generate-button" type="button" onClick={generateDescription} disabled={!values.title.trim() || generating || !supabase}><Sparkles size={14}/>{generating ? <><LoaderCircle size={14} className="ai-spinner"/> Generating...</> : 'Generate with AI'}</button></div><textarea id="event-description" rows="5" value={values.description} onChange={(event) => updateField('description', event.target.value)} maxLength={5000} placeholder="What should attendees know?"/>{generationError && <small className="field-error" role="alert">{generationError}</small>}</div>
    </div>
    <div className="form-section"><h2>Schedule & capacity</h2><p>Set when the event happens and how many people can attend.</p>
      <div className="form-grid"><div className="form-field"><label>Starts <i>*</i></label><div className="datetime-inputs"><label className="sr-only" htmlFor="event-start-date">Start date</label><input id="event-start-date" type="date" min={today} value={startDate} onChange={(event) => updateScheduleDate('startsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.startsAt)}/><label className="sr-only" htmlFor="event-start-time">Start time</label><input id="event-start-time" type="time" step="60" value={times.startsAt} onChange={(event) => updateScheduleTime('startsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.startsAt)}/></div>{fieldErrors.startsAt && <small className="field-error">{fieldErrors.startsAt}</small>}</div><div className="form-field"><label>Ends <i>*</i></label><div className="datetime-inputs"><label className="sr-only" htmlFor="event-end-date">End date</label><input id="event-end-date" type="date" min={endMinDate} value={values.endsAt.slice(0, 10)} onChange={(event) => updateScheduleDate('endsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.endsAt)}/><label className="sr-only" htmlFor="event-end-time">End time</label><input id="event-end-time" type="time" step="60" min={endMinTime} value={times.endsAt} onChange={(event) => updateScheduleTime('endsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.endsAt)}/></div>{fieldErrors.endsAt && <small className="field-error">{fieldErrors.endsAt}</small>}</div></div>
      <div className="form-grid"><div className="form-field"><label htmlFor="event-capacity">Capacity <i>*</i></label><input id="event-capacity" type="number" min="1" step="1" value={values.capacity} onChange={(event) => updateField('capacity', event.target.value)} placeholder="e.g. 80" aria-invalid={Boolean(fieldErrors.capacity)}/>{fieldErrors.capacity && <small className="field-error">{fieldErrors.capacity}</small>}</div><div className="form-field"><label htmlFor="event-price-type">Admission</label><select id="event-price-type" value={values.priceType} onChange={(event) => { updateField('priceType', event.target.value); if (event.target.value === 'free') updateField('price', '') }}><option value="free">Free</option><option value="paid">Paid</option></select></div></div>
      {values.priceType === 'paid' && <div className="form-field price-input"><label htmlFor="event-price">Ticket price (EUR) <i>*</i></label><input id="event-price" type="number" min="0.01" step="0.01" value={values.price} onChange={(event) => updateField('price', event.target.value)} placeholder="0.00" aria-invalid={Boolean(fieldErrors.price)}/>{fieldErrors.price && <small className="field-error">{fieldErrors.price}</small>}</div>}
    </div>
    <div className="form-section"><h2>Publish</h2><p>Published events appear in the public events list.</p><div className="form-field"><label htmlFor="event-status">Visibility</label><select id="event-status" value={values.status} onChange={(event) => updateField('status', event.target.value)}><option value="published">Published</option><option value="draft">Save as draft</option>{initialEvent?.status === 'cancelled' && <option value="cancelled">Cancelled</option>}</select></div></div>
    <div className="event-form-actions"><Link className="button button-secondary" to={initialEvent ? `/events/${initialEvent.id}` : '/events'}>Cancel</Link><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : submitLabel}</button></div>
  </form>
}
