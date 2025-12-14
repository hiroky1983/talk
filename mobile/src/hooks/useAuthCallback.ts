import { useEffect } from 'react'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'

export const useAuthCallback = () => {
  useEffect(() => {
    // Handle deep link callback from OAuth
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url

      console.log('📱 Deep link received:', url)

      // Check if this is an auth callback
      if (url.includes('auth/callback') || url.includes('--/auth/callback')) {
        try {
          console.log('🔐 Processing auth callback...')

          // Supabase returns tokens in hash fragment (#) or query params (?)
          // Example: exp://192.168.11.7:8084/--/auth/callback#access_token=xxx&refresh_token=yyy

          let access_token: string | null = null
          let refresh_token: string | null = null

          // Try to parse hash fragment first (most common for OAuth)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1]
            console.log('🔍 Hash part:', hashPart)
            const params = new URLSearchParams(hashPart)
            access_token = params.get('access_token')
            refresh_token = params.get('refresh_token')
          }

          // Fallback to query parameters
          if (!access_token && url.includes('?')) {
            const urlObj = new URL(url)
            access_token = urlObj.searchParams.get('access_token')
            refresh_token = urlObj.searchParams.get('refresh_token')
          }

          console.log('🔑 Tokens found:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
          })

          if (access_token && refresh_token) {
            // Set the session
            console.log('💾 Setting session...')
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            })
            console.log('✅ OAuth session set successfully')
          } else {
            console.warn('⚠️ Tokens not found in callback URL')
          }
        } catch (error) {
          console.error('❌ Error handling OAuth callback:', error)
        }
      }
    }

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Initial URL:', url)
        handleDeepLink({ url })
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])
}
