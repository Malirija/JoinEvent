import { isSupabaseConfigured, supabase } from './supabase.js'

function clientOrThrow() {
  if (!isSupabaseConfigured) {
    throw new Error('Profile data is unavailable until Supabase is configured. Add the project URL and anon key to .env.local.')
  }
  return supabase
}

function throwIfError(error) {
  if (!error) return
  if (error.code === 'PGRST202' || error.code === 'PGRST204' || error.code === '42703') {
    throw new Error('A required JoinEvent database function or field is missing. Apply the Supabase migrations with `supabase db push`.')
  }
  if (error.code === '42501') {
    throw new Error('Supabase denied access to this profile data. Sign in again and check the database row-level security policies.')
  }
  throw new Error(error.message || 'The profile request failed. Please try again.')
}

async function getSignedInUser(client) {
  const { data, error } = await client.auth.getUser()
  throwIfError(error)
  if (!data.user) throw new Error('Sign in to view your profile.')
  return data.user
}

export async function getMyProfile() {
  const client = clientOrThrow()
  const authUser = await getSignedInUser(client)
  const { data, error } = await client
    .from('users')
    .select('id,name')
    .eq('id', authUser.id)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('Your profile was not found. Sign out and back in to recreate it.')
  return {
    ...data,
    email: authUser.email || '',
    created_at: authUser.created_at,
  }
}

export async function updateMyProfile(name) {
  const client = clientOrThrow()
  await getSignedInUser(client)
  const cleanedName = String(name || '').trim()
  if (!cleanedName || cleanedName.length > 100) {
    throw new Error('Name must contain between 1 and 100 characters.')
  }
  const { data, error } = await client.rpc('update_profile', { p_name: cleanedName })
  throwIfError(error)
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile) throw new Error('Your profile could not be updated. Please try again.')
  return profile
}

export async function getMyEvents() {
  const client = clientOrThrow()
  const authUser = await getSignedInUser(client)
  const { data, error } = await client
    .from('events')
    .select('id,owner_id,title,category,location,starts_at,ends_at,capacity,price,status,created_at,signups(status)')
    .eq('owner_id', authUser.id)
    .order('starts_at', { ascending: true })
  throwIfError(error)
  return (data || []).map((event) => ({
    ...event,
    activeSignups: (event.signups || []).filter((signup) => signup.status === 'active').length,
  }))
}

export async function getMySignups() {
  const client = clientOrThrow()
  const authUser = await getSignedInUser(client)

  // The SECURITY DEFINER RPC can safely return details for historical signups,
  // including events that are no longer publicly readable.
  const { data, error } = await client.rpc('get_my_signups')
  if (!error) return (data || []).map((signup) => ({
    ...signup,
    signup_id: signup.signup_id || signup.id,
    signup_status: signup.signup_status || signup.status,
    event: {
      id: signup.event_id,
      title: signup.event_title,
      category: signup.event_category,
      location: signup.event_location,
      starts_at: signup.event_starts_at,
      status: signup.event_status,
      capacity: signup.event_capacity,
      price: signup.event_price,
    },
  }))

  // Fallback for projects that have the base signup RLS but have not applied
  // the read-RPC migration yet. RLS still limits these rows to auth.uid().
  if (error.code !== 'PGRST202') throwIfError(error)
  const { data: ownRows, error: ownRowsError } = await client
    .from('signups')
    .select('id,event_id,status,registered_at,cancelled_at,event:events(id,title,category,location,starts_at,status,capacity,price)')
    .eq('user_id', authUser.id)
    .order('registered_at', { ascending: false })
  throwIfError(ownRowsError)
  return (ownRows || []).map((signup) => ({
    ...signup,
    signup_id: signup.id,
    signup_status: signup.status,
  }))
}
