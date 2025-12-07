const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface User {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
  expires_in: number
}

export interface RegisterRequest {
  email: string
  password: string
  username: string
}

export interface LoginRequest {
  email: string
  password: string
}

class AuthAPI {
  private accessToken: string | null = null

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const authResponse: AuthResponse = await response.json()
    this.setAccessToken(authResponse.access_token)
    return authResponse
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const authResponse: AuthResponse = await response.json()
    this.setAccessToken(authResponse.access_token)
    return authResponse
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      this.clearAccessToken()
    }
  }

  async refreshToken(): Promise<string> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send refresh token cookie
    })

    if (!response.ok) {
      this.clearAccessToken()
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    this.setAccessToken(data.access_token)
    return data.access_token
  }

  async getMe(): Promise<User> {
    const response = await fetch(`${API_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          await this.refreshToken()
          // Retry the request
          return this.getMe()
        } catch {
          throw new Error('Unauthorized')
        }
      }
      throw new Error('Failed to get user info')
    }

    return response.json()
  }

  setAccessToken(token: string): void {
    this.accessToken = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token')
    }
    return this.accessToken
  }

  clearAccessToken(): void {
    this.accessToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
    }
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null
  }
}

export const authAPI = new AuthAPI()
