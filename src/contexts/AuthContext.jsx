import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { ROLES } from '../utils/constants'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch user profile
    const fetchProfile = async (userId) => {
        console.log('[Auth] Fetching profile for user:', userId)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                // Ignore AbortError which happens on reload/unmount
                if (error.code === '20' || error.message?.includes('AbortError')) {
                    console.log('[Auth] Profile fetch aborted (expected during reload)')
                    return null
                }

                console.error('[Auth] Profile fetch error:', error)
                return null
            }

            console.log('[Auth] Profile fetched:', data)
            setProfile(data)

            // CACHE: Save to local storage
            try {
                localStorage.setItem('app_user_profile', JSON.stringify(data))
            } catch (e) {
                console.error('[Auth] Failed to cache profile:', e)
            }

            return data
        } catch (err) {
            if (err.name === 'AbortError' || err.message?.includes('AbortError')) {
                return null
            }
            console.error('[Auth] Error fetching profile:', err)
            return null
        }
    }

    // Manual refresh for profile (exposed to UI)
    const refreshProfile = async () => {
        if (user) {
            setLoading(true)
            await fetchProfile(user.id)
            setLoading(false)
        }
    }

    // Initialize auth state
    useEffect(() => {
        let isMounted = true
        console.log('[Auth] Initializing auth state...')

        // CACHE: Try to load profile from local storage immediately
        const cachedProfile = localStorage.getItem('app_user_profile')
        if (cachedProfile) {
            try {
                const parsed = JSON.parse(cachedProfile)
                console.log('[Auth] Loaded cached profile:', parsed)
                setProfile(parsed)
            } catch (e) {
                console.error('[Auth] Failed to parse cached profile')
                localStorage.removeItem('app_user_profile')
            }
        }

        // Set a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('[Auth] Loading timeout - forcing completion')
                setLoading(false)
            }
        }, 5000) // 5 second timeout

        // Get initial session
        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('[Auth] Get session error:', error)
                }

                console.log('[Auth] Initial session:', session ? 'exists' : 'none')

                if (isMounted) {
                    if (session?.user) {
                        setUser(session.user)

                        // Background fetch to update cache/state
                        fetchProfile(session.user.id).then(data => {
                            if (!data && !cachedProfile) {
                                console.warn('[Auth] No profile data available (fetch failed + no cache)')
                            }
                        })
                    } else {
                        setUser(null)
                        setProfile(null)
                        localStorage.removeItem('app_user_profile')
                    }

                    setLoading(false)
                }
            } catch (err) {
                console.error('[Auth] Init error:', err)
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[Auth] Auth state changed:', event, session ? 'has session' : 'no session')

                if (isMounted) {
                    if (session?.user) {
                        setUser(session.user) // Always keep user if session exists
                        fetchProfile(session.user.id)
                    } else {
                        setUser(null)
                        setProfile(null)
                        localStorage.removeItem('app_user_profile')
                    }

                    setLoading(false)
                }
            }
        )

        return () => {
            isMounted = false
            clearTimeout(loadingTimeout)
            subscription.unsubscribe()
        }
    }, [])

    // Sign in with email and password
    const signIn = async (email, password) => {
        console.log('[Auth] Attempting sign in for:', email)
        try {
            setError(null)
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                console.error('[Auth] Sign in error:', error)
                throw error
            }

            console.log('[Auth] Sign in successful:', data.user?.id)

            // Log activity - don't wait for this, and handle silently
            supabase.rpc('log_activity', {
                p_aksi: 'LOGIN',
                p_details: { email }
            }).then(({ error }) => {
                if (error) console.warn('[Auth] Log activity error (non-critical):', error)
            })

            return { data, error: null }
        } catch (err) {
            console.error('[Auth] Sign in failed:', err)
            setError(err.message)
            return { data: null, error: err }
        }
    }

    // Sign up new user
    const signUp = async (email, password, metadata = {}) => {
        console.log('[Auth] Attempting sign up for:', email)
        try {
            setError(null)
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            })

            if (error) {
                console.error('[Auth] Sign up error:', error)
                throw error
            }

            console.log('[Auth] Sign up successful:', data)
            return { data, error: null }
        } catch (err) {
            console.error('[Auth] Sign up failed:', err)
            setError(err.message)
            return { data: null, error: err }
        }
    }

    // Sign out
    const signOut = async () => {
        console.log('[Auth] Signing out...')
        try {
            // Log activity before signing out - don't wait
            supabase.rpc('log_activity', {
                p_aksi: 'LOGOUT'
            }).then(({ error }) => {
                if (error) console.warn('[Auth] Logout log error (non-critical):', error)
            })

            const { error } = await supabase.auth.signOut()
            if (error) {
                console.warn('[Auth] Sign out error (backend):', error)
                // We don't throw here, we want to clear local state regardless
            }

            console.log('[Auth] Signed out successfully (or forced locally)')
        } catch (err) {
            console.error('[Auth] Error signing out:', err)
        } finally {
            // ALWAYS clear state to ensure UI updates
            setUser(null)
            setProfile(null)
            setError(null)
        }
    }

    // Update password
    const updatePassword = async (newPassword) => {
        console.log('[Auth] Updating password...')
        try {
            setError(null)
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) {
                console.error('[Auth] Update password error:', error)
                throw error
            }

            console.log('[Auth] Password updated successfully')
            return { data, error: null }
        } catch (err) {
            console.error('[Auth] Update password failed:', err)
            setError(err.message)
            return { data: null, error: err }
        }
    }

    // Update profile
    const updateProfile = async (updates) => {
        console.log('[Auth] Updating profile:', updates)
        try {
            setError(null)
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single()

            if (error) {
                console.error('[Auth] Update profile error:', error)
                throw error
            }

            console.log('[Auth] Profile updated:', data)
            setProfile(data)
            return { data, error: null }
        } catch (err) {
            console.error('[Auth] Update profile failed:', err)
            setError(err.message)
            return { data: null, error: err }
        }
    }

    // Check if user is admin
    const isAdmin = profile?.role === ROLES.ADMIN

    // Check if user is petugas
    const isPetugas = profile?.role === ROLES.PETUGAS

    const value = {
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        updatePassword,
        updateProfile,
        refreshProfile,
        isAdmin,
        isPetugas
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
