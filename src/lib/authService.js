import { isSupabaseConfigured, supabase } from './supabase.js'

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication is not configured. Add your Supabase URL and publishable key to .env.')
  }
  return supabase
}

function throwIfError(error) {
  if (!error) return
  const message = error.message || 'Authentication failed. Please try again.'
  throw new Error(message)
}

export async function register(name, email, password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  })
  throwIfError(error)
  if (!data.session && data.user?.identities?.length === 0) {
    throw new Error('An account with this email may already exist. Try signing in instead.')
  }
  return data
}

export async function login(email, password) {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  throwIfError(error)
  return data
}

export async function logout() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  throwIfError(error)
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getSession()
  throwIfError(error)
  return data.session?.user ?? null
}

export function onAuthStateChange(callback) {
  const client = requireSupabase()
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user ?? null, session)
  })
  return data.subscription
}
