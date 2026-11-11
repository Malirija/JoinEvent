import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUser, login, logout, onAuthStateChange, register } from '../lib/authService.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { AuthContext } from './authContext.js'

const configurationMessage = 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) to .env, then restart Vite.'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [initializationError, setInitializationError] = useState(isSupabaseConfigured ? '' : configurationMessage)
  const activeUserId = useRef(null)
  const profileNameRevision = useRef(0)

  const syncProfileName = useCallback((name) => {
    profileNameRevision.current += 1
    setProfileName(String(name || '').trim())
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let mounted = true
    function applyUser(nextUser) {
      activeUserId.current = nextUser?.id || null
      setUser(nextUser)
      const fallbackName = nextUser?.user_metadata?.name || ''
      setProfileName(fallbackName)
      setLoading(false)

      if (nextUser) {
        const userId = nextUser.id
        const revision = profileNameRevision.current
        // Leave Supabase's auth callback before issuing a database request.
        window.setTimeout(async () => {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('name')
              .eq('id', userId)
              .maybeSingle()
            if (mounted && !error && activeUserId.current === userId && profileNameRevision.current === revision && data?.name) {
              setProfileName(data.name)
            }
          } catch {
            // Keep the Auth metadata fallback when the profile lookup is unavailable.
          }
        }, 0)
      }
    }

    const subscription = onAuthStateChange((_event, nextUser) => {
      if (mounted) applyUser(nextUser)
    })

    getCurrentUser()
      .then((currentUser) => {
        if (mounted && activeUserId.current !== currentUser?.id) applyUser(currentUser)
      })
      .catch((error) => {
        if (mounted) setInitializationError(error.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    initializationError,
    profileName,
    syncProfileName,
    isConfigured: isSupabaseConfigured,
    register,
    login,
    logout,
  }), [user, loading, initializationError, profileName, syncProfileName])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

