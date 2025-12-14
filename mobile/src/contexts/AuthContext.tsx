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
// Note: You might need to adjust the import path for generated proto files in mobile
// Assuming similar structure or shared files, but usually mobile has its own generation target or copied files
// For now I will comment out the service import to avoid breaking build if path is wrong
// import { UserService } from '@/gen/app/user_service_pb'

import { User } from '../lib/api/auth'
import { UserService } from '../gen/app/user_service_pb'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
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
