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

export async function registerForEvent(eventId, eventDetails) {
  const client = clientOrThrow()
  const user = await requireSignedIn(client)
  const { data, error } = await client.rpc('register_for_event', { p_event_id: eventId })
  if (error) presentRpcError(error)

  const webhookBaseUrl = import.meta.env.VITE_ZAPIER_WEBHOOK_URL?.trim()
  if (!webhookBaseUrl) {
    if (import.meta.env.DEV) console.warn('Event registration succeeded, but Zapier was skipped because VITE_ZAPIER_WEBHOOK_URL is not configured.')
    return data?.[0] || null
  }

  try {
    // The caller already has the event from getEventById. Keep the fallback
    // query for any other callers of this service.
    let event = eventDetails
    if (!event?.title || event.price == null) {
      const { data: fetchedEvent, error: eventError } = await client
        .from('events')
        .select('title,price')
        .eq('id', eventId)
        .single()
      if (eventError) throw eventError
      event = fetchedEvent
    }

    const webhookUrl = new URL(webhookBaseUrl)
    webhookUrl.searchParams.set('paid', Number(event.price) > 0 ? '1' : '0')
    webhookUrl.searchParams.set('email', user.email || '')
    webhookUrl.searchParams.set('title', event.title)
    await fetch(webhookUrl.toString(), { method: 'GET', mode: 'no-cors', credentials: 'omit', keepalive: true })
  } catch (webhookError) {
    // Registration has already succeeded; a webhook outage must not make the
    // user retry and appear to have a failed or duplicate registration.
    console.error('The signup succeeded, but the Zapier webhook could not be called.', webhookError)
  }
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
