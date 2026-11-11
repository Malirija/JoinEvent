import { isSupabaseConfigured, supabase } from './supabase.js'

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Events are unavailable until Supabase is configured. Add your project URL and publishable or anon key to .env.')
  }
  return supabase
}

function throwIfError(error) {
  if (!error) return
  if (error.code === 'PGRST202' || error.code === 'PGRST204' || error.code === '42703') {
    throw new Error('The database is missing the Events module migration. From the project root, run `supabase db push`, then retry.')
  }
  if (error.code === '23503' && String(error.message).includes('events_owner_id')) {
    throw new Error('Your account profile is missing in the database. Apply the latest migration with `supabase db push`, then sign out and back in.')
  }
  if (error.code === '42501') {
    throw new Error('Supabase denied this event change. Make sure you are signed in and that you are the event creator.')
  }
  throw new Error(error.message || 'The event request failed. Please try again.')
}

function normalizeEvent(row) {
  if (!row) return null
  return {
    ...row,
    id: row.event_id || row.id,
    activeSignups: Number(row.active_signups ?? 0),
    availableCapacity: row.available_capacity == null ? null : Number(row.available_capacity),
  }
}

export async function getEvents() {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_events_with_capacity')
  throwIfError(error)
  return (data || []).map(normalizeEvent).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
}

export async function getEventById(id) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_events_with_capacity', { p_event_id: id })
  throwIfError(error)
  return normalizeEvent(data?.[0] || null)
}

export async function createEvent(eventData) {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  throwIfError(authError)
  if (!authData.user) throw new Error('Sign in before creating an event.')

  const { data, error } = await client
    .from('events')
    .insert({ ...eventData, owner_id: authData.user.id })
    .select('*')
    .single()
  throwIfError(error)
  return data
}

export async function updateEvent(id, eventData) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('events')
    .update({ ...eventData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Event not found or you do not have permission to edit it.')
  return data
}

export async function deleteEvent(id) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('events')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Event not found or you do not have permission to delete it.')
  return data.id
}
