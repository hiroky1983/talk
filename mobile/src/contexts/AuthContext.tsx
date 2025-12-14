import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { UserService } from '../gen/app/user_service_pb'

type User = {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
}

// Required for expo-web-browser
WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated on mount via Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || '',
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || '',
        })
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || '',
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || '',
        })

        // Call backend to ensure user exists
        try {
          const transport = createConnectTransport({
            baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
          })
          const client = createClient(UserService, transport)

          // TODO: Implement CreateUser call
          // We need to match the UserService definition
          // await client.createUser({ ... })
        } catch (e) {
          console.error('Failed to sync user with backend', e)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const register = async (
    email: string,
    password: string,
    username: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    try {
      // Create redirect URL for the current session
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'talkmobile',
        path: 'auth/callback',
      })

      console.log('Redirect URL:', redirectTo)

      // Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw error

      if (!data?.url) {
        throw new Error('No authorization URL returned')
      }

      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type === 'success') {
        const url = result.url
        // Extract tokens from URL
        const params = new URLSearchParams(
          url.split('#')[1] || url.split('?')[1]
        )
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
