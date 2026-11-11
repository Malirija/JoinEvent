import { isSupabaseConfigured, supabase } from './supabase.js'

function clientOrThrow() {
  if (!isSupabaseConfigured) {
    throw new Error('Registration is unavailable until Supabase is configured. Add your project URL and publishable or anon key to .env.')
  }
  return supabase
}

function presentRpcError(error) {
  if (!error) return
  if (error.code === '28000' || /must be signed in/i.test(error.message || '')) {
    throw new Error('Sign in to register for an event.')
  }
  if (error.code === '23505' || /already registered/i.test(error.message || '')) {
    throw new Error('You are already registered for this event.')
  }
  if (/own event/i.test(error.message || '')) {
    throw new Error('You cannot register for an event you created.')
  }
  if (/event is full/i.test(error.message || '')) {
    throw new Error('This event has reached its capacity.')
  }
  if (/not open for registration|has started/i.test(error.message || '')) {
    throw new Error(error.message)
  }
  if (error.code === 'PGRST202') {
    throw new Error('The signup database functions are missing. Apply the latest Supabase migration with `supabase db push`.')
  }
  throw new Error(error.message || 'The signup request failed. Please try again.')
}

async function requireSignedIn(client) {
  const { data, error } = await client.auth.getUser()
  if (error) presentRpcError(error)
  if (!data.user) throw new Error('Sign in to manage event registrations.')
  return data.user
}

export async function registerForEvent(eventId) {
  const client = clientOrThrow()
  await requireSignedIn(client)
  const { data, error } = await client.rpc('register_for_event', { p_event_id: eventId })
  if (error) presentRpcError(error)
  return data?.[0] || null
}

export async function cancelSignup(eventId) {
  const client = clientOrThrow()
  await requireSignedIn(client)
  const { data, error } = await client.rpc('cancel_event_signup', { p_event_id: eventId })
  if (error) presentRpcError(error)
  return data?.[0] || null
}

export async function getMySignups() {
  const client = clientOrThrow()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) presentRpcError(authError)
  if (!authData.user) return []
  // RLS already permits users to read their own signup rows. Use that policy
  // for this read so registration status does not depend on an extra RPC
  // migration being installed. Signup writes still go exclusively through RPC.
  const { data, error } = await client
    .from('signups')
    .select('id,event_id,status,registered_at,cancelled_at')
    .eq('user_id', authData.user.id)
    .order('registered_at', { ascending: false })
  if (error) presentRpcError(error)
  return (data || []).map((signup) => ({
    ...signup,
    signup_id: signup.id,
    signup_status: signup.status,
  }))
}

export async function getEventSignups(eventId) {
  const client = clientOrThrow()
  await requireSignedIn(client)
  const { data, error } = await client.rpc('get_event_signups', { p_event_id: eventId })
  if (error) presentRpcError(error)
  return data || []
}
