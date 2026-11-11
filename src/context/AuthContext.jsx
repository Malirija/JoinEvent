import { useEffect, useMemo, useState } from 'react'
import { getCurrentUser, login, logout, onAuthStateChange, register } from '../lib/authService.js'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { AuthContext } from './authContext.js'

const configurationMessage = 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) to .env, then restart Vite.'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [initializationError, setInitializationError] = useState(isSupabaseConfigured ? '' : configurationMessage)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let mounted = true
    const subscription = onAuthStateChange((_event, nextUser) => {
      if (mounted) {
        setUser(nextUser)
        setLoading(false)
      }
    })

    getCurrentUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser)
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
    isConfigured: isSupabaseConfigured,
    register,
    login,
    logout,
  }), [user, loading, initializationError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

