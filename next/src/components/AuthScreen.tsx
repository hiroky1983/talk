'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

type AuthMode = 'signin' | 'signup'

export const AuthScreen = () => {
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')

  const [mode, setMode] = useState<AuthMode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async () => {
    // Validation
    if (mode === 'signup' && !username.trim()) {
      setError(tAuth('usernameRequired'))
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500))

      // TODO: Implement actual authentication
      localStorage.setItem(
        'user',
        JSON.stringify({ username: username || email, email }),
      )
      router.push('/en/talk')
    } catch (err) {
      setError(tAuth('errorGeneric'))
      setIsLoading(false)
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement social authentication
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push('/en/talk')
    } catch (err) {
      setError(`${provider} authentication failed`)
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-950 dark:via-gray-900 dark:to-pink-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 transition-all duration-300 hover:shadow-3xl">
        <div className="text-center mb-8">
          <div className="relative w-40 h-40 mx-auto mb-6">
            <Image
              src="/language_learning_hero.png"
              alt="Language Learning"
              fill
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>

          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            {tCommon('tagline')}
          </p>
        </div>

        <div className="space-y-4">
          {mode === 'signup' && (
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError(null)
                  }}
                  className="w-full p-4 pl-5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm group-hover:border-blue-300 dark:group-hover:border-blue-600"
                  placeholder="Enter your username"
                />
              </div>
            </div>
          )}

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              {mode === 'signin' ? 'Username or Email' : 'Email'}{' '}
              <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full p-4 pl-5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm group-hover:border-blue-300 dark:group-hover:border-blue-600"
                placeholder={
                  mode === 'signin'
                    ? 'Enter username or email'
                    : 'Enter your email'
                }
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full p-4 pl-5 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm group-hover:border-blue-300 dark:group-hover:border-blue-600"
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
          </div>

          {/* Error Message Area */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/40 border border-red-100 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm flex items-center animate-fadeIn">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAuth}
              disabled={isLoading}
              className="w-full font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Start Learning'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                Google
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialAuth('apple')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black dark:bg-white text-white dark:text-black border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="font-medium">Apple</span>
            </button>
          </div>

          {/* Toggle Mode Link */}
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            {tAuth('featuresTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {tAuth('featureVoice')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              {tAuth('featureRealtime')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              {tAuth('featureMultilang')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
              {tAuth('featureFeedback')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
