import { useEffect } from 'react'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'

export const useAuthCallback = () => {
  useEffect(() => {
    // Handle deep link callback from OAuth
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url

      // Check if this is an auth callback
      if (url.includes('auth/callback')) {
        try {
          // Supabase returns tokens in hash fragment (#) or query params (?)
          // Example: talkmobile://auth/callback#access_token=xxx&refresh_token=yyy

          let access_token: string | null = null
          let refresh_token: string | null = null

          // Try to parse hash fragment first (most common for OAuth)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1]
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

          if (access_token && refresh_token) {
            // Set the session
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            })
            console.log('OAuth session set successfully')
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error)
        }
      }
    }

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url })
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])
}
