import { isSupabaseConfigured, supabase } from './supabase.js'

function clientOrThrow() {
  if (!isSupabaseConfigured) {
    throw new Error('Statistics are unavailable until Supabase is configured. Add your project URL and anon key to .env.local.')
  }
  return supabase
}

function throwIfError(error) {
  if (!error) return
  if (error.code === 'PGRST202' || error.code === 'PGRST204' || error.code === '42703') {
    throw new Error('A required statistics function or database field is missing. Apply the Supabase migrations with `supabase db push`.')
  }
  if (error.code === '28000') throw new Error('Sign in to view event statistics.')
  if (error.code === '42501') throw new Error('Supabase denied access to these statistics. Check the database row-level security policies.')
  throw new Error(error.message || 'Statistics could not be loaded. Please try again.')
}

function normalizeHourlyStats(rows = []) {
  const counts = new Map(rows.map((row) => [Number(row.local_creation_hour), Number(row.event_count)]))
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    count: counts.get(hour) || 0,
  }))
}

export async function getStatistics() {
  const client = clientOrThrow()
  const [{ data: authData, error: authError }, { data: hourlyRows, error: hourlyError }] = await Promise.all([
    client.auth.getUser(),
    client.rpc('get_event_creation_stats'),
  ])
  throwIfError(authError)
  throwIfError(hourlyError)
  if (!authData.user) throw new Error('Sign in to view event statistics.')

  // Restrict summary cards to the signed-in user's events. RLS also enforces
  // the owner filter in the database; the client never receives private rows.
  const { data: events, error: eventsError } = await client
    .from('events')
    .select('id,price')
    .eq('owner_id', authData.user.id)
  throwIfError(eventsError)

  const ownedEvents = events || []
  const eventStatistics = await Promise.all(ownedEvents.map(async (event) => {
    const { data, error } = await client.rpc('get_event_statistics', { p_event_id: event.id })
    throwIfError(error)
    return Array.isArray(data) ? data[0] : data
  }))

  return {
    eventsByHour: normalizeHourlyStats(hourlyRows || []),
    totalEvents: ownedEvents.length,
    totalSignups: eventStatistics.reduce((total, row) => total + Number(row?.active_signups || 0), 0),
    freeEvents: ownedEvents.filter((event) => Number(event.price) === 0).length,
    paidEvents: ownedEvents.filter((event) => Number(event.price) > 0).length,
    hasHostedEvents: ownedEvents.length > 0,
  }
}
