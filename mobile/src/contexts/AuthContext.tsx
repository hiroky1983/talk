import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { authAPI, User } from '../lib/api/auth'

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
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      // const authenticated = await authAPI.isAuthenticated()
      // if (authenticated) {
      //   try {
      //     const userData = await authAPI.getMe()
      //     setUser(userData)
      //   } catch (error) {
      //     await authAPI.clearAccessToken()
      //   }
      // }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    // const response = await authAPI.login({ email, password })
    // setUser(response.user)
    setUser({
      id: 'dummy-user-id',
      email: email,
      username: email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const register = async (
    email: string,
    password: string,
    username: string
  ) => {
    // const response = await authAPI.register({ email, password, username })
    // setUser(response.user)
    setUser({
      id: 'dummy-user-id',
      email: email,
      username: username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const logout = async () => {
    await authAPI.logout()
    setUser(null)
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
