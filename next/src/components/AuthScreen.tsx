'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Language } from '../types/types'

const AuthScreen = () => {
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const normalizedLocale = (
    Object.values(Language) as readonly string[]
  ).includes(locale)
    ? (locale as Language)
    : Language.EN

  const [username, setUsername] = useState('')
  const [language, setLanguage] = useState<Language>(normalizedLocale)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!username.trim()) {
      setError(tAuth('usernameRequired'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500))

      localStorage.setItem('user', JSON.stringify({ username, language }))
      router.push(`/${language}/talk`)
    } catch (err) {
      setError(tAuth('errorGeneric'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 transition-all duration-300 hover:shadow-3xl">
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

          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            {tCommon('appName')}
          </h1>
          <p className="text-gray-600 font-medium">{tCommon('tagline')}</p>
        </div>

        <div className="space-y-6">
          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              {tAuth('usernameLabel')} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full p-4 pl-5 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-400 shadow-sm group-hover:border-blue-300"
                placeholder={tAuth('usernameHint')}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              {tAuth('targetLanguage')}
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full p-4 pl-5 pr-10 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-gray-800 appearance-none shadow-sm cursor-pointer hover:border-blue-300"
              >
                <option value={Language.VI}>🇻🇳 Vietnamese (Tiếng Việt)</option>
                <option value={Language.EN}>🇺🇸 English</option>
                <option value={Language.JA}>🇯🇵 Japanese (日本語)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">
              {tAuth('targetLanguageHint')}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogin}
              disabled={!username.trim() || isLoading}
              className={`w-full font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 
                ${
                  !username.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0'
                }`}
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
                  {tAuth('ctaLoading')}
                </span>
              ) : (
                tAuth('ctaStart')
              )}
            </button>

            {/* Tooltip/Help text for disabled button */}
            {!username.trim() && (
              <p className="text-center text-sm text-amber-600 mt-3 animate-pulse">
                {tAuth('usernameRequiredShort')}
              </p>
            )}

            {/* Error Message Area */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center animate-fadeIn">
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
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            {tAuth('featuresTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {tAuth('featureVoice')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              {tAuth('featureRealtime')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              {tAuth('featureMultilang')}
            </div>
            <div className="flex items-center text-sm text-gray-600">
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
