'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useTranslations } from 'next-intl'
import React from 'react'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const t = useTranslations('common')

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative p-2 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 shadow-sm transition-all"
      title={theme === 'light' ? t('switchToDarkMode') : t('switchToLightMode')}
    >
      {theme === 'light' ? (
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  )
}
